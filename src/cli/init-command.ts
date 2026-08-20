import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { scaffoldProject, formatScaffoldResults, detectBaseDir } from "./scaffolder.js";
import { detectFramework } from "./detector.js";
import { select, confirm } from "./prompts.js";
import { getMigrationSql, type SupportedDatabaseType } from "../migrations/index.js";
import type { ContlifyFramework } from "../templates/framework.js";
import { getScaffoldManifest } from "../templates/index.js";


const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function log(msg: string) { console.log(msg); }
function info(msg: string) { console.log(`${COLORS.cyan}${msg}${COLORS.reset}`); }
function success(msg: string) { console.log(`${COLORS.green}${msg}${COLORS.reset}`); }
function warn(msg: string) { console.log(`${COLORS.yellow}${msg}${COLORS.reset}`); }
function bold(msg: string) { return `${COLORS.bold}${msg}${COLORS.reset}`; }
function dim(msg: string) { return `${COLORS.dim}${msg}${COLORS.reset}`; }

const FRAMEWORK_CHOICES: { label: string; value: ContlifyFramework }[] = [
  { label: "Next.js (App Router)", value: "nextjs" },
  { label: "Astro", value: "astro" },
  { label: "React Router v7 (Framework Mode)", value: "react-router" },
];

const DB_CHOICES: { label: string; value: SupportedDatabaseType }[] = [
  { label: "PostgreSQL (pg / Neon / Railway / Vercel Postgres)", value: "postgres" },
  { label: "Supabase", value: "supabase" },
  { label: "Cloudflare D1 (SQLite)", value: "d1" },
  { label: "MongoDB", value: "mongodb" },
];

/**
 * Astro / React Router pages import bindContlifyEnv. Postgres and similar treat it as a no-op.
 */
function withEnvBind(source: string): string {
  if (source.includes("export function bindContlifyEnv")) return source;
  return `${source}
/** Bind Cloudflare request env (D1). No-op for Postgres / Mongo / Supabase. */
export function bindContlifyEnv(_env?: unknown) {
  return contlifyAdapter;
}
`;
}

/**
 * Generates the adapter.ts content for the chosen database, host, and site framework.
 */
function buildAdapterContent(
  dbType: SupportedDatabaseType,
  pgTarget: "node" | "cloudflare" = "node",
  mongoTarget: "node" | "cloudflare" = "node",
  framework: ContlifyFramework = "nextjs"
): string {
  const supabaseUrlEnv =
    framework === "nextjs"
      ? "process.env.SUPABASE_URL"
      : framework === "astro"
        ? "(process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL)"
        : "(process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)";


  const skipNextBuildGuard = framework === "nextjs"
    ? `if (process.env.NEXT_PHASE === "phase-production-build") return null;\n  `
    : "";

  switch (dbType) {
    case "postgres":
      if (pgTarget === "cloudflare") {
        return withEnvBind(`import { neon } from "@neondatabase/serverless";
import { createPostgresAdapter } from "contlify";

const _sql = neon(process.env.DATABASE_URL!);

const neonHttpClient = {
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }> {
    const rows = await _sql.query(sql, params ?? []);
    return { rows: rows as unknown as T[] };
  },
};

export const contlifyAdapter = createPostgresAdapter(neonHttpClient);
`);
      }
      return withEnvBind(`import { Pool } from "pg";
import { createPostgresAdapter } from "contlify";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const contlifyAdapter = createPostgresAdapter(pool);
`);

    case "supabase":
      return withEnvBind(`import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdapter } from "contlify";

const supabase = createClient(
  ${supabaseUrlEnv}!,
  process.env.SUPABASE_SECRET_KEY!
);

export const contlifyAdapter = createSupabaseAdapter(supabase as any);
`);

    case "d1":
      if (framework === "nextjs") {
        return withEnvBind(`import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createD1Adapter } from "contlify";

export const contlifyAdapter = createD1Adapter(async () => {
  const ctx = await getCloudflareContext();
  return ctx?.env as any;
});
`);
      }
      return `import { createD1Adapter } from "contlify";

let _boundEnv: unknown = null;

export function bindContlifyEnv(env?: unknown) {
  if (env !== undefined) _boundEnv = env;
  return contlifyAdapter;
}

export const contlifyAdapter = createD1Adapter(async () => _boundEnv as any);
`;

    case "mongodb":
      if (mongoTarget === "cloudflare") {
        return withEnvBind(`import { createMongoAdapter } from "contlify";

// Cloudflare Workers: connect fresh per request.
export const contlifyAdapter = createMongoAdapter(async () => {
  ${skipNextBuildGuard}const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  await client.connect();
  return client.db(process.env.MONGODB_DB_NAME ?? "contlify");
});
`);
      }
      return withEnvBind(`import { createMongoAdapter } from "contlify";

let _client: import("mongodb").MongoClient | null = null;

export const contlifyAdapter = createMongoAdapter(async () => {
  ${skipNextBuildGuard}const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  const { MongoClient } = await import("mongodb");
  if (!_client) _client = new MongoClient(uri);
  await _client.connect().catch(() => {});
  return _client.db(process.env.MONGODB_DB_NAME ?? "contlify");
});
`);
  }
}

/**
 * Returns a .env.local snippet with the relevant DB env vars for the chosen database.
 */
function buildEnvSnippet(
  dbType: SupportedDatabaseType,
  pgTarget: "node" | "cloudflare" = "node",
  mongoTarget: "node" | "cloudflare" = "node"
): string {
  switch (dbType) {
    case "postgres":
      if (pgTarget === "cloudflare") {
        return `# .env.local
DATABASE_URL=postgresql://user:password@ep-something-pooler.neon.tech/dbname?sslmode=require

# Contlify API Key (set in your CMS dashboard)
CONTLIFY_API_KEY=your_api_key_here

# ⚠️ For Cloudflare Workers / OpenNext deployment, set secrets via Wrangler:
# npx wrangler secret put DATABASE_URL
# npx wrangler secret put CONTLIFY_API_KEY
#
# Use the pooler connection string (hostname contains -pooler) for Workers.
`;
      }
      return `# .env.local
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Contlify API Key (set in your CMS dashboard)
CONTLIFY_API_KEY=your_api_key_here
`;
    case "supabase":
      return `# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_service_role_key_here

CONTLIFY_API_KEY=your_api_key_here
`;
    case "d1":
      return `# wrangler.jsonc — add the D1 binding
# [[d1_databases]]
# binding = "DB"
# database_name = "contlify"
# database_id = "your-d1-database-id"

# .env.local
CONTLIFY_API_KEY=your_api_key_here
`;
    case "mongodb":
      if (mongoTarget === "cloudflare") {
        return `# .env.local
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB_NAME=contlify

CONTLIFY_API_KEY=your_api_key_here

# ⚠️ For Cloudflare Workers / OpenNext deployment, set secrets via Wrangler:
# npx wrangler secret put MONGODB_URI
# npx wrangler secret put CONTLIFY_API_KEY
#
# Note: MongoDB on Cloudflare Workers connects per-request (no persistent pool).
# Consider Cloudflare D1 or Neon PostgreSQL for lower-latency Workers support.
`;
      }
      return `# .env.local
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB_NAME=contlify

CONTLIFY_API_KEY=your_api_key_here
`;
  }
}

/**
 * Returns the npm package to install for the chosen database.
 */
function getDbPackage(
  dbType: SupportedDatabaseType,
  pgTarget: "node" | "cloudflare" = "node",
  _mongoTarget: "node" | "cloudflare" = "node"
): string | null {
  switch (dbType) {
    case "postgres": return pgTarget === "cloudflare" ? "@neondatabase/serverless" : "pg @types/pg";
    case "supabase": return "@supabase/supabase-js";
    case "d1": return null; // bundled with Cloudflare Workers
    case "mongodb": return "mongodb"; // same package for both node and cloudflare
  }
}

/**
 * Patches next.config.mjs to add serverExternalPackages for the given package.
 */
function patchNextConfig(projectRoot: string, pkg: string): void {
  const configPaths = [
    path.join(projectRoot, "next.config.mjs"),
    path.join(projectRoot, "next.config.js"),
    path.join(projectRoot, "next.config.ts"),
  ];

  const configPath = configPaths.find(p => fs.existsSync(p));
  if (!configPath) return;

  let content = fs.readFileSync(configPath, "utf-8");

  // Already patched
  if (content.includes("serverExternalPackages")) return;

  // Insert serverExternalPackages into the config object
  content = content.replace(
    /const nextConfig\s*=\s*\{/,
    `const nextConfig = {\n  serverExternalPackages: ["${pkg}"],`
  );

  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Patches app/routes.ts in React Router v7 to register Contlify blog and API routes.
 */
function patchReactRouterRoutes(projectRoot: string): boolean {
  const routesPaths = [
    path.join(projectRoot, "app", "routes.ts"),
    path.join(projectRoot, "app", "routes.js"),
    path.join(projectRoot, "app", "routes.tsx"),
  ];

  const routesPath = routesPaths.find((p) => fs.existsSync(p));
  if (!routesPath) return false;

  let content = fs.readFileSync(routesPath, "utf-8");

  const missingRoutes: string[] = [];

  if (!content.includes("routes/blog._index.tsx")) {
    missingRoutes.push('  route("blog", "routes/blog._index.tsx"),');
  }
  if (!content.includes("routes/blog.category.$slug.tsx")) {
    missingRoutes.push('  route("blog/category/:slug", "routes/blog.category.$slug.tsx"),');
  }
  if (!content.includes("routes/blog.post.$slug.tsx")) {
    missingRoutes.push('  route("blog/post/:slug", "routes/blog.post.$slug.tsx"),');
  }
  if (!content.includes("routes/api.contlify.$.ts") && !content.includes("api.contlify")) {
    missingRoutes.push('  route("api/contlify/*", "routes/api.contlify.$.ts"),');
  }

  // All 4 routes are already present
  if (missingRoutes.length === 0) {
    return true;
  }

  // Ensure 'route' is imported from @react-router/dev/routes
  if (!content.includes("route,") && !content.includes(", route") && !content.includes("route }") && !content.includes("route\n}")) {
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']@react-router\/dev\/routes["']/,
      (_match, imports) => `import { ${imports.trim()}, route } from "@react-router/dev/routes"`
    );
  }

  const routesToInsert = "\n" + missingRoutes.join("\n") + "\n";

  // Insert before the closing array bracket
  if (content.includes("] satisfies RouteConfig")) {
    content = content.replace(
      /(\s*)\]\s*satisfies\s*RouteConfig/,
      `${routesToInsert}$1] satisfies RouteConfig`
    );
  } else if (content.lastIndexOf("]") !== -1) {
    const lastBracketIndex = content.lastIndexOf("]");
    content = content.slice(0, lastBracketIndex) + routesToInsert + content.slice(lastBracketIndex);
  }

  fs.writeFileSync(routesPath, content, "utf-8");
  return true;
}


/**
 * Returns CLI migration instructions for the chosen database type.
 */

function getMigrationInstructions(dbType: SupportedDatabaseType, sqlFilePath: string): string {
  switch (dbType) {
    case "postgres":
      return `  Run migration with psql:
    ${dim(`psql $DATABASE_URL -f ${sqlFilePath}`)}

  Or paste the SQL directly in:
    ${dim("Supabase → SQL Editor")}
    ${dim("Neon → SQL Console")}
    ${dim("Railway → Connect → Query")}`;

    case "supabase":
      return `  Paste the SQL in Supabase SQL Editor:
    ${dim("https://app.supabase.com → SQL Editor → New Query")}
    ${dim(`Copy contents of ${sqlFilePath} and run`)}`;

    case "d1":
      return `  Apply via Wrangler CLI:
    ${dim(`npx wrangler d1 execute <DB_NAME> --file=${sqlFilePath}`)}

  Or for local dev:
    ${dim(`npx wrangler d1 execute <DB_NAME> --file=${sqlFilePath} --local`)}`;

    case "mongodb":
      return `  MongoDB collections auto-initialize on first document insertion.
  ${dim("No migration needed — just connect and go!")}`;
  }
}

/**
 * `contlify init` — interactive project setup command.
 * Scaffolds the blog pages, configures the adapter, and outputs migration instructions.
 */
export async function runInit(projectRoot: string, flags: { overwrite?: boolean } = {}): Promise<void> {
  log("");
  log(bold("  🚀 Contlify Setup Wizard"));
  log(dim("  ──────────────────────────────────────────────"));
  log("");

  // Step 1: Detect or select site framework
  const detected = detectFramework(projectRoot);
  let framework: ContlifyFramework;

  if (detected) {
    const matched = FRAMEWORK_CHOICES.find((f) => f.value === detected);
    const label = matched ? matched.label : detected;
    const confirmDetected = await confirm(
      `  🔍 Detected ${bold(label)}. Proceed with this framework?`,
      true
    );
    if (confirmDetected) {
      framework = detected;
    } else {
      framework = await select("  Which site framework are you using?", FRAMEWORK_CHOICES);
    }
  } else {
    framework = await select("  Which site framework are you using?", FRAMEWORK_CHOICES);
  }

  const dbType = await select("  Which database are you using?", DB_CHOICES);

  let pgTarget: "node" | "cloudflare" = "node";

  if (dbType === "postgres") {
    pgTarget = await select("  Where is your project hosted / deployed?", [
      { label: "Node.js / Vercel / Railway / Render / Docker (Standard pg)", value: "node" },
      { label: "Cloudflare Workers / OpenNext (Neon Serverless Driver)", value: "cloudflare" },
    ]);
  }

  let mongoTarget: "node" | "cloudflare" = "node";
  if (dbType === "mongodb") {
    mongoTarget = await select("  Where is your project hosted / deployed?", [
      { label: "Node.js / Vercel / Railway / Render / Docker", value: "node" },
      { label: "Cloudflare Workers / OpenNext", value: "cloudflare" },
    ]);
    if (mongoTarget === "cloudflare") {
      log("");
      warn("  ⚠️  MongoDB on Cloudflare Workers connects per-request (no persistent pool).");
      warn("     Consider Cloudflare D1 or Neon PostgreSQL for better Workers performance.");
      log("");
    }
  }

  const baseDir = detectBaseDir(projectRoot);
  const prefix = (rel: string) => (framework === "nextjs" && baseDir ? `${baseDir}/${rel}` : rel);

  // Step 2: Confirm scaffold
  log("");
  info(`  ℹ️  The following files will be generated in your ${framework} project:`);
  const dbLabel = dbType === "postgres"
    ? `postgres - ${pgTarget}`
    : dbType === "mongodb"
      ? `mongodb - ${mongoTarget}`
      : dbType;
  for (const entry of getScaffoldManifest(framework)) {
    log(`     ${dim(prefix(entry.relativePath))} — ${entry.description}`);
  }
  log(`     ${dim("(adapter will be written for " + dbLabel + ")")}`);
  log("");

  const shouldProceed = await confirm("  Proceed with setup?", true);
  if (!shouldProceed) {
    warn("  ⚠️  Setup cancelled.");
    return;
  }

  // Step 3: Install the required database driver
  const dbPkg = getDbPackage(dbType, pgTarget, mongoTarget);
  if (dbPkg) {
    log("");
    info(`  📦 Installing ${dbPkg}...`);
    try {
      execSync(`npm install ${dbPkg}`, { cwd: projectRoot, stdio: "inherit" });
      success(`  ✅ ${dbPkg} installed.`);
    } catch {
      warn(`  ⚠️  Could not auto-install ${dbPkg}. Run: npm install ${dbPkg}`);
    }
  }

  // Step 4: Scaffold files
  log("");
  info("  📁 Scaffolding files...");

  const results = scaffoldProject({
    projectRoot,
    overwrite: flags.overwrite ?? false,
    framework,
  });

  const adapterRel =
    framework === "nextjs"
      ? prefix("lib/contlify/adapter.ts")
      : framework === "react-router"
        ? "app/lib/contlify/adapter.ts"
        : "src/lib/contlify/adapter.ts";
  const adapterPath = path.join(projectRoot, adapterRel);
  const adapterContent = buildAdapterContent(dbType, pgTarget, mongoTarget, framework);
  fs.mkdirSync(path.dirname(adapterPath), { recursive: true });
  fs.writeFileSync(adapterPath, adapterContent, "utf-8");

  log(formatScaffoldResults(results));

  // Patch next.config.mjs only for Next.js + MongoDB
  if (framework === "nextjs" && dbType === "mongodb") {
    patchNextConfig(projectRoot, "mongodb");
    success("  ✅ next.config.mjs patched with serverExternalPackages.");
  }

  // Patch app/routes.ts for React Router v7
  if (framework === "react-router") {
    const patched = patchReactRouterRoutes(projectRoot);
    if (patched) {
      success("  ✅ app/routes.ts registered with blog and Contlify API routes.");
    }
  }


  // Step 5: Write migration SQL file
  log("");
  if (dbType !== "mongodb") {
    info("  📄 Generating migration SQL...");
    const sqlContent = getMigrationSql(dbType);
    const sqlFileName = `contlify-${dbType}.sql`;
    const sqlFilePath = path.join(projectRoot, sqlFileName);
    fs.writeFileSync(sqlFilePath, sqlContent, "utf-8");
    success(`  ✅ Migration file written: ${sqlFileName}`);
    log("");
    info("  📌 Apply the migration to your database:");
    log(getMigrationInstructions(dbType, sqlFileName));
  }

  // Step 6: Show env snippet
  log("");
  info("  🔑 Add these to your .env.local:");
  log("");
  log(buildEnvSnippet(dbType, pgTarget, mongoTarget).split("\n").map(l => `  ${dim(l)}`).join("\n"));

  // Done!
  log("");
  success("  ✅ Contlify setup complete!");
  log("");
  log(bold("  Next steps:"));
  log(`  1. ${dbType !== "mongodb" ? "Run the migration SQL on your database" : "Connect your MongoDB URI"}`);
  log("  2. Add env variables to .env.local");
  log("  3. Set your CONTLIFY_API_KEY in your Contlify dashboard");
  log("  4. Run: npm run dev");
  log("  5. Visit /blog to see your blog listing page");

  log("");
  log(dim("  Docs: https://github.com/SectemTechnologies/Next.js-Package#readme"));
  log("");
}
