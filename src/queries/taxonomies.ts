import type { Category, Tag, Author } from "../types/domain.js";
import type { ContlifyConfigInput } from "../config/types.js";
import { resolveConfig } from "../config/default-config.js";
import { AdapterError } from "../errors/adapter-error.js";

/**
 * Helper to extract configured storage adapter.
 */
function getStorageAdapter(config?: ContlifyConfigInput) {
  const resolved = resolveConfig(config);
  const adapter = resolved.adapter;
  if (!adapter) {
    throw new AdapterError(
      "No database adapter configured. Please define 'storage' in contlify.config.ts or pass a config object."
    );
  }
  return adapter;
}

/**
 * Fetch all blog categories.
 *
 * @example
 * ```ts
 * const categories = await getCategories();
 * ```
 */
export async function getCategories(config?: ContlifyConfigInput): Promise<Category[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getCategories === "function") {
    return (await adapter.getCategories()) as Category[];
  }

  if (adapter.categories && typeof adapter.categories.getCategories === "function") {
    return (await adapter.categories.getCategories()) as Category[];
  }

  return [];
}

/**
 * Fetch all blog tags.
 *
 * @example
 * ```ts
 * const tags = await getTags();
 * ```
 */
export async function getTags(config?: ContlifyConfigInput): Promise<Tag[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getTags === "function") {
    return (await adapter.getTags()) as Tag[];
  }

  if (adapter.tags && typeof adapter.tags.getTags === "function") {
    return (await adapter.tags.getTags()) as Tag[];
  }

  return [];
}

/**
 * Fetch all blog authors.
 *
 * @example
 * ```ts
 * const authors = await getAuthors();
 * ```
 */
export async function getAuthors(config?: ContlifyConfigInput): Promise<Author[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getAuthors === "function") {
    return (await adapter.getAuthors()) as Author[];
  }

  if (adapter.authors && typeof adapter.authors.getAuthors === "function") {
    return (await adapter.authors.getAuthors()) as Author[];
  }

  return [];
}
