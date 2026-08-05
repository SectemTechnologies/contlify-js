# contlify

> Standardized Blog Publishing Engine & Database Adapter API Framework for Next.js Websites.

[![npm version](https://img.shields.io/npm/v/contlify.svg?style=flat-square)](https://www.npmjs.com/package/contlify)
[![license](https://img.shields.io/npm/l/contlify.svg?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

`contlify` is a lightweight, framework-agnostic, database-agnostic TypeScript middleware and adapter engine. It enables any publisher service (Contlify, Postman, n8n, custom backends, headless CMS) to publish, update, and manage blog posts on your Next.js site through standardized Web API endpoints.

---

## Key Features

- **Database-Agnostic Storage Adapters**: Connect your own database (Prisma, Drizzle, Mongoose, Supabase, Raw SQL, or custom APIs).
- **Modern Next.js App Router Support**: Plug directly into Next.js Catch-All Route Handlers (`app/api/contlify/[...path]/route.ts`).
- **Centralized Authentication**: Enforces secure `X-Truecmo-Key` (or `CONTLIFY_API_KEY`) API key authentication.
- **Runtime Payload Validation**: Built-in validation verifying required fields (`title`, `content`, `status`) and optional metadata.
- **Automatic Slugification**: Generates clean URL-safe slugs using `slugify` with support for custom slugs.
- **Dynamic Post URL Resolver**: Configurable `getPostUrl(post)` callback for customized blog routing structures.
- **Unified JSON Error System**: Standardized error payloads hiding internal server details.
- **Strictly Typed**: Written in 100% TypeScript with complete declaration files (`.d.ts`) and sourcemaps.

---

## Installation

```bash
npm install contlify
# or
pnpm add contlify
# or
yarn add contlify
```

---

## Requirements

- **Node.js**: `>= 18.0.0`
- **Next.js**: `>= 13.4.0` (App Router) or Pages Router
- **TypeScript**: `>= 5.0.0` (Optional, recommended)

---

## Quick Start (Next.js App Router)

### 1. Configure Environment Variable (`.env`)

```env
CONTLIFY_API_KEY=your_secret_contlify_api_key
```

### 2. Implement Database Adapter (`lib/contlify-adapter.ts`)

```typescript
import type { ContlifyAdapter, PublishPostPayload, PublishResponse } from "contlify";
import { prisma } from "./db"; // Your Prisma client

export const myAdapter: ContlifyAdapter = {
  async ping() {
    return true;
  },

  async createPost(payload) {
    const slug = (payload.custom_slug ?? payload.slug ?? "post").trim();

    const post = await prisma.post.upsert({
      where: { slug },
      create: {
        title: payload.title,
        slug,
        content: payload.content,
        status: payload.status,
      },
      update: {
        title: payload.title,
        content: payload.content,
        status: payload.status,
      },
    });

    return {
      postId: post.id,
      slug: post.slug,
      status: post.status as "published",
      action: "created",
      url: `/blog/${post.slug}`,
    };
  },

  async updatePost(id, payload) {
    const post = await prisma.post.update({
      where: { id },
      data: {
        title: payload.title,
        content: payload.content,
        status: payload.status,
      },
    });

    return {
      postId: post.id,
      slug: post.slug,
      status: post.status as "published",
      action: "updated",
      url: `/blog/${post.slug}`,
    };
  },
};
```

### 3. Create Catch-All Route Handler (`app/api/contlify/[...path]/route.ts`)

```typescript
import { createContlifyHandler } from "contlify";
import { myAdapter } from "@/lib/contlify-adapter";

const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY,
  adapter: myAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => `/blog/${post.slug}`,
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

## Configuration Options

```typescript
export interface ContlifyConfig {
  /**
   * Secret API key used for authenticating incoming publishing requests.
   * Defaults to process.env.CONTLIFY_API_KEY if omitted.
   */
  apiKey?: string;

  /**
   * Storage engine adapter implementing ContlifyAdapter interface.
   */
  adapter?: ContlifyAdapter;

  /**
   * Custom URL resolver function constructing public post link.
   */
  getPostUrl?: (post: { slug: string; [key: string]: unknown }) => string;

  /**
   * Base route path prefix.
   * @default "/api/contlify"
   */
  apiPathPrefix?: string;

  /**
   * Custom logger instance (pino, winston, or custom).
   */
  logger?: LoggerContract;
}
```

---

## Supported Endpoints

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/contlify/validate` | Health check & connectivity validation |
| `POST` | `/api/contlify/posts` | Create & publish a new blog post |
| `PATCH` | `/api/contlify/posts/:id` | Partial update of an existing post |
| `PUT` | `/api/contlify/posts/:id` | Full update or replacement of a post |
| `GET` | `/api/contlify/authors` | Retrieve list of post authors |
| `GET` | `/api/contlify/categories` | Retrieve list of categories |
| `GET` | `/api/contlify/tags` | Retrieve list of post tags |

---

## Documentation & Examples

- 📖 [API Reference Guide](./docs/api-reference.md)
- 🔌 [Integration Guides (Contlify, Postman, cURL, n8n, Custom Backend)](./docs/integration-guides.md)
- ⚠️ [Error Catalog & Troubleshooting](./docs/errors.md)
- 💡 [Reference Adapters (Prisma, Drizzle, Mongoose, In-Memory)](./examples/adapters/)
- 🚀 [Executable Next.js App Router Example App](./examples/nextjs-blog/)

---

## Contributing Guidelines

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm test`) and typecheck passes (`npm run typecheck`).
4. Commit your changes (`git commit -m 'feat: add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## License

[MIT](./LICENSE)
