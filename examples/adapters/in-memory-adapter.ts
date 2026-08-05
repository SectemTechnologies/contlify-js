import type {
  ContlifyAdapter,
  PublishPostPayload,
  PublishResponse,
  Post,
  Author,
  Category,
  Tag,
  AuthorPayload,
  CategoryPayload,
  TagPayload,
} from "../../src/index.js";

/**
 * Reference In-Memory Storage Adapter for Contlify.
 * Useful for local testing, development, and demonstration environments.
 */
export class InMemoryContlifyAdapter implements ContlifyAdapter {
  private postsMap = new Map<string, Post>();
  private authorsMap = new Map<string, Author>();
  private categoriesMap = new Map<string, Category>();
  private tagsMap = new Map<string, Tag>();

  public async ping(): Promise<boolean> {
    return true;
  }

  // --- Posts Operations ---

  public async createPost(
    payload: PublishPostPayload & Record<string, unknown>
  ): Promise<PublishResponse> {
    const id = payload.externalId ?? `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug = (payload.custom_slug ?? payload.slug ?? "untitled-post").trim();
    const now = new Date().toISOString();

    const post: Post = {
      id,
      slug,
      title: payload.title,
      subtitle: payload.subtitle,
      content: payload.content,
      contentType: payload.contentType ?? "markdown",
      excerpt: payload.excerpt,
      coverImage: payload.featured_image ?? payload.coverImage,
      status: payload.status ?? "published",
      author: payload.author
        ? {
            id: payload.author.externalId ?? `author_${slug}`,
            name: payload.author.name,
            slug: payload.author.slug ?? slug,
            bio: payload.author.bio,
            avatar: payload.author.avatar,
          }
        : undefined,
      categories: payload.categories
        ? payload.categories.map((c, i) => ({
            id: c.externalId ?? `cat_${i}`,
            name: c.name,
            slug: c.slug ?? `category-${i}`,
          }))
        : [],
      tags: payload.tags
        ? payload.tags.map((t, i) => ({
            id: t.externalId ?? `tag_${i}`,
            name: t.name,
            slug: t.slug ?? `tag-${i}`,
          }))
        : [],
      seo: payload.seo,
      publishedAt: payload.publishedAt ?? now,
      createdAt: now,
      updatedAt: now,
      customFields: payload.customFields,
    };

    this.postsMap.set(id, post);
    this.postsMap.set(slug, post);

    return {
      postId: id,
      slug,
      status: post.status,
      action: "created",
      url: (payload.post_url as string) ?? `/blog/${slug}`,
      post,
    };
  }

  public async updatePost(
    idOrSlug: string,
    payload: Partial<PublishPostPayload> & Record<string, unknown>
  ): Promise<PublishResponse> {
    const existing = this.postsMap.get(idOrSlug);
    const id = existing ? existing.id : idOrSlug;
    const slug = (payload.custom_slug ?? payload.slug ?? existing?.slug ?? idOrSlug).trim();
    const now = new Date().toISOString();

    const updatedPost: Post = {
      id,
      slug,
      title: payload.title ?? existing?.title ?? "Updated Post",
      subtitle: payload.subtitle ?? existing?.subtitle,
      content: payload.content ?? existing?.content ?? "",
      contentType: payload.contentType ?? existing?.contentType ?? "markdown",
      excerpt: payload.excerpt ?? existing?.excerpt,
      coverImage: payload.featured_image ?? payload.coverImage ?? existing?.coverImage,
      status: payload.status ?? existing?.status ?? "published",
      author: payload.author
        ? {
            id: payload.author.externalId ?? `author_${slug}`,
            name: payload.author.name,
            slug: payload.author.slug ?? slug,
            bio: payload.author.bio,
            avatar: payload.author.avatar,
          }
        : existing?.author,
      categories: payload.categories
        ? payload.categories.map((c, i) => ({
            id: c.externalId ?? `cat_${i}`,
            name: c.name,
            slug: c.slug ?? `category-${i}`,
          }))
        : existing?.categories ?? [],
      tags: payload.tags
        ? payload.tags.map((t, i) => ({
            id: t.externalId ?? `tag_${i}`,
            name: t.name,
            slug: t.slug ?? `tag-${i}`,
          }))
        : existing?.tags ?? [],
      seo: payload.seo ?? existing?.seo,
      publishedAt: payload.publishedAt ?? existing?.publishedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      customFields: payload.customFields ?? existing?.customFields,
    };

    this.postsMap.set(id, updatedPost);
    this.postsMap.set(slug, updatedPost);

    return {
      postId: id,
      slug,
      status: updatedPost.status,
      action: "updated",
      url: (payload.post_url as string) ?? `/blog/${slug}`,
      post: updatedPost,
    };
  }

  // --- Authors Operations ---

  public async getAuthors(): Promise<Author[]> {
    return Array.from(new Set(this.authorsMap.values()));
  }

  public async upsertAuthor(payload: AuthorPayload): Promise<Author> {
    const slug = payload.slug ?? "author-slug";
    const author: Author = {
      id: `author_${slug}`,
      slug,
      name: payload.name,
      email: payload.email,
      bio: payload.bio,
      avatar: payload.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.authorsMap.set(slug, author);
    return author;
  }

  // --- Categories Operations ---

  public async getCategories(): Promise<Category[]> {
    return Array.from(new Set(this.categoriesMap.values()));
  }

  public async upsertCategory(payload: CategoryPayload): Promise<Category> {
    const slug = payload.slug ?? "category-slug";
    const category: Category = {
      id: `category_${slug}`,
      slug,
      name: payload.name,
      description: payload.description,
      parentId: payload.parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.categoriesMap.set(slug, category);
    return category;
  }

  // --- Tags Operations ---

  public async getTags(): Promise<Tag[]> {
    return Array.from(new Set(this.tagsMap.values()));
  }

  public async upsertTag(payload: TagPayload): Promise<Tag> {
    const slug = payload.slug ?? "tag-slug";
    const tag: Tag = {
      id: `tag_${slug}`,
      slug,
      name: payload.name,
      description: payload.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tagsMap.set(slug, tag);
    return tag;
  }
}
