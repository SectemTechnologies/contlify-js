import type { RouteContext } from "../routing/route-context.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";
import { AdapterError } from "../errors/adapter-error.js";

/**
 * Route handler for GET /categories endpoint.
 */
export async function handleGetCategories(ctx: RouteContext): Promise<Response> {
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let getCategoriesFn: (() => Promise<unknown>) | null = null;

  if (typeof adapter.getCategories === "function") {
    getCategoriesFn = adapter.getCategories.bind(adapter);
  } else if (adapter.categories && typeof adapter.categories.getCategories === "function") {
    getCategoriesFn = adapter.categories.getCategories.bind(adapter.categories);
  }

  if (!getCategoriesFn) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.success([], { message: "Adapter does not implement getCategories; returned empty array." }),
      HttpStatus.OK
    );
  }

  try {
    const categories = await getCategoriesFn();
    return ResponseBuilder.toJsonResponse(ResponseBuilder.success(categories), HttpStatus.OK);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to retrieve categories from adapter";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }
}
