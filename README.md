# 🚀 contlify

> **Standardized Blog Publishing Engine & Database Adapter Framework for Next.js, Astro, React Router, and Angular.**

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)
[![Tests: 147 passed](https://img.shields.io/badge/Tests-147%20Passed-brightgreen.svg?style=flat-square)](./tests)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-black.svg?style=flat-square)](https://nodejs.org)

`contlify` is a library-first publishing engine and multi-database adapter framework. It enables publishing platforms (Contlify, Postman, n8n, Make, custom backends) to publish, update, and manage blog posts on your website through standardized Web APIs, while providing zero-boilerplate query functions to render content directly in your frontend server components and pages.

---

## 🌟 Why Contlify?

- ⚡ **Library-First Architecture**: Minimal 2-file footprint (`contlify.config.ts` + thin API gateway). Zero messy scaffolded boilerplate cluttering your repo.
- 🗄️ **Multi-Database Support**: First-class adapters for **PostgreSQL** (pg / Neon), **Supabase**, **Cloudflare D1** (SQLite), and **MongoDB**.
- 🌐 **Universal Framework Compatibility**: Works seamlessly out of the box with **Next.js (App & Pages Router)**, **Astro**, **React Router v7**, and **Angular (SSR)**.
- 🔍 **Zero-Boilerplate Query API**: Simple, strongly-typed functions like `getAllPosts()`, `getPostBySlug()`, `getCategories()`, and `getTags()` that auto-resolve your database configuration.
- 🛡️ **Edge & Serverless Hardened**: Tested and optimized for Cloudflare Workers (`workerd`), OpenNext, Vercel, Netlify, Railway, Render, Docker, and Node.js.
- 🖼️ **Responsive Image Optimization**: Automatically enhances HTML content images with responsive inline styles, `loading="lazy"`, and `decoding="async"`.

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

## 🚀 Quick Start (Interactive CLI)

Initialize Contlify inside your existing web project in seconds:

```bash
npx contlify init
```

The setup wizard auto-detects your web framework, prompts for your database and hosting target, and generates exactly **2 integration files**:

1. **`contlify.config.ts`** (Project root) — Declarative configuration
2. **Framework Gateway Route** — Thin bridge to Contlify's API engine

### Gateway Locations by Framework

| Framework | Gateway File Path |
| :--- | :--- |
| **Next.js** | `app/api/contlify/v1/[...path]/route.ts` (or `src/app/...`) |
| **Astro** | `src/pages/api/contlify/v1/[...path].ts` |
| **React Router v7** | `app/routes/api.contlify.$.ts` |
| **Angular (SSR)** | `server.contlify.ts` |

Use `--overwrite` to replace existing configuration files:
```bash
npx contlify init --overwrite
```

### 🗄️ Database Migration Command

Generate migration SQL, inspect schemas, or configure auto-migration:

```bash
npx contlify migrate
```

- Automatically reads your database driver from `contlify.config.ts`.
- Generates `schema.sql` or automatically provisions tables on startup (`autoMigrate: true`).

---

## ⚙️ Declarative Configuration (`contlify.config.ts`)

Configure Contlify in a single TypeScript file in your project root using `defineConfig`:

```typescript
// contlify.config.ts
import { defineConfig } from "contlify";

export default defineConfig({
  // Your secret API key (keep secret in .env.local!)
  apiKey: process.env.CONTLIFY_API_KEY,

  // Storage Driver Configuration
  storage: {
    driver: "postgres", // "postgres" | "supabase" | "d1" | "mongodb" | "custom"
    connectionString: process.env.DATABASE_URL,
  },

  // API endpoint prefix (defaults to /api/contlify/v1)
  api: {
    path: "/api/contlify/v1",
  },

  // Optional: Dynamic blog post URL pattern
  postUrl: "/blog/{slug}",
});
```

---

## 🗄️ Storage Drivers

<details>
<summary><b>1. PostgreSQL & Neon (Click to expand)</b></summary>

#### A. Cloudflare Workers / OpenNext (Neon Serverless HTTP)
```typescript
import { neon } from "@neondatabase/serverless";
import { defineConfig } from "contlify";

const sql = neon(process.env.DATABASE_URL!);
export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "postgres",
    client: {
      query: async (queryStr, params) => ({ rows: await sql.query(queryStr, params ?? []) }),
    },
  },
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
  autoMigrate: true,
  postUrl: "/blog/{slug}",
});
```
</details>

<details>
<summary><b>2. Supabase (Click to expand)</b></summary>

```typescript
import { createClient } from "@supabase/supabase-js";
import { defineConfig } from "contlify";

let _client: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createClient(url, key);
  return _client;
}

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "supabase",
    client: getSupabaseClient,
  },
  postUrl: "/blog/{slug}",
});
```
> [!NOTE]
> Apply `schema.sql` once in **Supabase Dashboard → SQL Editor → New Query** before publishing.
</details>

<details>
<summary><b>3. Cloudflare D1 (Native Serverless SQLite) (Click to expand)</b></summary>

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
  postUrl: "/blog/{slug}",
});
```
</details>

<details>
<summary><b>4. MongoDB (Click to expand)</b></summary>

#### A. Cloudflare Workers / Edge
```typescript
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "mongodb",
    uri: process.env.MONGODB_URI, // Standard (non-SRV) URI required for Cloudflare Workers
    dbName: process.env.MONGODB_DB_NAME ?? "contlify",
    deployment: "cloudflare",
  },
  postUrl: "/blog/{slug}",
});
```

#### B. Node.js / Vercel / Railway / Docker
```typescript
import { defineConfig } from "contlify";

export default defineConfig({
  apiKey: process.env.CONTLIFY_API_KEY,
  storage: {
    driver: "mongodb",
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME ?? "contlify",
    deployment: "node",
  },
  postUrl: "/blog/{slug}",
});
```
</details>

---

## 📖 Querying Content in Your Pages

Contlify exports clean query functions that automatically connect to your configured database:

```typescript
import {
  getAllPosts,
  getPostBySlug,
  getCategories,
  getPostsByCategory,
  getTags,
  getPostsByTag,
} from "contlify";
```

### Next.js App Router Example (`app/blog/page.tsx`)
```tsx
import Link from "next/link";
import { getAllPosts, getCategories } from "contlify";

export const revalidate = 60; // ISR cache revalidation

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getCategories(),
  ]);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Latest Articles</h1>

      {/* Categories */}
      <div className="flex gap-2 mb-8">
        {categories.map((cat) => (
          <span key={cat.id} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
            {cat.name} ({cat.postCount ?? 0})
          </span>
        ))}
      </div>

      {/* Post Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <article key={post.id} className="border rounded-xl p-6 hover:shadow-md transition">
            <h2 className="text-xl font-bold mb-2">
              <Link href={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
            <span className="text-xs text-gray-400">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
```

---

## 📡 Publishing REST API

Publish posts automatically from Contlify, Postman, cURL, or automation pipelines (n8n, Zapier):

### Create Blog Post
```bash
curl -X POST "https://yourdomain.com/api/contlify/v1/posts" \
  -H "X-Contlify-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post via Contlify",
    "content": "<h2>Hello World</h2><p>Article body content.</p>",
    "status": "published",
    "custom_slug": "my-first-post",
    "author": "Jane Doe",
    "categories": ["Engineering"],
    "tags": ["Next.js", "TypeScript"]
  }'
```

### Update Blog Post
```bash
curl -X PATCH "https://yourdomain.com/api/contlify/v1/posts/my-first-post" \
  -H "X-Contlify-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post (Updated Title)"
  }'
```

---

## 📚 Documentation & Guides

- [📖 Complete Integration & Blog Setup Guide](./docs/integration-guides.md) — Step-by-step blog setup for Next.js, Astro, React Router v7, and Angular SSR.
- [🛠️ Error Architecture & Troubleshooting Guide](./docs/errors.md) — Error codes, root causes, and database-specific resolution recipes.
- [📚 REST API Reference](./docs/api-reference.md) — Complete endpoint schemas, parameters, and payloads.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/SectemTechnologies/Next.js-Package/issues).

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
