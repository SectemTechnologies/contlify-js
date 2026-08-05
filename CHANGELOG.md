# Changelog

All notable changes to the `contlify` npm package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-06

### Added
- Initial v1.0.0 production release of `contlify` npm package.
- Primary Web standard entry point `createContlifyHandler()` compatible with Next.js App Router route handlers (`app/api/contlify/[...path]/route.ts`).
- Centralized `ApiKeyAuthStrategy` enforcing `X-Truecmo-Key` (with `x-api-key` and `Authorization: Bearer` fallbacks) authentication.
- Database-agnostic `ContlifyAdapter` interface supporting `createPost`, `updatePost`, `getAuthors`, `getCategories`, `getTags`, and `ping`.
- Modular runtime validators: `PublishPayloadValidator`, `UpdatePayloadValidator`, and `RouteParamValidator`.
- Complete HTTP API surface:
  - `GET /validate` - System & adapter health check
  - `POST /posts` - Create and publish post
  - `PATCH /posts/:id` - Partial post update
  - `PUT /posts/:id` - Full post replacement
  - `GET /authors` - Author taxonomy list
  - `GET /categories` - Category taxonomy list
  - `GET /tags` - Tag taxonomy list
- Standardized `ResponseBuilder` formatting success payloads and hiding server stack traces on errors.
- Built-in `slugify` utility for automatic URL-safe slug generation.
- Production reference storage adapters for Prisma, Drizzle, Mongoose, and In-Memory storage (`examples/adapters/`).
- Full executable Next.js App Router demo application (`examples/nextjs-blog/`).
- Exhaustive documentation suite (`docs/api-reference.md`, `docs/integration-guides.md`, `docs/errors.md`).
- GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`).
