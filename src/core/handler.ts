import type { ContlifyConfig } from "../config/contlify-config.js";
import { resolveConfig } from "../config/default-config.js";
import { Router } from "../routing/router.js";
import { RequestContext } from "./request-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";
import { ErrorCode } from "../errors/error-codes.js";

/**
 * Contlify Handler signature returned by createContlifyHandler.
 * Compatible with Next.js App Router (route handlers), Pages Router, and Web Standard HTTP servers.
 */
export type ContlifyHandler = (req: Request | unknown) => Promise<Response>;

/**
 * Initializes Contlify architecture, configures routing infrastructure, and creates standard API handler.
 *
 * @param userConfig Configuration options including API key and custom storage adapter.
 * @returns Web API standard handler function.
 */
export function createContlifyHandler(userConfig: ContlifyConfig): ContlifyHandler {
  const config = resolveConfig(userConfig);
  const router = new Router();

  // ------------------------------------------------------------------
  // Register Skeleton Route Framework (Phase 1 Infrastructure)
  // ------------------------------------------------------------------

  // 1. Validation route: /validate
  router.register(
    "GET",
    "/validate",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.success({
          status: "healthy",
          architecture: "contlify-phase-1",
          capabilities: {
            posts: true,
            authors: true,
            categories: true,
            tags: true,
          },
        }),
        HttpStatus.OK
      );
    },
    "Validates Contlify API configuration and health"
  );

  router.register(
    "POST",
    "/validate",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.success({
          status: "healthy",
          architecture: "contlify-phase-1",
        }),
        HttpStatus.OK
      );
    },
    "Validates API key and payload structure"
  );

  // 2. Posts routes: /posts, /posts/:slug
  router.register(
    "POST",
    "/posts",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error(
          "Publishing posts is not implemented yet in Phase 1 Architecture",
          ErrorCode.NOT_IMPLEMENTED
        ),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Publish or update a blog post"
  );

  router.register(
    "GET",
    "/posts/:slug",
    async (ctx) => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error(
          `Fetching post '${ctx.params.slug}' is not implemented yet in Phase 1 Architecture`,
          ErrorCode.NOT_IMPLEMENTED
        ),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Retrieve post by slug"
  );

  router.register(
    "DELETE",
    "/posts/:slug",
    async (ctx) => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error(
          `Deleting post '${ctx.params.slug}' is not implemented yet in Phase 1 Architecture`,
          ErrorCode.NOT_IMPLEMENTED
        ),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Delete post by slug"
  );

  // 3. Authors routes: /authors
  router.register(
    "POST",
    "/authors",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error("Author management is not implemented yet in Phase 1 Architecture", ErrorCode.NOT_IMPLEMENTED),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Upsert author payload"
  );

  // 4. Categories routes: /categories
  router.register(
    "POST",
    "/categories",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error("Category management is not implemented yet in Phase 1 Architecture", ErrorCode.NOT_IMPLEMENTED),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Upsert category payload"
  );

  // 5. Tags routes: /tags
  router.register(
    "POST",
    "/tags",
    async () => {
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error("Tag management is not implemented yet in Phase 1 Architecture", ErrorCode.NOT_IMPLEMENTED),
        HttpStatus.NOT_IMPLEMENTED
      );
    },
    "Upsert tag payload"
  );

  // Main HTTP execution handler
  return async function handler(req: Request | unknown): Promise<Response> {
    const requestContext = await RequestContext.fromRequest(req);
    return await router.dispatch(requestContext, config);
  };
}
