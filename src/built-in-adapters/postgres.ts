import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { NotFoundError } from "../errors/not-found-error.js";
import { mapRowToPost, mapRowToAuthor, mapRowToCategory, mapRowToTag, extractImageUrl, type RawPostRow, type RawAuthorRow, type RawCategoryRow, type RawTagRow } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal PostgreSQL client interface.
 * Compatible with `pg`, `postgres` (by porsager), `@vercel/postgres`, and Neon serverless driver.
 */
export interface PostgresClientLike {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] | any[] }>;
}

let isPostgresMigrated = false;

/**
 * Automatically creates all required Contlify tables and indexes if they do not exist.
 * Runs once on cold start, then skipped in-memory.
 */
export async function ensurePostgresSchema(client: PostgresClientLike): Promise<void> {
  if (isPostgresMigrated) return;

  const ddl = `
    CREATE TABLE IF NOT EXISTS contlify_posts (
      id            VARCHAR(255) PRIMARY KEY,
      title         TEXT NOT NULL,
      slug          VARCHAR(255) UNIQUE NOT NULL,
      subtitle      TEXT,
      content       TEXT NOT NULL,
      content_type  VARCHAR(50) DEFAULT 'markdown',
      excerpt       TEXT,
      cover_image   TEXT,
      status        VARCHAR(50) DEFAULT 'published',
      author_id     VARCHAR(255),
      seo_data      JSONB,
      custom_fields JSONB,
      published_at  TIMESTAMPTZ DEFAULT NOW(),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contlify_authors (
      id         VARCHAR(255) PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      slug       VARCHAR(255) UNIQUE NOT NULL,
      email      VARCHAR(255),
      bio        TEXT,
      avatar     TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contlify_categories (
      id          VARCHAR(255) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      slug        VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      parent_id   VARCHAR(255),
      cover_image TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contlify_tags (
      id          VARCHAR(255) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      slug        VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contlify_post_categories (
      post_id     VARCHAR(255) REFERENCES contlify_posts(id) ON DELETE CASCADE,
      category_id VARCHAR(255) REFERENCES contlify_categories(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS contlify_post_tags (
      post_id VARCHAR(255) REFERENCES contlify_posts(id) ON DELETE CASCADE,
      tag_id  VARCHAR(255) REFERENCES contlify_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_contlify_posts_slug        ON contlify_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_contlify_posts_status      ON contlify_posts(status);
    CREATE INDEX IF NOT EXISTS idx_contlify_posts_published   ON contlify_posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contlify_authors_slug      ON contlify_authors(slug);
    CREATE INDEX IF NOT EXISTS idx_contlify_categories_slug   ON contlify_categories(slug);
    CREATE INDEX IF NOT EXISTS idx_contlify_tags_slug         ON contlify_tags(slug);
  `;

  try {
    await client.query(ddl);
    isPostgresMigrated = true;
  } catch {
    try {
      const stmts = ddl.split(";").map((s) => s.trim()).filter(Boolean);
      for (const s of stmts) {
        await client.query(s);
      }
      isPostgresMigrated = true;
    } catch {
      // Ignored if permissions or already existing
    }
  }
}

/**
 * Creates a pre-built Contlify adapter for PostgreSQL-compatible databases.
 * Works with Supabase, Neon, Railway, Vercel Postgres, RDS, and any \`pg\`-compatible client.
 *
 * @example
 * \`\`\`ts
 * import { Pool } from "pg";
 * import { createPostgresAdapter } from "contlify";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const adapter = createPostgresAdapter(pool);
 *
 * const handler = createContlifyHandler({ adapter });
 * \`\`\`
 */
export function createPostgresAdapter(client: PostgresClientLike): ContlifyAdapter {
  async function getPostCategories(postId: string): Promise<Category[]> {
    await ensurePostgresSchema(client);
    const res = await client.query<RawCategoryRow>(
      `SELECT c.* FROM contlify_categories c
       INNER JOIN contlify_post_categories pc ON c.id = pc.category_id
       WHERE pc.post_id = $1`,
      [postId]
    );
    return res.rows.map(mapRowToCategory);
  }

  async function getPostTags(postId: string): Promise<Tag[]> {
    await ensurePostgresSchema(client);
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
        await ensurePostgresSchema(client);
        await client.query("SELECT 1 AS alive");
        return true;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      await ensurePostgresSchema(client);
      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      const seoData = payload.seo ? JSON.stringify(payload.seo) : null;
      const customFields = payload.customFields ? JSON.stringify(payload.customFields) : null;

      const coverImg = extractImageUrl(
        payload.coverImage ??
        payload.cover_image ??
        payload.featured_image ??
        payload.featuredImage ??
        payload.image ??
        payload.imageUrl ??
        payload.image_url ??
        payload.thumbnail
      );

      const postRes = await client.query<{ id: string }>(
        `INSERT INTO contlify_posts
           (id, title, slug, subtitle, content, content_type, excerpt, cover_image, status, seo_data, custom_fields, published_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (slug) DO UPDATE SET
           title=$2, subtitle=$4, content=$5, content_type=$6, excerpt=$7,
           cover_image=$8, status=$9, seo_data=$10, custom_fields=$11,
           published_at=$12, updated_at=$14
         RETURNING id`,
        [
          id, payload.title, slug, payload.subtitle ?? null,
          payload.content, payload.contentType ?? "markdown",
          payload.excerpt ?? null,
          coverImg,
          payload.status ?? "published",
          seoData, customFields,
          payload.publishedAt ?? now, now, now,
        ]
      );

      const actualPostId = postRes.rows[0]?.id || id;

      // Handle author (supports string name or author object)
      if (payload.author) {
        const authorObj = typeof payload.author === "string" ? { name: payload.author } : (payload.author as Record<string, unknown>);
        const authorName = (authorObj.name as string | undefined) || "Unknown Author";
        const authorSlug = slugify((authorObj.slug as string | undefined) ?? authorName);
        const baseAuthorId = (authorObj.externalId as string | undefined) ?? `author_${authorSlug}`;
        const avatarStr = typeof authorObj.avatar === "object" && authorObj.avatar !== null
          ? (authorObj.avatar as { url?: string }).url ?? null
          : (authorObj.avatar as string | undefined) ?? null;

        const existingAuthor = await client.query<RawAuthorRow>(
          `SELECT id FROM contlify_authors WHERE slug = $1 OR id = $2 LIMIT 1`,
          [authorSlug, baseAuthorId]
        );

        let resolvedAuthorId: string;
        if (existingAuthor.rows.length > 0 && existingAuthor.rows[0]) {
          resolvedAuthorId = existingAuthor.rows[0].id;
          await client.query(
            `UPDATE contlify_authors SET name=$2, email=COALESCE($3, email), bio=COALESCE($4, bio), avatar=COALESCE($5, avatar), updated_at=$6 WHERE id=$1`,
            [resolvedAuthorId, authorName, (authorObj.email as string) ?? null, (authorObj.bio as string) ?? null, avatarStr, now]
          );
        } else {
          resolvedAuthorId = baseAuthorId;
          await client.query(
            `INSERT INTO contlify_authors (id, name, slug, email, bio, avatar, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (slug) DO UPDATE SET name=$2, email=$4, bio=$5, avatar=$6, updated_at=$8`,
            [resolvedAuthorId, authorName, authorSlug, (authorObj.email as string) ?? null, (authorObj.bio as string) ?? null, avatarStr, now, now]
          );
        }
        await client.query(`UPDATE contlify_posts SET author_id=$1 WHERE id=$2`, [resolvedAuthorId, actualPostId]);
      }

      // Handle categories (supports array of strings or category objects)
      if (payload.categories?.length) {
        for (const rawCat of payload.categories) {
          const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
          const catName = (cat.name as string | undefined) || "Uncategorized";
          const catSlug = slugify((cat.slug as string | undefined) ?? catName);
          const baseCatId = (cat.externalId as string | undefined) ?? `cat_${catSlug}`;
          const catCoverImg = extractImageUrl(cat.coverImage ?? cat.cover_image ?? cat.image ?? cat.imageUrl);

          const existingCat = await client.query<RawCategoryRow>(
            `SELECT id FROM contlify_categories WHERE slug = $1 OR id = $2 LIMIT 1`,
            [catSlug, baseCatId]
          );

          let resolvedCatId: string;
          if (existingCat.rows.length > 0 && existingCat.rows[0]) {
            resolvedCatId = existingCat.rows[0].id;
            await client.query(
              `UPDATE contlify_categories SET name=$2, cover_image=COALESCE($3, cover_image), updated_at=$4 WHERE id=$1`,
              [resolvedCatId, catName, catCoverImg, now]
            );
          } else {
            resolvedCatId = baseCatId;
            await client.query(
              `INSERT INTO contlify_categories (id, name, slug, cover_image, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (slug) DO UPDATE SET name=$2, cover_image=COALESCE($4, contlify_categories.cover_image), updated_at=$6`,
              [resolvedCatId, catName, catSlug, catCoverImg, now, now]
            );
          }

          await client.query(
            `INSERT INTO contlify_post_categories (post_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [actualPostId, resolvedCatId]
          );
        }
      }

      // Handle tags (supports array of strings or tag objects)
      if (payload.tags?.length) {
        for (const rawTag of payload.tags) {
          const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
          const tagName = (tag.name as string | undefined) || "General";
          const tagSlug = slugify((tag.slug as string | undefined) ?? tagName);
          const baseTagId = (tag.externalId as string | undefined) ?? `tag_${tagSlug}`;

          const existingTag = await client.query<RawTagRow>(
            `SELECT id FROM contlify_tags WHERE slug = $1 OR id = $2 LIMIT 1`,
            [tagSlug, baseTagId]
          );

          let resolvedTagId: string;
          if (existingTag.rows.length > 0 && existingTag.rows[0]) {
            resolvedTagId = existingTag.rows[0].id;
          } else {
            resolvedTagId = baseTagId;
            await client.query(
              `INSERT INTO contlify_tags (id, name, slug, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
              [resolvedTagId, tagName, tagSlug, now, now]
            );
          }

          await client.query(
            `INSERT INTO contlify_post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [actualPostId, resolvedTagId]
          );
        }
      }

      return {
        postId: actualPostId,
        slug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "created",
        url: `/blog/post/${slug}`,
      };
    },

    async updatePost(idOrSlug: string, payload: Partial<PublishPostPayload> & Record<string, unknown>): Promise<PublishResponse> {
      await ensurePostgresSchema(client);
      const existingPostRes = await client.query<RawPostRow>(
        `SELECT * FROM contlify_posts WHERE id = $1 OR slug = $1 LIMIT 1`,
        [idOrSlug]
      );
      if (!existingPostRes.rows[0]) {
        throw new NotFoundError(`Post not found with ID or slug: ${idOrSlug}`);
      }
      const existingPost = existingPostRes.rows[0];
      const postId = existingPost.id;

      const now = new Date().toISOString();
      const fields: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (payload.title !== undefined) { fields.push(`title=$${paramIdx++}`); params.push(payload.title); }
      if (payload.subtitle !== undefined) { fields.push(`subtitle=$${paramIdx++}`); params.push(payload.subtitle); }
      if (payload.content !== undefined) { fields.push(`content=$${paramIdx++}`); params.push(payload.content); }
      if (payload.excerpt !== undefined) { fields.push(`excerpt=$${paramIdx++}`); params.push(payload.excerpt); }
      if (payload.status !== undefined) { fields.push(`status=$${paramIdx++}`); params.push(payload.status); }
      
      const coverImg = extractImageUrl(
        payload.coverImage ??
        payload.cover_image ??
        payload.featured_image ??
        payload.featuredImage ??
        payload.image ??
        payload.imageUrl ??
        payload.image_url ??
        payload.thumbnail
      );
      if (coverImg !== null || payload.coverImage !== undefined || payload.cover_image !== undefined || payload.featured_image !== undefined) {
        fields.push(`cover_image=$${paramIdx++}`);
        params.push(coverImg);
      }

      if (payload.custom_slug ?? payload.slug) {
        const newSlug = slugify((payload.custom_slug ?? payload.slug) as string);
        fields.push(`slug=$${paramIdx++}`);
        params.push(newSlug);
      }

      if (payload.author !== undefined) {
        let authorId: string | null = null;
        if (typeof payload.author === "string") {
          const aSlug = slugify(payload.author);
          authorId = `author_${aSlug}`;
          await client.query(
            `INSERT INTO contlify_authors (id, name, slug, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
            [authorId, payload.author, aSlug, now]
          );
        } else if (payload.author && typeof payload.author === "object") {
          const authorObj = payload.author as Record<string, unknown>;
          const aName = (authorObj.name as string | undefined) || "";
          const aSlug = authorObj.slug ? slugify(authorObj.slug as string) : slugify(aName);
          authorId = (authorObj.id as string | undefined) || (authorObj.externalId as string | undefined) || `author_${aSlug}`;
          const avatarImg = extractImageUrl(authorObj.avatar ?? authorObj.image ?? authorObj.avatarUrl);
          await client.query(
            `INSERT INTO contlify_authors (id, name, slug, email, bio, avatar, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, bio = EXCLUDED.bio, avatar = EXCLUDED.avatar, updated_at = EXCLUDED.updated_at`,
            [authorId, aName, aSlug, authorObj.email || null, authorObj.bio || null, avatarImg || null, now]
          );
        }
        fields.push(`author_id=$${paramIdx++}`);
        params.push(authorId);
      }

      fields.push(`updated_at=$${paramIdx++}`);
      params.push(now);

      params.push(postId);
      const whereClause = `id=$${paramIdx}`;

      if (fields.length > 0) {
        await client.query(
          `UPDATE contlify_posts SET ${fields.join(", ")} WHERE ${whereClause}`,
          params
        );
      }

      if (payload.categories !== undefined) {
        await client.query(`DELETE FROM contlify_post_categories WHERE post_id = $1`, [postId]);
        const rawCategories = Array.isArray(payload.categories) ? payload.categories : [];
        for (const c of rawCategories) {
          let catId: string;
          let catName: string;
          let catSlug: string;
          let catDesc: string | null = null;
          let catImg: string | null = null;
          if (typeof c === "string") {
            catName = c;
            catSlug = slugify(c);
            catId = `cat_${catSlug}`;
          } else {
            const catObj = c as Record<string, unknown>;
            catName = (catObj.name as string | undefined) || "";
            catSlug = catObj.slug ? slugify(catObj.slug as string) : slugify(catName);
            catId = (catObj.id as string | undefined) || (catObj.externalId as string | undefined) || `cat_${catSlug}`;
            catDesc = (catObj.description as string | undefined) || null;
            catImg = extractImageUrl(catObj.coverImage ?? catObj.cover_image ?? catObj.image ?? catObj.imageUrl);
          }
          await client.query(
            `INSERT INTO contlify_categories (id, name, slug, description, cover_image, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, cover_image = COALESCE(EXCLUDED.cover_image, contlify_categories.cover_image), updated_at = EXCLUDED.updated_at`,
            [catId, catName, catSlug, catDesc, catImg, now]
          );
          const catRes = await client.query<{ id: string }>(`SELECT id FROM contlify_categories WHERE slug = $1`, [catSlug]);
          const finalCatId = catRes.rows[0]?.id ?? catId;
          await client.query(
            `INSERT INTO contlify_post_categories (post_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT (post_id, category_id) DO NOTHING`,
            [postId, finalCatId]
          );
        }
      }

      if (payload.tags !== undefined) {
        await client.query(`DELETE FROM contlify_post_tags WHERE post_id = $1`, [postId]);
        const rawTags = Array.isArray(payload.tags) ? payload.tags : [];
        for (const t of rawTags) {
          let tagId: string;
          let tagName: string;
          let tagSlug: string;
          if (typeof t === "string") {
            tagName = t;
            tagSlug = slugify(t);
            tagId = `tag_${tagSlug}`;
          } else {
            const tagObj = t as Record<string, unknown>;
            tagName = (tagObj.name as string | undefined) || "";
            tagSlug = tagObj.slug ? slugify(tagObj.slug as string) : slugify(tagName);
            tagId = (tagObj.id as string | undefined) || (tagObj.externalId as string | undefined) || `tag_${tagSlug}`;
          }
          await client.query(
            `INSERT INTO contlify_tags (id, name, slug, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
            [tagId, tagName, tagSlug, now]
          );
          const tagRes = await client.query<{ id: string }>(`SELECT id FROM contlify_tags WHERE slug = $1`, [tagSlug]);
          const finalTagId = tagRes.rows[0]?.id ?? tagId;
          await client.query(
            `INSERT INTO contlify_post_tags (post_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT (post_id, tag_id) DO NOTHING`,
            [postId, finalTagId]
          );
        }
      }

      const updatedSlug = (payload.custom_slug ?? payload.slug as string | undefined) ? slugify((payload.custom_slug ?? payload.slug) as string) : existingPost.slug;

      return {
        postId: existingPost.id,
        slug: updatedSlug,
        status: (payload.status as PublishResponse["status"]) ?? (existingPost.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/post/${updatedSlug}`,
      };
    },


    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      await ensurePostgresSchema(client);
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
      await ensurePostgresSchema(client);
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.slug = $1 AND (p.status = 'published' OR (p.status = 'scheduled' AND p.published_at <= NOW()))
         LIMIT 1`,
        [slug]
      );
      if (!res.rows[0]) return null;
      return resolveFullPost(res.rows[0]);
    },

    async getPostById(id: string): Promise<Post | null> {
      await ensurePostgresSchema(client);
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         WHERE p.id = $1 AND (p.status = 'published' OR (p.status = 'scheduled' AND p.published_at <= NOW()))
         LIMIT 1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return resolveFullPost(res.rows[0]);
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      await ensurePostgresSchema(client);
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         INNER JOIN contlify_post_categories pc ON p.id = pc.post_id
         INNER JOIN contlify_categories c ON c.id = pc.category_id
         WHERE c.slug = $1 AND (p.status = 'published' OR (p.status = 'scheduled' AND p.published_at <= NOW()))
         ORDER BY p.published_at DESC`,
        [categorySlug]
      );
      return Promise.all(res.rows.map((row) => resolveFullPost(row)));
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      await ensurePostgresSchema(client);
      const res = await client.query<RawPostRow>(
        `SELECT p.*, a.name as author_name, a.slug as author_slug, a.email as author_email, a.bio as author_bio, a.avatar as author_avatar
         FROM contlify_posts p
         LEFT JOIN contlify_authors a ON p.author_id = a.id
         INNER JOIN contlify_post_tags pt ON p.id = pt.post_id
         INNER JOIN contlify_tags t ON t.id = pt.tag_id
         WHERE t.slug = $1 AND (p.status = 'published' OR (p.status = 'scheduled' AND p.published_at <= NOW()))
         ORDER BY p.published_at DESC`,
        [tagSlug]
      );
      return Promise.all(res.rows.map((row) => resolveFullPost(row)));
    },


    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      await ensurePostgresSchema(client);
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
      await ensurePostgresSchema(client);
      const res = await client.query<RawAuthorRow>("SELECT * FROM contlify_authors ORDER BY name ASC");
      return res.rows.map(mapRowToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      await ensurePostgresSchema(client);
      const res = await client.query<RawCategoryRow>(
        `SELECT c.id, c.name, c.slug, c.description, c.parent_id, c.created_at, c.updated_at,
            COUNT(DISTINCT pc.post_id)::int AS post_count,
            COALESCE(
              c.cover_image,
              (SELECT p.cover_image
               FROM contlify_posts p
               INNER JOIN contlify_post_categories pc2 ON p.id = pc2.post_id
               WHERE pc2.category_id = c.id AND p.cover_image IS NOT NULL AND p.cover_image != ''
               ORDER BY p.published_at DESC LIMIT 1)
            ) AS cover_image
         FROM contlify_categories c
         LEFT JOIN contlify_post_categories pc ON pc.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      );
      return res.rows.map(mapRowToCategory);
    },

    async updateCategory(
      idOrSlug: string,
      payload: { name?: string; slug?: string; description?: string; coverImage?: string } & Record<string, unknown>
    ): Promise<Category> {
      await ensurePostgresSchema(client);
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
      if (payload.coverImage !== undefined || payload.cover_image !== undefined) {
        const cImg = extractImageUrl(payload.coverImage ?? payload.cover_image);
        fields.push(`cover_image = $${idx++}`);
        params.push(cImg);
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
      await ensurePostgresSchema(client);
      const res = await client.query<RawTagRow>(
        `SELECT t.id, t.name, t.slug, t.description, t.created_at, t.updated_at,
            COUNT(DISTINCT pt.post_id)::int AS post_count
         FROM contlify_tags t
         LEFT JOIN contlify_post_tags pt ON pt.tag_id = t.id
         GROUP BY t.id
         ORDER BY t.name ASC`
      );
      return res.rows.map(mapRowToTag);
    },
  };
}

