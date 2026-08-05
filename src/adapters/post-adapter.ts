import type { Post } from "../types/domain.js";
import type { PublishPostPayload, PublishResponse } from "../types/payload.js";

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
   * Creates or updates a post from a publish payload.
   */
  upsertPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;

  /**
   * Retrieves a post by its unique slug.
   */
  getPostBySlug?(slug: string): Promise<Post | null>;

  /**
   * Unpublishes a post by slug or ID.
   */
  unpublishPost?(identifier: { id?: string; slug?: string }): Promise<boolean>;

  /**
   * Deletes a post completely by slug or ID.
   */
  deletePost?(identifier: { id?: string; slug?: string }): Promise<boolean>;
}
