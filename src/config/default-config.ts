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
 * Resolves user config against default values and environment variables.
 */
export function resolveConfig(config: ContlifyConfig): ResolvedContlifyConfig {
  const envApiKey = typeof process !== "undefined" ? process?.env?.CONTLIFY_API_KEY : undefined;
  const apiKey = config.apiKey || envApiKey || "";

  const urlResolver = config.getPostUrl ?? config.buildPostUrl;

  return {
    apiKey,
    adapter: config.adapter,
    apiPathPrefix: config.apiPathPrefix ?? "/api/contlify",
    logger: config.logger ?? defaultLogger,
    getPostUrl: urlResolver,
    buildPostUrl: urlResolver,
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
