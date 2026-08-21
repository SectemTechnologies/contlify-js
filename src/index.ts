/**
 * contlify — Standardized Blog Publishing Engine & Database Adapter API Framework
 *
 * @module contlify
 */

// Edge Runtime Polyfill for esbuild __name helper (Cloudflare Workers / OpenNext)
if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>).__name) {
  (globalThis as Record<string, unknown>).__name = (target: unknown) => target;
}

// Primary Entry Point & Handlers
export { createContlifyHandler, type ContlifyHandler } from "./core/handler.js";
export { RequestContext } from "./core/request-context.js";
export { handleCreatePost } from "./core/posts-handler.js";
export { handleUpdatePost } from "./core/update-post-handler.js";
export { handleValidate } from "./core/validate-handler.js";
export { handleGetAuthors } from "./core/authors-handler.js";
export { handleGetCategories } from "./core/categories-handler.js";
export { handleUpdateCategory } from "./core/update-category-handler.js";
export { handleGetTags } from "./core/tags-handler.js";


// Node.js / Express Middleware Bridge (Express, Angular SSR, Fastify)
export {
  createNodeMiddleware,
  nodeRequestToWebRequest,
  writeWebResponseToNode,
  type NodeLikeRequest,
  type NodeMiddleware,
} from "./node/index.js";


// Configuration System
export type {
  ContlifyConfig,
  ResolvedContlifyConfig,
  LoggerContract,
  FeatureFlags,
  UrlBuilderFunction,
} from "./config/contlify-config.js";
export { defaultLogger, resolveConfig } from "./config/default-config.js";

// Storage Engine & Adapter Contracts
export type {
  ContlifyAdapter,
  PostAdapterContract,
  AuthorAdapterContract,
  CategoryAdapterContract,
  TagAdapterContract,
} from "./adapters/index.js";

// Domain & Payload Types
export type {
  Post,
  Author,
  Category,
  Tag,
  PostStatus,
  SeoMetadata,
  MediaAsset,
  PublishPayload,
  PublishPostPayload,
  PublishResponse,
  AuthorPayload,
  CategoryPayload,
  TagPayload,
  ValidateResult,
  HttpMethod,
  HttpHeaders,
  QueryParameters,
} from "./types/index.js";

// Error System Architecture
export {
  ContlifyError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  AdapterError,
  ErrorCode,
  type ErrorCodeValue,
  type ContlifyErrorOptions,
} from "./errors/index.js";

// Response Architecture & Builders
export {
  ResponseBuilder,
  type ApiResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ResponseMeta,
  type ApiErrorDetail,
} from "./responses/index.js";

// Middleware Architecture
export {
  createAuthMiddleware,
  composePipeline,
  type ContlifyMiddleware,
} from "./middleware/index.js";

// Routing Infrastructure
export { Router } from "./routing/router.js";
export type { IRouter } from "./routing/router.interface.js";
export type { RouteContext } from "./routing/route-context.js";
export type { RouteDefinition, RouteHandler, RouteMatchResult } from "./routing/route.interface.js";

// Authentication & Validation
export { ApiKeyAuthStrategy } from "./authentication/api-key-auth.js";
export type { AuthStrategyContract, AuthResult } from "./authentication/auth.interface.js";
export { PublishPayloadValidator } from "./validation/publish-payload-validator.js";
export { UpdatePayloadValidator } from "./validation/update-payload-validator.js";
export { RouteParamValidator } from "./validation/route-param-validator.js";
export type { ValidatorContract, ValidationResult } from "./validation/validator.interface.js";

// Utilities
export { slugify } from "./utils/slugify.js";
export { optimizeContentImages, type ImageTransformOptions } from "./utils/image-transformer.js";
export { HttpStatus, type HttpStatusCode } from "./utils/http-status.js";

// Read-Side Query Contract
export type {
  ContlifyQueryContract,
  PostQueryOptions,
  PaginatedPostsResult,
} from "./queries/index.js";

export type { ContlifyFramework } from "./templates/framework.js";

// Pre-Built Database Adapters (Phase 2)
export {
  createPostgresAdapter,
  createSupabaseAdapter,
  createD1Adapter,
  createMongoAdapter,
  mapRowToPost,
  mapRowToAuthor,
  mapRowToCategory,
  mapRowToTag,
  type PostgresClientLike,
  type SupabaseClientLike,
  type D1DatabaseLike,
  type D1StmtLike,
  type MongoDbLike,
  type MongoCollectionLike,
  type RawPostRow,
  type RawAuthorRow,
  type RawCategoryRow,
  type RawTagRow,
} from "./built-in-adapters/index.js";

// Database Migration Schemas (Phase 2)
export {
  postgresSchema,
  d1Schema,
  getMigrationSql,
  type SupportedDatabaseType,
} from "./migrations/index.js";
