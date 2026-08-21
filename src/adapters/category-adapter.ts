import type { Category } from "../types/domain.js";
import type { CategoryPayload } from "../types/payload.js";

/**
 * Storage adapter contract for managing Category operations.
 */
export interface CategoryAdapterContract {
  getCategoryBySlug?(slug: string): Promise<Category | null>;
  getCategories?(): Promise<Category[] | Record<string, unknown>[]>;
  upsertCategory?(payload: CategoryPayload): Promise<Category>;
  updateCategory?(idOrSlug: string, payload: Partial<CategoryPayload> & Record<string, unknown>): Promise<Category | Record<string, unknown>>;
  deleteCategory?(slug: string): Promise<boolean>;
}

