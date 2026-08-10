import type { Post, PostStatus } from "../types/domain.js";

/**
 * Options for filtering and paginating post queries.
 */
export interface PostQueryOptions {
  /** Filter posts by publication status. */
  status?: PostStatus;
  /** Maximum number of posts to return. */
  limit?: number;
  /** Number of posts to skip (for pagination). */
  offset?: number;
  /** Sort order by publication or creation date. */
  orderBy?: "publishedAt" | "createdAt" | "updatedAt";
  /** Sort direction. */
  order?: "asc" | "desc";
}

/**
 * Result container for paginated post queries.
 */
export interface PaginatedPostsResult {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Read-only query contract for fetching blog content from the database.
 * Generated query files in user projects implement this contract.
 * Pre-built adapters implement this alongside ContlifyAdapter.
 */
export interface ContlifyQueryContract {
  /**
   * Retrieves all posts, optionally filtered by status, with pagination.
   */
  getAllPosts(options?: PostQueryOptions): Promise<Post[]>;

  /**
   * Retrieves a single post by its URL slug.
   * Returns null if no post matches the given slug.
   */
  getPostBySlug(slug: string): Promise<Post | null>;

  /**
   * Retrieves a single post by its unique ID.
   * Returns null if no post matches the given ID.
   */
  getPostById?(id: string): Promise<Post | null>;

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
}
