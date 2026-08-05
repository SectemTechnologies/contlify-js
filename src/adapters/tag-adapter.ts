import type { Tag } from "../types/domain.js";
import type { TagPayload } from "../types/payload.js";

/**
 * Storage adapter contract for managing Tag operations.
 */
export interface TagAdapterContract {
  getTagBySlug(slug: string): Promise<Tag | null>;
  upsertTag(payload: TagPayload): Promise<Tag>;
  deleteTag(slug: string): Promise<boolean>;
}
