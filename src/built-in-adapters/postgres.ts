import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { mapRowToPost, mapRowToAuthor, mapRowToCategory, mapRowToTag, type RawPostRow, type RawAuthorRow, type RawCategoryRow, type RawTagRow } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal PostgreSQL client interface.
 * Compatible with `pg`, `postgres` (by porsager), `@vercel/postgres`, and Neon serverless driver.
 */
export interface PostgresClientLike {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

/**
 * Creates a pre-built Contlify adapter for PostgreSQL-compatible databases.
 * Works with Supabase, Neon, Railway, Vercel Postgres, RDS, and any `pg`-compatible client.
 *
 * @example
 * ```ts
 * import { Pool } from "pg";
 * import { createPostgresAdapter } from "contlify";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const adapter = createPostgresAdapter(pool);
 *
 * const handler = createContlifyHandler({ adapter });
 * ```
 */
export function createPostgresAdapter(client: PostgresClientLike): ContlifyAdapter {
  async function getPostCategories(postId: string): Promise<Category[]> {
    const res = await client.query<RawCategoryRow>(
      `SELECT c.* FROM contlify_categories c
       INNER JOIN contlify_post_categories pc ON c.id = pc.category_id
       WHERE pc.post_id = $1`,
      [postId]
    );
    return res.rows.map(mapRowToCategory);
  }

  async function getPostTags(postId: string): Promise<Tag[]> {
    const res = await client.query<RawTagRow>(
      `SELECT t.* FROM contlify_tags t
       INNER JOIN contlify_post_tags pt ON t.id = pt.tag_id
       WHERE pt.post_id = $1`,
      [postId]
    );
    return res.rows.map(mapRowToTag);
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
        await client.query("SELECT 1 AS alive");
        return true;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      const seoData = payload.seo ? JSON.stringify(payload.seo) : null;
      const customFields = payload.customFields ? JSON.stringify(payload.customFields) : null;

      await client.query(
        `INSERT INTO contlify_posts
           (id, title, slug, subtitle, content, content_type, excerpt, cover_image, status, seo_data, custom_fields, published_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (slug) DO UPDATE SET
           title=$2, subtitle=$4, content=$5, content_type=$6, excerpt=$7,
           cover_image=$8, status=$9, seo_data=$10, custom_fields=$11,
           published_at=$12, updated_at=$14`,
        [
          id, payload.title, slug, payload.subtitle ?? null,
          payload.content, payload.contentType ?? "markdown",
          payload.excerpt ?? null,
          (payload.featured_image as string | undefined) ?? payload.coverImage ?? null,
          payload.status ?? "published",
          seoData, customFields,
          payload.publishedAt ?? now, now, now,
        ]
      );

      // Handle author (supports string name or author object)
      if (payload.author) {
        const authorObj = typeof payload.author === "string" ? { name: payload.author } : (payload.author as Record<string, unknown>);
        const authorName = (authorObj.name as string | undefined) || "Unknown Author";
        const authorSlug = slugify((authorObj.slug as string | undefined) ?? authorName);
        const authorId = (authorObj.externalId as string | undefined) ?? `author_${authorSlug}`;
        const avatarStr = typeof authorObj.avatar === "object" && authorObj.avatar !== null
          ? (authorObj.avatar as { url?: string }).url ?? null
          : (authorObj.avatar as string | undefined) ?? null;

        await client.query(
          `INSERT INTO contlify_authors (id, name, slug, email, bio, avatar, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (slug) DO UPDATE SET name=$2, email=$4, bio=$5, avatar=$6, updated_at=$8`,
          [authorId, authorName, authorSlug, (authorObj.email as string) ?? null, (authorObj.bio as string) ?? null, avatarStr, now, now]
        );
        await client.query(`UPDATE contlify_posts SET author_id=$1 WHERE id=$2`, [authorId, id]);
      }

      // Handle categories (supports array of strings or category objects)
      if (payload.categories?.length) {
        for (const rawCat of payload.categories) {
          const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
          const catName = (cat.name as string | undefined) || "Uncategorized";
          const catSlug = slugify((cat.slug as string | undefined) ?? catName);
          const catId = (cat.externalId as string | undefined) ?? `cat_${catSlug}`;

          await client.query(
            `INSERT INTO contlify_categories (id, name, slug, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
            [catId, catName, catSlug, now, now]
          );
          await client.query(
            `INSERT INTO contlify_post_categories (post_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [id, catId]
          );
        }
      }

      // Handle tags (supports array of strings or tag objects)
      if (payload.tags?.length) {
        for (const rawTag of payload.tags) {
          const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
          const tagName = (tag.name as string | undefined) || "General";
          const tagSlug = slugify((tag.slug as string | undefined) ?? tagName);
          const tagId = (tag.externalId as string | undefined) ?? `tag_${tagSlug}`;

          await client.query(
            `INSERT INTO contlify_tags (id, name, slug, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
            [tagId, tagName, tagSlug, now, now]
          );
          await client.query(
            `INSERT INTO contlify_post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [id, tagId]
          );
        }
      }

      return {
        postId: id,
        slug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "created",
        url: `/blog/post/${slug}`,
      };
    },

    async updatePost(idOrSlug: string, payload: Partial<PublishPostPayload> & Record<string, unknown>): Promise<PublishResponse> {
      const now = new Date().toISOString();
      const fields: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (payload.title !== undefined) { fields.push(`title=$${paramIdx++}`); params.push(payload.title); }
      if (payload.subtitle !== undefined) { fields.push(`subtitle=$${paramIdx++}`); params.push(payload.subtitle); }
      if (payload.content !== undefined) { fields.push(`content=$${paramIdx++}`); params.push(payload.content); }
      if (payload.excerpt !== undefined) { fields.push(`excerpt=$${paramIdx++}`); params.push(payload.excerpt); }
      if (payload.status !== undefined) { fields.push(`status=$${paramIdx++}`); params.push(payload.status); }
      if (payload.custom_slug ?? payload.slug) {
        const newSlug = slugify((payload.custom_slug ?? payload.slug) as string);
        fields.push(`slug=$${paramIdx++}`);
        params.push(newSlug);
      }
      fields.push(`updated_at=$${paramIdx++}`);
      params.push(now);

      params.push(idOrSlug);
      const whereClause = `(id=$${paramIdx} OR slug=$${paramIdx})`;

      if (fields.length > 1) {
        await client.query(
          `UPDATE contlify_posts SET ${fields.join(", ")} WHERE ${whereClause}`,
          params
        );
      }

      const updatedSlug = (payload.custom_slug ?? payload.slug as string | undefined) ? slugify((payload.custom_slug ?? payload.slug) as string) : idOrSlug;

      return {
        postId: idOrSlug,
        slug: updatedSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/post/${updatedSlug}`,
      };
    },


    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (options?.status === "published") {
        conditions.push("(p.status = 'published' OR (p.status = 'scheduled' AND p.published_at <= NOW()))");
      } else if (options?.status === "scheduled") {
        conditions.push("(p.status = 'scheduled' AND p.published_at > NOW())");
      } else if (options?.status) {
        conditions.push(`p.status = $${idx++}`);
        params.push(options.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const orderCol = options?.orderBy === "createdAt" ? "p.created_at" : options?.orderBy === "updatedAt" ? "p.updated_at" : "p.published_at";
      const orderDir = options?.order === "asc" ? "ASC" : "DESC";
      const limit = options?.limit ? `LIMIT $${idx++}` : "";
      const offset = options?.offset ? `OFFSET $${idx++}` : "";

      if (options?.limit) params.push(options.limit);
      if (options?.offset) params.push(options.offset);

      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         ${where} ORDER BY ${orderCol} ${orderDir} ${limit} ${offset}`,
        params
      );

      return Promise.all(res.rows.map((row) => resolveFullPost(row)));
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.slug = $1 LIMIT 1`,
        [slug]
      );
      if (!res.rows[0]) return null;
      return resolveFullPost(res.rows[0]);
    },

    async getPostById(id: string): Promise<Post | null> {
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.id = $1 LIMIT 1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return resolveFullPost(res.rows[0]);
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      const res = await client.query<RawPostRow>(
        `SELECT p.* FROM contlify_posts p
         INNER JOIN contlify_post_categories pc ON p.id = pc.post_id
         INNER JOIN contlify_categories c ON c.id = pc.category_id
         WHERE c.slug = $1 AND p.status = 'published'
         ORDER BY p.published_at DESC`,
        [categorySlug]
      );
      return Promise.all(res.rows.map((row) => resolveFullPost(row)));
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      const res = await client.query<RawPostRow>(
        `SELECT p.* FROM contlify_posts p
         INNER JOIN contlify_post_tags pt ON p.id = pt.post_id
         INNER JOIN contlify_tags t ON t.id = pt.tag_id
         WHERE t.slug = $1 AND p.status = 'published'
         ORDER BY p.published_at DESC`,
        [tagSlug]
      );
      return Promise.all(res.rows.map((row) => resolveFullPost(row)));
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      const params: unknown[] = [];
      const where = options?.status ? "WHERE status = $1" : "";
      if (options?.status) params.push(options.status);
      const res = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM contlify_posts ${where}`,
        params
      );
      return parseInt(res.rows[0]?.count ?? "0", 10);
    },

    async getAuthors(): Promise<Author[]> {
      const res = await client.query<RawAuthorRow>("SELECT * FROM contlify_authors ORDER BY name ASC");
      return res.rows.map(mapRowToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      const res = await client.query<RawCategoryRow & { cover_image?: string }>(
        `SELECT c.*,
           (SELECT p.cover_image
            FROM contlify_posts p
            INNER JOIN contlify_post_categories pc ON p.id = pc.post_id
            WHERE pc.category_id = c.id AND p.cover_image IS NOT NULL AND p.cover_image != ''
            ORDER BY p.published_at DESC LIMIT 1) AS cover_image
         FROM contlify_categories c
         ORDER BY c.name ASC`
      );
      return res.rows.map((row) => ({
        ...mapRowToCategory(row),
        coverImage: row.cover_image ? row.cover_image : undefined,
      }));
    },

    async updateCategory(
      idOrSlug: string,
      payload: { name?: string; slug?: string; description?: string; coverImage?: string }
    ): Promise<Category> {
      const fields: string[] = [];
      const params: unknown[] = [idOrSlug];
      let idx = 2;

      if (payload.name !== undefined) {
        fields.push(`name = $${idx++}`);
        params.push(payload.name);
      }
      if (payload.slug !== undefined) {
        fields.push(`slug = $${idx++}`);
        params.push(payload.slug);
      }
      if (payload.description !== undefined) {
        fields.push(`description = $${idx++}`);
        params.push(payload.description);
      }

      if (fields.length === 0) {
        const existing = await client.query<RawCategoryRow>(
          `SELECT * FROM contlify_categories WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [idOrSlug]
        );
        if (!existing.rows[0]) throw new Error(`Category not found: ${idOrSlug}`);
        return mapRowToCategory(existing.rows[0]);
      }

      const res = await client.query<RawCategoryRow>(
        `UPDATE contlify_categories SET ${fields.join(", ")}
         WHERE id::text = $1 OR slug = $1
         RETURNING *`,
        params
      );

      if (!res.rows[0]) {
        throw new Error(`Category not found: ${idOrSlug}`);
      }

      return mapRowToCategory(res.rows[0]);
    },

    async getTags(): Promise<Tag[]> {
      const res = await client.query<RawTagRow>("SELECT * FROM contlify_tags ORDER BY name ASC");
      return res.rows.map(mapRowToTag);
    },
  };
}

