import type { PostAdapterContract } from "./post-adapter.js";
import type { AuthorAdapterContract } from "./author-adapter.js";
import type { CategoryAdapterContract } from "./category-adapter.js";
import type { TagAdapterContract } from "./tag-adapter.js";
import type { PublishPostPayload, PublishResponse } from "../types/payload.js";
import type { Post, PostStatus, Author, Category, Tag } from "../types/domain.js";
import type { PostQueryOptions } from "../queries/query.interface.js";

/**
 * Main Database Adapter interface for Contlify.
 * Customers implement this interface to connect Contlify to their ORM, database, or API.
 */
export interface ContlifyAdapter {
  /**
   * Direct createPost method on adapter root.
   */
  createPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Direct updatePost method on adapter root.
   */
  updatePost?(
    id: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Direct updateCategory method on adapter root.
   */
  updateCategory?(
    idOrSlug: string,
    payload: { name?: string; slug?: string; description?: string; coverImage?: string | { url?: string } } & Record<string, unknown>
  ): Promise<Category | Record<string, unknown>>;

  /**
   * Direct upsertPost method on adapter root.
   */
  upsertPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;


  // --- Read-Side Query Methods ---

  /**
   * Retrieves all posts, optionally filtered and paginated.
   */
  getAllPosts?(options?: PostQueryOptions): Promise<Post[]>;

  /**
   * Retrieves a single post by its URL slug.
   */
  getPostBySlug?(slug: string): Promise<Post | null>;

  /**
   * Retrieves a single post by its unique ID.
   */
  getPostById?(id: string): Promise<Post | null>;

  /**
   * Retrieves posts filtered by category slug.
   */
  getPostsByCategory?(categorySlug: string): Promise<Post[]>;

  /**
   * Retrieves posts filtered by tag slug.
   */
  getPostsByTag?(tagSlug: string): Promise<Post[]>;

  /**
   * Returns total count of posts, optionally filtered by status.
   */
  getPostCount?(options?: { status?: PostStatus }): Promise<number>;

  // --- Taxonomy Query Methods ---

  /**
   * Direct getAuthors method on adapter root.
   */
  getAuthors?(): Promise<Author[] | Record<string, unknown>[]>;

  /**
   * Direct getCategories method on adapter root.
   */
  getCategories?(): Promise<Category[] | Record<string, unknown>[]>;

  /**
   * Direct getTags method on adapter root.
   */
  getTags?(): Promise<Tag[] | Record<string, unknown>[]>;

  // --- Sub-Adapter Objects ---

  /**
   * Post persistence operations object.
   */
  posts?: PostAdapterContract;

  /**
   * Author operations object (optional).
   */
  authors?: AuthorAdapterContract;

  /**
   * Category operations object (optional).
   */
  categories?: CategoryAdapterContract;

  /**
   * Tag operations object (optional).
   */
  tags?: TagAdapterContract;

  /**
   * Connection health check or system verification callback.
   */
  ping?(): Promise<boolean>;
}

