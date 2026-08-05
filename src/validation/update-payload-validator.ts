import type { ValidatorContract, ValidationResult } from "./validator.interface.js";
import type { PublishPostPayload } from "../types/payload.js";
import type { PostStatus, MediaAsset } from "../types/domain.js";

const VALID_STATUSES: PostStatus[] = ["draft", "published", "archived", "scheduled"];

/**
 * Validator for incoming blog post update payloads (PATCH / PUT).
 */
export class UpdatePayloadValidator
  implements ValidatorContract<Partial<PublishPostPayload> & Record<string, unknown>>
{
  /**
   * Validates update request payload.
   */
  public async validate(
    data: unknown
  ): Promise<ValidationResult<Partial<PublishPostPayload> & Record<string, unknown>>> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data || typeof data !== "object") {
      return {
        success: false,
        errors: [{ field: "payload", message: "Request body must be a valid JSON object" }],
      };
    }

    const payloadObj = data as Record<string, unknown>;
    const postData = (payloadObj.post && typeof payloadObj.post === "object" ? payloadObj.post : payloadObj) as Record<
      string,
      unknown
    >;

    const keys = Object.keys(postData);
    if (keys.length === 0) {
      return {
        success: false,
        errors: [{ field: "payload", message: "Update payload must contain at least one field to update" }],
      };
    }

    // 1. Validate title if provided
    if (postData.title !== undefined) {
      if (typeof postData.title !== "string" || postData.title.trim() === "") {
        errors.push({ field: "title", message: "Field 'title' must be a non-empty string if provided" });
      }
    }

    // 2. Validate content if provided
    if (postData.content !== undefined) {
      if (typeof postData.content !== "string" || postData.content.trim() === "") {
        errors.push({ field: "content", message: "Field 'content' must be a non-empty string if provided" });
      }
    }

    // 3. Validate status if provided
    if (postData.status !== undefined) {
      if (typeof postData.status !== "string") {
        errors.push({
          field: "status",
          message: `Field 'status' must be a string. Allowed values: ${VALID_STATUSES.join(", ")}`,
        });
      } else if (!VALID_STATUSES.includes(postData.status.toLowerCase() as PostStatus)) {
        errors.push({
          field: "status",
          message: `Invalid status '${postData.status}'. Allowed values: ${VALID_STATUSES.join(", ")}`,
        });
      }
    }

    // 4. Validate custom_slug if provided
    const customSlug = postData.custom_slug ?? postData.slug;
    if (customSlug !== undefined && typeof customSlug !== "string") {
      errors.push({ field: "custom_slug", message: "Field 'custom_slug' must be a string if provided" });
    }

    // 5. Validate categories & tags arrays if provided
    if (postData.categories !== undefined && !Array.isArray(postData.categories)) {
      errors.push({ field: "categories", message: "Field 'categories' must be an array if provided" });
    }
    if (postData.tags !== undefined && !Array.isArray(postData.tags)) {
      errors.push({ field: "tags", message: "Field 'tags' must be an array if provided" });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const normalizedPayload: Partial<PublishPostPayload> & Record<string, unknown> = {
      ...postData,
      title: typeof postData.title === "string" ? postData.title.trim() : undefined,
      content: typeof postData.content === "string" ? postData.content : undefined,
      status: typeof postData.status === "string" ? (postData.status.toLowerCase() as PostStatus) : undefined,
      custom_slug: typeof customSlug === "string" ? customSlug.trim() : undefined,
      slug: typeof customSlug === "string" ? customSlug.trim() : undefined,
      featured_image: (postData.featured_image ?? postData.coverImage) as MediaAsset | string | undefined,
      coverImage: (postData.coverImage ?? postData.featured_image) as MediaAsset | string | undefined,
    };

    return {
      success: true,
      data: normalizedPayload,
    };
  }
}
