import type { HttpMethod } from "../types/http.js";
import type { RouteDefinition, RouteHandler, RouteMatchResult } from "./route.interface.js";
import type { RequestContext } from "../core/request-context.js";
import type { ResolvedContlifyConfig } from "../config/contlify-config.js";

/**
 * Interface contract for Contlify internal Router.
 */
export interface IRouter {
  /**
   * Registers a new route.
   */
  register(method: HttpMethod, path: string, handler: RouteHandler, description?: string): void;

  /**
   * Matches an incoming HTTP request method & path against registered routes.
   */
  match(method: HttpMethod, pathname: string): RouteMatchResult | null;

  /**
   * Dispatches a request context through the matched route handler.
   */
  dispatch(request: RequestContext, config: ResolvedContlifyConfig): Promise<Response>;

  /**
   * Returns all currently registered route definitions.
   */
  getRoutes(): RouteDefinition[];
}
