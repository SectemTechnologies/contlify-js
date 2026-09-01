import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { mapRowToPost, mapRowToAuthor, mapRowToCategory, mapRowToTag, extractImageUrl, type RawPostRow, type RawAuthorRow, type RawCategoryRow, type RawTagRow } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";
import { AdapterError } from "../errors/adapter-error.js";

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

function ensureNoError(res: any, operationName: string): void {
  if (res && res.error) {
    const msg = res.error.message || (typeof res.error === "string" ? res.error : JSON.stringify(res.error));
    const code = res.error.code ? ` [code: ${res.error.code}]` : "";
    if (msg.includes("does not exist") || res.error.code === "42P01" || res.error.code === "PGRST204" || res.error.code === "PGRST205") {
      throw new AdapterError(
        `Supabase table does not exist: ${msg}${code}. Please apply the Contlify SQL schema in your Supabase SQL Editor.`,
        res.error
      );
    }
    throw new AdapterError(`Supabase error during ${operationName}: ${msg}${code}`, res.error);
  }
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
export type SupabaseClientProvider =
  | SupabaseClientLike
  | (() => SupabaseClientLike | null | undefined | Promise<SupabaseClientLike | null | undefined>);

export function createSupabaseAdapter(clientProvider: any): ContlifyAdapter {
  async function getClient(required = true): Promise<any> {
    try {
      let resolved: any;
      if (typeof clientProvider === "function") {
        resolved = await clientProvider();
      } else {
        resolved = clientProvider;
      }
      if (!resolved || typeof resolved.from !== "function") {
        if (required) {
          throw new AdapterError(
            "Supabase client is not initialized or credentials are missing (SUPABASE_URL and SUPABASE_SECRET_KEY required)."
          );
        }
        return null;
      }
      return resolved;
    } catch (err: any) {
      if (err instanceof AdapterError) throw err;
      if (required) {
        throw new AdapterError(
          `Failed to resolve Supabase client: ${err?.message || String(err)}`,
          undefined,
          err instanceof Error ? err : undefined
        );
      }
      return null;
    }
  }

  async function queryAll<T>(query: any, operationName: string = "query"): Promise<T[]> {
    try {
      const res = await Promise.resolve(query);
      if (res && res.error) {
        ensureNoError(res, operationName);
      }
      return (res?.data as T[]) ?? [];
    } catch (err: any) {
      if (err instanceof AdapterError) throw err;
      const msg = err?.message || String(err);
      throw new AdapterError(`Supabase error during ${operationName}: ${msg}`, undefined, err instanceof Error ? err : undefined);
    }
  }

  async function executeSupabase<T = any>(queryPromise: any, operationName: string): Promise<{ data: T | null; error: unknown }> {
    try {
      const res = await Promise.resolve(queryPromise);
      if (res && res.error) {
        ensureNoError(res, operationName);
      }
      return res ?? { data: null, error: null };
    } catch (err: any) {
      if (err instanceof AdapterError) throw err;
      const msg = err?.message || String(err);
      throw new AdapterError(`Supabase error during ${operationName}: ${msg}`, undefined, err instanceof Error ? err : undefined);
    }
  }

  return {
    async ping(): Promise<boolean> {
      try {
        const client = await getClient(false);
        if (!client || typeof client.from !== "function") return false;
        const res = await Promise.resolve(client.from("contlify_posts").select("id").limit(1));
        return !res?.error;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const client = await getClient(true);
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      // Check if post already exists to reuse its existing ID (prevents foreign key constraint violations on contlify_post_categories)
      let actualPostId = payload.externalId as string | undefined;
      if (!actualPostId) {
        try {
          const checkQuery = client.from("contlify_posts");
          if (typeof checkQuery?.select === "function") {
            const existingPost = await queryAll<{ id: string }>(
              checkQuery.select("id").eq("slug", slug).limit(1),
              "createPost (check existing post slug)"
            );
            if (existingPost[0]?.id) {
              actualPostId = existingPost[0].id;
            }
          }
        } catch {
          // If check fails (e.g. table not found or mock client), fallback to generated ID
        }
        if (!actualPostId) {
          actualPostId = `post_${Date.now()}`;
        }
      }

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

      const upsertQuery = client.from("contlify_posts").upsert({
        id: actualPostId, title: payload.title, slug,
        subtitle: payload.subtitle ?? null,
        content: payload.content,
        content_type: payload.contentType ?? "markdown",
        excerpt: payload.excerpt ?? null,
        cover_image: coverImg,
        status: payload.status ?? "published",
        seo_data: payload.seo ? JSON.stringify(payload.seo) : null,
        custom_fields: payload.customFields ? JSON.stringify(payload.customFields) : null,
        published_at: payload.publishedAt ?? now,
        created_at: now, updated_at: now,
      }, { onConflict: "slug" });

      await executeSupabase(
        typeof upsertQuery?.select === "function" ? upsertQuery.select("id").single() : upsertQuery,
        "createPost (contlify_posts)"
      );

      // Handle author (supports string name or author object)
      if (payload.author) {
        const authorObj = typeof payload.author === "string" ? { name: payload.author } : (payload.author as Record<string, unknown>);
        const authorName = (authorObj.name as string | undefined) || "Unknown Author";
        const authorSlug = slugify((authorObj.slug as string | undefined) ?? authorName);
        
        let authorId = (authorObj.externalId as string | undefined);
        if (!authorId) {
          try {
            const authorQuery = client.from("contlify_authors");
            if (typeof authorQuery?.select === "function") {
              const existingAuthor = await queryAll<{ id: string }>(
                authorQuery.select("id").eq("slug", authorSlug).limit(1),
                "createPost (check existing author slug)"
              );
              if (existingAuthor[0]?.id) {
                authorId = existingAuthor[0].id;
              }
            }
          } catch {}
          if (!authorId) {
            authorId = `author_${authorSlug}`;
          }
        }

        const avatarStr = typeof authorObj.avatar === "object" && authorObj.avatar !== null
          ? (authorObj.avatar as { url?: string }).url ?? null
          : (authorObj.avatar as string | undefined) ?? null;

        await executeSupabase(
          client.from("contlify_authors").upsert({
            id: authorId, name: authorName, slug: authorSlug,
            email: (authorObj.email as string) ?? null,
            bio: (authorObj.bio as string) ?? null,
            avatar: avatarStr,
            created_at: now, updated_at: now,
          }, { onConflict: "slug" }),
          "createPost (contlify_authors)"
        );

        await executeSupabase(
          client.from("contlify_posts").update({ author_id: authorId }).eq("id", actualPostId),
          "createPost (link author)"
        );
      }

      // Handle categories (supports array of strings or category objects)
      if (payload.categories?.length) {
        for (const rawCat of payload.categories) {
          const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
          const catName = (cat.name as string | undefined) || "Uncategorized";
          const catSlug = slugify((cat.slug as string | undefined) ?? catName);
          
          let catId = (cat.externalId as string | undefined);
          if (!catId) {
            try {
              const catQuery = client.from("contlify_categories");
              if (typeof catQuery?.select === "function") {
                const existingCat = await queryAll<{ id: string }>(
                  catQuery.select("id").eq("slug", catSlug).limit(1),
                  "createPost (check existing category slug)"
                );
                if (existingCat[0]?.id) {
                  catId = existingCat[0].id;
                }
              }
            } catch {}
            if (!catId) {
              catId = `cat_${catSlug}`;
            }
          }

          const catCoverImg = extractImageUrl(cat.coverImage ?? cat.cover_image ?? cat.image ?? cat.imageUrl);

          await executeSupabase(
            client.from("contlify_categories").upsert(
              { id: catId, name: catName, slug: catSlug, cover_image: catCoverImg, created_at: now, updated_at: now },
              { onConflict: "slug" }
            ),
            "createPost (contlify_categories)"
          );

          await executeSupabase(
            client.from("contlify_post_categories").upsert(
              { post_id: actualPostId, category_id: catId },
              { onConflict: "post_id,category_id" }
            ),
            "createPost (contlify_post_categories)"
          );
        }
      }

      // Handle tags (supports array of strings or tag objects)
      if (payload.tags?.length) {
        for (const rawTag of payload.tags) {
          const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
          const tagName = (tag.name as string | undefined) || "General";
          const tagSlug = slugify((tag.slug as string | undefined) ?? tagName);
          
          let tagId = (tag.externalId as string | undefined);
          if (!tagId) {
            try {
              const tagQuery = client.from("contlify_tags");
              if (typeof tagQuery?.select === "function") {
                const existingTag = await queryAll<{ id: string }>(
                  tagQuery.select("id").eq("slug", tagSlug).limit(1),
                  "createPost (check existing tag slug)"
                );
                if (existingTag[0]?.id) {
                  tagId = existingTag[0].id;
                }
              }
            } catch {}
            if (!tagId) {
              tagId = `tag_${tagSlug}`;
            }
          }

          await executeSupabase(
            client.from("contlify_tags").upsert(
              { id: tagId, name: tagName, slug: tagSlug, created_at: now, updated_at: now },
              { onConflict: "slug" }
            ),
            "createPost (contlify_tags)"
          );

          await executeSupabase(
            client.from("contlify_post_tags").upsert(
              { post_id: actualPostId, tag_id: tagId },
              { onConflict: "post_id,tag_id" }
            ),
            "createPost (contlify_post_tags)"
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
      const client = await getClient(true);
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updated_at: now };

      if (payload.title) updates.title = payload.title;
      if (payload.content) updates.content = payload.content;
      if (payload.status) updates.status = payload.status;
      if (payload.excerpt) updates.excerpt = payload.excerpt;
      
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
        updates.cover_image = coverImg;
      }

      if (payload.custom_slug ?? payload.slug) {
        updates.slug = slugify((payload.custom_slug ?? payload.slug) as string);
      }

      await executeSupabase(
        client.from("contlify_posts").update(updates).or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`),
        "updatePost"
      );

      const newSlug = (updates.slug as string | undefined) ?? idOrSlug;

      return {
        postId: idOrSlug,
        slug: newSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/post/${newSlug}`,
      };
    },

    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      const client = await getClient(false);
      if (!client || typeof client.from !== "function") return [];
      let q = client.from("contlify_posts").select("*");
      if (options?.status) q = q.eq("status", options.status);
      const orderCol = options?.orderBy === "createdAt" ? "created_at" : options?.orderBy === "updatedAt" ? "updated_at" : "published_at";
      q = q.order(orderCol, { ascending: options?.order === "asc" });
      if (options?.limit && options?.offset !== undefined) {
        q = q.range(options.offset, options.offset + options.limit - 1);
      } else if (options?.limit) {
        q = q.limit(options.limit);
      }
      const rows = await queryAll<RawPostRow>(q, "getAllPosts");
      return rows.map((row) => mapRowToPost(row));
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      try {
        const client = await getClient(false);
        if (!client || typeof client.from !== "function") return null;
        const result = await Promise.resolve(client.from("contlify_posts").select("*").eq("slug", slug).single());
        if (!result || !result.data) return null;
        return mapRowToPost(result.data as unknown as RawPostRow);
      } catch {
        return null;
      }
    },

    async getPostById(id: string): Promise<Post | null> {
      try {
        const client = await getClient(false);
        if (!client || typeof client.from !== "function") return null;
        const result = await Promise.resolve(client.from("contlify_posts").select("*").eq("id", id).single());
        if (!result || !result.data) return null;
        return mapRowToPost(result.data as unknown as RawPostRow);
      } catch {
        return null;
      }
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      try {
        const client = await getClient(false);
        if (!client || typeof client.from !== "function") return [];
        const catRes = await Promise.resolve(client.from("contlify_categories").select("id").eq("slug", categorySlug).single());
        if (!catRes || !catRes.data) return [];
        const catId = (catRes.data as { id: string }).id;
        const joinRows = await queryAll<{ post_id: string }>(
          client.from("contlify_post_categories").select("post_id").eq("category_id", catId),
          "getPostsByCategory (join)"
        );
        const postIds = joinRows.map((r) => r.post_id);
        if (!postIds.length) return [];
        const rows = await queryAll<RawPostRow>(
          client.from("contlify_posts").select("*").in("id", postIds).eq("status", "published").order("published_at", { ascending: false }),
          "getPostsByCategory (posts)"
        );
        return rows.map((row) => mapRowToPost(row));
      } catch {
        return [];
      }
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      try {
        const client = await getClient(false);
        if (!client || typeof client.from !== "function") return [];
        const tagRes = await Promise.resolve(client.from("contlify_tags").select("id").eq("slug", tagSlug).single());
        if (!tagRes || !tagRes.data) return [];
        const tagId = (tagRes.data as { id: string }).id;
        const joinRows = await queryAll<{ post_id: string }>(
          client.from("contlify_post_tags").select("post_id").eq("tag_id", tagId),
          "getPostsByTag (join)"
        );
        const postIds = joinRows.map((r) => r.post_id);
        if (!postIds.length) return [];
        const rows = await queryAll<RawPostRow>(
          client.from("contlify_posts").select("*").in("id", postIds).eq("status", "published").order("published_at", { ascending: false }),
          "getPostsByTag (posts)"
        );
        return rows.map((row) => mapRowToPost(row));
      } catch {
        return [];
      }
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      const client = await getClient(false);
      if (!client || typeof client.from !== "function") return 0;
      const rows = await queryAll<{ id: string }>(
        options?.status
          ? client.from("contlify_posts").select("id").eq("status", options.status)
          : client.from("contlify_posts").select("id"),
        "getPostCount"
      );
      return rows.length;
    },

    async getAuthors(): Promise<Author[]> {
      const client = await getClient(false);
      if (!client || typeof client.from !== "function") return [];
      const rows = await queryAll<RawAuthorRow>(client.from("contlify_authors").select("*").order("name", { ascending: true }), "getAuthors");
      return rows.map(mapRowToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      const client = await getClient(false);
      if (!client || typeof client.from !== "function") return [];
      const rows = await queryAll<RawCategoryRow>(client.from("contlify_categories").select("*").order("name", { ascending: true }), "getCategories");
      const baseCategories = rows.map(mapRowToCategory);

      return Promise.all(
        baseCategories.map(async (cat) => {
          if (cat.coverImage) return cat;
          try {
            const joinRows = await queryAll<{ post_id: string }>(
              client.from("contlify_post_categories").select("post_id").eq("category_id", cat.id),
              "getCategories (cover image join)"
            );
            const postIds = joinRows.map((r) => r.post_id);
            if (!postIds.length) return cat;
            const postRows = await queryAll<{ cover_image?: string }>(
              client.from("contlify_posts").select("cover_image").in("id", postIds).order("published_at", { ascending: false }),
              "getCategories (cover image post)"
            );
            const validRow = postRows.find((r) => r.cover_image && r.cover_image.trim() !== "");
            return { ...cat, coverImage: validRow?.cover_image };
          } catch {
            return cat;
          }
        })
      );
    },

    async updateCategory(
      idOrSlug: string,
      payload: { name?: string; slug?: string; description?: string; coverImage?: string } & Record<string, unknown>
    ): Promise<Category> {
      const client = await getClient(true);
      const updateData: Record<string, unknown> = {};
      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.slug !== undefined) updateData.slug = payload.slug;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.coverImage !== undefined || (payload as any).cover_image !== undefined) {
        updateData.cover_image = extractImageUrl(payload.coverImage ?? (payload as any).cover_image);
      }

      if (Object.keys(updateData).length === 0) {
        const existing = await queryAll<RawCategoryRow>(
          client.from("contlify_categories").select("*").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).limit(1),
          "updateCategory (get existing)"
        );
        if (!existing[0]) throw new Error(`Category not found: ${idOrSlug}`);
        return mapRowToCategory(existing[0]);
      }

      let query = client.from("contlify_categories").update(updateData);
      query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).select("*");

      const rows = await queryAll<RawCategoryRow>(query, "updateCategory");
      if (!rows[0]) {
        throw new Error(`Category not found: ${idOrSlug}`);
      }
      return mapRowToCategory(rows[0]);
    },

    async getTags(): Promise<Tag[]> {
      const client = await getClient(false);
      if (!client || typeof client.from !== "function") return [];
      const rows = await queryAll<RawTagRow>(client.from("contlify_tags").select("*").order("name", { ascending: true }), "getTags");
      return rows.map(mapRowToTag);
    },
  };
}

