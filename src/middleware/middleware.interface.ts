import type { RouteContext } from "../routing/route-context.js";

/**
 * Middleware function contract for processing requests before route handlers.
 */
export type ContlifyMiddleware = (
  ctx: RouteContext,
  next: () => Promise<Response>
) => Promise<Response>;
