import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Author, Category, Tag } from "../../src/index.js";

/**
 * Minimal Prisma Client Interface representation for demonstration purposes.
 * Replace with your actual `@prisma/client` instance.
 */
export interface PrismaClientLike {
  post: {
    upsert(args: {
      where: { slug: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<{ id: string; slug: string; status: string }>;
    update(args: {
      where: { id: string } | { slug: string };
      data: Record<string, unknown>;
    }): Promise<{ id: string; slug: string; status: string }>;
  };
  author?: {
    findMany(): Promise<Author[]>;
  };
  category?: {
    findMany(): Promise<Category[]>;
  };
  tag?: {
    findMany(): Promise<Tag[]>;
  };
  $queryRaw?(query: TemplateStringsArray): Promise<unknown>;
}

/**
 * Reference Prisma ORM Adapter for Contlify.
 * Demonstrates connecting Contlify API handlers to a Prisma database client.
 *
 * @example
 * ```ts
 * import { PrismaClient } from "@prisma/client";
 * import { PrismaContlifyAdapter } from "./prisma-adapter";

 * const prisma = new PrismaClient();
 * const adapter = new PrismaContlifyAdapter(prisma);
 * ```
 */
export class PrismaContlifyAdapter implements ContlifyAdapter {
  constructor(private readonly prisma: PrismaClientLike) {}

  public async ping(): Promise<boolean> {
    return Boolean(this.prisma);
  }

  public async createPost(
    payload: PublishPostPayload & Record<string, unknown>
  ): Promise<PublishResponse> {
    const slug = (payload.custom_slug ?? payload.slug ?? "untitled-post").trim();

    const data = {
      title: payload.title,
      slug,
      content: payload.content,
      excerpt: payload.excerpt ?? null,
      coverImage: typeof payload.featured_image === "string" ? payload.featured_image : null,
      status: payload.status ?? "published",
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : new Date(),
    };

    const record = await this.prisma.post.upsert({
      where: { slug },
      create: data,
      update: data,
    });

    return {
      postId: record.id,
      slug: record.slug,
      status: record.status as "published" | "draft" | "archived" | "scheduled",
      action: "created",
      url: (payload.post_url as string) ?? `/blog/${record.slug}`,
    };
  }

  public async updatePost(
    id: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse> {
    const data: Record<string, unknown> = {};

    if (payload.title) data.title = payload.title;
    if (payload.content) data.content = payload.content;
    if (payload.status) data.status = payload.status;
    if (payload.excerpt) data.excerpt = payload.excerpt;
    if (payload.custom_slug || payload.slug) data.slug = (payload.custom_slug ?? payload.slug)?.trim();

    const record = await this.prisma.post.update({
      where: id.includes("-") || id.startsWith("post_") ? { id } : { slug: id },
      data,
    });

    return {
      postId: record.id,
      slug: record.slug,
      status: record.status as "published" | "draft" | "archived" | "scheduled",
      action: "updated",
      url: (payload.post_url as string) ?? `/blog/${record.slug}`,
    };
  }

  public async getAuthors(): Promise<Author[]> {
    if (this.prisma.author) {
      return await this.prisma.author.findMany();
    }
    return [];
  }

  public async getCategories(): Promise<Category[]> {
    if (this.prisma.category) {
      return await this.prisma.category.findMany();
    }
    return [];
  }

  public async getTags(): Promise<Tag[]> {
    if (this.prisma.tag) {
      return await this.prisma.tag.findMany();
    }
    return [];
  }
}
