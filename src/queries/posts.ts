import type { Post, PostStatus } from "../types/domain.js";
import type { PostQueryOptions } from "./query.interface.js";
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
 * Fetch all blog posts, optionally filtered by status, category, tag, or pagination.
 *
 * @example
 * ```ts
 * const posts = await getAllPosts({ status: "published", limit: 10 });
 * ```
 */
export async function getAllPosts(options?: PostQueryOptions, config?: ContlifyConfigInput): Promise<Post[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getAllPosts === "function") {
    return await adapter.getAllPosts(options);
  }

  if (adapter.posts && typeof adapter.posts.getAllPosts === "function") {
    return await adapter.posts.getAllPosts(options);
  }

  return [];
}

/**
 * Fetch a single blog post by its URL slug.
 * Returns null if no post matches the given slug.
 *
 * @example
 * ```ts
 * const post = await getPostBySlug("my-first-post");
 * ```
 */
export async function getPostBySlug(slug: string, config?: ContlifyConfigInput): Promise<Post | null> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getPostBySlug === "function") {
    return await adapter.getPostBySlug(slug);
  }

  if (adapter.posts && typeof adapter.posts.getPostBySlug === "function") {
    return await adapter.posts.getPostBySlug(slug);
  }

  return null;
}

/**
 * Fetch a single blog post by its unique ID.
 * Returns null if no post matches the given ID.
 *
 * @example
 * ```ts
 * const post = await getPostById("post_123");
 * ```
 */
export async function getPostById(id: string, config?: ContlifyConfigInput): Promise<Post | null> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getPostById === "function") {
    return await adapter.getPostById(id);
  }

  if (adapter.posts && typeof adapter.posts.getPostById === "function") {
    return await adapter.posts.getPostById(id);
  }

  return null;
}

/**
 * Fetch published posts belonging to a specific category slug.
 *
 * @example
 * ```ts
 * const posts = await getPostsByCategory("technology");
 * ```
 */
export async function getPostsByCategory(categorySlug: string, config?: ContlifyConfigInput): Promise<Post[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getPostsByCategory === "function") {
    return await adapter.getPostsByCategory(categorySlug);
  }

  if (adapter.posts && typeof adapter.posts.getPostsByCategory === "function") {
    return await adapter.posts.getPostsByCategory(categorySlug);
  }

  // Fallback: If adapter only implements getAllPosts, filter manually
  if (typeof adapter.getAllPosts === "function") {
    const all = await adapter.getAllPosts({ status: "published" });
    return all.filter((p) => p.categories?.some((c) => c.slug === categorySlug));
  }

  return [];
}

/**
 * Fetch published posts tagged with a specific tag slug.
 *
 * @example
 * ```ts
 * const posts = await getPostsByTag("typescript");
 * ```
 */
export async function getPostsByTag(tagSlug: string, config?: ContlifyConfigInput): Promise<Post[]> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getPostsByTag === "function") {
    return await adapter.getPostsByTag(tagSlug);
  }

  if (adapter.posts && typeof adapter.posts.getPostsByTag === "function") {
    return await adapter.posts.getPostsByTag(tagSlug);
  }

  // Fallback: If adapter only implements getAllPosts, filter manually
  if (typeof adapter.getAllPosts === "function") {
    const all = await adapter.getAllPosts({ status: "published" });
    return all.filter((p) => p.tags?.some((t) => t.slug === tagSlug));
  }

  return [];
}

/**
 * Returns total count of posts, optionally filtered by status.
 *
 * @example
 * ```ts
 * const total = await getPostCount({ status: "published" });
 * ```
 */
export async function getPostCount(options?: { status?: PostStatus }, config?: ContlifyConfigInput): Promise<number> {
  const adapter = getStorageAdapter(config);

  if (typeof adapter.getPostCount === "function") {
    return await adapter.getPostCount(options);
  }

  if (adapter.posts && typeof adapter.posts.getPostCount === "function") {
    return await adapter.posts.getPostCount(options);
  }

  if (typeof adapter.getAllPosts === "function") {
    const all = await adapter.getAllPosts(options);
    return all.length;
  }

  return 0;
}
