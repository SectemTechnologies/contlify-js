import type { ValidatorContract, ValidationResult } from "./validator.interface.js";

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  custom_slug?: string;
  description?: string;
  cover_image?: string;
  coverImage?: string | { url?: string };
}

/**
 * Native zero-dependency validator for incoming category update payloads (PATCH / PUT).
 */
export class CategoryPayloadValidator implements ValidatorContract<CategoryUpdateInput> {
  public async validate(data: unknown): Promise<ValidationResult<CategoryUpdateInput>> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data || typeof data !== "object") {
      return {
        success: false,
        errors: [{ field: "payload", message: "Request body must be a valid JSON object" }],
      };
    }

    const payloadObj = data as Record<string, unknown>;
    const keys = Object.keys(payloadObj);
    if (keys.length === 0) {
      return {
        success: false,
        errors: [{ field: "payload", message: "At least one field (name, slug, description, or cover_image) must be provided to update" }],
      };
    }

    if (payloadObj.name !== undefined) {
      if (typeof payloadObj.name !== "string" || payloadObj.name.trim() === "") {
        errors.push({ field: "name", message: "Field 'name' must be a non-empty string if provided" });
      }
    }

    if (payloadObj.slug !== undefined && typeof payloadObj.slug !== "string") {
      errors.push({ field: "slug", message: "Field 'slug' must be a string if provided" });
    }

    if (payloadObj.custom_slug !== undefined && typeof payloadObj.custom_slug !== "string") {
      errors.push({ field: "custom_slug", message: "Field 'custom_slug' must be a string if provided" });
    }

    if (payloadObj.description !== undefined && typeof payloadObj.description !== "string") {
      errors.push({ field: "description", message: "Field 'description' must be a string if provided" });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const normalizedPayload: CategoryUpdateInput = {
      name: typeof payloadObj.name === "string" ? payloadObj.name.trim() : undefined,
      slug: typeof payloadObj.slug === "string" ? payloadObj.slug.trim() : undefined,
      custom_slug: typeof payloadObj.custom_slug === "string" ? payloadObj.custom_slug.trim() : undefined,
      description: typeof payloadObj.description === "string" ? payloadObj.description : undefined,
      cover_image: typeof payloadObj.cover_image === "string" ? payloadObj.cover_image : undefined,
      coverImage: (payloadObj.coverImage ?? payloadObj.cover_image) as string | { url?: string } | undefined,
    };

    return {
      success: true,
      data: normalizedPayload,
    };
  }
}
