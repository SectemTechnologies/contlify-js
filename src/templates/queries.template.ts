/**
 * Template for the queries file: lib/contlify/queries.ts
 * Generated into the user's project to provide read-side database access for blog pages.
 *
 * This template uses the adapter instance from adapter-config to fetch data.
 * Users can customize or replace this file entirely.
 */
export function getQueriesTemplate(): string {
  return `import type { Post, Category } from "contlify";
import { contlifyAdapter } from "./adapter";

/**
 * Fetch all categories from the database.
 */
export async function getCategories(): Promise<Category[]> {
  if (typeof contlifyAdapter.getCategories === "function") {
    return (await contlifyAdapter.getCategories()) as Category[];
  }

  if (contlifyAdapter.categories && typeof contlifyAdapter.categories.getCategories === "function") {
    return (await contlifyAdapter.categories.getCategories()) as Category[];
  }

  console.warn("[contlify] Adapter does not implement getCategories. Returning empty array.");
  return [];
}

/**
 * Fetch all published blog posts in a specific category by category slug.
 */
export async function getPostsByCategory(categorySlug: string): Promise<Post[]> {
  if (typeof contlifyAdapter.getPostsByCategory === "function") {
    return await contlifyAdapter.getPostsByCategory(categorySlug);
  }

  console.warn("[contlify] Adapter does not implement getPostsByCategory. Returning empty array.");
  return [];
}

/**
 * Fetch all published blog posts, sorted by most recent first.
 */
export async function getAllPosts(): Promise<Post[]> {
  if (typeof contlifyAdapter.getAllPosts === "function") {
    return await contlifyAdapter.getAllPosts({
      status: "published",
      orderBy: "publishedAt",
      order: "desc",
    });
  }

  if (contlifyAdapter.posts && typeof contlifyAdapter.posts.getAllPosts === "function") {
    return await contlifyAdapter.posts.getAllPosts({
      status: "published",
      orderBy: "publishedAt",
      order: "desc",
    });
  }

  console.warn("[contlify] Adapter does not implement getAllPosts. Returning empty array.");
  return [];
}

/**
 * Fetch a single blog post by its URL slug.
 * Returns null if no post is found.
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (typeof contlifyAdapter.getPostBySlug === "function") {
    return await contlifyAdapter.getPostBySlug(slug);
  }

  if (contlifyAdapter.posts && typeof contlifyAdapter.posts.getPostBySlug === "function") {
    return await contlifyAdapter.posts.getPostBySlug(slug);
  }

  console.warn("[contlify] Adapter does not implement getPostBySlug. Returning null.");
  return null;
}

/**
 * Fetch a single blog post by its unique ID.
 * Returns null if no post is found.
 */
export async function getPostById(id: string): Promise<Post | null> {
  if (typeof contlifyAdapter.getPostById === "function") {
    return await contlifyAdapter.getPostById(id);
  }

  if (contlifyAdapter.posts && typeof contlifyAdapter.posts.getPostById === "function") {
    return await contlifyAdapter.posts.getPostById(id);
  }

  console.warn("[contlify] Adapter does not implement getPostById. Returning null.");
  return null;
}
`;
}