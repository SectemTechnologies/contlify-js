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
  postgresDeployment?: PostgresDeployment,
  framework?: ContlifyFramework
): string {
  const isAstro = framework === "astro" || framework === "react-router";
  switch (dbType) {
    case "postgres":
      if (postgresDeployment === "cloudflare") {
        if (isAstro) {
          return `
// Lazy factory — only runs when a request arrives and secrets are available.
// Calling neon() at module load time causes Cloudflare Worker errors because
// secrets (DATABASE_URL) are not injected until the first request.
let _sql: any = null;
function getSql() {
  if (!_sql) {
    const url = process.env["DATABASE_URL"] || (globalThis as any).DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL secret is missing in Cloudflare Worker.");
    _sql = neon(url);
  }
  return _sql;
}

const neonHttpClient = {
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }> {
    const sqlClient = getSql();
    // Supports both sqlClient.query() and sqlClient(sql, params)
    const rows = typeof sqlClient.query === "function"
      ? await sqlClient.query(sql, params ?? [])
      : await sqlClient(sql, params ?? []);
    return { rows: rows as unknown as T[] };
  },
};
`;
        }
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
    const rows = typeof _sql.query === "function"
      ? await _sql.query(sql, params ?? [])
      : await _sql(sql, params ?? []);
    return { rows: rows as unknown as T[] };
  },
};
`;
      }
      const dbUrl = isAstro
        ? `process.env["DATABASE_URL"] || (import.meta as any).env?.DATABASE_URL`
        : `process.env["DATABASE_URL"]`;
      return `
// Standard pg Pool — works on Node.js, Vercel, Railway, Render, and Docker.
// Do NOT use this on Cloudflare Workers; use the Cloudflare deployment option instead.
const pool = new Pool({ connectionString: ${dbUrl} });
`;
    case "supabase":
      const url = isAstro
        ? `process.env["SUPABASE_URL"] || (import.meta as any).env?.SUPABASE_URL`
        : `process.env["SUPABASE_URL"]`;
      const key = isAstro
        ? `process.env["SUPABASE_SECRET_KEY"] || (import.meta as any).env?.SUPABASE_SECRET_KEY || process.env["SUPABASE_SERVICE_ROLE_KEY"] || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || process.env["SUPABASE_ANON_KEY"] || (import.meta as any).env?.SUPABASE_ANON_KEY`
        : `process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_ANON_KEY"]`;
      return `
// Lazy Supabase client factory — safely handles Next.js build time when secrets are not yet defined.
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  const url = ${url};
  const key = ${key};
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
  const isAstro = framework === "astro" || framework === "react-router";
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
    // Pass the full Cloudflare env object — createD1Adapter scans it automatically
    // so the D1 binding works regardless of what it is named in wrangler.jsonc.
    dbProvider: async () => {
      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const ctx = await getCloudflareContext();
        return ctx?.env as any;
      } catch {
        return (globalThis as any);
      }
    },
  },`;
      }
      if (isAstro) {
        return `  storage: {
    driver: "d1",
    // Pass the full runtime environment object — createD1Adapter scans all bindings
    // automatically, so it works regardless of the D1 binding name in wrangler.jsonc.
    dbProvider: async () => {
      return (globalThis as any);
    },
  },`;
      }
      return `  storage: {
    driver: "d1",
    // Pass the full runtime environment object — createD1Adapter scans all bindings
    // automatically, so it works regardless of the D1 binding name in wrangler.jsonc.
    dbProvider: async () => {
      return (globalThis as any);
    },
  },`;

    case "mongodb":
      const mongoUri = isAstro
        ? `process.env["MONGODB_URI"] || (import.meta as any).env?.MONGODB_URI`
        : `process.env["MONGODB_URI"]`;
      const mongoDbName = `process.env["MONGODB_DB_NAME"] ?? "contlify"`;

      if (postgresDeployment === "cloudflare" && !isAstro) {
        return `  storage: {
    driver: "mongodb",
    uri: ${mongoUri},
    dbName: ${mongoDbName},
    deployment: "cloudflare",
  },`;
      }
      return `  storage: {
    driver: "mongodb",
    uri: ${mongoUri},
    dbName: ${mongoDbName},
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
  const isAstro = framework === "astro" || framework === "react-router";
  const importBlock = getImportBlock(dbType, postgresDeployment);
  const clientBlock = getClientBlock(dbType, postgresDeployment, framework);
  const storageBlock = getStorageBlock(dbType, postgresDeployment, framework);
  const autoMigrateBlock = getAutoMigrateBlock(migrationMode, dbType);
  const envComment = getEnvComment(dbType, postgresDeployment);

  const envLoadBlock = isAstro
    ? `// Auto-load environment variables in Astro
try {
  // @ts-ignore
  process.loadEnvFile?.();
} catch {}
try {
  // @ts-ignore
  process.loadEnvFile?.(".env.local");
} catch {}

`
    : "";

  // For Astro on Cloudflare, use a getter so apiKey is read per-request after secrets are injected.
  // On Node-based Astro (and all non-Cloudflare deployments), a static read is fine.
  const isCloudflare = postgresDeployment === "cloudflare" || dbType === "d1";
  const apiKey = isAstro && isCloudflare
    ? `get apiKey() {
    return process.env["CONTLIFY_API_KEY"] || (globalThis as any).CONTLIFY_API_KEY || "";
  }`
    : isAstro
    ? `apiKey: process.env["CONTLIFY_API_KEY"] || (import.meta as any).env?.CONTLIFY_API_KEY`
    : `apiKey: process.env["CONTLIFY_API_KEY"]`;

  return `${envComment}
${envLoadBlock}${importBlock}
${clientBlock}
export default defineConfig({
  ${apiKey},

${storageBlock}

  api: {
    path: "/api/contlify/v1",
  },

  postUrl: "/blog/{slug}",
${autoMigrateBlock}
});
`;
}
