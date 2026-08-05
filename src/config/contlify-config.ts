import type { ContlifyAdapter } from "../adapters/adapter.interface.js";

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
 */
export type UrlBuilderFunction = (slug: string, postType?: string) => string;

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
   */
  apiKey: string;

  /**
   * Custom database/ORM storage adapter implementing ContlifyAdapter interface.
   */
  adapter?: ContlifyAdapter;

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
   * Custom URL resolver function for post links.
   */
  buildPostUrl?: UrlBuilderFunction;

  /**
   * Feature flags to enable or disable specific features.
   */
  featureFlags?: FeatureFlags;
}

/**
 * Resolved internal configuration with guaranteed default values.
 */
export interface ResolvedContlifyConfig extends Required<Omit<ContlifyConfig, "adapter" | "buildPostUrl" | "logger">> {
  adapter?: ContlifyAdapter;
  logger: LoggerContract;
  buildPostUrl?: UrlBuilderFunction;
}
