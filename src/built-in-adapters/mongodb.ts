import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { AdapterError } from "../errors/adapter-error.js";
import { extractImageUrl } from "./row-mapper.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal MongoDB collection interface.
 * Compatible with the native `mongodb` driver Collection.
 */
export interface MongoCollectionLike<T = Record<string, unknown>> {
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  find(filter: Record<string, unknown>): {
    sort(s: unknown): {
      skip(n: number): {
        limit(n: number): {
          toArray(): Promise<T[]>;
        };
      };
    };
  };
  insertOne(doc: T): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: { upsert?: boolean }): Promise<unknown>;
  updateMany?(filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
}


export interface MongoDbLike {
  collection<T = Record<string, unknown>>(name: string): MongoCollectionLike<T> | unknown;
}

export type MongoDbProvider =
  | MongoDbLike
  | unknown
  | (() => MongoDbLike | unknown | Promise<MongoDbLike | unknown>);

/**
 * Creates a pre-built Contlify adapter for MongoDB.
 * Pass your connected `Db` instance from the native `mongodb` driver or a resolver function.
 */
export function createMongoAdapter(dbProvider: MongoDbProvider): ContlifyAdapter {
  async function getDb(): Promise<MongoDbLike | null> {
    let instance: unknown;
    if (typeof dbProvider === "function") {
      // Intentional nulls (build-time skip, missing env var) return null silently.
      // Real errors (bad URI, auth failure, topology closed) propagate so the caller
      // sees the actual cause instead of the generic "not available" message.
      instance = await dbProvider();
    } else {
      instance = dbProvider;
    }

    if (instance === null || instance === undefined) {
      return null;
    }

    if (typeof instance !== "object") {
      return null;
    }

    return instance as MongoDbLike;
  }

  // NOTE: We do NOT call ensureCol / listCollections before every access.
  // MongoDB Atlas creates collections automatically on the first insertOne/updateOne.
  // Calling listCollections per-request adds an unnecessary extra round-trip to Atlas.

  async function getPostsCol(): Promise<MongoCollectionLike<Record<string, unknown>> | null> {
    const db = await getDb();
    if (!db) return null;
    return db.collection<Record<string, unknown>>("contlify_posts") as MongoCollectionLike<Record<string, unknown>>;
  }

  async function getAuthorsCol(): Promise<MongoCollectionLike<Record<string, unknown>> | null> {
    const db = await getDb();
    if (!db) return null;
    return db.collection<Record<string, unknown>>("contlify_authors") as MongoCollectionLike<Record<string, unknown>>;
  }

  async function getCategoriesCol(): Promise<MongoCollectionLike<Record<string, unknown>> | null> {
    const db = await getDb();
    if (!db) return null;
    return db.collection<Record<string, unknown>>("contlify_categories") as MongoCollectionLike<Record<string, unknown>>;
  }

  async function getTagsCol(): Promise<MongoCollectionLike<Record<string, unknown>> | null> {
    const db = await getDb();
    if (!db) return null;
    return db.collection<Record<string, unknown>>("contlify_tags") as MongoCollectionLike<Record<string, unknown>>;
  }

  function docToPost(doc: Record<string, unknown>): Post {
    return {
      id: String(doc._id ?? doc.id ?? ""),
      slug: String(doc.slug ?? ""),
      title: String(doc.title ?? ""),
      subtitle: doc.subtitle ? String(doc.subtitle) : undefined,
      content: String(doc.content ?? ""),
      contentType: (doc.contentType as Post["contentType"]) ?? "markdown",
      excerpt: doc.excerpt ? String(doc.excerpt) : undefined,
      coverImage: doc.coverImage ? String(doc.coverImage) : undefined,
      status: (doc.status as Post["status"]) ?? "published",
      author: doc.author as Author | undefined,
      categories: (doc.categories as Category[]) ?? [],
      tags: (doc.tags as Tag[]) ?? [],
      seo: doc.seo as Post["seo"] | undefined,
      customFields: doc.customFields as Record<string, unknown> | undefined,
      publishedAt: doc.publishedAt ? String(doc.publishedAt) : undefined,
      createdAt: doc.createdAt ? String(doc.createdAt) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : new Date().toISOString(),
    };
  }

  function docToAuthor(doc: Record<string, unknown>): Author {
    return {
      id: String(doc._id ?? doc.id ?? ""),
      name: String(doc.name ?? ""),
      slug: String(doc.slug ?? ""),
      email: doc.email ? String(doc.email) : undefined,
      bio: doc.bio ? String(doc.bio) : undefined,
      avatar: doc.avatar ? String(doc.avatar) : undefined,
      createdAt: doc.createdAt ? String(doc.createdAt) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : new Date().toISOString(),
    };
  }

  function docToCategory(doc: Record<string, unknown>): Category {
    return {
      id: String(doc._id ?? doc.id ?? ""),
      name: String(doc.name ?? ""),
      slug: String(doc.slug ?? ""),
      description: doc.description ? String(doc.description) : undefined,
      parentId: doc.parentId ? String(doc.parentId) : undefined,
      createdAt: doc.createdAt ? String(doc.createdAt) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : new Date().toISOString(),
    };
  }

  function docToTag(doc: Record<string, unknown>): Tag {
    return {
      id: String(doc._id ?? doc.id ?? ""),
      name: String(doc.name ?? ""),
      slug: String(doc.slug ?? ""),
      description: doc.description ? String(doc.description) : undefined,
      createdAt: doc.createdAt ? String(doc.createdAt) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? String(doc.updatedAt) : new Date().toISOString(),
    };
  }

  return {
    async ping(): Promise<boolean> {
      try {
        const posts = await getPostsCol();
        if (!posts) return false;
        const findPromise = (posts as any).findOne ? (posts as any).findOne({}) : Promise.resolve(null);
        await Promise.race([
          findPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB ping timeout")), 3000)),
        ]);
        return true;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const posts = await getPostsCol();
      if (!posts) {
        throw new AdapterError("MongoDB database connection not available. Please check your MONGODB_URI environment variable.");
      }

      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      const authorDoc = payload.author
        ? typeof payload.author === "string"
          ? { id: `author_${slugify(payload.author)}`, name: payload.author, slug: slugify(payload.author) }
          : {
            id: (payload.author.externalId as string | undefined) ?? `author_${slugify(payload.author.name)}`,
            name: payload.author.name,
            slug: slugify((payload.author.slug as string | undefined) ?? payload.author.name),
            email: payload.author.email,
            bio: payload.author.bio,
            avatar: typeof payload.author.avatar === "object" && payload.author.avatar !== null ? payload.author.avatar.url : payload.author.avatar,
          }
        : undefined;

      const categoriesDocs = (payload.categories ?? []).map((rawCat: unknown) => {
        const cat = typeof rawCat === "string" ? { name: rawCat } : (rawCat as Record<string, unknown>);
        const name = (cat.name as string) || "Uncategorized";
        const catSlug = slugify((cat.slug as string) ?? name);
        return {
          id: (cat.externalId as string) ?? `cat_${catSlug}`,
          name,
          slug: catSlug,
        };
      });

      const tagsDocs = (payload.tags ?? []).map((rawTag: unknown) => {
        const tag = typeof rawTag === "string" ? { name: rawTag } : (rawTag as Record<string, unknown>);
        const name = (tag.name as string) || "General";
        const tagSlug = slugify((tag.slug as string) ?? name);
        return {
          id: (tag.externalId as string) ?? `tag_${tagSlug}`,
          name,
          slug: tagSlug,
        };
      });

      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;

      const doc = {
        id,
        slug,
        title: payload.title,
        subtitle: payload.subtitle,
        content: payload.content,
        contentType: payload.contentType ?? "markdown",
        excerpt: payload.excerpt,
        coverImage: extractImageUrl(
          payload.coverImage ??
          payload.cover_image ??
          payload.featured_image ??
          payload.featuredImage ??
          payload.image ??
          payload.imageUrl ??
          payload.image_url ??
          payload.thumbnail
        ) ?? undefined,
        status: payload.status ?? "published",
        author: authorDoc,
        categories: categoriesDocs,
        tags: tagsDocs,
        seo: payload.seo,
        customFields: payload.customFields,
        publishedAt: payload.publishedAt ?? now,
        createdAt: now,
        updatedAt: now,
      };

      await posts.updateOne({ slug }, { $set: doc }, { upsert: true });

      // Upsert categories into contlify_categories collection
      const categoriesCol = await getCategoriesCol();
      if (categoriesCol && categoriesDocs.length > 0) {
        for (const cat of categoriesDocs) {
          const catCoverImg = extractImageUrl((cat as any).coverImage ?? (cat as any).cover_image ?? (cat as any).image ?? (cat as any).imageUrl);
          await categoriesCol.updateOne(
            { slug: cat.slug },
            { $set: { id: cat.id, name: cat.name, slug: cat.slug, ...(catCoverImg ? { coverImage: catCoverImg } : {}), updatedAt: now } },
            { upsert: true }
          );
        }
      }

      // Upsert author into contlify_authors collection
      const authorsCol = await getAuthorsCol();
      if (authorsCol && authorDoc) {
        await authorsCol.updateOne(
          { slug: authorDoc.slug },
          { $set: { ...authorDoc, updatedAt: now } },
          { upsert: true }
        );
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
      const posts = await getPostsCol();
      if (!posts) {
        throw new AdapterError("MongoDB database connection not available. Please check your MONGODB_URI environment variable.");
      }

      const now = new Date().toISOString();
      const update: Record<string, unknown> = { updatedAt: now };

      if (payload.title) update.title = payload.title;
      if (payload.content) update.content = payload.content;
      if (payload.status) update.status = payload.status;
      if (payload.excerpt) update.excerpt = payload.excerpt;
      
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
        update.coverImage = coverImg ?? undefined;
      }

      if (payload.custom_slug ?? payload.slug) {
        update.slug = slugify((payload.custom_slug ?? payload.slug) as string);
      }

      await posts.updateOne(
        { $or: [{ id: idOrSlug }, { slug: idOrSlug }] } as Record<string, unknown>,
        { $set: update }
      );

      const newSlug = (update.slug as string | undefined) ?? idOrSlug;
      return {
        postId: idOrSlug,
        slug: newSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/post/${newSlug}`,
      };
    },


    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      try {
        const posts = await getPostsCol();
        if (!posts) return [];

        const filter: Record<string, unknown> = {};
        if (options?.status === "published") {
          const nowIso = new Date().toISOString();
          filter.$or = [
            { status: "published" },
            { status: "scheduled", publishedAt: { $lte: nowIso } }
          ];
        } else if (options?.status === "scheduled") {
          const nowIso = new Date().toISOString();
          filter.$or = [
            { status: "scheduled", publishedAt: { $gt: nowIso } }
          ];
        } else if (options?.status) {
          filter.status = options.status;
        }

        const sortField = options?.orderBy === "createdAt" ? "createdAt" : options?.orderBy === "updatedAt" ? "updatedAt" : "publishedAt";
        const sortDir = options?.order === "asc" ? 1 : -1;
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 1000;

        const docs = await posts
          .find(filter)
          .sort({ [sortField]: sortDir })
          .skip(offset)
          .limit(limit)
          .toArray();

        return docs.map(docToPost);
      } catch {
        return [];
      }
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      try {
        const posts = await getPostsCol();
        if (!posts) return null;

        const nowIso = new Date().toISOString();
        const filter = {
          slug,
          $or: [
            { status: "published" },
            { status: "scheduled", publishedAt: { $lte: nowIso } }
          ]
        };

        const doc = await posts.findOne(filter);
        if (!doc) return null;
        return docToPost(doc);
      } catch {
        return null;
      }
    },

    async getPostById(id: string): Promise<Post | null> {
      try {
        const posts = await getPostsCol();
        if (!posts) return null;

        const doc = await posts.findOne({ id });
        if (!doc) return null;
        return docToPost(doc);
      } catch {
        return null;
      }
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      try {
        const posts = await getPostsCol();
        if (!posts) return [];

        const nowIso = new Date().toISOString();
        const docs = await posts
          .find({
            "categories.slug": categorySlug,
            $or: [
              { status: "published" },
              { status: "scheduled", publishedAt: { $lte: nowIso } }
            ]
          })
          .sort({ publishedAt: -1 })
          .skip(0)
          .limit(1000)
          .toArray();

        return docs.map(docToPost);
      } catch {
        return [];
      }
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      try {
        const posts = await getPostsCol();
        if (!posts) return [];

        const nowIso = new Date().toISOString();
        const docs = await posts
          .find({
            "tags.slug": tagSlug,
            $or: [
              { status: "published" },
              { status: "scheduled", publishedAt: { $lte: nowIso } }
            ]
          })
          .sort({ publishedAt: -1 })
          .skip(0)
          .limit(1000)
          .toArray();

        return docs.map(docToPost);
      } catch {
        return [];
      }
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      try {
        const posts = await getPostsCol();
        if (!posts) return 0;

        const filter: Record<string, unknown> = {};
        if (options?.status === "published") {
          const nowIso = new Date().toISOString();
          filter.$or = [
            { status: "published" },
            { status: "scheduled", publishedAt: { $lte: nowIso } }
          ];
        } else if (options?.status) {
          filter.status = options.status;
        }

        return await posts.countDocuments(filter);
      } catch {
        return 0;
      }
    },

    async getAuthors(): Promise<Author[]> {
      try {
        const authors = await getAuthorsCol();
        if (!authors) return [];

        const docs = await authors.find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
        return docs.map(docToAuthor);
      } catch {
        return [];
      }
    },

    async getCategories(): Promise<Category[]> {
      try {
        // Single aggregation pipeline: fetch all categories and join the latest cover image
        // from the posts collection in ONE round-trip instead of N per-category queries.
        const db = await getDb();
        if (!db) return [];

        const categoriesCol = db.collection<Record<string, unknown>>("contlify_categories") as MongoCollectionLike<Record<string, unknown>>;
        const postsCol = db.collection<Record<string, unknown>>("contlify_posts") as MongoCollectionLike<Record<string, unknown>>;

        // Try to get categories from the dedicated collection first
        const catDocs = await categoriesCol.find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
        let baseCategories: Category[] = catDocs.map(docToCategory);

        // Fallback: aggregate categories embedded in posts if the collection is empty
        if (baseCategories.length === 0) {
          const postDocs = await postsCol.find({}).sort({ publishedAt: -1 }).skip(0).limit(1000).toArray();
          const categoryMap = new Map<string, Category>();
          for (const postDoc of postDocs) {
            const rawCats = (postDoc.categories ?? []) as Array<{ id?: string; name?: string; slug?: string }>;
            for (const cat of rawCats) {
              if (cat && cat.slug && !categoryMap.has(cat.slug)) {
                categoryMap.set(cat.slug, {
                  id: cat.id ?? `cat_${cat.slug}`,
                  name: cat.name ?? cat.slug,
                  slug: cat.slug,
                  coverImage: postDoc.coverImage ? String(postDoc.coverImage) : undefined,
                });
              }
            }
          }
          baseCategories = Array.from(categoryMap.values());
          return baseCategories;
        }

        // For categories that are missing a cover image, resolve them in a SINGLE query
        // by aggregating the latest post cover per category slug — not N separate queries.
        const slugsNeedingCover = baseCategories
          .filter((c) => !c.coverImage)
          .map((c) => c.slug);

        if (slugsNeedingCover.length > 0) {
          // One query: find the latest post with a coverImage for each of the slugs
          const coverPosts = await postsCol
            .find({
              "categories.slug": { $in: slugsNeedingCover } as unknown as Record<string, unknown>,
              coverImage: { $exists: true, $ne: null } as unknown as Record<string, unknown>,
            } as Record<string, unknown>)
            .sort({ publishedAt: -1 })
            .skip(0)
            .limit(1000)
            .toArray();

          // Build a map: categorySlug → first cover image found
          const coverMap = new Map<string, string>();
          for (const post of coverPosts) {
            const cats = (post.categories ?? []) as Array<{ slug?: string }>;
            const img = post.coverImage ? String(post.coverImage) : undefined;
            if (!img) continue;
            for (const cat of cats) {
              if (cat.slug && !coverMap.has(cat.slug)) {
                coverMap.set(cat.slug, img);
              }
            }
          }

          baseCategories = baseCategories.map((cat) =>
            cat.coverImage ? cat : { ...cat, coverImage: coverMap.get(cat.slug) }
          );
        }

        return baseCategories;
      } catch {
        return [];
      }
    },


    async updateCategory(
      idOrSlug: string,
      payload: { name?: string; slug?: string; description?: string; coverImage?: string }
    ): Promise<Category> {
      const categories = await getCategoriesCol();
      if (!categories) throw new Error("MongoDB categories collection not available");

      const updateData: Record<string, unknown> = {};
      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.slug !== undefined) updateData.slug = payload.slug;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.coverImage !== undefined || (payload as any).cover_image !== undefined) {
        updateData.coverImage = extractImageUrl(payload.coverImage ?? (payload as any).cover_image) ?? undefined;
      }

      const filter = { $or: [{ id: idOrSlug }, { slug: idOrSlug }] };
      if (Object.keys(updateData).length > 0) {
        await categories.updateOne(filter, { $set: updateData });

        // If category slug or name was updated, optionally update embedded categories in posts collection
        const posts = await getPostsCol();
        if (posts && (payload.name !== undefined || payload.slug !== undefined)) {
          try {
            await posts.updateMany?.(
              { "categories.slug": idOrSlug },

              {
                $set: {
                  ...(payload.name !== undefined ? { "categories.$[elem].name": payload.name } : {}),
                  ...(payload.slug !== undefined ? { "categories.$[elem].slug": payload.slug } : {}),
                },
              },
              { arrayFilters: [{ "elem.slug": idOrSlug }] }
            );
          } catch {
            // Ignore arrayFilters errors if not supported by older Mongo drivers
          }
        }
      }

      const updated = await categories.findOne(filter);
      if (!updated) {
        throw new Error(`Category not found: ${idOrSlug}`);
      }

      return docToCategory(updated);
    },

    async getTags(): Promise<Tag[]> {
      try {
        const tags = await getTagsCol();
        if (!tags) return [];

        const docs = await tags.find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
        return docs.map(docToTag);
      } catch {
        return [];
      }
    },
  };
}

