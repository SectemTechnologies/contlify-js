import type { Post, Author, Category, Tag } from "../types/domain.js";

/**
 * Extracts a clean image URL from a string, MediaAsset object ({ url, src, ... }), or undefined/null.
 */
export function extractImageUrl(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const candidate = obj.url ?? obj.src ?? obj.image ?? obj.secure_url;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      return trimmed ? trimmed : null;
    }
  }
  return null;
}

/**
 * Raw database row shape returned by a SQL SELECT * on contlify_posts.
 * Both postgres and D1 rows follow this shape.
 */
export interface RawPostRow {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  content: string;
  content_type?: string | null;
  excerpt?: string | null;
  cover_image?: string | null;
  status?: string | null;
  author_id?: string | null;
  seo_data?: string | null;
  custom_fields?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joined author columns (optional, from LEFT JOIN)
  author_name?: string | null;
  author_slug?: string | null;
  author_email?: string | null;
  author_bio?: string | null;
  author_avatar?: string | null;
}

export interface RawAuthorRow {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  bio?: string | null;
  avatar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawCategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image?: string | null;
  parent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawTagRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Maps a raw SQL row from contlify_posts to a normalized Post domain object.
 */
export function mapRowToPost(
  row: RawPostRow,
  categories: Category[] = [],
  tags: Tag[] = []
): Post {
  let author: Author | undefined;
  if (row.author_name || row.author_id) {
    author = {
      id: row.author_id ?? `author_${row.slug}`,
      name: row.author_name ?? "Unknown",
      slug: row.author_slug ?? String(row.author_name ?? "unknown").toLowerCase().replace(/\s+/g, "-"),
      email: row.author_email ?? undefined,
      bio: row.author_bio ?? undefined,
      avatar: row.author_avatar ?? undefined,
    };
  }

  let seo: Post["seo"] | undefined;
  if (row.seo_data) {
    try {
      seo = JSON.parse(row.seo_data) as Post["seo"];
    } catch { /* ignore */ }
  }

  let customFields: Record<string, unknown> | undefined;
  if (row.custom_fields) {
    try {
      customFields = JSON.parse(row.custom_fields) as Record<string, unknown>;
    } catch { /* ignore */ }
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    content: row.content,
    contentType: (row.content_type as Post["contentType"]) ?? "markdown",
    excerpt: row.excerpt ?? undefined,
    coverImage: row.cover_image ?? undefined,
    status: (row.status as Post["status"]) ?? "published",
    author,
    categories,
    tags,
    seo,
    customFields,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Maps a raw SQL row to an Author domain object.
 */
export function mapRowToAuthor(row: RawAuthorRow): Author {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email ?? undefined,
    bio: row.bio ?? undefined,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Maps a raw SQL row to a Category domain object.
 */
export function mapRowToCategory(row: RawCategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    coverImage: row.cover_image ?? undefined,
    parentId: row.parent_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Maps a raw SQL row to a Tag domain object.
 */
export function mapRowToTag(row: RawTagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}
