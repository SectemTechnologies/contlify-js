import type { PostAdapterContract } from "./post-adapter.js";
import type { AuthorAdapterContract } from "./author-adapter.js";
import type { CategoryAdapterContract } from "./category-adapter.js";
import type { TagAdapterContract } from "./tag-adapter.js";
import type { PublishPostPayload, PublishResponse } from "../types/payload.js";
import type { Post, Author, Category, Tag } from "../types/domain.js";

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
   * Direct upsertPost method on adapter root.
   */
  upsertPost?(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse | Post | Record<string, unknown>>;

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
