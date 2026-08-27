import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  defineConfig,
  getAllPosts,
  getPostBySlug,
  getPostById,
  getPostsByCategory,
  getPostsByTag,
  getPostCount,
  getCategories,
  getTags,
  getAuthors,
} from "../../src/index.js";
import { clearActiveConfig } from "../../src/config/define-config.js";
import { InMemoryContlifyAdapter } from "../../examples/adapters/in-memory-adapter.js";

describe("Package-Level Query Functions (contlify read API)", () => {
  let adapter: InMemoryContlifyAdapter;

  beforeEach(async () => {
    clearActiveConfig();
    adapter = new InMemoryContlifyAdapter();

    // Populate test data
    await adapter.createPost({
      title: "First Post",
      content: "Content of first post",
      custom_slug: "first-post",
      status: "published",
      categories: [{ name: "Engineering", slug: "engineering" }],
      tags: [{ name: "TypeScript", slug: "typescript" }],
      publishedAt: "2026-02-01T00:00:00.000Z",
    });

    await adapter.createPost({
      title: "Second Post (Draft)",
      content: "Draft content",
      custom_slug: "second-post",
      status: "draft",
      categories: [{ name: "Design", slug: "design" }],
      tags: [{ name: "CSS", slug: "css" }],
      publishedAt: "2026-02-02T00:00:00.000Z",
    });

    // Register active configuration
    defineConfig({
      apiKey: "secret-key",
      storage: {
        driver: "custom",
        adapter,
      },
    });
  });

  afterEach(() => {
    clearActiveConfig();
  });

  it("should throw AdapterError when no adapter is configured", async () => {
    clearActiveConfig();
    await expect(getAllPosts()).rejects.toThrow("No database adapter configured");
  });

  describe("getAllPosts", () => {
    it("should retrieve all posts using active config", async () => {
      const posts = await getAllPosts();
      expect(posts).toHaveLength(2);
    });

    it("should filter posts by publication status", async () => {
      const published = await getAllPosts({ status: "published" });
      expect(published).toHaveLength(1);
      expect(published[0]?.title).toBe("First Post");

      const drafts = await getAllPosts({ status: "draft" });
      expect(drafts).toHaveLength(1);
      expect(drafts[0]?.title).toBe("Second Post (Draft)");
    });
  });

  describe("getPostBySlug", () => {
    it("should retrieve post by URL slug", async () => {
      const post = await getPostBySlug("first-post");
      expect(post).not.toBeNull();
      expect(post?.title).toBe("First Post");
    });

    it("should return null for non-existent slug", async () => {
      const post = await getPostBySlug("non-existent-slug");
      expect(post).toBeNull();
    });
  });

  describe("getPostById", () => {
    it("should retrieve post by ID", async () => {
      const all = await getAllPosts();
      const firstId = all[0]!.id;

      const post = await getPostById(firstId);
      expect(post).not.toBeNull();
      expect(post?.id).toBe(firstId);
    });

    it("should return null for non-existent ID", async () => {
      const post = await getPostById("unknown-id");
      expect(post).toBeNull();
    });
  });

  describe("getPostsByCategory", () => {
    it("should retrieve posts by category slug", async () => {
      const posts = await getPostsByCategory("engineering");
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("First Post");
    });

    it("should return empty array for unknown category", async () => {
      const posts = await getPostsByCategory("unknown-cat");
      expect(posts).toEqual([]);
    });
  });

  describe("getPostsByTag", () => {
    it("should retrieve posts by tag slug", async () => {
      const posts = await getPostsByTag("typescript");
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("First Post");
    });

    it("should return empty array for unknown tag", async () => {
      const posts = await getPostsByTag("unknown-tag");
      expect(posts).toEqual([]);
    });
  });

  describe("getPostCount", () => {
    it("should return total count of posts", async () => {
      const count = await getPostCount();
      expect(count).toBe(2);
    });

    it("should return filtered count by status", async () => {
      const publishedCount = await getPostCount({ status: "published" });
      expect(publishedCount).toBe(1);
    });
  });

  describe("Taxonomy query functions", () => {
    it("should query getCategories", async () => {
      const categories = await getCategories();
      expect(Array.isArray(categories)).toBe(true);
    });

    it("should query getTags", async () => {
      const tags = await getTags();
      expect(Array.isArray(tags)).toBe(true);
    });

    it("should query getAuthors", async () => {
      const authors = await getAuthors();
      expect(Array.isArray(authors)).toBe(true);
    });
  });

  describe("Explicit config override", () => {
    it("should allow passing explicit config object instead of relying on active config", async () => {
      clearActiveConfig();
      const explicitAdapter = new InMemoryContlifyAdapter();
      await explicitAdapter.createPost({
        title: "Explicit Config Post",
        content: "Hello",
        custom_slug: "explicit-post",
      });

      const posts = await getAllPosts(undefined, {
        apiKey: "test",
        storage: explicitAdapter,
      });

      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("Explicit Config Post");
    });
  });
});
