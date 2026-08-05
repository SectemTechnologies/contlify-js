import type { ValidatorContract, ValidationResult } from "./validator.interface.js";
import type { PublishPostPayload } from "../types/payload.js";
import type { PostStatus, MediaAsset } from "../types/domain.js";

const VALID_STATUSES: PostStatus[] = ["draft", "published", "archived", "scheduled"];

/**
 * Validator for incoming blog post publish payloads.
 */
export class PublishPayloadValidator implements ValidatorContract<PublishPostPayload & Record<string, unknown>> {
  /**
   * Validates publish request payload.
   */
  public async validate(data: unknown): Promise<ValidationResult<PublishPostPayload & Record<string, unknown>>> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data || typeof data !== "object") {
      return {
        success: false,
        errors: [{ field: "payload", message: "Request body must be a valid JSON object" }],
      };
    }

    const payloadObj = data as Record<string, unknown>;
    // Support either direct payload or nested { post: ... } container payload
    const postData = (payloadObj.post && typeof payloadObj.post === "object" ? payloadObj.post : payloadObj) as Record<
      string,
      unknown
    >;

    // 1. Title validation
    if (!postData.title || typeof postData.title !== "string" || postData.title.trim() === "") {
      errors.push({ field: "title", message: "Field 'title' is required and must be a non-empty string" });
    }

    // 2. Content validation
    if (!postData.content || typeof postData.content !== "string" || postData.content.trim() === "") {
      errors.push({ field: "content", message: "Field 'content' is required and must be a non-empty string" });
    }

    // 3. Status validation
    if (!postData.status || typeof postData.status !== "string") {
      errors.push({
        field: "status",
        message: `Field 'status' is required. Allowed values: ${VALID_STATUSES.join(", ")}`,
      });
    } else if (!VALID_STATUSES.includes(postData.status.toLowerCase() as PostStatus)) {
      errors.push({
        field: "status",
        message: `Invalid status '${postData.status}'. Allowed values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // 4. Optional custom_slug / slug validation
    const customSlug = postData.custom_slug ?? postData.slug;
    if (customSlug !== undefined && typeof customSlug !== "string") {
      errors.push({ field: "custom_slug", message: "Field 'custom_slug' must be a string if provided" });
    }

    // 5. Optional categories & tags arrays validation
    if (postData.categories !== undefined && !Array.isArray(postData.categories)) {
      errors.push({ field: "categories", message: "Field 'categories' must be an array if provided" });
    }
    if (postData.tags !== undefined && !Array.isArray(postData.tags)) {
      errors.push({ field: "tags", message: "Field 'tags' must be an array if provided" });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Normalize and construct clean PublishPostPayload object
    const normalizedPayload: PublishPostPayload & Record<string, unknown> = {
      title: (postData.title as string).trim(),
      content: postData.content as string,
      status: (postData.status as string).toLowerCase() as PostStatus,
      custom_slug: typeof customSlug === "string" ? customSlug.trim() : undefined,
      slug: typeof customSlug === "string" ? customSlug.trim() : undefined,
      subtitle: typeof postData.subtitle === "string" ? postData.subtitle : undefined,
      excerpt: typeof postData.excerpt === "string" ? postData.excerpt : undefined,
      author: postData.author as PublishPostPayload["author"],
      categories: postData.categories as PublishPostPayload["categories"],
      tags: postData.tags as PublishPostPayload["tags"],
      featured_image: (postData.featured_image ?? postData.coverImage) as MediaAsset | string | undefined,
      coverImage: (postData.coverImage ?? postData.featured_image) as MediaAsset | string | undefined,
      meta_title: typeof postData.meta_title === "string" ? postData.meta_title : undefined,
      meta_description: typeof postData.meta_description === "string" ? postData.meta_description : undefined,
      seo: postData.seo as PublishPostPayload["seo"],
      publishedAt: typeof postData.publishedAt === "string" ? postData.publishedAt : undefined,
      customFields: typeof postData.customFields === "object" ? (postData.customFields as Record<string, unknown>) : undefined,
      ...postData, // Keep all extra fields without breaking extensions
    };

    return {
      success: true,
      data: normalizedPayload,
    };
  }
}
