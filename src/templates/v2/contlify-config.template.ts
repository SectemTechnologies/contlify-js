/**
 * v2 template: contlify.config.ts
 * Generated at project root by `npx contlify init`.
 *
 * Each driver uses its native Contlify config key, keeping driver semantics intact
 * so `npx contlify migrate` can auto-detect the database type.
 *
 *   postgres/node       → driver: "postgres", client: pg Pool
 *   postgres/cloudflare → driver: "postgres", client: neon() HTTP (stateless, no cross-request I/O)
 *   supabase/postgres   → driver: "postgres", client: pg Pool / neon() (direct connection with auto-migration)
 *   supabase/client     → driver: "supabase", client: supabase JS client (HTTP API via schema.sql)
 *   d1                  → driver: "d1",       dbProvider: async lazy getter
 *   mongodb             → driver: "mongodb",  dbProvider: async lazy getter with build-time skip
 */

import type { SupportedDatabaseType } from "../../migrations/index.js";
import type { ContlifyFramework } from "../framework.js";

export type V2MigrationMode = "auto" | "sql" | "skip";

/**
 * Where the PostgreSQL / direct connection project is deployed.
 * Determines which adapter is generated:
 *   - "node"       → standard `pg` Pool (Node.js, Vercel, Railway, Render, Docker)
 *   - "cloudflare" → Neon HTTP driver via `neon()` (Cloudflare Workers / OpenNext)
 */
export type PostgresDeployment = "node" | "cloudflare";

/**
 * How to connect to Supabase:
 *   - "postgres" → Direct PostgreSQL connection URI via DATABASE_URL (supports autoMigrate: true)
 *   - "client"   → Supabase JS SDK via SUPABASE_URL + SUPABASE_SECRET_KEY (HTTP API via schema.sql)
 */
export type SupabaseConnectionMode = "postgres" | "client";

function getImportBlock(
  dbType: SupportedDatabaseType,
  postgresDeployment?: PostgresDeployment
): string {
  switch (dbType) {
    case "postgres":
      if (postgresDeployment === "cloudflare") {
        return `import { neon } from "@neondatabase/serverless";
import { defineConfig } from "contlify";`;
      }
      return `import { Pool } from "pg";
import { defineConfig } from "contlify";`;
    case "supabase":
      return `import { createClient } from "@supabase/supabase-js";
import { defineConfig } from "contlify";`;
    case "d1":
      return `import { defineConfig } from "contlify";`;
    case "mongodb":
      return `import { defineConfig } from "contlify";`;
  }
}

function getClientBlock(
  dbType: SupportedDatabaseType,
  postgresDeployment?: PostgresDeployment
): string {
  switch (dbType) {
    case "postgres":
      if (postgresDeployment === "cloudflare") {
        return `
// neon() uses Neon's serverless HTTP API — one HTTP call per query, fully stateless.
// Unlike WebSocket pools, it never caches connections across requests, so Cloudflare's
// per-request I/O isolation is never violated (no Error 1101, no cross-request errors).
const _sql = neon(process.env["DATABASE_URL"]!);

const neonHttpClient = {
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }> {
    const rows = await _sql.query(sql, params ?? []);
    return { rows: rows as unknown as T[] };
  },
};
`;
      }
      return `
// Standard pg Pool — works on Node.js, Vercel, Railway, Render, and Docker.
// Do NOT use this on Cloudflare Workers; use the Cloudflare deployment option instead.
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
`;
    case "supabase":
      return `
// Lazy Supabase client factory — safely handles Next.js build time when secrets are not yet defined.
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SECRET_KEY"];
  if (!url || !key) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key);
  }
  return _supabaseClient;
}
`;
    case "d1":
      return "";
    case "mongodb":
      return "";
  }
}

function getStorageBlock(
  dbType: SupportedDatabaseType,
  postgresDeployment?: PostgresDeployment,
  framework?: ContlifyFramework
): string {
  switch (dbType) {
    case "postgres":
      if (postgresDeployment === "cloudflare") {
        return `  storage: {
    driver: "postgres",
    client: neonHttpClient,
  },`;
      }
      return `  storage: {
    driver: "postgres",
    client: pool,
  },`;

    case "supabase":
      return `  storage: {
    driver: "supabase",
    // Lazily resolves the Supabase client per-request, preventing build-time evaluation errors.
    client: getSupabaseClient,
  },`;

    case "d1":
      if (framework === "nextjs") {
        return `  storage: {
    driver: "d1",
    // Lazily resolves the Cloudflare D1 binding per-request via OpenNext context.
    // Prevents top-level socket errors (Cloudflare Error 1101).
    dbProvider: async () => {
      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const ctx = await getCloudflareContext();
        return ctx?.env as any;
      } catch {
        return (globalThis as any).DB ?? null;
      }
    },
  },`;
      }
      return `  storage: {
    driver: "d1",
    // Lazily resolves the Cloudflare D1 database binding from the runtime environment.
    dbProvider: async () => {
      return (globalThis as any).DB ?? (process.env as any)["DB"] ?? null;
    },
  },`;

    case "mongodb":
      if (postgresDeployment === "cloudflare") {
        return `  storage: {
    driver: "mongodb",
    uri: process.env["MONGODB_URI"],
    dbName: process.env["MONGODB_DB_NAME"] ?? "contlify",
    deployment: "cloudflare",
  },`;
      }
      return `  storage: {
    driver: "mongodb",
    uri: process.env["MONGODB_URI"],
    dbName: process.env["MONGODB_DB_NAME"] ?? "contlify",
  },`;
  }
}

function getAutoMigrateBlock(
  mode: V2MigrationMode,
  dbType?: SupportedDatabaseType
): string {
  if (dbType === "supabase" || dbType === "mongodb") {
    return "";
  }
  if (mode === "auto") {
    return `
  // autoMigrate: runs CREATE TABLE IF NOT EXISTS once on cold start, then skipped in-memory.
  autoMigrate: true,`;
  }
  return "";
}

function getEnvComment(
  dbType: SupportedDatabaseType,
  postgresDeployment: PostgresDeployment = "cloudflare"
): string {
  switch (dbType) {
    case "postgres":
      if (postgresDeployment === "cloudflare") {
        return `// Required environment variables (add to Cloudflare Worker secrets via wrangler):
// DATABASE_URL=postgresql://user:password@host/dbname  (Neon serverless URL recommended)
// CONTLIFY_API_KEY=your_secret_api_key
`;
      }
      return `// Required environment variables (add to .env.local):
// DATABASE_URL=postgresql://user:password@localhost:5432/mydb
// CONTLIFY_API_KEY=your_secret_api_key
`;
    case "supabase":
      return `// Note: Ensure your Supabase project URL & Secret Key are configured
//
// Required environment variables:
// SUPABASE_URL=https://your-project.supabase.co
// SUPABASE_SECRET_KEY=your_service_role_key
// CONTLIFY_API_KEY=your_secret_api_key
`;
    case "d1":
      return `// Required wrangler.toml binding:
// [[d1_databases]]
// binding = "DB"
// database_name = "contlify"
// database_id = "your-d1-database-id"
//
// Required environment variables:
// CONTLIFY_API_KEY=your_secret_api_key
`;
    case "mongodb":
      if (postgresDeployment === "cloudflare") {
        return `// Required environment variables (add secrets via wrangler for Cloudflare Workers):
//
// ⚠️  IMPORTANT FOR CLOUDFLARE WORKERS:
//    Use the Standard (non-SRV) connection string below. The mongodb+srv:// scheme relies
//    on DNS SRV queries that can cause Cloudflare Workers to hang (Error 1101).
//
//    Atlas → Connect → Drivers → toggle "Standard connection string"
//    MONGODB_URI=mongodb://user:password@host1:27017,host2:27017,host3:27017/?replicaSet=atlas-...&ssl=true&authSource=admin
//
// MONGODB_DB_NAME=contlify   (optional, defaults to "contlify")
// CONTLIFY_API_KEY=your_secret_api_key
`;
      }
      return `// Required environment variables:
//
// MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
// MONGODB_DB_NAME=contlify   (optional, defaults to "contlify")
// CONTLIFY_API_KEY=your_secret_api_key
`;

  }
}

/**
 * Returns the content of contlify.config.ts for the selected database driver, migration mode, and deployment target.
 * @param postgresDeployment - Only relevant when dbType is "postgres".
 *   "cloudflare" generates the Neon HTTP client (stateless, works on Cloudflare Workers).
 *   "node" generates a standard pg Pool (works on Node.js, Vercel, Railway, Render).
 */
export function getContlifyConfigTemplate(
  dbType: SupportedDatabaseType,
  migrationMode: V2MigrationMode = "skip",
  postgresDeployment: PostgresDeployment = "cloudflare",
  _supabaseMode?: SupabaseConnectionMode,
  framework?: ContlifyFramework
): string {
  const importBlock = getImportBlock(dbType, postgresDeployment);
  const clientBlock = getClientBlock(dbType, postgresDeployment);
  const storageBlock = getStorageBlock(dbType, postgresDeployment, framework);
  const autoMigrateBlock = getAutoMigrateBlock(migrationMode, dbType);
  const envComment = getEnvComment(dbType, postgresDeployment);

  return `${envComment}
${importBlock}
${clientBlock}
export default defineConfig({
  apiKey: process.env["CONTLIFY_API_KEY"],

${storageBlock}

  api: {
    path: "/api/contlify/v1",
  },

  postUrl: "/blog/{slug}",
${autoMigrateBlock}
});
`;
}
