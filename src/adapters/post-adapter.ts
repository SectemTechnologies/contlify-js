import type { Post } from "../types/domain.js";
import type { PublishPostPayload, PublishResponse } from "../types/payload.js";

/**
 * Storage adapter contract for managing Post operations.
 * Customers implement this interface for their ORM (Prisma, Drizzle, Mongoose, Supabase, etc.).
 */
export interface PostAdapterContract {
  /**
   * Retrieves a post by its unique slug.
   */
  getPostBySlug(slug: string): Promise<Post | null>;

  /**
   * Creates or updates a post from a publish payload.
   */
  upsertPost(payload: PublishPostPayload): Promise<PublishResponse>;

  /**
   * Unpublishes (sets status to draft or unlisted) a post by slug or ID.
   */
  unpublishPost(identifier: { id?: string; slug?: string }): Promise<boolean>;

  /**
   * Deletes a post completely by slug or ID.
   */
  deletePost(identifier: { id?: string; slug?: string }): Promise<boolean>;
}
