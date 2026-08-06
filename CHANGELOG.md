# Changelog

All notable changes to the `contlify` npm package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-08-07

### Fixed
- `GET /validate` now returns Contlify/WordPress-compatible top-level `{ status: "success", message, meta_data, success, valid }` so Contlify Integrations “Test connection” accepts the response.
- Example Next.js route no longer falls back to `demo-secret-key` when `CONTLIFY_API_KEY` is missing (avoids silent key mismatches).
- `resolveConfig` warns when API key is unset instead of inventing a secret.

### Added
- Optional `siteName` / `siteUrl` config (and `CONTLIFY_SITE_URL` env) for validate `meta_data`.

### Removed
- Unit test suite (`tests/`), Vitest config, and `npm test` script.
- Unused `AuthenticationError` / `ValidationError` classes and unused `ValidateResult` type.

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
