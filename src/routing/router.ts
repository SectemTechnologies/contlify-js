import type { HttpMethod } from "../types/http.js";
import type { RouteDefinition, RouteHandler, RouteMatchResult } from "./route.interface.js";
import type { IRouter } from "./router.interface.js";
import type { RequestContext } from "../core/request-context.js";
import type { ResolvedContlifyConfig } from "../config/contlify-config.js";
import { NotFoundError } from "../errors/not-found-error.js";
import { ContlifyError } from "../errors/contlify-error.js";
import { ErrorCode } from "../errors/error-codes.js";
import { HttpStatus } from "../utils/http-status.js";
import { ResponseBuilder } from "../responses/response-builder.js";

/**
 * Modern lightweight internal router engine for Contlify API.
 */
export class Router implements IRouter {
  private readonly routes: RouteDefinition[] = [];

  /**
   * Register a route handler for a given HTTP method and path pattern.
   */
  public register(method: HttpMethod, path: string, handler: RouteHandler, description?: string): void {
    const normalizedPath = this.normalizePath(path);
    this.routes.push({
      method: method.toUpperCase() as HttpMethod,
      path: normalizedPath,
      handler,
      description,
    });
  }

  /**
   * Returns all registered routes.
   */
  public getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  /**
   * Matches request method and path against registered route patterns.
   */
  public match(method: HttpMethod, pathname: string): RouteMatchResult | null {
    const normalizedTarget = this.normalizePath(pathname);
    const upperMethod = method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== upperMethod) {
        continue;
      }

      const params = this.matchPathPattern(route.path, normalizedTarget);
      if (params !== null) {
        return { route, params };
      }
    }

    return null;
  }

  /**
   * Dispatches an incoming request context to its matching route handler.
   */
  public async dispatch(request: RequestContext, config: ResolvedContlifyConfig): Promise<Response> {
    try {
      // Strip path prefix if configured
      let relativePath = request.path;
      if (config.apiPathPrefix && relativePath.startsWith(config.apiPathPrefix)) {
        relativePath = relativePath.slice(config.apiPathPrefix.length);
      }
      if (!relativePath.startsWith("/")) {
        relativePath = `/${relativePath}`;
      }

      const match = this.match(request.method, relativePath);

      if (!match) {
        // Check if path exists under a different HTTP method for 405 Method Not Allowed
        const isPathMatchedByOtherMethod = this.routes.some(
          (r) => this.matchPathPattern(r.path, relativePath) !== null
        );

        if (isPathMatchedByOtherMethod) {
          throw new ContlifyError(`Method ${request.method} not allowed for path ${request.path}`, {
            code: ErrorCode.METHOD_NOT_ALLOWED,
            statusCode: HttpStatus.METHOD_NOT_ALLOWED,
          });
        }

        throw new NotFoundError(`Route ${request.method} ${request.path} not found`);
      }

      const routeCtx = {
        request,
        config,
        adapter: config.adapter,
        params: match.params,
      };

      return await match.route.handler(routeCtx);
    } catch (error) {
      config.logger.error("Routing dispatch error", error);
      return ResponseBuilder.fromError(error);
    }
  }

  /**
   * Normalizes path string by ensuring leading slash and stripping trailing slash.
   */
  private normalizePath(path: string): string {
    let p = path.trim();
    if (!p.startsWith("/")) {
      p = `/${p}`;
    }
    if (p.length > 1 && p.endsWith("/")) {
      p = p.slice(0, -1);
    }
    return p;
  }

  /**
   * Matches route pattern (e.g., "/posts/:slug") against actual path (e.g., "/posts/hello-world").
   */
  private matchPathPattern(pattern: string, path: string): Record<string, string> | null {
    const patternSegments = pattern.split("/").filter(Boolean);
    const pathSegments = path.split("/").filter(Boolean);

    if (patternSegments.length !== pathSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i]!;
      const pathSeg = pathSegments[i]!;

      if (patternSeg.startsWith(":")) {
        const paramName = patternSeg.slice(1);
        params[paramName] = decodeURIComponent(pathSeg);
      } else if (patternSeg.toLowerCase() !== pathSeg.toLowerCase()) {
        return null;
      }
    }

    return params;
  }
}
