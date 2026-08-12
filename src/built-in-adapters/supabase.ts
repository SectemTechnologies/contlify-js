import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { mapRowToPost, mapRowToAuthor, mapRowToCategory, mapRowToTag, type RawPostRow, type RawAuthorRow, type RawCategoryRow, type RawTagRow } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal Supabase client interface.
 * Compatible with `@supabase/supabase-js` SupabaseClient.
 */
export interface SupabaseClientLike {
  from(table: string): SupabaseQueryBuilder;
}

export interface SupabaseQueryBuilder {
  select(columns?: string): SupabaseQuery;
  insert(data: Record<string, unknown> | Record<string, unknown>[]): SupabaseQuery;
  update(data: Record<string, unknown>): SupabaseQuery;
  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): SupabaseQuery;
  delete(): SupabaseQuery;
}

export interface SupabaseQuery {
  eq(column: string, value: unknown): SupabaseQuery;
  or(query: string): SupabaseQuery;
  in(column: string, values: unknown[]): SupabaseQuery;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  range(from: number, to: number): SupabaseQuery;
  single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
  then<T>(resolve: (value: { data: T[] | null; error: unknown }) => void): void;
}

/**
 * Creates a pre-built Contlify adapter for Supabase.
 * Pass your `createClient(url, key)` Supabase client instance.
 *
 * @example
 * ```ts
 * import { createClient } from "@supabase/supabase-js";
 * import { createSupabaseAdapter } from "contlify";
 *
 * const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
 * const adapter = createSupabaseAdapter(supabase);
 * ```
 */
export function createSupabaseAdapter(client: SupabaseClientLike): ContlifyAdapter {

  async function queryAll<T>(query: SupabaseQuery): Promise<T[]> {
    return new Promise<T[]>((resolve) => {
      query.then(({ data, error }) => {
        if (error) { resolve([]); return; }
        resolve((data as T[]) ?? []);
      });
    });
  }

  return {
    async ping(): Promise<boolean> {
      try {
        const res = await new Promise<{ data: unknown; error: unknown }>((resolve) => {
          client.from("contlify_posts").select("id").limit(1).then(resolve);
        });
        return !res.error;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      await new Promise<void>((resolve) => {
        client.from("contlify_posts").upsert({
          id, title: payload.title, slug,
          subtitle: payload.subtitle ?? null,
          content: payload.content,
          content_type: payload.contentType ?? "markdown",
          excerpt: payload.excerpt ?? null,
          cover_image: (payload.featured_image as string | undefined) ?? payload.coverImage ?? null,
          status: payload.status ?? "published",
          seo_data: payload.seo ? JSON.stringify(payload.seo) : null,
          custom_fields: payload.customFields ? JSON.stringify(payload.customFields) : null,
          published_at: payload.publishedAt ?? now,
          created_at: now, updated_at: now,
        }, { onConflict: "slug" }).then(() => resolve());
      });

      // Handle author (supports string name or author object)
      if (payload.author) {
        const authorObj = typeof payload.author === "string" ? { name: payload.author } : (payload.author as Record<string, unknown>);
        const authorName = (authorObj.name as string | undefined) || "Unknown Author";
        const authorSlug = slugify((authorObj.slug as string | undefined) ?? authorName);
        const authorId = (authorObj.externalId as string | undefined) ?? `author_${authorSlug}`;
        const avatarStr = typeof authorObj.avatar === "object" && authorObj.avatar !== null
          ? (authorObj.avatar as { url?: string }).url ?? null
          : (authorObj.avatar as string | undefined) ?? null;

        await new Promise<void>((resolve) => {
          client.from("contlify_authors").upsert({
            id: authorId, name: authorName, slug: authorSlug,
            email: (authorObj.email as string) ?? null,
            bio: (authorObj.bio as string) ?? null,
            avatar: avatarStr,
            created_at: now, updated_at: now,
          }, { onConflict: "slug" }).then(() => resolve());
        });
        await new Promise<void>((resolve) => {
          client.from("contlify_posts").update({ author_id: authorId }).eq("id", id).then(() => resolve());
        });
      }

      // Handle categories (supports array of strings or category objects)
      if (payload.categories?.length) {
        for (const rawCat of payload.categories) {
          const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
          const catName = (cat.name as string | undefined) || "Uncategorized";
          const catSlug = slugify((cat.slug as string | undefined) ?? catName);
          const catId = (cat.externalId as string | undefined) ?? `cat_${catSlug}`;
          await new Promise<void>((resolve) => {
            client.from("contlify_categories").upsert(
              { id: catId, name: catName, slug: catSlug, created_at: now, updated_at: now },
              { onConflict: "slug" }
            ).then(() => resolve());
          });
          await new Promise<void>((resolve) => {
            client.from("contlify_post_categories").upsert(
              { post_id: id, category_id: catId },
              { onConflict: "post_id,category_id" }
            ).then(() => resolve());
          });
        }
      }

      // Handle tags (supports array of strings or tag objects)
      if (payload.tags?.length) {
        for (const rawTag of payload.tags) {
          const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
          const tagName = (tag.name as string | undefined) || "General";
          const tagSlug = slugify((tag.slug as string | undefined) ?? tagName);
          const tagId = (tag.externalId as string | undefined) ?? `tag_${tagSlug}`;
          await new Promise<void>((resolve) => {
            client.from("contlify_tags").upsert(
              { id: tagId, name: tagName, slug: tagSlug, created_at: now, updated_at: now },
              { onConflict: "slug" }
            ).then(() => resolve());
          });
          await new Promise<void>((resolve) => {
            client.from("contlify_post_tags").upsert(
              { post_id: id, tag_id: tagId },
              { onConflict: "post_id,tag_id" }
            ).then(() => resolve());
          });
        }
      }

      return {
        postId: id, slug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "created",
        url: `/blog/${slug}`,
      };
    },

    async updatePost(idOrSlug: string, payload: Partial<PublishPostPayload> & Record<string, unknown>): Promise<PublishResponse> {
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updated_at: now };

      if (payload.title) updates.title = payload.title;
      if (payload.content) updates.content = payload.content;
      if (payload.status) updates.status = payload.status;
      if (payload.excerpt) updates.excerpt = payload.excerpt;
      if (payload.custom_slug ?? payload.slug) {
        updates.slug = slugify((payload.custom_slug ?? payload.slug) as string);
      }

      await new Promise<void>((resolve) => {
        client.from("contlify_posts").update(updates).or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).then(() => resolve());
      });

      const newSlug = (updates.slug as string | undefined) ?? idOrSlug;

      return {
        postId: idOrSlug, slug: newSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/${newSlug}`,
      };
    },

    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      let q = client.from("contlify_posts").select("*");
      if (options?.status) q = q.eq("status", options.status);
      const orderCol = options?.orderBy === "createdAt" ? "created_at" : options?.orderBy === "updatedAt" ? "updated_at" : "published_at";
      q = q.order(orderCol, { ascending: options?.order === "asc" });
      if (options?.limit && options?.offset !== undefined) {
        q = q.range(options.offset, options.offset + options.limit - 1);
      } else if (options?.limit) {
        q = q.limit(options.limit);
      }
      const rows = await queryAll<RawPostRow>(q);
      return rows.map((row) => mapRowToPost(row));
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      const result = await client.from("contlify_posts").select("*").eq("slug", slug).single();
      if (!result.data) return null;
      return mapRowToPost(result.data as unknown as RawPostRow);
    },

    async getPostById(id: string): Promise<Post | null> {
      const result = await client.from("contlify_posts").select("*").eq("id", id).single();
      if (!result.data) return null;
      return mapRowToPost(result.data as unknown as RawPostRow);
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      const catRes = await client.from("contlify_categories").select("id").eq("slug", categorySlug).single();
      if (!catRes.data) return [];
      const catId = (catRes.data as { id: string }).id;
      const joinRows = await queryAll<{ post_id: string }>(
        client.from("contlify_post_categories").select("post_id").eq("category_id", catId)
      );
      const postIds = joinRows.map((r) => r.post_id);
      if (!postIds.length) return [];
      const rows = await queryAll<RawPostRow>(
        client.from("contlify_posts").select("*").in("id", postIds).eq("status", "published").order("published_at", { ascending: false })
      );
      return rows.map((row) => mapRowToPost(row));
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      const tagRes = await client.from("contlify_tags").select("id").eq("slug", tagSlug).single();
      if (!tagRes.data) return [];
      const tagId = (tagRes.data as { id: string }).id;
      const joinRows = await queryAll<{ post_id: string }>(
        client.from("contlify_post_tags").select("post_id").eq("tag_id", tagId)
      );
      const postIds = joinRows.map((r) => r.post_id);
      if (!postIds.length) return [];
      const rows = await queryAll<RawPostRow>(
        client.from("contlify_posts").select("*").in("id", postIds).eq("status", "published").order("published_at", { ascending: false })
      );
      return rows.map((row) => mapRowToPost(row));
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      const rows = await queryAll<{ id: string }>(
        options?.status
          ? client.from("contlify_posts").select("id").eq("status", options.status)
          : client.from("contlify_posts").select("id")
      );
      return rows.length;
    },

    async getAuthors(): Promise<Author[]> {
      const rows = await queryAll<RawAuthorRow>(client.from("contlify_authors").select("*").order("name", { ascending: true }));
      return rows.map(mapRowToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      const rows = await queryAll<RawCategoryRow>(client.from("contlify_categories").select("*").order("name", { ascending: true }));
      return rows.map(mapRowToCategory);
    },

    async getTags(): Promise<Tag[]> {
      const rows = await queryAll<RawTagRow>(client.from("contlify_tags").select("*").order("name", { ascending: true }));
      return rows.map(mapRowToTag);
    },
  };
}
