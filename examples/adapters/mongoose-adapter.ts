import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Author, Category, Tag } from "../../src/index.js";

export interface MongooseModelLike<T = Record<string, unknown>> {
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { upsert: boolean; new: boolean }
  ): Promise<T>;
  find(): Promise<T[]>;
}

/**
 * Reference Mongoose / MongoDB Adapter for Contlify.
 */
export class MongooseContlifyAdapter implements ContlifyAdapter {
  constructor(
    private readonly models: {
      PostModel: MongooseModelLike<{ _id: unknown; id?: string; slug: string; status: string }>;
      AuthorModel?: MongooseModelLike<Author>;
      CategoryModel?: MongooseModelLike<Category>;
      TagModel?: MongooseModelLike<Tag>;
    }
  ) {}

  public async ping(): Promise<boolean> {
    return Boolean(this.models.PostModel);
  }

  public async createPost(
    payload: PublishPostPayload & Record<string, unknown>
  ): Promise<PublishResponse> {
    const slug = (payload.custom_slug ?? payload.slug ?? "untitled-post").trim();

    const data = {
      title: payload.title,
      slug,
      content: payload.content,
      excerpt: payload.excerpt,
      status: payload.status ?? "published",
      updatedAt: new Date(),
    };

    const doc = await this.models.PostModel.findOneAndUpdate({ slug }, data, {
      upsert: true,
      new: true,
    });

    const postId = doc.id ?? String(doc._id);

    return {
      postId,
      slug: doc.slug,
      status: doc.status as "published" | "draft" | "archived" | "scheduled",
      action: "created",
      url: (payload.post_url as string) ?? `/blog/${doc.slug}`,
    };
  }

  public async updatePost(
    id: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse> {
    const slug = (payload.custom_slug ?? payload.slug)?.trim();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (payload.title) updateData.title = payload.title;
    if (payload.content) updateData.content = payload.content;
    if (payload.status) updateData.status = payload.status;
    if (slug) updateData.slug = slug;

    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const doc = await this.models.PostModel.findOneAndUpdate(filter, updateData, {
      upsert: false,
      new: true,
    });

    const postId = doc?.id ?? String(doc?._id ?? id);

    return {
      postId,
      slug: doc?.slug ?? slug ?? id,
      status: (doc?.status ?? payload.status ?? "published") as "published" | "draft" | "archived" | "scheduled",
      action: "updated",
      url: (payload.post_url as string) ?? `/blog/${doc?.slug ?? id}`,
    };
  }

  public async getAuthors(): Promise<Author[]> {
    if (this.models.AuthorModel) {
      return await this.models.AuthorModel.find();
    }
    return [];
  }

  public async getCategories(): Promise<Category[]> {
    if (this.models.CategoryModel) {
      return await this.models.CategoryModel.find();
    }
    return [];
  }

  public async getTags(): Promise<Tag[]> {
    if (this.models.TagModel) {
      return await this.models.TagModel.find();
    }
    return [];
  }
}
