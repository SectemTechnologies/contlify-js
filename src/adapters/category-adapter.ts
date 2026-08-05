import type { Category } from "../types/domain.js";
import type { CategoryPayload } from "../types/payload.js";

/**
 * Storage adapter contract for managing Category operations.
 */
export interface CategoryAdapterContract {
  getCategoryBySlug?(slug: string): Promise<Category | null>;
  getCategories?(): Promise<Category[] | Record<string, unknown>[]>;
  upsertCategory?(payload: CategoryPayload): Promise<Category>;
  deleteCategory?(slug: string): Promise<boolean>;
}
