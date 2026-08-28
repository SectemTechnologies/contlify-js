import type { ContlifyConfigInput } from "../../config/types.js";
import { createContlifyHandler, type ContlifyHandler } from "../../core/handler.js";

/**
 * Route handler map matching Next.js App Router HTTP method exports.
 */
export interface NextRouteHandlers {
  GET: ContlifyHandler;
  POST: ContlifyHandler;
  PATCH: ContlifyHandler;
  PUT: ContlifyHandler;
  DELETE: ContlifyHandler;
  OPTIONS: ContlifyHandler;
  HEAD: ContlifyHandler;
}

/**
 * Hybrid Next.js route handler that is both a callable request handler
 * and an object containing HTTP method sub-handlers.
 */
export type NextRouteHandler = ContlifyHandler & NextRouteHandlers & {
  handler: ContlifyHandler;
};

/**
 * Creates route handler function(s) for Next.js App Router:
 * `app/api/contlify/v1/[...path]/route.ts`.
 *
 * Supports both export patterns:
 *
 * Pattern 1: Single handler export (Preferred)
 * ```ts
 * const handler = createNextHandler();
 * export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE, handler as OPTIONS, handler as HEAD };
 * ```
 *
 * Pattern 2: Destructured export
 * ```ts
 * export const { GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD } = createNextHandler();
 * ```
 */
export function createNextHandler(userConfig?: ContlifyConfigInput): NextRouteHandler {
  const baseHandler = createContlifyHandler(userConfig);

  const hybridHandler = async function nextRouteHandler(req: Request | unknown): Promise<Response> {
    return baseHandler(req);
  } as NextRouteHandler;

  hybridHandler.GET = baseHandler;
  hybridHandler.POST = baseHandler;
  hybridHandler.PATCH = baseHandler;
  hybridHandler.PUT = baseHandler;
  hybridHandler.DELETE = baseHandler;
  hybridHandler.OPTIONS = baseHandler;
  hybridHandler.HEAD = baseHandler;
  hybridHandler.handler = baseHandler;

  return hybridHandler;
}
