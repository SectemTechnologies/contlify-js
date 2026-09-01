# 🛠️ Contlify Error Architecture & Troubleshooting Guide

> [!NOTE]
> **Contribute to this Guide**: If you encounter any new error, edge case, or deployment nuance not covered in this guide, please add your findings, root cause analysis, and resolution steps to this file or submit a pull request to help future developers resolve them quickly!

This document provides a complete catalog of standardized error responses returned by `contlify` middleware and in-depth troubleshooting recipes for all supported database drivers and serverless/edge frameworks.

---

## 1. Standardized Error Payload Format

All failed operations in Contlify return a consistent, predictable JSON response structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of error",
    "details": []
  },
  "meta": {
    "timestamp": "2026-09-01T00:00:00.000Z"
  }
}
```

---

## 2. HTTP Error Codes & Resolution Catalog

### 🔒 `UNAUTHORIZED` (HTTP 401)
- **Description**: Authentication failed because the API key header was missing, invalid, or did not match the configured `apiKey`.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing API key in request headers (X-Contlify-Key required)"
    }
  }
  ```
- **How to Fix**:
  1. Add one of the accepted authentication headers to your request:
     - `X-Contlify-Key: your_secret_api_key` *(Preferred v2 header)*
     - `x-api-key: your_secret_api_key`
     - `Authorization: Bearer your_secret_api_key`
     - `X-Truecmo-Key: your_secret_api_key` *(Legacy v1 header)*
  2. Verify that `CONTLIFY_API_KEY` is set in your `.env.local` or Cloudflare Worker secrets (`npx wrangler secret put CONTLIFY_API_KEY`).
  3. Ensure your `contlify.config.ts` passes `apiKey: process.env.CONTLIFY_API_KEY`.

---

### ⚠️ `VALIDATION_ERROR` (HTTP 400)
- **Description**: The incoming JSON request body is missing required fields (`title`, `content`, `status`) or contains invalid data types.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Payload validation failed",
      "details": [
        { "field": "title", "message": "Field 'title' is required and must be a non-empty string" },
        { "field": "status", "message": "Invalid status 'drafted'. Allowed values: draft, published, archived, scheduled" }
      ]
    }
  }
  ```
- **How to Fix**:
  1. Ensure `title` is a non-empty string.
  2. Ensure `content` contains article HTML or Markdown.
  3. Ensure `status` is one of: `"draft"`, `"published"`, `"archived"`, or `"scheduled"`.
  4. Refer to the [API Reference](./api-reference.md) for the complete JSON schema.

---

### 🔍 `NOT_FOUND` (HTTP 404)
- **Description**: The requested endpoint route does not exist or the target blog post / category was not found in the database.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Post not found with ID or slug: non-existent-post"
    }
  }
  ```
- **How to Fix**:
  1. For API endpoints, verify that your request URL includes the `/api/contlify/v1/` prefix (e.g. `POST /api/contlify/v1/posts`).
  2. When updating or fetching posts via `GET /posts/:id` or `PATCH /posts/:id`, verify that the post exists in the database and has not been deleted.
  3. Check if the post is in `"draft"` status—public read endpoints filter drafts by default.

---

### 🚫 `METHOD_NOT_ALLOWED` (HTTP 405)
- **Description**: The path exists but the requested HTTP verb is not registered on that endpoint (e.g. sending `DELETE` to `/api/contlify/v1/validate`).
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "METHOD_NOT_ALLOWED",
      "message": "Method DELETE not allowed for path /api/contlify/v1/validate"
    }
  }
  ```
- **How to Fix**:
  - Use the supported HTTP methods:
    - `/posts`: `POST` (create)
    - `/posts/:id`: `GET` (read), `PATCH` (partial update), `PUT` (full update)
    - `/categories`: `GET` (read)
    - `/categories/:id`: `PATCH` (update), `PUT` (update)
    - `/tags`: `GET` (read)
    - `/authors`: `GET` (read)
    - `/validate` & `/health`: `GET` (health check)

---

### 🗄️ `ADAPTER_ERROR` (HTTP 500)
- **Description**: Database execution failed, connection timed out, or storage adapter is misconfigured.
- **Payload Example (Client Response)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ADAPTER_ERROR",
      "message": "A database or internal adapter error occurred while processing the request."
    }
  }
  ```
- **How to Fix**: Check server logs for the specific database error and consult the recipes below.

---

## 3. Database-Specific Troubleshooting Recipes

### 🍃 MongoDB Troubleshooting

#### 1. Cloudflare Workers Error 1101 (`Worker threw exception` / `Worker's code had hung`)
- **Root Cause**: `mongodb+srv://` connection strings require DNS `SRV` and `TXT` record lookups over UDP. Cloudflare Workers' `workerd` runtime does not support standard UDP DNS SRV queries, causing the driver connection attempt to hang indefinitely.
- **Fix**:
  1. Open MongoDB Atlas → **Connect** → **Drivers**.
  2. Toggle **"Standard connection string"** (non-SRV format).
  3. Copy the standard connection string format:
     ```env
     MONGODB_URI=mongodb://user:password@host1:27017,host2:27017,host3:27017/?replicaSet=atlas-xxx&ssl=true&authSource=admin
     ```
  4. In `contlify.config.ts`, set `deployment: "cloudflare"`.

#### 2. `querySrv ECONNREFUSED`
- **Root Cause**: A local firewall, VPN, ISP, or corporate proxy is blocking DNS SRV queries on port 53.
- **Fix**: Switch from `mongodb+srv://` to the standard `mongodb://` connection string format.

#### 3. `Topology is closed`
- **Root Cause**: Serverless/edge isolates terminate TCP sockets when idling. Reusing a stale client instance causes the MongoDB Node driver to reject queries with `Topology is closed`.
- **Fix**: Contlify's built-in MongoDB storage driver automatically performs a lightweight `{ ping: 1 }` probe before reusing cached client connections, auto-reconnecting fresh if the edge isolate severed the socket.

#### 4. MongoDB Atlas IP Access List (`MongoServerSelectionError`)
- **Root Cause**: Serverless functions and Cloudflare Workers have dynamic IP addresses that change on every request.
- **Fix**: In MongoDB Atlas, navigate to **Network Access** → **Add IP Address** → choose **Allow Access from Anywhere** (`0.0.0.0/0`).

---

### 🐘 PostgreSQL & Neon Troubleshooting

#### 1. `Connection pool exhausted` / `Too many connections`
- **Root Cause**: Serverless environments spinning up dozens of concurrent lambdas can exhaust traditional PostgreSQL connection limits.
- **Fix for Cloudflare / Serverless**: Use Neon's serverless HTTP driver `@neondatabase/serverless`. Because it communicates over stateless HTTPS fetch requests, it creates 0 persistent TCP connections.
  ```typescript
  import { neon } from "@neondatabase/serverless";
  import { defineConfig } from "contlify";

  const sql = neon(process.env.DATABASE_URL!);
  export default defineConfig({
    apiKey: process.env.CONTLIFY_API_KEY,
    storage: {
      driver: "postgres",
      client: {
        query: async (queryStr, params) => ({ rows: await sql.query(queryStr, params ?? []) })
      }
    }
  });
  ```

#### 2. `self-signed certificate in certificate chain` (SSL Errors)
- **Root Cause**: PostgreSQL cloud providers (Heroku, Render, AWS RDS) require SSL with `rejectUnauthorized: false`.
- **Fix**:
  ```typescript
  import { Pool } from "pg";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  ```

---

### ⚡ Cloudflare D1 Troubleshooting

#### 1. `D1 Database binding not found in request context`
- **Root Cause**: D1 database binding `DB` is missing from `wrangler.jsonc` or `wrangler.toml`.
- **Fix**:
  1. Add the D1 binding to `wrangler.jsonc`:
     ```json
     {
       "d1_databases": [
         {
           "binding": "DB",
           "database_name": "contlify",
           "database_id": "your-d1-database-id"
         }
       ]
     }
     ```
  2. For Next.js OpenNext, verify `@opennextjs/cloudflare` is installed and `getCloudflareContext()` is used in `dbProvider`.

#### 2. `no such table: contlify_posts`
- **Root Cause**: D1 database schema has not been applied.
- **Fix**:
  ```bash
  npx wrangler d1 execute contlify --file=schema.sql --remote
  # Or for local development:
  npx wrangler d1 execute contlify --file=schema.sql --local
  ```

---

### ⚡ Supabase Troubleshooting

#### 1. `relation "contlify_posts" does not exist` (PostgREST Error `42P01` / `PGRST204`)
- **Root Cause**: Supabase's PostgREST API only queries existing tables and cannot automatically execute DDL `CREATE TABLE` migrations at runtime.
- **Fix**:
  1. Run `npx contlify migrate` to generate `schema.sql`.
  2. Open the **Supabase Dashboard** → **SQL Editor** → **New Query**.
  3. Paste the contents of `schema.sql` and click **Run**.

#### 2. `new row violates row-level security policy`
- **Root Cause**: The Supabase client was initialized with the public `anonKey` instead of the backend `serviceRoleKey`.
- **Fix**: For publishing and backend updates, supply `SUPABASE_SECRET_KEY` (service role key) in `.env.local`.

---

## 4. Framework-Specific Troubleshooting

### 🅰️ Angular SSR Troubleshooting

#### 1. `Error: Cannot find module 'mongodb'` / `pg` during Angular SSR build
- **Root Cause**: Angular CLI's esbuild bundler attempts to bundle Node.js CJS binary packages.
- **Fix**: Add the drivers to `externalDependencies` in `angular.json`:
  ```json
  "architect": {
    "build": {
      "options": {
        "externalDependencies": [
          "mongodb",
          "pg",
          "@neondatabase/serverless",
          "@supabase/supabase-js",
          "dotenv"
        ]
      }
    }
  }
  ```

#### 2. `NG0100: ExpressionChangedAfterItHasBeenCheckedError` on Blog Pages
- **Root Cause**: Fetching blog posts in client-side lifecycle hooks without proper SSR hydration transfer.
- **Fix**: Use Angular's `HttpClient` with `provideClientHydration()` or fetch during server rendering in `server.contlify.ts`.

---

### ▲ Next.js Troubleshooting

#### 1. `Module not found: Can't resolve 'mongodb'` in Next.js 14 / 15
- **Root Cause**: Next.js App Router webpack bundler tries to process database drivers on client-side compilation passes.
- **Fix**: Add `serverExternalPackages` to `next.config.ts`:
  ```typescript
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    serverExternalPackages: ["mongodb", "pg", "@neondatabase/serverless"],
  };

  export default nextConfig;
  ```

---

### 🚀 Astro Troubleshooting

#### 1. `Astro SSR 500: Missing runtime environment variables on Cloudflare`
- **Root Cause**: Astro SSR on Cloudflare Pages / Workers exposes environment bindings on `context.locals.runtime.env` rather than `process.env`.
- **Fix**: Contlify's Astro gateway route template automatically bridges `context.locals.runtime.env` to global scope:
  ```typescript
  export const ALL: APIRoute = async (context) => {
    const runtimeEnv = (context.locals as any)?.runtime?.env;
    if (runtimeEnv) {
      Object.assign(globalThis, runtimeEnv);
    }
    return handler(context.request);
  };
  ```
