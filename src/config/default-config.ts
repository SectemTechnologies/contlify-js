import type { ContlifyConfig, ResolvedContlifyConfig, LoggerContract } from "./contlify-config.js";

/**
 * Default fallback console logger.
 */
export const defaultLogger: LoggerContract = {
  debug: (message: string, ...meta: unknown[]) => {
    if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") {
      console.debug(`[contlify:debug] ${message}`, ...meta);
    }
  },
  info: (message: string, ...meta: unknown[]) => {
    console.info(`[contlify:info] ${message}`, ...meta);
  },
  warn: (message: string, ...meta: unknown[]) => {
    console.warn(`[contlify:warn] ${message}`, ...meta);
  },
  error: (message: string, ...meta: unknown[]) => {
    console.error(`[contlify:error] ${message}`, ...meta);
  },
};

/**
 * Resolves user config against default values.
 */
export function resolveConfig(config: ContlifyConfig): ResolvedContlifyConfig {
  return {
    apiKey: config.apiKey,
    adapter: config.adapter,
    apiPathPrefix: config.apiPathPrefix ?? "/api/contlify",
    logger: config.logger ?? defaultLogger,
    buildPostUrl: config.buildPostUrl,
    featureFlags: {
      enableAuthorEndpoints: true,
      enableCategoryEndpoints: true,
      enableTagEndpoints: true,
      enableValidationEndpoint: true,
      debugMode: false,
      ...config.featureFlags,
    },
  };
}
