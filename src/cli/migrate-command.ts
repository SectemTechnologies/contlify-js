import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { getMigrationSql, type SupportedDatabaseType } from "../migrations/index.js";
import { select, confirm, prompt } from "./prompts.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
};

function info(msg: string) { console.log(`${COLORS.cyan}${msg}${COLORS.reset}`); }
function success(msg: string) { console.log(`${COLORS.green}${msg}${COLORS.reset}`); }
function warn(msg: string) { console.log(`${COLORS.yellow}${msg}${COLORS.reset}`); }
function bold(msg: string) { return `${COLORS.bold}${msg}${COLORS.reset}`; }
function dim(msg: string) { return `${COLORS.dim}${msg}${COLORS.reset}`; }

const DB_CHOICES: { label: string; value: SupportedDatabaseType }[] = [
  { label: "PostgreSQL (pg / Neon / Railway / Vercel Postgres)", value: "postgres" },
  { label: "Supabase",                                            value: "supabase" },
  { label: "Cloudflare D1 (SQLite)",                             value: "d1"       },
  { label: "MongoDB",                                            value: "mongodb"  },
];

type MigrateOutputMode = "direct-execute" | "sql-file" | "auto-migrate" | "print" | "cancel";

const OUTPUT_CHOICES: { label: string; value: MigrateOutputMode }[] = [
  { label: "⚡  Apply directly to database now (Auto-execute via connection string / psql)", value: "direct-execute" },
  { label: "📄  Generate schema.sql file and show apply instructions", value: "sql-file" },
  { label: "🚀  Enable automatic migration in contlify.config.ts",     value: "auto-migrate" },
  { label: "🖨️   Print schema to console only",                        value: "print"    },
  { label: "❌  Cancel",                                                value: "cancel"   },
];

/**
 * Scans process.env and .env files for a database URL.
 */
function findDatabaseUrl(projectRoot: string): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DATABASE_URL) return process.env.SUPABASE_DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith("postgres")) return process.env.SUPABASE_URL;

  const envFiles = [".env.local", ".env.development", ".env", ".env.production"];
  for (const file of envFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^(?:DATABASE_URL|SUPABASE_DATABASE_URL|SUPABASE_DB_URL)\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) return match[1].trim();
      const matchSub = content.match(/^SUPABASE_URL\s*=\s*["']?(postgresql:\/\/[^"'\r\n]+)["']?/m);
      if (matchSub && matchSub[1]) return matchSub[1].trim();
    }
  }
  return null;
}

async function executeMigrationDirectly(projectRoot: string, dbType: SupportedDatabaseType, sql: string): Promise<boolean> {
  if (dbType === "d1") {
    info("  ☁️  Detecting Cloudflare D1 database configuration...");
    let d1Name = "DB";
    const wranglerPaths = [
      path.join(projectRoot, "wrangler.jsonc"),
      path.join(projectRoot, "wrangler.json"),
      path.join(projectRoot, "wrangler.toml"),
    ];
    const wranglerPath = wranglerPaths.find((p) => fs.existsSync(p));
    if (wranglerPath) {
      const content = fs.readFileSync(wranglerPath, "utf-8");
      const match = content.match(/database_name\s*["']?:\s*["']([^"']+)["']/) || content.match(/database_name\s*=\s*["']([^"']+)["']/);
      if (match && match[1]) {
        d1Name = match[1];
      }
    }
    const tempSqlPath = path.join(projectRoot, "schema.sql");
    fs.writeFileSync(tempSqlPath, sql, "utf-8");
    try {
      info(`  🔄 Executing: npx wrangler d1 execute ${d1Name} --file=schema.sql --remote`);
      execSync(`npx wrangler d1 execute ${d1Name} --file=schema.sql --remote`, { cwd: projectRoot, stdio: "inherit" });
      success("  🎉 Cloudflare D1 migration applied successfully!");
      return true;
    } catch (e: any) {
      warn(`  ⚠️  Wrangler D1 execution failed: ${e.message}`);
      return false;
    }
  }

  // PostgreSQL / Supabase
  let dbUrl = findDatabaseUrl(projectRoot);
  if (!dbUrl) {
    warn("  ⚠️  No DATABASE_URL found in environment or .env.local.");
    const inputUrl = await prompt("  🔑 Enter your database connection URI (postgresql://...): ");
    if (!inputUrl) {
      warn("  ⚠️  No connection URL provided. Migration aborted.");
      return false;
    }
    dbUrl = inputUrl.trim();
  }

  info(`  🔄 Connecting to database...`);
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function("m", "return import(m);");

    // Check if Neon
    if (dbUrl.includes("neon.tech")) {
      try {
        const neonMod = await dynamicImport("@neondatabase/serverless");
        const neon = neonMod.neon ?? neonMod.default?.neon;
        if (typeof neon === "function") {
          const sqlClient = neon(dbUrl);
          await sqlClient(sql);
          success("  ✅ Connected successfully via Neon HTTP!");
          success("  🎉 Migration applied successfully! All tables created.");
          return true;
        }
      } catch {}
    }

    // Try pg
    try {
      const pgMod = await dynamicImport("pg");
      const Pool = pgMod.Pool ?? pgMod.default?.Pool;
      if (Pool) {
        const pool = new Pool({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false },
        });
        await pool.query(sql);
        await pool.end();
        success("  ✅ Connected to PostgreSQL database successfully!");
        success("  🎉 Migration applied successfully! All tables created.");
        return true;
      }
    } catch {}

    // Fallback: try psql CLI
    try {
      const tempSqlPath = path.join(projectRoot, ".contlify-temp-schema.sql");
      fs.writeFileSync(tempSqlPath, sql, "utf-8");
      try {
        execSync(`psql "${dbUrl}" -f "${tempSqlPath}"`, { cwd: projectRoot, stdio: "inherit" });
        success("  ✅ Connected via psql CLI!");
        success("  🎉 Migration applied successfully! All tables created.");
        return true;
      } finally {
        if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
      }
    } catch {}

    warn("  ⚠️  Could not find a PostgreSQL client library ('pg') or 'psql' CLI in PATH.");
    info(`  💡 You can apply the schema with:\n     psql "${dbUrl}" -f schema.sql`);
    return false;
  } catch (err: any) {
    warn(`  ❌ Migration error: ${err.message}`);
    return false;
  }
}

/**
 * Attempts to extract database driver and config path from contlify.config.ts.
 */
function detectDriverFromConfig(projectRoot: string): {
  driver: SupportedDatabaseType | null;
  configPath: string | null;
  hasAutoMigrate: boolean;
} {
  const configPaths = [
    path.join(projectRoot, "contlify.config.ts"),
    path.join(projectRoot, "contlify.config.js"),
    path.join(projectRoot, "contlify.config.mjs"),
  ];

  const configPath = configPaths.find((p) => fs.existsSync(p));
  if (!configPath) return { driver: null, configPath: null, hasAutoMigrate: false };

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const match = content.match(/driver\s*:\s*["'](\w+)["']/);
    const hasAutoMigrate = /autoMigrate\s*:\s*true/.test(content);
    if (!match) return { driver: null, configPath, hasAutoMigrate };

    const raw = match[1];
    if (raw === "postgres" || raw === "supabase" || raw === "d1" || raw === "mongodb") {
      return { driver: raw as SupportedDatabaseType, configPath, hasAutoMigrate };
    }
    return { driver: null, configPath, hasAutoMigrate };
  } catch {
    return { driver: null, configPath: null, hasAutoMigrate: false };
  }
}

function enableAutoMigrateInConfigFile(configPath: string): boolean {
  try {
    let content = fs.readFileSync(configPath, "utf-8");
    if (content.includes("autoMigrate: true")) {
      return true;
    }
    if (content.includes("autoMigrate: false")) {
      content = content.replace(/autoMigrate\s*:\s*false/, "autoMigrate: true");
    } else {
      const lastClose = content.lastIndexOf("});");
      if (lastClose !== -1) {
        content = content.slice(0, lastClose) + "  autoMigrate: true,\n" + content.slice(lastClose);
      } else {
        const lastBrace = content.lastIndexOf("}");
        if (lastBrace !== -1) {
          content = content.slice(0, lastBrace) + "  autoMigrate: true,\n" + content.slice(lastBrace);
        }
      }
    }
    fs.writeFileSync(configPath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function getMigrationInstructions(dbType: SupportedDatabaseType, sqlFilePath: string): string {
  switch (dbType) {
    case "postgres":
    case "supabase":
      return `  psql "$DATABASE_URL" -f ${sqlFilePath}`;
    case "d1":
      return `  npx wrangler d1 execute <database_name> --file=${sqlFilePath}`;
    case "mongodb":
      return "";
  }
}

/**
 * `contlify migrate` — generates and optionally applies the migration SQL or configures autoMigrate.
 *
 * Derives the database driver directly from contlify.config.ts if present,
 * otherwise falls back to interactive database selection.
 */
export async function runMigrate(projectRoot: string): Promise<void> {
  console.log("");
  console.log(bold("  🗄️  Contlify Database Migration"));
  console.log(dim("  ──────────────────────────────────────────────"));
  console.log("");

  // Step 1: Detect driver from contlify.config.ts
  let dbType: SupportedDatabaseType;
  const { driver: detectedDriver, configPath } = detectDriverFromConfig(projectRoot);

  if (detectedDriver) {
    const label = DB_CHOICES.find((c) => c.value === detectedDriver)?.label ?? detectedDriver;
    info(`  🔍 Detected database from contlify.config.ts: ${label}`);
    dbType = detectedDriver;
  } else {
    dbType = await select("  Which database are you migrating?", DB_CHOICES);
  }

  // Step 2: MongoDB has no schema migrations
  if (dbType === "mongodb") {
    success("  ✅ MongoDB collections auto-initialize on first document insertion. No migration needed!");
    console.log("");
    return;
  }

  const sql = getMigrationSql(dbType);
  const fileName = "schema.sql";
  const filePath = path.join(projectRoot, fileName);

  // Step 3: Choose action mode
  console.log("");
  const outputMode = await select("  How would you like to set up the database?", OUTPUT_CHOICES);

  if (outputMode === "cancel") {
    warn("  ⚠️  Migration cancelled.");
    console.log("");
    return;
  }

  if (outputMode === "direct-execute") {
    console.log("");
    await executeMigrationDirectly(projectRoot, dbType, sql);
    console.log("");
    return;
  }

  if (outputMode === "auto-migrate") {
    console.log("");
    if (configPath && fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      if (content.includes('driver: "supabase"') && (content.includes("createClient(") || content.includes("@supabase/supabase-js"))) {
        warn("  ⚠️  Notice: The Supabase JS SDK (@supabase/supabase-js) communicates via PostgREST HTTP, which does not support creating tables automatically.");
        info("  💡 To enable autoMigrate for Supabase, connect via direct PostgreSQL DATABASE_URL or apply schema.sql in the Supabase SQL Editor.");
      }
      const ok = enableAutoMigrateInConfigFile(configPath);
      if (ok) {
        success(`  ✅ Updated ${path.basename(configPath)}: set autoMigrate: true`);
        warn("  ⚠️  Note: Runtime schema provisioning will run on application startup.");
      } else {
        warn(`  ⚠️  Could not update ${path.basename(configPath)}. Please add 'autoMigrate: true' manually.`);
      }
    } else {
      warn("  ⚠️  contlify.config.ts not found. Please run 'npx contlify init' first.");
    }
    console.log("");
    return;
  }

  if (outputMode === "print") {
    console.log("");
    info("  📄 Schema SQL:");
    console.log(dim("  ─────────────────────────────────────────"));
    for (const line of sql.split("\n")) {
      console.log(`  ${dim(line)}`);
    }
    console.log(dim("  ─────────────────────────────────────────"));
    console.log("");
    success("  Done! Copy and apply the SQL above to your database.");
    console.log("");
    return;
  }

  // Step 4: sql-file mode
  if (fs.existsSync(filePath)) {
    const overwrite = await confirm(`  ${fileName} already exists. Overwrite?`, false);
    if (!overwrite) {
      warn("  ⚠️  Migration file not overwritten.");
      console.log("");
      return;
    }
  }

  fs.writeFileSync(filePath, sql, "utf-8");
  success(`  ✅ Schema file written: ${fileName}`);
  console.log("");
  info("  📌 Apply the migration:");
  console.log(`  ${dim(getMigrationInstructions(dbType, fileName))}`);
  console.log("");
  success("  Done! Run the command above to create the tables in your database.");
  console.log("");
}
