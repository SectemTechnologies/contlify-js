import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { scaffoldProject, formatScaffoldResults, detectBaseDir } from "./scaffolder.js";
import { select, confirm } from "./prompts.js";
import { getMigrationSql, type SupportedDatabaseType } from "../migrations/index.js";

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

const DB_CHOICES: { label: string; value: SupportedDatabaseType }[] = [
  { label: "PostgreSQL (pg / Neon / Railway / Vercel Postgres)", value: "postgres" },
  { label: "Supabase", value: "supabase" },
  { label: "Cloudflare D1 (SQLite)", value: "d1" },
  { label: "MongoDB", value: "mongodb" },
];

/**
 * Generates the adapter.ts content for the chosen database.
 */
function buildAdapterContent(dbType: SupportedDatabaseType, pgTarget: "node" | "cloudflare" = "node"): string {
  switch (dbType) {
    case "postgres":
      if (pgTarget === "cloudflare") {
        return `import { Pool } from "@neondatabase/serverless";
import { createPostgresAdapter } from "contlify";

// Initialize your Neon Serverless connection pool for Cloudflare Workers / Edge
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const contlifyAdapter = createPostgresAdapter(pool);
`;
      }
      return `import { Pool } from "pg";
import { createPostgresAdapter } from "contlify";

// Initialize your PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // Uncomment for Neon / Railway
});

export const contlifyAdapter = createPostgresAdapter(pool);
`;

    case "supabase":
      return `import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdapter } from "contlify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side writes
);

export const contlifyAdapter = createSupabaseAdapter(supabase as any);
`;

    case "d1":
      return `import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createD1Adapter } from "contlify";

// Auto-detects ANY D1 database binding name from wrangler.jsonc
export const contlifyAdapter = createD1Adapter(async () => {
  const ctx = await getCloudflareContext();
  return ctx?.env as any;
});
`;

    case "mongodb":
      return `import { createMongoAdapter } from "contlify";

let _client: import("mongodb").MongoClient | null = null;

export const contlifyAdapter = createMongoAdapter(async () => {
  // Skip DB connection during Next.js production build
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  // Dynamic import prevents webpack from analyzing mongodb at build time
  const { MongoClient } = await import("mongodb");
  if (!_client) _client = new MongoClient(uri);
  return _client.db(process.env.MONGODB_DB_NAME ?? "contlify");
});
`;
  }
}

/**
 * Returns a .env.local snippet with the relevant DB env vars for the chosen database.
 */
function buildEnvSnippet(dbType: SupportedDatabaseType, pgTarget: "node" | "cloudflare" = "node"): string {
  switch (dbType) {
    case "postgres":
      if (pgTarget === "cloudflare") {
        return `# .env.local
DATABASE_URL=postgresql://user:password@ep-something.neon.tech/dbname?sslmode=require

# Contlify API Key (set in your CMS dashboard)
CONTLIFY_API_KEY=your_api_key_here

# ⚠️ For Cloudflare Workers / OpenNext deployment, set secret via Wrangler:
# npx wrangler secret put DATABASE_URL
# npx wrangler secret put CONTLIFY_API_KEY
`;
      }
      return `# .env.local
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Contlify API Key (set in your CMS dashboard)
CONTLIFY_API_KEY=your_api_key_here
`;
    case "supabase":
      return `# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

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
function getDbPackage(dbType: SupportedDatabaseType, pgTarget: "node" | "cloudflare" = "node"): string | null {
  switch (dbType) {
    case "postgres": return pgTarget === "cloudflare" ? "@neondatabase/serverless" : "pg @types/pg";
    case "supabase": return "@supabase/supabase-js";
    case "d1": return null; // bundled with Cloudflare Workers
    case "mongodb": return "mongodb";
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

  // Step 1: Choose database
  const dbType = await select("  Which database are you using?", DB_CHOICES);

  let pgTarget: "node" | "cloudflare" = "node";
  if (dbType === "postgres") {
    pgTarget = await select("  Where is your project hosted / deployed?", [
      { label: "Node.js / Vercel / Railway / Render / Docker (Standard pg)", value: "node" },
      { label: "Cloudflare Workers / OpenNext (Neon Serverless Driver)", value: "cloudflare" },
    ]);
  }

  const baseDir = detectBaseDir(projectRoot);
  const prefix = (rel: string) => baseDir ? `${baseDir}/${rel}` : rel;

  // Step 2: Confirm scaffold
  log("");
  info(`  ℹ️  The following files will be generated in your project:`);
  log(`     ${dim(prefix("app/api/contlify/[...path]/route.ts"))} — API route handler`);
  log(`     ${dim(prefix("lib/contlify/adapter.ts"))}             — Database adapter (${dbType}${dbType === "postgres" ? ` - ${pgTarget}` : ""})`);
  log(`     ${dim(prefix("lib/contlify/queries.ts"))}             — Blog read queries`);
  log(`     ${dim(prefix("app/blog/loading.tsx"))}               — Loading spinner component`);
  log(`     ${dim(prefix("app/blog/page.tsx"))}                   — Blog categories page`);
  log(`     ${dim(prefix("app/blog/category/[slug]/page.tsx"))}   — Category posts page`);
  log(`     ${dim(prefix("app/blog/post/[slug]/page.tsx"))}       — Single post page`);
  log("");

  const shouldProceed = await confirm("  Proceed with setup?", true);
  if (!shouldProceed) {
    warn("  ⚠️  Setup cancelled.");
    return;
  }

  // Step 3: Install the required database driver
  const dbPkg = getDbPackage(dbType, pgTarget);
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

  const results = scaffoldProject({ projectRoot, overwrite: flags.overwrite ?? false });

  // Override adapter.ts with the DB-specific content
  const adapterPath = path.join(projectRoot, prefix("lib/contlify/adapter.ts"));
  const adapterContent = buildAdapterContent(dbType, pgTarget);
  fs.writeFileSync(adapterPath, adapterContent, "utf-8");

  log(formatScaffoldResults(results));

  // Patch next.config.mjs for packages that need serverExternalPackages
  if (dbType === "mongodb") {
    patchNextConfig(projectRoot, "mongodb");
    success("  ✅ next.config.mjs patched with serverExternalPackages.");
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
  log(buildEnvSnippet(dbType, pgTarget).split("\n").map(l => `  ${dim(l)}`).join("\n"));

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
