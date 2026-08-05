import type { HttpMethod } from "../types/http.js";
import type { RouteContext } from "./route-context.js";

/**
 * Route handler function contract. Returns a Web API Response or raw data.
 */
export type RouteHandler = (ctx: RouteContext) => Promise<Response>;

/**
 * Interface describing a registered API route.
 */
export interface RouteDefinition {
  method: HttpMethod;
  path: string; // e.g., "/validate", "/posts", "/posts/:slug"
  handler: RouteHandler;
  description?: string;
}

/**
 * Result of matching a request path against registered routes.
 */
export interface RouteMatchResult {
  route: RouteDefinition;
  params: Record<string, string>;
}
