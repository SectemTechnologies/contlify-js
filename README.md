# contlify

> Standardized Blog Publishing Engine & Database Adapter API Framework for Next.js, Astro, and React Router.

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

`contlify` is a library-first publishing engine and database adapter framework. It enables publishing services (Postman, n8n, CMS dashboards, or custom backends) to publish, update, and manage blog posts on your website through standardized Web APIs, while providing zero-boilerplate read functions to query your content directly from server components and pages.

---

## 🌟 Key Highlights

- **Library-First Architecture**: Clean codebase with zero scaffolded boilerplate. All database adapters, liveness checks, and query utilities live inside the package.
- **Declarative `defineConfig()`**: Single configuration file (`contlify.config.ts`) with typed storage options for **PostgreSQL**, **Supabase**, **Cloudflare D1**, and **MongoDB**.
- **Interactive CLI Wizard (`npx contlify init`)**: Generates only `contlify.config.ts` and a thin gateway route for **Next.js (App Router)**, **Astro**, or **React Router v7**.
- **Package-Level Read Queries**: Query posts and taxonomies directly via `getAllPosts()`, `getPostBySlug()`, `getCategories()`, etc., with automatic configuration resolution.
- **Edge & Serverless Hardened**: 100% compatible with Cloudflare Workers (`workerd`), OpenNext, Vercel, Railway, AWS, Docker, and Node.js.
- **Built-in Resilience**: Ping-based socket reconnects, bounded timeout races (prevents Cloudflare Error 1101), and Next.js build-phase guards.

---

## 📦 Installation

```bash
npm install contlify
# or
pnpm add contlify
# or
yarn add contlify
```

---

## 🚀 Quick Start (Interactive Setup)

Run the interactive setup wizard inside your project:

```bash
npx contlify init
```

The wizard detects your framework, prompts for your database and hosting environment, and generates exactly **2 integration files**:

1. **`contlify.config.ts`** (Project root) — Declarative configuration
2. **Framework Gateway Route** (e.g. `app/api/contlify/v1/[...path]/route.ts`) — Thin bridge to Contlify's engine

| Framework | Gateway File Path |
| :--- | :--- |
| **Next.js** | `app/api/contlify/v1/[...path]/route.ts` (or `src/app/...`) |
| **Astro** | `src/pages/api/contlify/v1/[...path].ts` |
| **React Router v7** | `app/routes/api.contlify.$.ts` |

Use `--overwrite` to replace existing configuration files:

```bash
npx contlify init --overwrite
```

### Database Migration Command

Generate migration SQL, inspect schemas, or configure auto-migration:

```bash
npx contlify migrate
```

- Automatically detects your database driver from `contlify.config.ts`.
- Generates a `schema.sql` file, prints SQL commands to console, or validates migration status.

---

## ⚙️ Configuration Reference (`contlify.config.ts`)

Configure Contlify in a single TypeScript file in your project root using `defineConfig`:

```typescript
// contlify.config.ts
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,

  storage: {
    driver: "mongodb", // "postgres" | "supabase" | "d1" | "mongodb" | "custom"
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME ?? "contlify",
    deployment: "cloudflare", // "cloudflare" | "node"
  },

  api: {
    path: "/api/contlify/v1",
  },

  postUrl: "/blog/{slug}",
});
```

---

## 🗄️ Storage Drivers & Edge Deployments

### 1. MongoDB

Contlify manages connection pooling, reconnect-on-stale-topology, dynamic driver imports, and fail-fast timeouts internally.

#### A. Cloudflare Workers / OpenNext (Edge-Optimized)
```typescript
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "mongodb",
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME ?? "contlify",
    deployment: "cloudflare", // Enables edge socket options & 4s timeout protection
  },
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

> [!IMPORTANT]
> **Cloudflare Workers Standard Connection String Requirement**:
> Cloudflare Workers (`workerd`) cannot resolve DNS `SRV` records used by `mongodb+srv://` schemes. Always use the **Standard Connection String** from MongoDB Atlas:
> 1. In MongoDB Atlas, go to **Connect** → **Drivers**.
> 2. Toggle **Standard connection string**.
> 3. Set the secret: `npx wrangler secret put MONGODB_URI`
> 
> ```env
> MONGODB_URI=mongodb://user:password@host1:27017,host2:27017,host3:27017/?replicaSet=atlas-xxx&ssl=true&authSource=admin
> ```

#### B. Node.js / Vercel / Railway / Docker
```typescript
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "mongodb",
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME ?? "contlify",
    deployment: "node", // Standard persistent connection pool
  },
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

---

### 2. PostgreSQL

#### A. Cloudflare Workers / OpenNext (Neon Serverless HTTP)
Uses Neon's stateless HTTP driver (`@neondatabase/serverless`). Every query executes over stateless HTTP fetch with zero TCP socket leaks:
```typescript
import { neon } from "@neondatabase/serverless";
import { defineConfig } from "contlify";

const _sql = neon(process.env.DATABASE_URL!);
const neonHttpClient = {
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    const rows = await _sql.query(sql, params ?? []);
    return { rows: rows as unknown as T[] };
  },
};

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "postgres",
    client: neonHttpClient,
  },
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

#### B. Node.js / Traditional Server (`pg.Pool`)
```typescript
import { Pool } from "pg";
import { defineConfig } from "contlify";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "postgres",
    client: pool,
  },
  autoMigrate: true, // Auto-creates tables on first run
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

---

### 3. Supabase (JavaScript SDK)

```typescript
import { createClient } from "@supabase/supabase-js";
import { defineConfig } from "contlify";

let _supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key);
  }
  return _supabaseClient;
}

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "supabase",
    client: getSupabaseClient,
  },
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

> [!NOTE]
> **Supabase Schema Setup**: Apply `schema.sql` via **Supabase Dashboard → SQL Editor → New Query** once before publishing.

---

### 4. Cloudflare D1 (Native Serverless SQLite)

```typescript
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "d1",
    dbProvider: async () => {
      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const ctx = await getCloudflareContext();
        return ctx?.env as any;
      } catch {
        return (globalThis as any).DB ?? null;
      }
    },
  },
  api: { path: "/api/contlify/v1" },
  postUrl: "/blog/{slug}",
});
```

---

## 🌐 Gateway Route Handler

### Next.js App Router (`app/api/contlify/v1/[...path]/route.ts`)

```typescript
import "../../../../../../contlify.config";
import { createNextHandler } from "contlify/next";

export const dynamic = "force-dynamic";

const handler = createNextHandler();

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
```

---

## 📖 Querying Posts in Your Pages

Import query functions directly from `contlify`. No local query files or adapter passing required:

```typescript
// app/blog/page.tsx (Next.js Server Component)
import { getAllPosts, getCategories } from "contlify";

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([
    getAllPosts({ status: "published", limit: 10 }),
    getCategories(),
  ]);

  return (
    <main>
      <h1>Blog</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}
```

### Available Read Functions

```typescript
import {
  getAllPosts,
  getPostBySlug,
  getPostById,
  getPostsByCategory,
  getPostsByTag,
  getPostCount,
  getCategories,
  getTags,
  getAuthors,
} from "contlify";

// Single post lookup
const post = await getPostBySlug("getting-started");

// Category filtering
const techPosts = await getPostsByCategory("technology");

// Tag filtering
const reactPosts = await getPostsByTag("react");

// Paginated query
const result = await getAllPosts({
  status: "published",
  orderBy: "publishedAt",
  order: "desc",
  limit: 20,
  offset: 0,
});
```

---

## 📮 API Publishing Payload Examples

### Simple Payload
```http
POST /api/contlify/v1/posts
x-api-key: your_secret_api_key
Content-Type: application/json

{
  "title": "Getting Started with Contlify",
  "content": "<h1>Hello World</h1><p>This is my first published article.</p>",
  "status": "published",
  "custom_slug": "getting-started-with-contlify",
  "author": "Alex Smith",
  "categories": ["Technology", "Web Development"],
  "tags": ["Next.js", "TypeScript"],
  "coverImage": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8"
}
```

### Advanced Payload (Objects & Metadata)
```json
{
  "title": "Mastering Next.js App Router",
  "content": "<h2>Deep Dive</h2><p>Server Actions and Edge Rendering.</p>",
  "status": "published",
  "author": {
    "name": "Sarah Chen",
    "email": "sarah@example.com",
    "bio": "Lead Full-Stack Architect"
  },
  "categories": [
    {
      "name": "Technology",
      "slug": "technology",
      "description": "Tech news, frameworks, and engineering tutorials."
    }
  ],
  "tags": [
    { "name": "React", "slug": "react" }
  ],
  "seo": {
    "title": "Next.js App Router Masterclass",
    "description": "Complete guide to Next.js App Router architecture."
  }
}
```

---

## 🛠️ Endpoints Reference

All endpoints are versioned under `/api/contlify/v1`:

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/contlify/v1/validate` | Yes | Health check, API key verification, & adapter capabilities |
| `GET` | `/api/contlify/v1/health` | Yes | Service health check |
| `POST` | `/api/contlify/v1/posts` | Yes | Create and publish a new blog post |
| `PATCH` | `/api/contlify/v1/posts/:id` | Yes | Partial update of an existing post by ID or slug |
| `PUT` | `/api/contlify/v1/posts/:id` | Yes | Full update or replacement of a post by ID or slug |
| `GET` | `/api/contlify/v1/authors` | Yes | Retrieve list of authors |
| `GET` | `/api/contlify/v1/categories` | Yes | Retrieve list of categories (with cover images) |
| `GET` | `/api/contlify/v1/tags` | Yes | Retrieve list of tags |

---

## 📖 Documentation & Troubleshooting

- 📖 [API Reference Guide](./docs/api-reference.md)
- 🔌 [Integration Guides (Postman, cURL, n8n, Custom Backend)](./docs/integration-guides.md)
- ⚠️ [Error Catalog & Edge Troubleshooting Guide](./docs/errors.md)

---

## 📜 License

[MIT](./LICENSE)
