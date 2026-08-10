import * as fs from "node:fs";
import * as path from "node:path";
import { getMigrationSql, type SupportedDatabaseType } from "../migrations/index.js";
import { select, confirm } from "./prompts.js";

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

function getMigrationInstructions(dbType: SupportedDatabaseType, sqlFilePath: string): string {
  switch (dbType) {
    case "postgres":
      return `  psql $DATABASE_URL -f ${sqlFilePath}`;
    case "supabase":
      return `  Paste in Supabase SQL Editor: https://app.supabase.com → SQL Editor`;
    case "d1":
      return `  npx wrangler d1 execute <DB_NAME> --file=${sqlFilePath}`;
    case "mongodb":
      return "";
  }
}

/**
 * `contlify migrate` — generates and optionally applies the migration SQL for the chosen database.
 */
export async function runMigrate(projectRoot: string): Promise<void> {
  console.log("");
  console.log(bold("  🗄️  Contlify Database Migration"));
  console.log(dim("  ──────────────────────────────────────────────"));
  console.log("");

  const dbType = await select("  Which database are you migrating?", DB_CHOICES);

  if (dbType === "mongodb") {
    success("  ✅ MongoDB collections auto-initialize on first insert. No migration needed!");
    console.log("");
    return;
  }

  const sql = getMigrationSql(dbType);
  const fileName = `contlify-${dbType}.sql`;
  const filePath = path.join(projectRoot, fileName);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    const overwrite = await confirm(`  ${fileName} already exists. Overwrite?`, false);
    if (!overwrite) {
      warn("  ⚠️  Migration file not overwritten.");
      console.log("");
      return;
    }
  }

  fs.writeFileSync(filePath, sql, "utf-8");
  success(`  ✅ Migration file written: ${fileName}`);
  console.log("");
  info("  📌 Apply the migration:");
  console.log(`  ${dim(getMigrationInstructions(dbType, fileName))}`);
  console.log("");
  success("  Done! Run the command above to create the tables in your database.");
  console.log("");
}
