/**
 * Status of a blog post in the publishing pipeline.
 */
export type PostStatus = "draft" | "published" | "archived" | "scheduled";

/**
 * SEO & Open Graph Metadata attached to blog posts.
 */
export interface SeoMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: "summary" | "summary_large_image" | "player" | "app";
  noIndex?: boolean;
}

/**
 * Image or media asset reference.
 */
export interface MediaAsset {
  id?: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

/**
 * Author entity representing post writer.
 */
export interface Author {
  id: string;
  slug: string;
  name: string;
  email?: string;
  bio?: string;
  avatar?: MediaAsset | string;
  socialLinks?: Record<string, string>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Category entity.
 */
export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  coverImage?: MediaAsset | string;
  parentId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Tag entity.
 */
export interface Tag {
  id: string;
  slug: string;
  name: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Core Post entity.
 */
export interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string; // Markdown, HTML, or serialized AST format
  contentType?: "markdown" | "html" | "json";
  excerpt?: string;
  coverImage?: MediaAsset | string;
  status: PostStatus;
  readingTimeMinutes?: number;
  author?: Author;
  authorId?: string;
  categories?: Category[];
  categoryIds?: string[];
  tags?: Tag[];
  tagIds?: string[];
  seo?: SeoMetadata;
  publishedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  customFields?: Record<string, unknown>;
}
