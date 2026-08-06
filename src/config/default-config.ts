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
 * Never invents a default API key — missing key fails auth with a clear message.
 */
export function resolveConfig(config: ContlifyConfig): ResolvedContlifyConfig {
  const envApiKey = typeof process !== "undefined" ? process?.env?.CONTLIFY_API_KEY : undefined;
  // Prefer explicit config; fall back to env only (no hardcoded demo key)
  const apiKey = (config.apiKey || envApiKey || "").trim();

  const logger = config.logger ?? defaultLogger;
  if (!apiKey) {
    logger.warn(
      "CONTLIFY_API_KEY is not set. Contlify verify/publish will fail until you set createContlifyHandler({ apiKey }) or process.env.CONTLIFY_API_KEY."
    );
  }

  const urlResolver = config.getPostUrl ?? config.buildPostUrl;
  const envSiteUrl = typeof process !== "undefined" ? process?.env?.CONTLIFY_SITE_URL : undefined;

  return {
    apiKey,
    adapter: config.adapter,
    apiPathPrefix: config.apiPathPrefix ?? "/api/contlify",
    logger,
    getPostUrl: urlResolver,
    buildPostUrl: urlResolver,
    siteName: config.siteName,
    siteUrl: config.siteUrl || envSiteUrl,
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
