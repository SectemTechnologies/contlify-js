# contlify

> Standardized Blog Publishing Engine & Database Adapter API Framework for Next.js Websites.
<!-- 
[![npm version](https://img.shields.io/npm/v/contlify.svg?style=flat-square)](https://www.npmjs.com/package/contlify)
[![license](https://img.shields.io/npm/l/contlify.svg?style=flat-square)](./LICENSE) -->
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

`contlify` is a database-agnostic TypeScript publishing middleware and adapter engine. It enables any publisher service (Postman, n8n, CMS dashboards, or custom backends) to publish, update, and manage blog posts on your Next.js site through standardized Web APIs.

---

## 🌟 Key Features

- **Built-in Storage Adapters**: Pre-built adapters for **PostgreSQL** (`pg` & `@neondatabase/serverless`), **Supabase**, **Cloudflare D1**, and **MongoDB**.
- **Interactive CLI Wizard (`npx contlify init`)**: **Next.js**, **Astro**, or **React Router v4**. Detects `src/` for Next.js and scaffolds ready-to-use blog pages.
- **Flexible Payload Normalization**: Accepts simple string inputs (`"author": "Rauf"`, `"categories": ["Technology", "Design"]`) OR full object arrays (`[{ name: "Technology", slug: "technology" }]`).
- **Dynamic Category Cover Images**: Categories automatically inherit the cover image of the latest published post in that category without requiring database migrations.
- **Category-First Next.js App Router Pages**: Generates `/blog` (Categories grid), `/blog/category/[slug]` (Filtered articles), and `/blog/post/[slug]` (Article detail).
- **Instant Loading Feedback (`app/blog/loading.tsx`)**: Scaffolds a Next.js `loading.tsx` component so navigation between pages shows a clean animated loading spinner.
- **Edge & Cloudflare Workers Compatibility**: 100% compatible with Cloudflare Workers, OpenNext, Vercel, and Node.js. Includes built-in `esbuild` edge polyfills.

---

## 🚀 CLI Commands

### 1. Interactive Project Setup (`init`)
Scaffolds ready-to-use blog pages, queries, and database adapter configuration:

```bash
npx contlify init
```

The wizard asks for **framework** first:

| Framework | What gets generated |
| :--- | :--- |
| **Next.js** | `app/api/contlify/[...path]/route.ts` + `/blog` App Router pages |
| **Astro** | `src/pages/api/contlify/[...path].ts` + `src/pages/blog/*.astro` |
| **React Router v4** | `server/contlify-server.ts` (Express) + class-component pages with `Switch` / `Route` |

* Next.js still detects `src/app` vs `app/`.
* Astro and React Router v4 write into `src/` (and `server/` for Express).
* Use `--overwrite` to replace existing files.

```bash
npx contlify init --overwrite
```

### 2. Migration SQL Generator (`migrate`)
Generates database migration SQL files (`contlify-postgres.sql`, `contlify-d1.sql`, `contlify-supabase.sql`):

```bash
npx contlify migrate
```

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

## ⚡ Quick Start & Built-in Adapters

### 1. Environment Variable (`.env.local`)
```env
CONTLIFY_API_KEY=your_secret_contlify_api_key
```

### 2. Choose Your Database Adapter (`lib/contlify/adapter.ts`)

#### A. PostgreSQL (Node.js or Neon Serverless)
```typescript
import { Pool } from "@neondatabase/serverless"; // Or 'pg' for Node.js
import { createPostgresAdapter } from "contlify";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const contlifyAdapter = createPostgresAdapter(pool);
```

#### B. Supabase
```typescript
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdapter } from "contlify";

const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export const contlifyAdapter = createSupabaseAdapter(client);
```

#### C. Cloudflare D1
```typescript
import { createD1Adapter } from "contlify";

export function getAdapter(env: { DB: D1Database }) {
  return createD1Adapter(env.DB);
}
```

#### D. MongoDB
```typescript
import { MongoClient } from "mongodb";
import { createMongoAdapter } from "contlify";

const client = new MongoClient(process.env.MONGODB_URI!);
export const contlifyAdapter = createMongoAdapter(() => client.db());
```

---

### 3. Catch-All Route Handler (`app/api/contlify/[...path]/route.ts`)

```typescript
import { createContlifyHandler } from "contlify";
import { contlifyAdapter } from "@/lib/contlify/adapter";

export const dynamic = "force-dynamic";

const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY,
  adapter: contlifyAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => `/blog/post/${post.slug}`,
});

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

## 📮 API Publishing Payload Examples

### Simple Payload (String Categories & Author)
```json
POST /api/contlify/posts
Headers:
  x-api-key: your_secret_contlify_api_key
  Content-Type: application/json

{
  "title": "Getting Started with Contlify",
  "content": "<h1>Hello World</h1><p>This is my first published article.</p>",
  "status": "published",
  "custom_slug": "getting-started-with-contlify",
  "author": "Alex Smith",
  "categories": [
    "Technology",
    "Web Development"
  ],
  "tags": [
    "Next.js",
    "TypeScript"
  ],
  "coverImage": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8"
}
```

### Advanced Payload (Object Entities & Metadata)
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

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/contlify/validate` | Health check, API key verification, & adapter capabilities |
| `POST` | `/api/contlify/posts` | Create and publish a new blog post |
| `PATCH` | `/api/contlify/posts/:id` | Partial update of an existing blog post by ID or slug |
| `PUT` | `/api/contlify/posts/:id` | Full update or replacement of a post by ID or slug |
| `GET` | `/api/contlify/authors` | Retrieve list of authors |
| `GET` | `/api/contlify/categories` | Retrieve list of categories (with cover images) |
| `GET` | `/api/contlify/tags` | Retrieve list of tags |

---

## 📑 Generated Navigation Routes

| Page | File Path | Route | Description |
| :--- | :--- | :--- | :--- |
| **Categories Grid** | `app/blog/page.tsx` | `/blog` | Grid of all category cards with cover banners |
| **Category Articles** | `app/blog/category/[slug]/page.tsx` | `/blog/category/[slug]` | Articles filtered by category |
| **Single Article** | `app/blog/post/[slug]/page.tsx` | `/blog/post/[slug]` | Full article content view |
| **Loading Spinner** | `app/blog/loading.tsx` | Fallback | Instant animated spinner during page navigation |

---

## 📖 Documentation & Guides

- 📖 [API Reference Guide](./docs/api-reference.md)
- 🔌 [Integration Guides (Postman, cURL, n8n, Custom Backend)](./docs/integration-guides.md)
- ⚠️ [Error Catalog & Troubleshooting](./docs/errors.md)

---

## 📜 License

[MIT](./LICENSE)
