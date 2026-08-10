import { AdapterError } from "../errors/adapter-error.js";
import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { mapRowToPost, mapRowToAuthor, mapRowToCategory, mapRowToTag, type RawPostRow, type RawAuthorRow, type RawCategoryRow, type RawTagRow } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal Cloudflare D1 Database binding interface.
 * Matches the D1Database type from @cloudflare/workers-types.
 */
export interface D1DatabaseLike {
  prepare(query: string): D1StmtLike;
  batch<T = unknown>(statements: D1StmtLike[]): Promise<Array<{ results: T[]; success: boolean }>>;
}

export interface D1StmtLike {
  bind(...values: unknown[]): D1StmtLike;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean }>;
}

export type D1DatabaseProvider =
  | D1DatabaseLike
  | Record<string, unknown>
  | (() => D1DatabaseLike | Record<string, unknown> | Promise<D1DatabaseLike | Record<string, unknown>>);

/**
 * Sanitizes parameters passed into D1 `.bind(...)`.
 * Strictly converts any `undefined` values to `null` and objects/arrays to JSON strings.
 */
function sanitizeParam(v: unknown): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function cleanBindParams(params: unknown[]): (string | number | boolean | null)[] {
  return params.map(sanitizeParam);
}

/**
 * Creates a pre-built Contlify adapter for Cloudflare D1.
 * Accepts a static D1Database binding, an env object, or a dynamic resolver function.
 * Automatically scans Cloudflare environment for ANY D1 database binding name.
 */
export function createD1Adapter(dbProvider: D1DatabaseProvider): ContlifyAdapter {
  async function getDb(): Promise<D1DatabaseLike | null> {
    try {
      let instance: unknown;
      if (typeof dbProvider === "function") {
        instance = await dbProvider();
      } else {
        instance = dbProvider;
      }

      if (!instance || typeof instance !== "object") {
        return null;
      }

      // 1. Direct D1 database object with .prepare method
      if (typeof (instance as D1DatabaseLike).prepare === "function") {
        return instance as D1DatabaseLike;
      }

      // 2. Auto-scan Cloudflare env object for ANY property with .prepare method
      for (const value of Object.values(instance as Record<string, unknown>)) {
        if (value && typeof value === "object" && typeof (value as D1DatabaseLike).prepare === "function") {
          return value as D1DatabaseLike;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async function all<T = RawPostRow>(stmt: D1StmtLike): Promise<T[]> {
    try {
      const res = await stmt.all<T>();
      return res.results ?? [];
    } catch {
      return [];
    }
  }

  async function getPostCategories(postId: string): Promise<Category[]> {
    const db = await getDb();
    if (!db) return [];
    const rows = await all<RawCategoryRow>(
      db.prepare(
        `SELECT c.* FROM contlify_categories c
         INNER JOIN contlify_post_categories pc ON c.id = pc.category_id
         WHERE pc.post_id = ?`
      ).bind(...cleanBindParams([postId]))
    );
    return rows.map(mapRowToCategory);
  }

  async function getPostTags(postId: string): Promise<Tag[]> {
    const db = await getDb();
    if (!db) return [];
    const rows = await all<RawTagRow>(
      db.prepare(
        `SELECT t.* FROM contlify_tags t
         INNER JOIN contlify_post_tags pt ON t.id = pt.tag_id
         WHERE pt.post_id = ?`
      ).bind(...cleanBindParams([postId]))
    );
    return rows.map(mapRowToTag);
  }

  async function resolveFullPost(row: RawPostRow): Promise<Post> {
    const [categories, tags] = await Promise.all([
      getPostCategories(row.id),
      getPostTags(row.id),
    ]);
    return mapRowToPost(row, categories, tags);
  }

  return {
    async ping(): Promise<boolean> {
      try {
        const db = await getDb();
        if (!db) return false;
        const res = await db.prepare("SELECT 1 AS alive").first<{ alive: number }>();
        return res?.alive === 1;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const db = await getDb();
      if (!db) {
        throw new AdapterError(
          "Cloudflare D1 Database binding not found in request context. Please check your wrangler.jsonc D1 binding."
        );
      }

      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      const title = payload.title || "Untitled Post";
      const subtitle = payload.subtitle ?? null;
      const content = payload.content || "";
      const contentType = payload.contentType ?? "markdown";
      const excerpt = payload.excerpt ?? null;
      const coverImg = (payload.featured_image as string | undefined) ?? payload.coverImage ?? null;
      const status = payload.status ?? "published";
      const seoData = payload.seo ? JSON.stringify(payload.seo) : null;
      const customFields = payload.customFields ? JSON.stringify(payload.customFields) : null;
      const publishedAt = payload.publishedAt ?? now;

      await db.prepare(
        `INSERT INTO contlify_posts
           (id, title, slug, subtitle, content, content_type, excerpt, cover_image, status, seo_data, custom_fields, published_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(slug) DO UPDATE SET
           title=excluded.title, subtitle=excluded.subtitle, content=excluded.content,
           content_type=excluded.content_type, excerpt=excluded.excerpt,
           cover_image=excluded.cover_image, status=excluded.status,
           seo_data=excluded.seo_data, custom_fields=excluded.custom_fields,
           published_at=excluded.published_at, updated_at=excluded.updated_at`
      ).bind(
        ...cleanBindParams([
          id, title, slug, subtitle,
          content, contentType,
          excerpt, coverImg,
          status, seoData, customFields,
          publishedAt, now, now,
        ])
      ).run();
      const actualPost = await db.prepare(
        `SELECT id FROM contlify_posts WHERE slug = ?`
      ).bind(slug).first<{ id: string }>();
      if (!actualPost) throw new AdapterError(`Post not found after upsert (slug: ${slug})`);
      const actualId = actualPost.id;

      // Handle author (supports string name or author object)
      if (payload.author) {
        const authorObj = typeof payload.author === "string" ? { name: payload.author } : (payload.author as Record<string, unknown>);
        const authorName = (authorObj.name as string | undefined) || "Unknown Author";
        const authorSlug = slugify((authorObj.slug as string | undefined) ?? authorName);
        const authorId = (authorObj.externalId as string | undefined) ?? `author_${authorSlug}`;
        const avatarStr = typeof authorObj.avatar === "object" && authorObj.avatar !== null
          ? (authorObj.avatar as { url?: string }).url ?? null
          : (authorObj.avatar as string | undefined) ?? null;

        await db.prepare(
          `INSERT INTO contlify_authors (id, name, slug, email, bio, avatar, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?)
           ON CONFLICT(slug) DO UPDATE SET name=excluded.name, email=excluded.email, bio=excluded.bio, avatar=excluded.avatar, updated_at=excluded.updated_at`
        ).bind(
          ...cleanBindParams([
            authorId, authorName, authorSlug,
            (authorObj.email as string | undefined) ?? null,
            (authorObj.bio as string | undefined) ?? null,
            avatarStr, now, now,
          ])
        ).run();

        await db.prepare("UPDATE contlify_posts SET author_id=? WHERE id=?")
          .bind(...cleanBindParams([authorId, actualId]))
          .run();
      }

      // Handle categories (supports array of strings or category objects)
      if (payload.categories?.length) {
        for (const rawCat of payload.categories) {
          const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
          const catName = (cat.name as string | undefined) || "Uncategorized";
          const catSlug = slugify((cat.slug as string | undefined) ?? catName);
          const catId = (cat.externalId as string | undefined) ?? `cat_${catSlug}`;

          await db.prepare(
            `INSERT INTO contlify_categories (id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(slug) DO NOTHING`
          ).bind(...cleanBindParams([catId, catName, catSlug, now, now])).run();

          await db.prepare(
            `INSERT INTO contlify_post_categories (post_id, category_id) VALUES (?,?) ON CONFLICT DO NOTHING`
          ).bind(...cleanBindParams([actualId, catId])).run();
        }
      }

      // Handle tags (supports array of strings or tag objects)
      if (payload.tags?.length) {
        for (const rawTag of payload.tags) {
          const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
          const tagName = (tag.name as string | undefined) || "General";
          const tagSlug = slugify((tag.slug as string | undefined) ?? tagName);
          const tagId = (tag.externalId as string | undefined) ?? `tag_${tagSlug}`;

          await db.prepare(
            `INSERT INTO contlify_tags (id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(slug) DO NOTHING`
          ).bind(...cleanBindParams([tagId, tagName, tagSlug, now, now])).run();

          await db.prepare(
            `INSERT INTO contlify_post_tags (post_id, tag_id) VALUES (?,?) ON CONFLICT DO NOTHING`
          ).bind(...cleanBindParams([actualId, tagId])).run();
        }
      }

      return {
        postId: actualId,
        slug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "created",
        url: `/blog/${slug}`,
      };
    },

    async updatePost(idOrSlug: string, payload: Partial<PublishPostPayload> & Record<string, unknown>): Promise<PublishResponse> {
      const db = await getDb();
      if (!db) {
        throw new AdapterError(
          "Cloudflare D1 Database binding not found in request context. Please check your wrangler.jsonc D1 binding."
        );
      }

      const now = new Date().toISOString();
      const parts: string[] = [];
      const params: unknown[] = [];

      if (payload.title) { parts.push("title=?"); params.push(payload.title); }
      if (payload.content) { parts.push("content=?"); params.push(payload.content); }
      if (payload.status) { parts.push("status=?"); params.push(payload.status); }
      if (payload.excerpt) { parts.push("excerpt=?"); params.push(payload.excerpt); }
      if (payload.custom_slug ?? payload.slug) {
        parts.push("slug=?");
        params.push(slugify((payload.custom_slug ?? payload.slug) as string));
      }
      parts.push("updated_at=?");
      params.push(now);

      if (parts.length > 1) {
        params.push(idOrSlug, idOrSlug);
        const cleaned = cleanBindParams(params);
        await db.prepare(
          `UPDATE contlify_posts SET ${parts.join(", ")} WHERE id=? OR slug=?`
        ).bind(...cleaned).run();
      }

      const newSlug = (payload.custom_slug ?? payload.slug as string | undefined)
        ? slugify((payload.custom_slug ?? payload.slug) as string)
        : idOrSlug;

      return {
        postId: idOrSlug,
        slug: newSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/${newSlug}`,
      };
    },

    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      const db = await getDb();
      if (!db) return [];

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options?.status === "published") {
        conditions.push("(p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= datetime('now')))");
      } else if (options?.status === "scheduled") {
        conditions.push("(p.status = 'scheduled' AND datetime(p.published_at) > datetime('now'))");
      } else if (options?.status) {
        conditions.push("p.status = ?");
        params.push(options.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const orderCol = options?.orderBy === "createdAt" ? "p.created_at" : options?.orderBy === "updatedAt" ? "p.updated_at" : "p.published_at";
      const orderDir = options?.order === "asc" ? "ASC" : "DESC";

      let sql = `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
                 FROM contlify_posts p
                 LEFT JOIN contlify_authors a ON p.author_id = a.id
                 ${where} ORDER BY ${orderCol} ${orderDir}`;

      if (options?.limit) {
        sql += " LIMIT ?";
        params.push(options.limit);
        if (options?.offset) {
          sql += " OFFSET ?";
          params.push(options.offset);
        }
      }

      const cleanedParams = cleanBindParams(params);
      const stmt = cleanedParams.length > 0 ? db.prepare(sql).bind(...cleanedParams) : db.prepare(sql);
      const rows = await all<RawPostRow>(stmt);
      return Promise.all(rows.map((row) => resolveFullPost(row)));
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      const db = await getDb();
      if (!db) return null;

      const row = await db.prepare(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.slug = ? AND (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= datetime('now')))
 LIMIT 1`
      ).bind(...cleanBindParams([slug])).first<RawPostRow>();
      if (!row) return null;
      return resolveFullPost(row);
    },

    async getPostById(id: string): Promise<Post | null> {
      const db = await getDb();
      if (!db) return null;

      const row = await db.prepare(
        `SELECT p.*, a.name as author_name, a.slug as author_slug
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.id = ? LIMIT 1`
      ).bind(...cleanBindParams([id])).first<RawPostRow>();
      if (!row) return null;
      return resolveFullPost(row);
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      const db = await getDb();
      if (!db) return [];

      const rows = await all<RawPostRow>(
        db.prepare(
          `SELECT p.* FROM contlify_posts p
           INNER JOIN contlify_post_categories pc ON p.id = pc.post_id
           INNER JOIN contlify_categories c ON c.id = pc.category_id
           WHERE c.slug = ? AND (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= datetime('now')))
           ORDER BY p.published_at DESC`
        ).bind(...cleanBindParams([categorySlug]))
      );
      return Promise.all(rows.map((row) => resolveFullPost(row)));
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      const db = await getDb();
      if (!db) return [];

      const rows = await all<RawPostRow>(
        db.prepare(
          `SELECT p.* FROM contlify_posts p
           INNER JOIN contlify_post_tags pt ON p.id = pt.post_id
           INNER JOIN contlify_tags t ON t.id = pt.tag_id
           WHERE t.slug = ? AND (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= datetime('now')))
           ORDER BY p.published_at DESC`
        ).bind(...cleanBindParams([tagSlug]))
      );
      return Promise.all(rows.map((row) => resolveFullPost(row)));
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      const db = await getDb();
      if (!db) return 0;

      let stmt;
      if (options?.status === "published") {
        stmt = db.prepare(
          `SELECT COUNT(*) as count FROM contlify_posts
     WHERE status = 'published'
        OR (status = 'scheduled' AND datetime(published_at) <= datetime('now'))`
        );
      } else if (options?.status) {
        stmt = db.prepare(
          "SELECT COUNT(*) as count FROM contlify_posts WHERE status = ?"
        ).bind(...cleanBindParams([options.status]));
      } else {
        stmt = db.prepare("SELECT COUNT(*) as count FROM contlify_posts");
      }
      const res = await stmt.first<{ count: number }>();
      return res?.count ?? 0;
    },

    async getAuthors(): Promise<Author[]> {
      const db = await getDb();
      if (!db) return [];

      const rows = await all<RawAuthorRow>(db.prepare("SELECT * FROM contlify_authors ORDER BY name ASC"));
      return rows.map(mapRowToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      const db = await getDb();
      if (!db) return [];

      const rows = await all<RawCategoryRow>(db.prepare("SELECT * FROM contlify_categories ORDER BY name ASC"));
      return rows.map(mapRowToCategory);
    },

    async getTags(): Promise<Tag[]> {
      const db = await getDb();
      if (!db) return [];

      const rows = await all<RawTagRow>(db.prepare("SELECT * FROM contlify_tags ORDER BY name ASC"));
      return rows.map(mapRowToTag);
    },
  };
}
