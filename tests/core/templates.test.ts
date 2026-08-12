import { describe, it, expect } from "vitest";
import { getBlogListingTemplate } from "../../src/templates/blog-listing.template.js";
import { getCategoryPostsTemplate } from "../../src/templates/category-posts.template.js";
import { getBlogPostTemplate } from "../../src/templates/blog-post.template.js";
import { getQueriesTemplate } from "../../src/templates/queries.template.js";
import { getAdapterConfigTemplate } from "../../src/templates/adapter-config.template.js";
import { getApiRouteTemplate } from "../../src/templates/api-route.template.js";
import { getScaffoldManifest } from "../../src/templates/index.js";

describe("Template System", () => {
  describe("Blog Listing Template", () => {
    it("should return a non-empty string containing categories page structure", () => {
      const template = getBlogListingTemplate();
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(0);
    });

    it("should import getCategories from queries", () => {
      const template = getBlogListingTemplate();
      expect(template).toContain('import { getCategories } from "@/lib/contlify/queries"');
    });

    it("should call getCategories in the page component", () => {
      const template = getBlogListingTemplate();
      expect(template).toContain("getCategories()");
    });

    it("should render category links with slug-based URLs", () => {
      const template = getBlogListingTemplate();
      expect(template).toContain("/blog/category/");
      expect(template).toContain("category.slug");
    });

    it("should be a valid default export async function", () => {
      const template = getBlogListingTemplate();
      expect(template).toContain("export default async function");
    });
  });

  describe("Category Posts Template", () => {
    it("should return a non-empty string containing category posts page structure", () => {
      const template = getCategoryPostsTemplate();
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(0);
    });

    it("should import getPostsByCategory from queries", () => {
      const template = getCategoryPostsTemplate();
      expect(template).toContain('import { getPostsByCategory } from "@/lib/contlify/queries"');
    });

    it("should call getPostsByCategory in the page component", () => {
      const template = getCategoryPostsTemplate();
      expect(template).toContain("getPostsByCategory(slug)");
    });

    it("should render post links pointing to /blog/post/", () => {
      const template = getCategoryPostsTemplate();
      expect(template).toContain("/blog/post/");
    });
  });

  describe("Blog Post Template", () => {
    it("should return a non-empty string containing single post page structure", () => {
      const template = getBlogPostTemplate();
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(0);
    });

    it("should import getPostBySlug from queries", () => {
      const template = getBlogPostTemplate();
      expect(template).toContain('getPostBySlug');
      expect(template).toContain('@/lib/contlify/queries');
    });

    it("should call notFound() when post is missing", () => {
      const template = getBlogPostTemplate();
      expect(template).toContain("notFound()");
      expect(template).toContain('import { notFound } from "next/navigation"');
    });

    it("should render post content with dangerouslySetInnerHTML", () => {
      const template = getBlogPostTemplate();
      expect(template).toContain("dangerouslySetInnerHTML");
      expect(template).toContain("post.content");
    });

    it("should include generateMetadata for SEO", () => {
      const template = getBlogPostTemplate();
      expect(template).toContain("generateMetadata");
      expect(template).toContain("post.title");
    });
  });

  describe("Queries Template", () => {
    it("should export getCategories function", () => {
      const template = getQueriesTemplate();
      expect(template).toContain("export async function getCategories");
    });

    it("should export getPostsByCategory function", () => {
      const template = getQueriesTemplate();
      expect(template).toContain("export async function getPostsByCategory");
    });

    it("should export getAllPosts function", () => {
      const template = getQueriesTemplate();
      expect(template).toContain("export async function getAllPosts");
    });

    it("should export getPostBySlug function", () => {
      const template = getQueriesTemplate();
      expect(template).toContain("export async function getPostBySlug");
    });

    it("should export getPostById function", () => {
      const template = getQueriesTemplate();
      expect(template).toContain("export async function getPostById");
    });

    it("should import adapter from adapter config", () => {
      const template = getQueriesTemplate();
      expect(template).toContain('import { contlifyAdapter } from "./adapter"');
    });
  });

  describe("Adapter Config Template", () => {
    it("should export contlifyAdapter instance", () => {
      const template = getAdapterConfigTemplate();
      expect(template).toContain("export const contlifyAdapter");
    });

    it("should implement createPost method", () => {
      const template = getAdapterConfigTemplate();
      expect(template).toContain("async createPost");
    });

    it("should implement getAllPosts method", () => {
      const template = getAdapterConfigTemplate();
      expect(template).toContain("async getAllPosts");
    });

    it("should implement getPostBySlug method", () => {
      const template = getAdapterConfigTemplate();
      expect(template).toContain("async getPostBySlug");
    });

    it("should import ContlifyAdapter type from contlify", () => {
      const template = getAdapterConfigTemplate();
      expect(template).toContain('import type { ContlifyAdapter } from "contlify"');
    });
  });

  describe("API Route Template", () => {
    it("should import createContlifyHandler from contlify", () => {
      const template = getApiRouteTemplate();
      expect(template).toContain('import { createContlifyHandler } from "contlify"');
    });

    it("should import adapter from lib/contlify/adapter", () => {
      const template = getApiRouteTemplate();
      expect(template).toContain('@/lib/contlify/adapter');
    });

    it("should export handler for all HTTP methods", () => {
      const template = getApiRouteTemplate();
      expect(template).toContain("handler as GET");
      expect(template).toContain("handler as POST");
      expect(template).toContain("handler as PATCH");
      expect(template).toContain("handler as PUT");
    });
  });

  describe("Scaffold Manifest", () => {
    it("should return 7 file entries", () => {
      const manifest = getScaffoldManifest();
      expect(manifest).toHaveLength(7);
    });

    it("should include all expected file paths", () => {
      const manifest = getScaffoldManifest();
      const paths = manifest.map((e) => e.relativePath);

      expect(paths).toContain("app/api/contlify/[...path]/route.ts");
      expect(paths).toContain("lib/contlify/adapter.ts");
      expect(paths).toContain("lib/contlify/queries.ts");
      expect(paths).toContain("app/blog/page.tsx");
      expect(paths).toContain("app/blog/category/[slug]/page.tsx");
      expect(paths).toContain("app/blog/post/[slug]/page.tsx");
    });

    it("should have getContent functions that return non-empty strings", () => {
      const manifest = getScaffoldManifest();
      for (const entry of manifest) {
        const content = entry.getContent();
        expect(typeof content).toBe("string");
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it("each entry should have a description", () => {
      const manifest = getScaffoldManifest();
      for (const entry of manifest) {
        expect(typeof entry.description).toBe("string");
        expect(entry.description.length).toBeGreaterThan(0);
      }
    });
  });
});
