import type { ContlifyAdapter } from "../adapters/adapter.interface.js";
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
export type UrlBuilderFunction = (post: Post | { slug: string;[key: string]: unknown }) => string;

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
 * Core configuration options for Contlify handler.
 */
export interface ContlifyConfig {
  /**
   * Secret API key used for authenticating incoming publishing requests.
   * If omitted, defaults to process.env.CONTLIFY_API_KEY.
   */
  apiKey?: string;

  /**
   * Custom database/ORM storage adapter implementing ContlifyAdapter interface.
   */
  adapter?: ContlifyAdapter;

  /**
   * Custom URL resolver function constructing public post link.
   */
  getPostUrl?: UrlBuilderFunction;

  /**
   * Alias for getPostUrl for backward compatibility.
   */
  buildPostUrl?: UrlBuilderFunction;

  /**
   * Base route prefix for Contlify API endpoints.
   * @default "/api/contlify"
   */
  apiPathPrefix?: string;

  /**
   * Custom logger instance.
   */
  logger?: LoggerContract;

  /**
   * Feature flags to enable or disable specific features.
   */
  featureFlags?: FeatureFlags;

  /**
   * Optional display name returned in GET /validate meta_data (Contlify Test connection).
   */
  siteName?: string;

  /**
   * Optional public site origin returned in GET /validate meta_data.
   */
  siteUrl?: string;
}

/**
 * Resolved internal configuration with guaranteed default values.
 */
export interface ResolvedContlifyConfig
  extends Required<Omit<ContlifyConfig, "adapter" | "getPostUrl" | "buildPostUrl" | "logger" | "siteName" | "siteUrl">> {
  adapter?: ContlifyAdapter;
  logger: LoggerContract;
  getPostUrl?: UrlBuilderFunction;
  buildPostUrl?: UrlBuilderFunction;
  siteName?: string;
  siteUrl?: string;
}
