import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryContlifyAdapter } from "../../examples/adapters/in-memory-adapter.js";
import type { PublishPostPayload } from "../../src/types/payload.js";

describe("InMemoryContlifyAdapter (Read Query Methods)", () => {
  let adapter: InMemoryContlifyAdapter;

  const samplePayload: PublishPostPayload & Record<string, unknown> = {
    title: "Test Post",
    content: "<p>Hello world</p>",
    status: "published",
    custom_slug: "test-post",
    categories: [{ name: "Tech", slug: "tech" }],
    tags: [{ name: "TypeScript", slug: "typescript" }],
    publishedAt: "2026-01-15T00:00:00.000Z",
  };

  const draftPayload: PublishPostPayload & Record<string, unknown> = {
    title: "Draft Post",
    content: "<p>Draft content</p>",
    status: "draft",
    custom_slug: "draft-post",
    publishedAt: "2026-01-10T00:00:00.000Z",
  };

  beforeEach(async () => {
    adapter = new InMemoryContlifyAdapter();
    await adapter.createPost(samplePayload);
    await adapter.createPost(draftPayload);
  });

  describe("getAllPosts", () => {
    it("should return all posts when no filter is provided", async () => {
      const posts = await adapter.getAllPosts();
      expect(posts).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const published = await adapter.getAllPosts({ status: "published" });
      expect(published).toHaveLength(1);
      expect(published[0]?.title).toBe("Test Post");

      const drafts = await adapter.getAllPosts({ status: "draft" });
      expect(drafts).toHaveLength(1);
      expect(drafts[0]?.title).toBe("Draft Post");
    });

    it("should sort by publishedAt descending by default", async () => {
      const posts = await adapter.getAllPosts();
      // "2026-01-15" should come before "2026-01-10" in desc order
      expect(posts[0]?.title).toBe("Test Post");
      expect(posts[1]?.title).toBe("Draft Post");
    });

    it("should support ascending sort order", async () => {
      const posts = await adapter.getAllPosts({ order: "asc" });
      expect(posts[0]?.title).toBe("Draft Post");
      expect(posts[1]?.title).toBe("Test Post");
    });

    it("should support pagination with limit and offset", async () => {
      const page1 = await adapter.getAllPosts({ limit: 1, offset: 0 });
      expect(page1).toHaveLength(1);

      const page2 = await adapter.getAllPosts({ limit: 1, offset: 1 });
      expect(page2).toHaveLength(1);

      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });
  });

  describe("getPostBySlug", () => {
    it("should return a post by slug", async () => {
      const post = await adapter.getPostBySlug("test-post");
      expect(post).not.toBeNull();
      expect(post?.title).toBe("Test Post");
    });

    it("should return null for non-existent slug", async () => {
      const post = await adapter.getPostBySlug("non-existent");
      expect(post).toBeNull();
    });
  });

  describe("getPostById", () => {
    it("should return a post by ID", async () => {
      const allPosts = await adapter.getAllPosts();
      const firstPost = allPosts[0]!;

      const post = await adapter.getPostById(firstPost.id);
      expect(post).not.toBeNull();
      expect(post?.title).toBe(firstPost.title);
    });

    it("should return null for non-existent ID", async () => {
      const post = await adapter.getPostById("non-existent-id");
      expect(post).toBeNull();
    });
  });

  describe("getPostsByCategory", () => {
    it("should return posts matching category slug", async () => {
      const posts = await adapter.getPostsByCategory("tech");
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("Test Post");
    });

    it("should return empty array for non-existent category", async () => {
      const posts = await adapter.getPostsByCategory("non-existent");
      expect(posts).toHaveLength(0);
    });
  });

  describe("getPostsByTag", () => {
    it("should return posts matching tag slug", async () => {
      const posts = await adapter.getPostsByTag("typescript");
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("Test Post");
    });

    it("should return empty array for non-existent tag", async () => {
      const posts = await adapter.getPostsByTag("non-existent");
      expect(posts).toHaveLength(0);
    });
  });

  describe("getPostCount", () => {
    it("should return total post count", async () => {
      const count = await adapter.getPostCount();
      expect(count).toBe(2);
    });

    it("should return filtered count by status", async () => {
      const publishedCount = await adapter.getPostCount({ status: "published" });
      expect(publishedCount).toBe(1);

      const draftCount = await adapter.getPostCount({ status: "draft" });
      expect(draftCount).toBe(1);
    });
  });
});
