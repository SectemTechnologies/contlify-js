import type { ContlifyConfigInput, ResolvedContlifyConfig, LoggerContract, UrlBuilderFunction } from "./types.js";
import { getActiveConfig } from "./define-config.js";
import { resolveStorageAdapter } from "./storage-resolver.js";
import type { Post } from "../types/domain.js";

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
 * Helper to construct a URL builder function from string template or custom function.
 */
function createUrlResolver(
  postUrl?: string | UrlBuilderFunction,
  legacyGetPostUrl?: UrlBuilderFunction,
  legacyBuildPostUrl?: UrlBuilderFunction
): UrlBuilderFunction | undefined {
  if (typeof postUrl === "function") {
    return postUrl;
  }
  if (typeof postUrl === "string") {
    return (post: Post | { slug: string; [key: string]: unknown }) => {
      const slug = post.slug || "";
      return postUrl.replace(/{slug}/g, slug);
    };
  }
  return legacyGetPostUrl ?? legacyBuildPostUrl;
}

/**
 * Resolves user config against default values, active configuration, and environment variables.
 */
export function resolveConfig(userConfig?: ContlifyConfigInput): ResolvedContlifyConfig {
  const active = getActiveConfig() ?? {};
  const config = userConfig && Object.keys(userConfig).length > 0
    ? { ...active, ...userConfig }
    : active;
  let envApiKey: string | undefined = undefined;
  if (typeof process !== "undefined" && process?.env) {
    envApiKey = process.env.CONTLIFY_API_KEY || (process.env as any)["CONTLIFY_API_KEY"];
  }
  if (!envApiKey && typeof (globalThis as any).CONTLIFY_API_KEY === "string") {
    envApiKey = (globalThis as any).CONTLIFY_API_KEY;
  }
  if (!envApiKey) {
    try {
      const metaEnv = (new Function("try { return import.meta.env; } catch { return undefined; }"))();
      envApiKey = metaEnv?.CONTLIFY_API_KEY;
    } catch {}
  }
  const apiKey = config.apiKey || envApiKey || "";

  let storageConfig = config.storage;
  if (!storageConfig && !config.adapter && typeof process !== "undefined" && process?.env?.DATABASE_URL) {
    storageConfig = {
      driver: "postgres",
      connectionString: process.env.DATABASE_URL,
    };
  }

  const adapter = resolveStorageAdapter(storageConfig, config.adapter);

  const apiPathPrefix = config.api?.path ?? config.apiPath ?? config.apiPathPrefix ?? "/api/contlify";
  const urlResolver = createUrlResolver(config.postUrl, config.getPostUrl, config.buildPostUrl);

  return {
    apiKey,
    adapter,
    storage: config.storage,
    apiPathPrefix,
    postUrl: config.postUrl,
    getPostUrl: urlResolver,
    buildPostUrl: urlResolver,
    autoMigrate: config.autoMigrate ?? false,
    security: {
      maxBodyBytes: config.security?.maxBodyBytes ?? 2_000_000,
      allowLegacyApiKeyHeader: config.security?.allowLegacyApiKeyHeader ?? true,
    },
    logger: config.logger ?? defaultLogger,
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
