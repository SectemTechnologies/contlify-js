import type { RouteContext } from "../routing/route-context.js";
import { PublishPayloadValidator } from "../validation/publish-payload-validator.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { slugify } from "../utils/slugify.js";
import { optimizeContentImages } from "../utils/image-transformer.js";
import { HttpStatus } from "../utils/http-status.js";
import { ErrorCode } from "../errors/error-codes.js";
import { AdapterError } from "../errors/adapter-error.js";

const validator = new PublishPayloadValidator();

/**
 * Route handler for POST /posts endpoint.
 * Handles payload validation, slug generation, responsive image optimization, URL resolution, adapter execution, and standardized response formatting.
 */
export async function handleCreatePost(ctx: RouteContext): Promise<Response> {
  const jsonBody = await ctx.request.json();

  // 1. Payload validation
  const validationResult = await validator.validate(jsonBody);
  if (!validationResult.success || !validationResult.data) {
    return ResponseBuilder.toJsonResponse(
      ResponseBuilder.error(
        "Payload validation failed",
        ErrorCode.VALIDATION_ERROR,
        validationResult.errors
      ),
      HttpStatus.BAD_REQUEST
    );
  }

  const payload = validationResult.data;

  // 2. Responsive Image Optimization
  const optimizedContent = optimizeContentImages(payload.content);

  // 3. Slug generation (Sanitizes custom_slug or falls back to title)
  const rawCustomSlug = payload.custom_slug ?? payload.slug;
  const customSlugStr = typeof rawCustomSlug === "string" ? rawCustomSlug.trim() : undefined;
  const slug = customSlugStr && customSlugStr !== ""
    ? slugify(customSlugStr)
    : slugify(payload.title);

  // 4. Post URL Resolution
  let postUrl = "";
  const postForUrl = { ...payload, content: optimizedContent, slug };

  if (ctx.config.getPostUrl) {
    try {
      postUrl = ctx.config.getPostUrl(postForUrl);
    } catch (err) {
      ctx.config.logger.warn("Custom getPostUrl callback threw an error:", err);
      postUrl = `/blog/post/${slug}`;
    }
  } else if (ctx.config.buildPostUrl) {
    try {
      postUrl = ctx.config.buildPostUrl(postForUrl);
    } catch (err) {
      ctx.config.logger.warn("Custom buildPostUrl callback threw an error:", err);
      postUrl = `/blog/post/${slug}`;
    }
  } else {
    postUrl = `/blog/post/${slug}`;
  }


  // 5. Category Fallback: Default to "Uncategorized" if no categories are provided
  let categories = payload.categories;
  if (!categories || (Array.isArray(categories) && categories.length === 0)) {
    categories = [
      {
        name: "Uncategorized",
        slug: "uncategorized",
        description: "General and uncategorized articles",
      },
    ];
  }

  // Enriched payload passed to adapter
  const enrichedPayload = {
    ...payload,
    content: optimizedContent,
    slug,
    custom_slug: slug,
    post_url: postUrl,
    categories,
  };


  // 5. Adapter Invocation
  const adapter = ctx.adapter;
  if (!adapter) {
    throw new AdapterError("Storage adapter is not configured in Contlify handler options");
  }

  let adapterFn: ((payload: Record<string, unknown>) => Promise<unknown>) | null = null;

  if (typeof adapter.createPost === "function") {
    adapterFn = adapter.createPost.bind(adapter) as (payload: Record<string, unknown>) => Promise<unknown>;
  } else if (typeof adapter.upsertPost === "function") {
    adapterFn = adapter.upsertPost.bind(adapter) as (payload: Record<string, unknown>) => Promise<unknown>;
  } else if (adapter.posts && typeof adapter.posts.createPost === "function") {
    adapterFn = adapter.posts.createPost.bind(adapter.posts) as (payload: Record<string, unknown>) => Promise<unknown>;
  } else if (adapter.posts && typeof adapter.posts.upsertPost === "function") {
    adapterFn = adapter.posts.upsertPost.bind(adapter.posts) as (payload: Record<string, unknown>) => Promise<unknown>;
  }

  if (!adapterFn) {
    throw new AdapterError("Configured adapter does not implement createPost or upsertPost method");
  }

  let adapterResult: unknown;
  try {
    adapterResult = await adapterFn(enrichedPayload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Adapter execution failed";
    throw new AdapterError(errorMsg, undefined, err instanceof Error ? err : undefined);
  }

  // 6. Build standardized response
  const resultObj = (typeof adapterResult === "object" && adapterResult !== null ? adapterResult : {}) as Record<
    string,
    unknown
  >;

  const postId =
    (resultObj.postId as string) ??
    (resultObj.post_id as string) ??
    (resultObj.id as string) ??
    `post_${Date.now()}`;

  const finalUrl = postUrl || ((resultObj.post_url as string) ?? (resultObj.url as string) ?? `/blog/post/${slug}`);

  const responseBody = {
    status: "success",
    post_id: postId,
    post_url: finalUrl,
    data: adapterResult,
  };

  return ResponseBuilder.toJsonResponse(responseBody, HttpStatus.OK);
}
