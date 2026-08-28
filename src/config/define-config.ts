import type { ContlifyConfigInput } from "./types.js";

const ACTIVE_CONFIG_KEY = Symbol.for("__contlify_active_config__");

/**
 * Module-level storage for the active project configuration.
 */
let activeConfig: ContlifyConfigInput | null = null;

/**
 * Sets the active configuration instance.
 */
export function setActiveConfig(config: ContlifyConfigInput | null): void {
  if (typeof globalThis !== "undefined") {
    (globalThis as Record<symbol, unknown>)[ACTIVE_CONFIG_KEY] = config;
  }
  activeConfig = config;
}

/**
 * Retrieves the currently active configuration instance, if set.
 */
export function getActiveConfig(): ContlifyConfigInput | null {
  if (typeof globalThis !== "undefined") {
    const stored = (globalThis as Record<symbol, unknown>)[ACTIVE_CONFIG_KEY];
    if (stored) {
      return stored as ContlifyConfigInput;
    }
  }
  return activeConfig;
}

/**
 * Clears the active configuration instance (mainly for test cleanup).
 */
export function clearActiveConfig(): void {
  if (typeof globalThis !== "undefined") {
    delete (globalThis as Record<symbol, unknown>)[ACTIVE_CONFIG_KEY];
  }
  activeConfig = null;
}

/**
 * Helper to define a strongly-typed Contlify configuration in `contlify.config.ts`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "contlify";
 *
 * export default defineConfig({
 *   apiKey: process.env.CONTLIFY_API_KEY,
 *   storage: {
 *     driver: "postgres",
 *     connectionString: process.env.DATABASE_URL,
 *   },
 *   postUrl: "/blog/{slug}",
 * });
 * ```
 */
export function defineConfig(config: ContlifyConfigInput): ContlifyConfigInput {
  setActiveConfig(config);
  return config;
}
