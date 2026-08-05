# contlify

> Standardized blog publishing engine and database adapter framework for Next.js and headless websites.

## Overview

`contlify` is a TypeScript library that enables standardized API endpoints for publishing blog posts, managing authors, categories, tags, and syncing content across multiple headless platforms and CMS solutions.

## Architecture & Modular System

- **Core Handler (`createContlifyHandler`)**: Primary HTTP entry point matching Web API `Request`/`Response` standards.
- **Adapter Contract (`ContlifyAdapter`)**: Storage engine abstraction allowing developers to connect custom ORMs, databases, or API clients.
- **Routing Engine (`IRouter`)**: Pluggable lightweight internal HTTP router for `/validate`, `/posts`, `/authors`, `/categories`, and `/tags`.
- **Response & Error Hierarchy**: Strongly-typed custom errors and unified JSON payload contracts.

## Package Architecture (Phase 1 Foundation)

```ts
import { createContlifyHandler } from "contlify";

// Handler initialization skeleton
export const handler = createContlifyHandler({
  apiKey: "your-api-key",
  // adapter implementation will be passed here in Phase 2
});
```

## Development

```bash
# Build production bundle (ESM + CommonJS + Types)
npm run build

# Run type checker
npm run typecheck
```

## License

MIT
