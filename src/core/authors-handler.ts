import type { RouteContext } from "../routing/route-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";
import { AdapterError } from "../errors/adapter-error.js";

/**
 * Route handler for GET /authors endpoint.
 */
export async function handleGetAuthors(ctx: RouteContext): Promise<Response> {
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let getAuthorsFn: (() => Promise<unknown>) | null = null;

  if (typeof adapter.getAuthors === "function") {
    getAuthorsFn = adapter.getAuthors.bind(adapter);
  } else if (adapter.authors && typeof adapter.authors.getAuthors === "function") {
    getAuthorsFn = adapter.authors.getAuthors.bind(adapter.authors);
  }

  if (!getAuthorsFn) {
    // If not implemented on adapter, return standard empty list
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.success([], { message: "Adapter does not implement getAuthors; returned empty array." }),
      HttpStatus.OK
    );
  }

  try {
    const authors = await getAuthorsFn();
    return ResponseBuilder.toJsonResponse(ResponseBuilder.success(authors), HttpStatus.OK);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to retrieve authors from adapter";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }
}
