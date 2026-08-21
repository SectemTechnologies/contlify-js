import type { RouteContext } from "../routing/route-context.js";
import { UpdatePayloadValidator } from "../validation/update-payload-validator.js";
import { RouteParamValidator } from "../validation/route-param-validator.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { slugify } from "../utils/slugify.js";
import { optimizeContentImages } from "../utils/image-transformer.js";
import { HttpStatus } from "../utils/http-status.js";
import { ErrorCode } from "../errors/error-codes.js";
import { AdapterError } from "../errors/adapter-error.js";

const updateValidator = new UpdatePayloadValidator();

/**
 * Route handler for PATCH /posts/:id and PUT /posts/:id endpoints.
 * Handles post update pipeline with responsive image optimization.
 */
export async function handleUpdatePost(ctx: RouteContext): Promise<Response> {
  // 1. Validate route parameter (:id)
  const paramResult = RouteParamValidator.validateParam(ctx.params, "id");
  if (!paramResult.success || !paramResult.data) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.error("Invalid route parameter", ErrorCode.BAD_REQUEST, paramResult.errors),
      HttpStatus.BAD_REQUEST
    );
  }

  const postIdOrSlug = paramResult.data;
  const jsonBody = await ctx.request.json();

  // 2. Validate update payload
  const validationResult = await updateValidator.validate(jsonBody);
  if (!validationResult.success || !validationResult.data) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.error("Update payload validation failed", ErrorCode.VALIDATION_ERROR, validationResult.errors),
      HttpStatus.BAD_REQUEST
    );
  }

  const payload = validationResult.data;

  // Optimize content images if updated content string was provided
  const content = typeof payload.content === "string" ? optimizeContentImages(payload.content) : undefined;

  // 3. Re-calculate slug and URL only if custom_slug or slug is explicitly provided
  let slug: string | undefined = undefined;
  const rawSlug = payload.custom_slug ?? payload.slug;
  if (typeof rawSlug === "string" && rawSlug.trim() !== "") {
    slug = slugify(rawSlug.trim());
  }


  let postUrl: string | undefined = undefined;
  if (slug) {
    const postForUrl = { ...payload, ...(content ? { content } : {}), slug };
    const resolver = ctx.config.getPostUrl ?? ctx.config.buildPostUrl;
    if (resolver) {
      try {
        postUrl = resolver(postForUrl);
      } catch (err) {
        ctx.config.logger.warn("Custom getPostUrl callback threw an error during update:", err);
        postUrl = `/blog/${slug}`;
      }
    } else {
      postUrl = `/blog/${slug}`;
    }
  }

  const enrichedPayload = {
    ...payload,
    ...(content ? { content } : {}),
    ...(slug ? { slug, custom_slug: slug } : {}),
    ...(postUrl ? { post_url: postUrl } : {}),
  };

  // 4. Adapter Invocation
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let updateFn: ((id: string, payload: Record<string, unknown>) => Promise<unknown>) | null = null;

  if (typeof adapter.updatePost === "function") {
    updateFn = adapter.updatePost.bind(adapter) as (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  } else if (adapter.posts && typeof adapter.posts.updatePost === "function") {
    updateFn = adapter.posts.updatePost.bind(adapter.posts) as (
      id: string,
      payload: Record<string, unknown>
    ) => Promise<unknown>;
  }

  if (!updateFn) {
    throw new AdapterError("Configured adapter does not implement updatePost method");
  }

  let adapterResult: unknown;
  try {
    adapterResult = await updateFn(postIdOrSlug, enrichedPayload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Adapter update post execution failed";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }

  // 5. Build standardized response
  const resultObj = (typeof adapterResult === "object" && adapterResult !== null ? adapterResult : {}) as Record<
    string,
    unknown
  >;

  const returnedId =
    (resultObj.postId as string) ??
    (resultObj.post_id as string) ??
    (resultObj.id as string) ??
    postIdOrSlug;

  const finalUrl = (resultObj.post_url as string) ?? (resultObj.url as string) ?? postUrl ?? "";

  const responseBody = {
    status: "success",
    post_id: returnedId,
    post_url: finalUrl,
    data: adapterResult,
  };

  return ResponseBuilder.toJsonResponse(responseBody, HttpStatus.OK);
}
