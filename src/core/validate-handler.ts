import type { RouteContext } from "../routing/route-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";

/**
 * Route handler for GET /validate endpoint.
 * Verifies API connectivity, system configuration, and adapter health status.
 */
export async function handleValidate(ctx: RouteContext): Promise<Response> {
  const adapter = ctx.adapter;
  let adapterConnected = false;

  if (adapter) {
    if (typeof adapter.ping === "function") {
      try {
        adapterConnected = await adapter.ping();
      } catch (err) {
        ctx.config.logger.warn("Adapter ping health check threw an error:", err);
        adapterConnected = false;
      }
    } else {
      adapterConnected = true;
    }
  }

  const payload = {
    valid: true,
    version: "0.1.0",
    status: "healthy",
    adapterConnected,
    capabilities: {
      posts: Boolean(adapter?.createPost || adapter?.posts?.createPost || adapter?.posts?.upsertPost || adapter?.upsertPost),
      authors: Boolean(adapter?.getAuthors || adapter?.authors?.getAuthors),
      categories: Boolean(adapter?.getCategories || adapter?.categories?.getCategories),
      tags: Boolean(adapter?.getTags || adapter?.tags?.getTags),
    },
  };

  return ResponseBuilder.toJsonResponse(ResponseBuilder.success(payload), HttpStatus.OK);
}
