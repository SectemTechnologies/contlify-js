/**
 * Template for the adapter config file: lib/contlify/adapter.ts
 * Generated into the user's project during `contlify init`.
 *
 * This placeholder uses an in-memory adapter for development.
 * Phase 2 will auto-generate this file with the user's chosen database adapter.
 */
export function getAdapterConfigTemplate(): string {
  return `import type { ContlifyAdapter } from "contlify";

/**
 * Contlify database adapter instance.
 *
 * Replace this with your actual database adapter.
 * See: https://github.com/SectemTechnologies/Next.js-Package#adapters
 *
 * Example with a pre-built adapter (Phase 2):
 *   import { PostgresAdapter } from "contlify/adapters/postgres";
 *   export const contlifyAdapter = PostgresAdapter(process.env.DATABASE_URL!);
 */

// Placeholder: In-memory adapter for development and testing.
// Posts stored here will be lost on server restart.
const posts = new Map<string, Record<string, unknown>>();

export const contlifyAdapter: ContlifyAdapter = {
  async createPost(payload) {
    const id = payload.externalId ?? \`post_\${Date.now()}\`;
    const slug = (payload.custom_slug ?? payload.slug ?? "untitled").toString().trim();
    const now = new Date().toISOString();

    const post = {
      id,
      slug,
      title: payload.title,
      subtitle: payload.subtitle,
      content: payload.content,
      excerpt: payload.excerpt,
      status: payload.status ?? "published",
      author: payload.author,
      categories: payload.categories,
      tags: payload.tags,
      publishedAt: payload.publishedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };

    posts.set(id, post);
    posts.set(slug, post);

    return { postId: id, slug, status: post.status, action: "created" as const };
  },

  async updatePost(id, payload) {
    const existing = posts.get(id) ?? {};
    const updated = { ...existing, ...payload, updatedAt: new Date().toISOString() };
    const slug = (payload.custom_slug ?? payload.slug ?? existing.slug ?? id).toString().trim();
    updated.slug = slug;

    posts.set(id, updated);
    posts.set(slug, updated);

    return { postId: id, slug, status: (updated.status as string) ?? "published", action: "updated" as const };
  },

  async getAllPosts() {
    const seen = new Set<string>();
    const result: Record<string, unknown>[] = [];
    for (const post of posts.values()) {
      const postId = (post as { id?: string }).id ?? "";
      if (!seen.has(postId)) {
        seen.add(postId);
        result.push(post);
      }
    }
    return result as any[];
  },

  async getPostBySlug(slug) {
    return (posts.get(slug) as any) ?? null;
  },

  async getPostById(id) {
    return (posts.get(id) as any) ?? null;
  },

  async getAuthors() {
    return [];
  },

  async getCategories() {
    return [];
  },

  async getTags() {
    return [];
  },

  async ping() {
    return true;
  },
};
`;
}
