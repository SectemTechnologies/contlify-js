import type { RequestContext } from "../core/request-context.js";
import type { ResolvedContlifyConfig } from "../config/contlify-config.js";
import type { ContlifyAdapter } from "../adapters/adapter.interface.js";

/**
 * Context provided to each individual route handler during execution.
 */
export interface RouteContext {
  /**
   * Universal HTTP Request abstraction.
   */
  request: RequestContext;

  /**
   * Resolved package configuration.
   */
  config: ResolvedContlifyConfig;

  /**
   * User database storage adapter (if provided).
   */
  adapter?: ContlifyAdapter;

  /**
   * Dynamic URL route path parameters (e.g. { slug: "my-first-post" }).
   */
  params: Record<string, string>;
}
