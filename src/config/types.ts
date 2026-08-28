import type { ContlifyAdapter } from "../adapters/adapter.interface.js";
import type {
  PostgresClientLike,
  SupabaseClientLike,
  D1DatabaseLike,
  D1DatabaseProvider,
  MongoDbLike,
  MongoDbProvider,
} from "../built-in-adapters/index.js";
import type { Post } from "../types/domain.js";

/**
 * Custom logger contract interface allowing users to inject pino, winston, or custom loggers.
 */
export interface LoggerContract {
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
}

/**
 * Function contract for dynamic post URL generation.
 * Accepts either post entity or slug.
 */
export type UrlBuilderFunction = (post: Post | { slug: string; [key: string]: unknown }) => string;

/**
 * Feature flag options for experimental features or enabling optional routes.
 */
export interface FeatureFlags {
  enableAuthorEndpoints?: boolean;
  enableCategoryEndpoints?: boolean;
  enableTagEndpoints?: boolean;
  enableValidationEndpoint?: boolean;
  debugMode?: boolean;
}

/**
 * PostgreSQL storage configuration.
 */
export interface PostgresStorageConfig {
  driver: "postgres";
  client?: PostgresClientLike | unknown;
  pool?: PostgresClientLike | unknown;
  connectionString?: string;
  ssl?: boolean | Record<string, unknown>;
}

/**
 * Supabase storage configuration.
 */
export interface SupabaseStorageConfig {
  driver: "supabase";
  client?: SupabaseClientLike | PostgresClientLike | unknown;
  pool?: PostgresClientLike | unknown;
  connectionString?: string;
  ssl?: boolean | Record<string, unknown>;
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

/**
 * Cloudflare D1 storage configuration.
 */
export interface D1StorageConfig {
  driver: "d1";
  binding?: D1DatabaseLike | unknown;
  env?: unknown;
  dbProvider?: D1DatabaseProvider;
}

/**
 * MongoDB storage configuration.
 */
export interface MongoStorageConfig {
  driver: "mongodb";
  db?: MongoDbLike | unknown;
  client?: unknown;
  uri?: string;
  dbName?: string;
  dbProvider?: MongoDbProvider;
  deployment?: "cloudflare" | "node" | "edge" | "serverless";
  serverless?: boolean;
  options?: Record<string, unknown>;
}

/**
 * Custom storage configuration using a custom ContlifyAdapter instance.
 */
export interface CustomStorageConfig {
  driver: "custom";
  adapter: ContlifyAdapter;
}

/**
 * Storage configuration options supported by Contlify.
 */
export type StorageConfig =
  | PostgresStorageConfig
  | SupabaseStorageConfig
  | D1StorageConfig
  | MongoStorageConfig
  | CustomStorageConfig
  | ContlifyAdapter;

/**
 * Security and request limits configuration.
 */
export interface SecurityConfig {
  maxBodyBytes?: number;
  allowLegacyApiKeyHeader?: boolean;
}

/**
 * API route path configuration.
 */
export interface ApiConfig {
  path?: string;
  prefix?: string;
  version?: string;
}

/**
 * Core declarative configuration options for Contlify.
 */
export interface ContlifyConfigInput {
  /**
   * Secret API key used for authenticating incoming publishing requests.
   * If omitted, defaults to process.env.CONTLIFY_API_KEY.
   */
  apiKey?: string;

  /**
   * Declarative storage configuration or custom adapter.
   */
  storage?: StorageConfig;

  /**
   * Legacy adapter property for backward compatibility with v1.
   */
  adapter?: ContlifyAdapter;

  /**
   * API routing configuration.
   */
  api?: ApiConfig;

  /**
   * Base route prefix or path (e.g. "/api/contlify/v1" or "/api/contlify").
   */
  apiPath?: string;

  /**
   * Legacy alias for apiPath.
   * @default "/api/contlify"
   */
  apiPathPrefix?: string;

  /**
   * URL pattern or resolver function for published post URLs (e.g. "/blog/{slug}" or (post) => `/blog/${post.slug}`).
   */
  postUrl?: string | UrlBuilderFunction;

  /**
   * Legacy URL resolver callback.
   */
  getPostUrl?: UrlBuilderFunction;

  /**
   * Legacy alias for getPostUrl.
   */
  buildPostUrl?: UrlBuilderFunction;

  /**
   * Whether to automatically run database migrations if supported.
   */
  autoMigrate?: boolean;

  /**
   * Security settings such as payload size limits.
   */
  security?: SecurityConfig;

  /**
   * Custom logger instance.
   */
  logger?: LoggerContract;

  /**
   * Feature flags to enable or disable specific features.
   */
  featureFlags?: FeatureFlags;
}

/**
 * Alias for ContlifyConfigInput for backward compatibility.
 */
export type ContlifyConfig = ContlifyConfigInput;

/**
 * Resolved internal configuration with guaranteed default values.
 */
export interface ResolvedContlifyConfig {
  apiKey: string;
  adapter?: ContlifyAdapter;
  storage?: StorageConfig;
  apiPathPrefix: string;
  postUrl?: string | UrlBuilderFunction;
  getPostUrl?: UrlBuilderFunction;
  buildPostUrl?: UrlBuilderFunction;
  autoMigrate: boolean;
  security: {
    maxBodyBytes: number;
    allowLegacyApiKeyHeader: boolean;
  };
  logger: LoggerContract;
  featureFlags: Required<FeatureFlags>;
}
