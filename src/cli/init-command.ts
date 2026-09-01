import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { scaffoldProjectV2 } from "./scaffolder.js";
import { detectFramework } from "./detector.js";
import { select, confirm } from "./prompts.js";
import { getMigrationSql, type SupportedDatabaseType } from "../migrations/index.js";
import type { ContlifyFramework } from "../templates/framework.js";
import type { V2MigrationMode, PostgresDeployment } from "../templates/v2/index.js";

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
  { label: "Angular (SSR)", value: "angular" },
];

const DB_CHOICES: { label: string; value: SupportedDatabaseType }[] = [
  { label: "PostgreSQL (pg / Neon / Railway / Vercel Postgres)", value: "postgres" },
  { label: "Supabase (JavaScript SDK)", value: "supabase" },
  { label: "Cloudflare D1 (SQLite)", value: "d1" },
  { label: "MongoDB", value: "mongodb" },
];

const MIGRATION_CHOICES: { label: string; value: V2MigrationMode }[] = [
  { label: "🚀  Automatic — provision schema automatically when the application starts", value: "auto" },
  { label: "📄  Generate SQL File — generate schema.sql and show how to apply it", value: "sql" },
  { label: "⏭️   Skip for now — I'll run `npx contlify migrate` later", value: "skip" },
];

const POSTGRES_HOSTING_CHOICES: { label: string; value: PostgresDeployment }[] = [
  { label: "Cloudflare Workers / OpenNext (Neon Serverless HTTP Driver — stateless, no socket errors)", value: "cloudflare" },
  { label: "Node.js / Vercel / Railway / Render / Docker (Standard pg Pool)", value: "node" },
];

const MONGO_HOSTING_CHOICES: { label: string; value: PostgresDeployment }[] = [
  { label: "Cloudflare Workers / OpenNext (Edge-optimized serverless connection, timeout protection)", value: "cloudflare" },
  { label: "Node.js / Vercel / Railway / Render / Docker (Standard persistent connection pool)", value: "node" },
];

/**
 * Returns the npm package to install for the chosen database type.
 */
function getDbPackage(
  dbType: SupportedDatabaseType,
  postgresDeployment?: PostgresDeployment,
  framework?: ContlifyFramework
): string | null {
  switch (dbType) {
    case "postgres":
      return postgresDeployment === "node" ? "pg @types/pg" : "@neondatabase/serverless";
    case "supabase":
      return "@supabase/supabase-js";
    case "d1":
      return framework === "nextjs" ? "@opennextjs/cloudflare" : null;
    case "mongodb":
      return "mongodb";
  }
}

/**
 * Returns CLI migration instructions for the chosen database type.
 */
function getMigrationInstructions(dbType: SupportedDatabaseType, sqlFilePath: string): string {
  switch (dbType) {
    case "postgres":
      return `  Run migration with psql:\n    ${dim(`psql "$DATABASE_URL" -f ${sqlFilePath}`)}\n\n  Or paste in:\n    ${dim("Neon → SQL Console")}\n    ${dim("Railway → Connect → Query")}`;

    case "supabase":
      return `  Apply in Supabase Dashboard:\n    1. Go to ${dim("https://app.supabase.com")} → Select your project\n    2. Click ${dim("SQL Editor")} → ${dim("New query")}\n    3. Paste the contents of ${dim("schema.sql")} and click ${dim("Run")}`;

    case "d1":
      return `  Apply via Wrangler CLI:\n    ${dim(`npx wrangler d1 execute <database_name> --file=${sqlFilePath}`)}\n\n  Or for local dev:\n    ${dim(`npx wrangler d1 execute <database_name> --file=${sqlFilePath} --local`)}`;

    case "mongodb":
      return `  MongoDB collections auto-initialize on first document insertion.\n  ${dim("No migration needed — just connect and go!")}`;
  }
}

/**
 * Returns a .env.local snippet with the relevant DB env vars for the chosen database.
 */
function buildEnvSnippet(dbType: SupportedDatabaseType, deployment?: PostgresDeployment): string {
  switch (dbType) {
    case "postgres":
      return `# .env.local
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Contlify API Key (keep this secret!)
CONTLIFY_API_KEY=your_api_key_here
`;
    case "supabase":
      return `# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_service_role_key_here

# Contlify API Key (keep this secret!)
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
      if (deployment === "cloudflare") {
        return `# .env.local / wrangler secret (Standard connection string recommended for Cloudflare):
MONGODB_URI=mongodb://user:password@host1:27017,host2:27017,host3:27017/?replicaSet=atlas-...&ssl=true&authSource=admin
MONGODB_DB_NAME=contlify

CONTLIFY_API_KEY=your_api_key_here
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
 * Patches next.config.mjs to add serverExternalPackages for the given package.
 */
function patchNextConfig(projectRoot: string, pkg: string): void {
  const configPaths = [
    path.join(projectRoot, "next.config.ts"),
    path.join(projectRoot, "next.config.mjs"),
    path.join(projectRoot, "next.config.js"),
  ];

  const configPath = configPaths.find(p => fs.existsSync(p));
  if (!configPath) return;

  let content = fs.readFileSync(configPath, "utf-8");

  if (content.includes("serverExternalPackages")) return;

  const isTs = configPath.endsWith(".ts");
  const typeAnnotation = isTs && content.includes("NextConfig") ? ": NextConfig" : "";

  content = content.replace(
    /const nextConfig(?::\s*[^=]+)?\s*=\s*\{/,
    `const nextConfig${typeAnnotation} = {\n  serverExternalPackages: ["${pkg}"],`
  );

  if (!content.includes("serverExternalPackages")) {
    content = content.replace(
      /export default\s*\{/,
      `export default {\n  serverExternalPackages: ["${pkg}"],`
    );
  }

  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Patches app/routes.ts in React Router v7 to register the Contlify API route.
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

  if (content.includes("api.contlify.$")) {
    return true;
  }

  // Ensure 'route' is imported
  if (!content.includes("route,") && !content.includes(", route") && !content.includes("route }") && !content.includes("route\n}")) {
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']@react-router\/dev\/routes["']/,
      (_match, imports) => `import { ${imports.trim()}, route } from "@react-router/dev/routes"`
    );
  }

  const routeEntry = `\n  route("api/contlify/*", "routes/api.contlify.$.ts"),\n`;

  if (content.includes("] satisfies RouteConfig")) {
    content = content.replace(
      /(\s*)\]\s*satisfies\s*RouteConfig/,
      `${routeEntry}$1] satisfies RouteConfig`
    );
  } else if (content.lastIndexOf("]") !== -1) {
    const lastBracketIndex = content.lastIndexOf("]");
    content = content.slice(0, lastBracketIndex) + routeEntry + content.slice(lastBracketIndex);
  }

  fs.writeFileSync(routesPath, content, "utf-8");
  return true;
}

/**
 * Patches Angular SSR server.ts to register the Contlify Express middleware.
 */
function patchAngularServer(projectRoot: string): boolean {
  const possiblePaths = [
    path.join(projectRoot, "server.ts"),
    path.join(projectRoot, "src", "server.ts"),
  ];

  let serverPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serverPath = p;
      break;
    }
  }

  if (!serverPath) return false;

  let content = fs.readFileSync(serverPath, "utf-8");
  if (content.includes("contlify") || content.includes("mountContlify")) {
    return false; // already patched
  }

  const importStatement = `import { mountContlify } from "./server.contlify";\n`;
  content = importStatement + content;

  if (content.includes("const app = express();")) {
    content = content.replace(
      "const app = express();",
      `const app = express();\n\n// Mount Contlify Publishing API\nmountContlify(app);`
    );
  } else if (content.includes("app.use(")) {
    content = content.replace(
      /(\s*)(app\.use\()/,
      `$1// Mount Contlify Publishing API\n$1mountContlify(app);\n\n$1$2`
    );
  } else {
    content += `\n// Mount Contlify Publishing API\nmountContlify(app);\n`;
  }

  fs.writeFileSync(serverPath, content, "utf-8");
  return true;
}

/**
 * Patches Angular angular.json to add externalDependencies for server database drivers.
 */
function patchAngularJson(projectRoot: string): boolean {
  const angularJsonPath = path.join(projectRoot, "angular.json");
  if (!fs.existsSync(angularJsonPath)) return false;

  try {
    const raw = fs.readFileSync(angularJsonPath, "utf-8");
    const json = JSON.parse(raw);
    const projects = json.projects || {};
    const defaultProjectKey = Object.keys(projects)[0];
    if (!defaultProjectKey) return false;

    const buildOptions = projects[defaultProjectKey]?.architect?.build?.options;
    if (!buildOptions) return false;

    const requiredDrivers = ["mongodb", "pg", "@neondatabase/serverless", "@supabase/supabase-js", "dotenv"];
    const current = Array.isArray(buildOptions.externalDependencies) ? buildOptions.externalDependencies : [];
    const merged = Array.from(new Set([...current, ...requiredDrivers]));

    buildOptions.externalDependencies = merged;
    fs.writeFileSync(angularJsonPath, JSON.stringify(json, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * `contlify init` — interactive v2 project setup command.
 * Generates only:
 *   1. contlify.config.ts (project root)
 *   2. Framework-specific thin gateway route
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

  // Step 2: Select database
  const dbType = await select("  Which database are you using?", DB_CHOICES);

  // Step 2b: If postgres or mongodb, ask deployment target
  let postgresDeployment: PostgresDeployment = "cloudflare";
  if (dbType === "postgres") {
    log("");
    info("  🌐 Where is your project hosted / deployed?");
    postgresDeployment = await select("  Deployment target", POSTGRES_HOSTING_CHOICES);
  } else if (dbType === "mongodb") {
    log("");
    info("  🌐 Where is your project hosted / deployed?");
    postgresDeployment = await select("  Deployment target", MONGO_HOSTING_CHOICES);
  }

  // Step 3: Database setup wizard
  let migrationMode: V2MigrationMode = "sql";
  if (dbType === "supabase") {
    info("  ℹ️  Supabase uses schema.sql (one-time copy & paste into the Supabase SQL Editor).");
    migrationMode = "sql";
  } else if (dbType === "postgres" || dbType === "d1") {
    log("");
    info("  🗄️  How would you like to set up the Contlify database schema?");
    migrationMode = await select("  Database setup", MIGRATION_CHOICES);
  } else {
    migrationMode = "skip";
  }

  // Step 4: Confirm scaffold
  log("");
  info(`  ℹ️  The following files will be generated in your ${framework} project:`);
  const dbLabel = DB_CHOICES.find(c => c.value === dbType)?.label ?? dbType;
  log(`     ${dim("contlify.config.ts")} — Contlify declarative configuration (${dbLabel})`);
  if (dbType === "supabase" || migrationMode === "sql") {
    log(`     ${dim("schema.sql")} — Database tables schema`);
  }

  if (framework === "nextjs") {
    log(`     ${dim("app/api/contlify/v1/[...path]/route.ts")} — Next.js App Router gateway`);
  } else if (framework === "astro") {
    log(`     ${dim("src/pages/api/contlify/v1/[...path].ts")} — Astro API endpoint gateway`);
  } else if (framework === "react-router") {
    log(`     ${dim("app/routes/api.contlify.$.ts")} — React Router v7 gateway`);
  } else if (framework === "angular") {
    log(`     ${dim("server.contlify.ts")} — Angular SSR Express gateway`);
  }
  log("");

  const shouldProceed = await confirm("  Proceed with setup?", true);
  if (!shouldProceed) {
    warn("  ⚠️  Setup cancelled.");
    return;
  }

  // Step 5: Install the required database driver
  const dbPkg = getDbPackage(dbType, postgresDeployment, framework);
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

  // Step 6: Scaffold files (v2 minimal: config + route only)
  log("");
  let overwrite = flags.overwrite ?? false;
  const configPath = path.join(projectRoot, "contlify.config.ts");
  if (!overwrite && fs.existsSync(configPath)) {
    overwrite = await confirm("  ⚠️  contlify.config.ts already exists. Overwrite with new configuration?", false);
  }

  info("  📁 Scaffolding files...");

  const results = scaffoldProjectV2({
    projectRoot,
    overwrite,
    framework,
    dbType,
    migrationMode,
    postgresDeployment,
  });

  for (const result of results) {
    switch (result.status) {
      case "created":
        log(`  ✅ Created ${result.relativePath}`);
        break;
      case "skipped":
        log(`  ⏭️  Skipped ${result.relativePath} (already exists — use --overwrite to replace)`);
        break;
      case "error":
        log(`  ❌ Error   ${result.relativePath}: ${result.message}`);
        break;
    }
  }

  // Step 7: Framework-specific patches
  if (framework === "nextjs" && dbType === "mongodb") {
    patchNextConfig(projectRoot, "mongodb");
    success("  ✅ next.config.mjs patched with serverExternalPackages.");
  }

  if (framework === "react-router") {
    const patched = patchReactRouterRoutes(projectRoot);
    if (patched) {
      success("  ✅ app/routes.ts registered with Contlify API route.");
    }
  }

  if (framework === "angular") {
    const patchedServer = patchAngularServer(projectRoot);
    if (patchedServer) {
      success("  ✅ Angular server.ts registered with Contlify Express middleware.");
    }
    const patchedJson = patchAngularJson(projectRoot);
    if (patchedJson) {
      success("  ✅ angular.json patched with externalDependencies for database drivers.");
    }
  }

  // Step 8: Handle migration mode
  log("");
  if (migrationMode === "auto") {
    info("  🚀 Auto-migration enabled.");
    log(`  ${dim("contlify.config.ts includes autoMigrate: true")}`);
    warn("  ⚠️  Note: Runtime auto-migration will provision tables on startup once configured.");
    warn("     For manual execution, run: npx contlify migrate");
  } else if (migrationMode === "sql") {
    if (dbType !== "mongodb") {
      info("  📄 Generating schema.sql...");
      const sqlContent = getMigrationSql(dbType);
      const sqlFileName = "schema.sql";
      const sqlFilePath = path.join(projectRoot, sqlFileName);
      fs.writeFileSync(sqlFilePath, sqlContent, "utf-8");
      success(`  ✅ Schema file written: ${sqlFileName}`);
      log("");
      info("  📌 Apply the schema to your database:");
      log(getMigrationInstructions(dbType, sqlFilePath));
    } else {
      info("  ℹ️  MongoDB collections auto-initialize on first insert. No schema needed.");
    }
  } else {
    info("  Database setup skipped.");
    log(`  ${dim("You can run:  npx contlify migrate  at any time to set up the database.")}`);
  }

  // Step 9: Show env snippet
  log("");
  info("  🔑 Add these to your .env.local:");
  log("");
  log(buildEnvSnippet(dbType, postgresDeployment).split("\n").map(l => `  ${dim(l)}`).join("\n"));

  // Done!
  log("");
  success("  ✅ Contlify setup complete!");
  log("");
  const devCmd = framework === "angular" ? "npm start" : "npm run dev";
  log(bold("  Next steps:"));
  if (dbType === "supabase") {
    log("  1. Open Supabase Dashboard → SQL Editor → New query");
    log("  2. Paste and run schema.sql to create tables");
    log("  3. Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env.local");
    log(`  4. Run: ${devCmd}`);
  } else if (dbType === "mongodb") {
    if (postgresDeployment === "cloudflare") {
      log("  1. Add your Standard (non-SRV) MongoDB URI to secrets / .env.local:");
      log(`  ${dim("   MONGODB_URI=mongodb://user:password@host1:27017,host2:27017/?replicaSet=atlas-...")}`);
      log(`  ${dim("   MONGODB_DB_NAME=contlify")}`);
      log(`  ${dim("   CONTLIFY_API_KEY=your_secret_api_key")}`);
      log("");
      warn("  ⚠️  Important for Cloudflare Workers:");
      log(`  ${dim("   → Cloudflare Workers cannot resolve mongodb+srv:// DNS SRV records.")}`);
      log(`  ${dim("   → Use the Standard connection string from MongoDB Atlas:")}`);
      log(`  ${dim("     Atlas → Connect → Drivers → toggle 'Standard connection string'")}`);
      log(`  ${dim("   → Run: npx wrangler secret put MONGODB_URI")}`);
      log("");
      log("  2. Collections are created automatically on first insert — no schema needed.");
      log(`  3. Run: ${devCmd}`);
    } else {
      log("  1. Add your MongoDB URI to .env.local:");
      log(`  ${dim("   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net")}`);
      log(`  ${dim("   MONGODB_DB_NAME=contlify")}`);
      log(`  ${dim("   CONTLIFY_API_KEY=your_secret_api_key")}`);
      log("");
      log("  2. Collections are created automatically on first insert — no schema needed.");
      log(`  3. Run: ${devCmd}`);
    }
  } else if (migrationMode !== "auto") {
    log("  1. Apply the schema to your database");
    log("  2. Add env variables to .env.local");
    log(`  3. Run: ${devCmd}`);
  } else {
    log("  1. Add env variables to .env.local");
    log(`  2. Run: ${devCmd} (tables are created automatically on cold start!)`);
  }
  log("");
  log(bold("  How to use Contlify in your pages:"));
  log(`  ${dim('import { getAllPosts, getPostBySlug, getCategories } from "contlify";')}`);
  log("");
  log(dim("  Docs: https://github.com/SectemTechnologies/contlify-js#readme"));
  log("");
}
