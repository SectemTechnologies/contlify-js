import type { RouteContext } from "../routing/route-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";
import { AdapterError } from "../errors/adapter-error.js";

/**
 * Route handler for GET /tags endpoint.
 */
export async function handleGetTags(ctx: RouteContext): Promise<Response> {
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let getTagsFn: (() => Promise<unknown>) | null = null;

  if (typeof adapter.getTags === "function") {
    getTagsFn = adapter.getTags.bind(adapter);
  } else if (adapter.tags && typeof adapter.tags.getTags === "function") {
    getTagsFn = adapter.tags.getTags.bind(adapter.tags);
  }

  if (!getTagsFn) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.success([], { message: "Adapter does not implement getTags; returned empty array." }),
      HttpStatus.OK
    );
  }

  try {
    const tags = await getTagsFn();
    return ResponseBuilder.toJsonResponse(ResponseBuilder.success(tags), HttpStatus.OK);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to retrieve tags from adapter";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }
}
