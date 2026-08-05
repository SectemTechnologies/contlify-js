import type { PostAdapterContract } from "./post-adapter.js";
import type { AuthorAdapterContract } from "./author-adapter.js";
import type { CategoryAdapterContract } from "./category-adapter.js";
import type { TagAdapterContract } from "./tag-adapter.js";

/**
 * Main Database Adapter interface for Contlify.
 * Customers implement this interface to connect Contlify to their ORM, database, or API.
 */
export interface ContlifyAdapter {
  /**
   * Post persistence operations (required).
   */
  posts: PostAdapterContract;

  /**
   * Author operations (optional).
   */
  authors?: AuthorAdapterContract;

  /**
   * Category operations (optional).
   */
  categories?: CategoryAdapterContract;

  /**
   * Tag operations (optional).
   */
  tags?: TagAdapterContract;

  /**
   * Connection health check or system verification callback.
   */
  ping?(): Promise<boolean>;
}
