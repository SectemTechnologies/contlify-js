import { type Post, type PostStatus, type SeoMetadata, type MediaAsset } from "./domain.js";

/**
 * Incoming payload sent by publisher services (Contlify, Postman, n8n, custom backends) to create/update a post.
 */
export interface PublishPostPayload {
  externalId?: string;
  slug?: string;
  title: string;
  subtitle?: string;
  content: string;
  contentType?: "markdown" | "html" | "json";
  excerpt?: string;
  coverImage?: MediaAsset | string;
  status?: PostStatus;
  author?: {
    externalId?: string;
    slug?: string;
    name: string;
    email?: string;
    bio?: string;
    avatar?: MediaAsset | string;
  };
  categories?: Array<{
    externalId?: string;
    slug?: string;
    name: string;
    description?: string;
  }>;
  tags?: Array<{
    externalId?: string;
    slug?: string;
    name: string;
  }>;
  seo?: SeoMetadata;
  publishedAt?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Generic container payload for publishing endpoints.
 */
export interface PublishPayload {
  action: "publish" | "unpublish" | "delete" | "update";
  post: PublishPostPayload;
  publisherInfo?: {
    name?: string;
    version?: string;
    source?: string;
  };
}

/**
 * Response structure returned after a successful publish operation.
 */
export interface PublishResponse {
  postId: string;
  slug: string;
  url?: string;
  status: PostStatus;
  action: "created" | "updated" | "deleted" | "unpublished";
  post?: Post;
  publishedAt?: string;
}

/**
 * Payload for author management operations.
 */
export interface AuthorPayload {
  slug?: string;
  name: string;
  email?: string;
  bio?: string;
  avatar?: MediaAsset | string;
}

/**
 * Payload for category management operations.
 */
export interface CategoryPayload {
  slug?: string;
  name: string;
  description?: string;
  parentId?: string;
}

/**
 * Payload for tag management operations.
 */
export interface TagPayload {
  slug?: string;
  name: string;
  description?: string;
}

/**
 * Validation check endpoint result.
 */
export interface ValidateResult {
  valid: boolean;
  version: string;
  adapterName?: string;
  capabilities?: {
    authors: boolean;
    categories: boolean;
    tags: boolean;
    customFields: boolean;
  };
}
