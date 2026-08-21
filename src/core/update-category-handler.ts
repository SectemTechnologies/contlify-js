import type { RouteContext } from "../routing/route-context.js";
import { CategoryPayloadValidator } from "../validation/category-payload-validator.js";
import { RouteParamValidator } from "../validation/route-param-validator.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { slugify } from "../utils/slugify.js";
import { HttpStatus } from "../utils/http-status.js";
import { ErrorCode } from "../errors/error-codes.js";
import { AdapterError } from "../errors/adapter-error.js";

const categoryValidator = new CategoryPayloadValidator();

/**
 * Route handler for PATCH /categories/:id and PUT /categories/:id endpoints.
 * Allows updating category name, slug, description, and metadata.
 */
export async function handleUpdateCategory(ctx: RouteContext): Promise<Response> {
  // 1. Validate route parameter (:id)
  const paramResult = RouteParamValidator.validateParam(ctx.params, "id");
  if (!paramResult.success || !paramResult.data) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.error("Invalid route parameter", ErrorCode.BAD_REQUEST, paramResult.errors),
      HttpStatus.BAD_REQUEST
    );
  }

  const categoryIdOrSlug = paramResult.data;
  const jsonBody = await ctx.request.json();

  // 2. Validate update payload
  const validationResult = await categoryValidator.validate(jsonBody);
  if (!validationResult.success || !validationResult.data) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.error("Category update payload validation failed", ErrorCode.VALIDATION_ERROR, validationResult.errors),
      HttpStatus.BAD_REQUEST
    );
  }

  const payload = validationResult.data;

  // 3. Normalize slug if custom_slug or slug is passed, or auto-generate from name
  let slug: string | undefined = undefined;
  const rawSlug = payload.custom_slug ?? payload.slug;
  if (typeof rawSlug === "string" && rawSlug.trim() !== "") {
    slug = slugify(rawSlug.trim());
  } else if (payload.name) {
    slug = slugify(payload.name);
  }


  const coverImage =
    typeof payload.coverImage === "string"
      ? payload.coverImage
      : typeof payload.coverImage === "object"
        ? payload.coverImage?.url
        : payload.cover_image;

  const enrichedPayload = {
    ...payload,
    ...(slug ? { slug } : {}),
    ...(coverImage ? { coverImage, cover_image: coverImage } : {}),
  };

  // 4. Adapter Invocation
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let updateFn: ((id: string, payload: Record<string, unknown>) => Promise<unknown>) | null = null;

  if (typeof adapter.updateCategory === "function") {
    updateFn = adapter.updateCategory.bind(adapter) as (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  } else if (adapter.categories && typeof adapter.categories.updateCategory === "function") {
    updateFn = adapter.categories.updateCategory.bind(adapter.categories) as (
      id: string,
      payload: Record<string, unknown>
    ) => Promise<unknown>;
  }

  if (!updateFn) {
    throw new AdapterError("Configured adapter does not implement updateCategory method");
  }

  let adapterResult: unknown;
  try {
    adapterResult = await updateFn(categoryIdOrSlug, enrichedPayload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Adapter update category execution failed";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }

  const responseBody = {
    status: "success",
    category_id: categoryIdOrSlug,
    data: adapterResult,
  };

  return ResponseBuilder.toJsonResponse(responseBody, HttpStatus.OK);
}
