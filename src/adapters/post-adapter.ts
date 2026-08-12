import type { Post, PostStatus } from "../types/domain.js";
import type { PublishPostPayload, PublishResponse } from "../types/payload.js";
import type { PostQueryOptions } from "../queries/query.interface.js";

/**
 * Storage adapter contract for managing Post operations.
 * Customers implement this interface for their ORM (Prisma, Drizzle, Mongoose, Supabase, etc.).
 */
export interface PostAdapterContract {
  /**
   * Creates a post from a validated publish payload.
   */
  createPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Updates an existing post by ID or slug.
   */
  updatePost?(
    id: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Creates or updates a post from a publish payload.
   */
  upsertPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Retrieves all posts, optionally filtered and paginated.
   */
  getAllPosts?(options?: PostQueryOptions): Promise<Post[]>;

  /**
   * Retrieves a single post by its unique ID.
   */
  getPostById?(id: string): Promise<Post | null>;

  /**
   * Retrieves a post by its unique slug.
   */
  getPostBySlug?(slug: string): Promise<Post | null>;

  /**
   * Retrieves posts associated with a specific category slug.
   */
  getPostsByCategory?(categorySlug: string): Promise<Post[]>;

  /**
   * Retrieves posts associated with a specific tag slug.
   */
  getPostsByTag?(tagSlug: string): Promise<Post[]>;

  /**
   * Returns the total count of posts, optionally filtered by status.
   */
  getPostCount?(options?: { status?: PostStatus }): Promise<number>;

  /**
   * Unpublishes a post by slug or ID.
   */
  unpublishPost?(identifier: { id?: string; slug?: string }): Promise<boolean>;

  /**
   * Deletes a post completely by slug or ID.
   */
  deletePost?(identifier: { id?: string; slug?: string }): Promise<boolean>;
}
