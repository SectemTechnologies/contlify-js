import type { ContlifyConfig } from "../config/contlify-config.js";
import { resolveConfig } from "../config/default-config.js";
import { Router } from "../routing/router.js";
import { RequestContext } from "./request-context.js";
import { handleCreatePost } from "./posts-handler.js";
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
export function createContlifyHandler(userConfig: ContlifyConfig = {}): ContlifyHandler {
  const config = resolveConfig(userConfig);
  const router = new Router();

  // Create authentication middleware instance
  const authMiddleware = createAuthMiddleware();

  // ------------------------------------------------------------------
  // Phase 2 Route Registration: POST /posts
  // ------------------------------------------------------------------
  const protectedCreatePostHandler = composePipeline([authMiddleware], handleCreatePost);

  router.register(
    "POST",
    "/posts",
    protectedCreatePostHandler,
    "Publish or update a blog post with authentication and payload validation"
  );

  // Main HTTP execution handler
  return async function handler(req: Request | unknown): Promise<Response> {
    const requestContext = await RequestContext.fromRequest(req);
    return await router.dispatch(requestContext, config);
  };
}
