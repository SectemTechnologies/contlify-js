import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Post, Author, Category, Tag, PostQueryOptions } from "../index.js";
import { slugify } from "../utils/slugify.js";

/**
 * Minimal MongoDB collection interface.
 * Compatible with the native `mongodb` driver Collection.
 */
export interface MongoCollectionLike<T = Record<string, unknown>> {
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  find(filter: Record<string, unknown>): { sort(s: Record<string, number>): { skip(n: number): { limit(n: number): { toArray(): Promise<T[]> } } } };
  insertOne(doc: T): Promise<{ insertedId: unknown }>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: { upsert?: boolean }): Promise<{ modifiedCount: number; upsertedCount: number }>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
}

export interface MongoDbLike {
  collection<T = Record<string, unknown>>(name: string): MongoCollectionLike<T>;
}

/**
 * Creates a pre-built Contlify adapter for MongoDB.
 * Pass your connected `Db` instance from the native `mongodb` driver.
 *
 * @example
 * ```ts
 * import { MongoClient } from "mongodb";
 * import { createMongoAdapter } from "contlify";
 *
 * const client = new MongoClient(process.env.MONGODB_URI!);
 * await client.connect();
 * const db = client.db("myblog");
 * const adapter = createMongoAdapter(db);
 * ```
 */
export function createMongoAdapter(db: MongoDbLike): ContlifyAdapter {
  const posts = () => db.collection<Record<string, unknown>>("contlify_posts");
  const authors = () => db.collection<Record<string, unknown>>("contlify_authors");
  const categories = () => db.collection<Record<string, unknown>>("contlify_categories");
  const tags = () => db.collection<Record<string, unknown>>("contlify_tags");

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
        await posts().findOne({});
        return true;
      } catch {
        return false;
      }
    },

    async createPost(payload: PublishPostPayload & Record<string, unknown>): Promise<PublishResponse> {
      const slug = slugify((payload.custom_slug ?? payload.slug ?? payload.title) as string);
      const now = new Date().toISOString();

      const authorDoc = payload.author ? {
        id: payload.author.externalId ?? `author_${slugify(payload.author.name)}`,
        name: payload.author.name,
        slug: slugify(payload.author.slug ?? payload.author.name),
        email: payload.author.email,
        bio: payload.author.bio,
        avatar: payload.author.avatar,
      } : undefined;

      const categoriesDocs = (payload.categories ?? []).map((c) => ({
        id: c.externalId ?? `cat_${slugify(c.name)}`,
        name: c.name,
        slug: slugify(c.slug ?? c.name),
      }));

      const tagsDocs = (payload.tags ?? []).map((t) => ({
        id: t.externalId ?? `tag_${slugify(t.name)}`,
        name: t.name,
        slug: slugify(t.slug ?? t.name),
      }));

      const id = (payload.externalId as string | undefined) ?? `post_${Date.now()}`;

      const doc = {
        id, slug, title: payload.title, subtitle: payload.subtitle,
        content: payload.content, contentType: payload.contentType ?? "markdown",
        excerpt: payload.excerpt,
        coverImage: (payload.featured_image as string | undefined) ?? payload.coverImage,
        status: payload.status ?? "published",
        author: authorDoc,
        categories: categoriesDocs,
        tags: tagsDocs,
        seo: payload.seo,
        customFields: payload.customFields,
        publishedAt: payload.publishedAt ?? now,
        createdAt: now, updatedAt: now,
      };

      await posts().updateOne({ slug }, { $set: doc }, { upsert: true });

      return {
        postId: id, slug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "created",
        url: `/blog/${slug}`,
      };
    },

    async updatePost(idOrSlug: string, payload: Partial<PublishPostPayload> & Record<string, unknown>): Promise<PublishResponse> {
      const now = new Date().toISOString();
      const update: Record<string, unknown> = { updatedAt: now };

      if (payload.title) update.title = payload.title;
      if (payload.content) update.content = payload.content;
      if (payload.status) update.status = payload.status;
      if (payload.excerpt) update.excerpt = payload.excerpt;
      if (payload.custom_slug ?? payload.slug) {
        update.slug = slugify((payload.custom_slug ?? payload.slug) as string);
      }

      await posts().updateOne(
        { $or: [{ id: idOrSlug }, { slug: idOrSlug }] } as Record<string, unknown>,
        { $set: update }
      );

      const newSlug = (update.slug as string | undefined) ?? idOrSlug;
      return {
        postId: idOrSlug, slug: newSlug,
        status: (payload.status as PublishResponse["status"]) ?? "published",
        action: "updated",
        url: `/blog/${newSlug}`,
      };
    },

    async getAllPosts(options?: PostQueryOptions): Promise<Post[]> {
      const filter: Record<string, unknown> = {};
      if (options?.status) filter.status = options.status;

      const sortField = options?.orderBy === "createdAt" ? "createdAt" : options?.orderBy === "updatedAt" ? "updatedAt" : "publishedAt";
      const sortDir = options?.order === "asc" ? 1 : -1;
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 1000;

      const docs = await posts()
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip(offset)
        .limit(limit)
        .toArray();

      return docs.map(docToPost);
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
      const doc = await posts().findOne({ slug });
      if (!doc) return null;
      return docToPost(doc);
    },

    async getPostById(id: string): Promise<Post | null> {
      const doc = await posts().findOne({ id });
      if (!doc) return null;
      return docToPost(doc);
    },

    async getPostsByCategory(categorySlug: string): Promise<Post[]> {
      const docs = await posts()
        .find({ "categories.slug": categorySlug, status: "published" })
        .sort({ publishedAt: -1 })
        .skip(0)
        .limit(1000)
        .toArray();
      return docs.map(docToPost);
    },

    async getPostsByTag(tagSlug: string): Promise<Post[]> {
      const docs = await posts()
        .find({ "tags.slug": tagSlug, status: "published" })
        .sort({ publishedAt: -1 })
        .skip(0)
        .limit(1000)
        .toArray();
      return docs.map(docToPost);
    },

    async getPostCount(options?: { status?: Post["status"] }): Promise<number> {
      const filter: Record<string, unknown> = {};
      if (options?.status) filter.status = options.status;
      return await posts().countDocuments(filter);
    },

    async getAuthors(): Promise<Author[]> {
      const docs = await authors().find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
      return docs.map(docToAuthor);
    },

    async getCategories(): Promise<Category[]> {
      const docs = await categories().find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
      return docs.map(docToCategory);
    },

    async getTags(): Promise<Tag[]> {
      const docs = await tags().find({}).sort({ name: 1 }).skip(0).limit(1000).toArray();
      return docs.map(docToTag);
    },
  };
}
