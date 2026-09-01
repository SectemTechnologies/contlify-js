import type { ContlifyConfig } from "../config/contlify-config.js";
import { resolveConfig } from "../config/default-config.js";
import { Router } from "../routing/router.js";
import { RequestContext } from "./request-context.js";
import { handleCreatePost, handleGetPostById } from "./posts-handler.js";
import { handleUpdatePost } from "./update-post-handler.js";
import { handleValidate } from "./validate-handler.js";
import { handleGetAuthors } from "./authors-handler.js";
import { handleGetCategories } from "./categories-handler.js";
import { handleUpdateCategory } from "./update-category-handler.js";
import { handleGetTags } from "./tags-handler.js";

import { createAuthMiddleware, composePipeline } from "../middleware/index.js";

/**
 * Contlify Handler signature returned by createContlifyHandler.
 * Compatible with Next.js App Router (route handlers), Pages Router, and Web Standard HTTP servers.
 */
export type ContlifyHandler = (req: Request | unknown) => Promise<Response>;

/**
 * Initializes Contlify architecture, configures middleware pipeline, and creates standard API handler.
 *
 * @param userConfig Configuration options including API key, adapter, and URL generator.
 * @returns Web API standard handler function.
 */
export function createContlifyHandler(userConfig?: ContlifyConfig): ContlifyHandler {
  const config = resolveConfig(userConfig);
  const router = new Router();

  // Shared authentication middleware pipeline
  const authMiddleware = createAuthMiddleware();

  // Helper to wrap route handlers with authentication pipeline
  const protectedRoute = (handler: Parameters<typeof composePipeline>[1]) =>
    composePipeline([authMiddleware], handler);

  // ------------------------------------------------------------------
  // Phase 3 Complete HTTP Route Registration Matrix
  // ------------------------------------------------------------------

  // 1. Health & Configuration Validation: GET /validate & GET /health
  router.register(
    "GET",
    "/validate",
    protectedRoute(handleValidate),
    "Validates Contlify configuration, API key authentication, and database adapter health"
  );

  router.register(
    "GET",
    "/health",
    protectedRoute(handleValidate),
    "Health check verifying Contlify configuration and database connection"
  );

  // 2. Publish Post: POST /posts (Phase 2 integration preserved)
  router.register(
    "POST",
    "/posts",
    protectedRoute(handleCreatePost),
    "Publish a new blog post"
  );

  // 3. Get Single Post: GET /posts/:id
  router.register(
    "GET",
    "/posts/:id",
    protectedRoute(handleGetPostById),
    "Fetch a single post by ID or slug"
  );

  // 4. Update Post: PATCH /posts/:id and PUT /posts/:id
  router.register(
    "PATCH",
    "/posts/:id",
    protectedRoute(handleUpdatePost),
    "Partial update of an existing post by ID or slug"
  );

  router.register(
    "PUT",
    "/posts/:id",
    protectedRoute(handleUpdatePost),
    "Full update or replacement of an existing post by ID or slug"
  );

  // 4. Authors Taxonomy: GET /authors
  router.register(
    "GET",
    "/authors",
    protectedRoute(handleGetAuthors),
    "Fetch list of post authors from adapter"
  );

  // 5. Categories Taxonomy: GET /categories, PATCH /categories/:id, PUT /categories/:id
  router.register(
    "GET",
    "/categories",
    protectedRoute(handleGetCategories),
    "Fetch list of post categories from adapter"
  );

  router.register(
    "PATCH",
    "/categories/:id",
    protectedRoute(handleUpdateCategory),
    "Partial update of an existing category by ID or slug"
  );

  router.register(
    "PUT",
    "/categories/:id",
    protectedRoute(handleUpdateCategory),
    "Full update of an existing category by ID or slug"
  );

  // 6. Tags Taxonomy: GET /tags

  router.register(
    "GET",
    "/tags",
    protectedRoute(handleGetTags),
    "Fetch list of post tags from adapter"
  );

  // Main HTTP execution handler
  return async function handler(req: Request | unknown): Promise<Response> {
    const requestContext = await RequestContext.fromRequest(req);
    return await router.dispatch(requestContext, config);
  };
}
