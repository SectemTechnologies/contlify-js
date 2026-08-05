import type { ContlifyAdapter, PublishPostPayload, PublishResponse, Author, Category, Tag } from "../../src/index.js";

/**
 * Drizzle Database Client Interface representation for reference purposes.
 */
export interface DrizzleDbLike {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoUpdate(config: unknown): {
        returning(): Promise<Array<{ id: string; slug: string; status: string }>>;
      };
    };
  };
  update(table: unknown): {
    set(values: Record<string, unknown>): {
      where(clause: unknown): {
        returning(): Promise<Array<{ id: string; slug: string; status: string }>>;
      };
    };
  };
  select(): {
    from(table: unknown): Promise<unknown[]>;
  };
}

/**
 * Reference Drizzle ORM Adapter for Contlify.
 * Demonstrates connecting Contlify API handlers to Drizzle ORM schemas.
 */
export class DrizzleContlifyAdapter implements ContlifyAdapter {
  constructor(
    private readonly db: DrizzleDbLike,
    private readonly schema: {
      postsTable: unknown;
      authorsTable?: unknown;
      categoriesTable?: unknown;
      tagsTable?: unknown;
    }
  ) {}

  public async ping(): Promise<boolean> {
    return Boolean(this.db);
  }

  public async createPost(
    payload: PublishPostPayload & Record<string, unknown>
  ): Promise<PublishResponse> {
    const slug = (payload.custom_slug ?? payload.slug ?? "untitled-post").trim();

    const record = {
      id: payload.externalId ?? `post_${Date.now()}`,
      title: payload.title,
      slug,
      content: payload.content,
      excerpt: payload.excerpt ?? null,
      status: payload.status ?? "published",
      updatedAt: new Date(),
    };

    const results = await this.db
      .insert(this.schema.postsTable)
      .values(record)
      .onConflictDoUpdate({ target: "slug", set: record })
      .returning();

    const inserted = results[0] ?? { id: record.id, slug, status: record.status };

    return {
      postId: inserted.id,
      slug: inserted.slug,
      status: inserted.status as "published" | "draft" | "archived" | "scheduled",
      action: "created",
      url: (payload.post_url as string) ?? `/blog/${inserted.slug}`,
    };
  }

  public async updatePost(
    id: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse> {
    const slug = (payload.custom_slug ?? payload.slug)?.trim();
    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.title) data.title = payload.title;
    if (payload.content) data.content = payload.content;
    if (payload.status) data.status = payload.status;
    if (slug) data.slug = slug;

    const results = await this.db
      .update(this.schema.postsTable)
      .set(data)
      .where(id)
      .returning();

    const updated = results[0] ?? { id, slug: slug ?? id, status: (payload.status as string) ?? "published" };

    return {
      postId: updated.id,
      slug: updated.slug,
      status: updated.status as "published" | "draft" | "archived" | "scheduled",
      action: "updated",
      url: (payload.post_url as string) ?? `/blog/${updated.slug}`,
    };
  }

  public async getAuthors(): Promise<Author[]> {
    if (this.schema.authorsTable) {
      return (await this.db.select().from(this.schema.authorsTable)) as Author[];
    }
    return [];
  }

  public async getCategories(): Promise<Category[]> {
    if (this.schema.categoriesTable) {
      return (await this.db.select().from(this.schema.categoriesTable)) as Category[];
    }
    return [];
  }

  public async getTags(): Promise<Tag[]> {
    if (this.schema.tagsTable) {
      return (await this.db.select().from(this.schema.tagsTable)) as Tag[];
    }
    return [];
  }
}
