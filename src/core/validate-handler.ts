import type { RouteContext } from "../routing/route-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";

/** Package version reported to Contlify on GET /validate */
const PACKAGE_VERSION = "1.0.0";

/**
 * Route handler for GET /validate endpoint.
 * Contlify “Test connection” expects WordPress-compatible top-level fields:
 * { status: "success", message, meta_data } plus success/valid for dual clients.
 */
export async function handleValidate(ctx: RouteContext): Promise<Response> {
  const adapter = ctx.adapter;
  let adapterConnected = false;

  // Ping adapter when available so Contlify can surface DB health
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

  const capabilities = {
    posts: Boolean(
      adapter?.createPost ||
        adapter?.posts?.createPost ||
        adapter?.posts?.upsertPost ||
        adapter?.upsertPost
    ),
    authors: Boolean(adapter?.getAuthors || adapter?.authors?.getAuthors),
    categories: Boolean(adapter?.getCategories || adapter?.categories?.getCategories),
    tags: Boolean(adapter?.getTags || adapter?.tags?.getTags),
  };

  // Contlify + WordPress-plugin parity shape (nextpackage.md §5)
  const meta_data = {
    site_name: ctx.config.siteName ?? "Next.js site",
    site_url: ctx.config.siteUrl ?? null,
    platform: "nextjs",
    package_version: PACKAGE_VERSION,
    adapterConnected,
    capabilities,
  };

  const payload = {
    status: "success",
    message: "API key is valid",
    success: true,
    valid: true,
    meta_data,
    // Nested data kept for older package docs / clients
    data: {
      valid: true,
      version: PACKAGE_VERSION,
      status: "healthy",
      adapterConnected,
      capabilities,
    },
  };

  return ResponseBuilder.toJsonResponse(payload, HttpStatus.OK);
}
