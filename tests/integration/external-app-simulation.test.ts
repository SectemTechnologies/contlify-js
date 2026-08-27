import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  defineConfig,
  getAllPosts,
  getPostBySlug,
  getPostCount,
} from "../../src/index.js";
import { clearActiveConfig } from "../../src/config/define-config.js";
import { createNextHandler } from "../../src/frameworks/next/index.js";
import { InMemoryContlifyAdapter } from "../../examples/adapters/in-memory-adapter.js";

describe("End-to-End External Next.js Application Simulation", () => {
  beforeEach(() => {
    clearActiveConfig();
  });

  afterEach(() => {
    clearActiveConfig();
  });

  it("should support library-first architecture: route handling and Server Component queries share unified storage", async () => {
    // 1. Customer creates contlify.config.ts using defineConfig
    const inMemoryStorage = new InMemoryContlifyAdapter();
    const config = defineConfig({
      apiKey: "contlify-secret-token",
      apiPath: "/api/contlify/v1",
      postUrl: "/blog/{slug}",
      storage: {
        driver: "custom",
        adapter: inMemoryStorage,
      },
    });

    // 2. Customer creates thin Next.js route: app/api/contlify/v1/[...path]/route.ts
    const route = createNextHandler(config);

    // Initial state: Database has 0 posts
    const initialCount = await getPostCount();
    expect(initialCount).toBe(0);

    // 3. Publisher service sends HTTP POST /api/contlify/v1/posts to Next.js route handler
    const publishPayload = {
      title: "How to Build with Contlify v2",
      content: "Contlify is now a library-first headless CMS publishing engine.",
      slug: "how-to-build-with-contlify-v2",
      status: "published",
      categories: [{ name: "Next.js", slug: "nextjs" }],
      tags: [{ name: "Architecture", slug: "architecture" }],
      publishedAt: "2026-03-01T12:00:00.000Z",
    };

    const publishRequest = new Request("http://localhost:3000/api/contlify/v1/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer contlify-secret-token",
      },
      body: JSON.stringify(publishPayload),
    });

    const routeResponse = await route.POST(publishRequest);
    expect(routeResponse.status).toBe(200);

    const publishResult = await routeResponse.json();
    expect(publishResult.status).toBe("success");
    expect(publishResult.post_url).toBe("/blog/how-to-build-with-contlify-v2");

    // 4. Server Component (e.g. app/blog/page.tsx) calls getAllPosts() directly from "contlify"
    const publishedPosts = await getAllPosts({ status: "published" });
    expect(publishedPosts).toHaveLength(1);
    expect(publishedPosts[0]?.title).toBe("How to Build with Contlify v2");
    expect(publishedPosts[0]?.categories?.[0]?.name).toBe("Next.js");

    // 5. Server Component (e.g. app/blog/[slug]/page.tsx) calls getPostBySlug() directly from "contlify"
    const singlePost = await getPostBySlug("how-to-build-with-contlify-v2");
    expect(singlePost).not.toBeNull();
    expect(singlePost?.content).toBe("Contlify is now a library-first headless CMS publishing engine.");
    expect(singlePost?.tags?.[0]?.slug).toBe("architecture");

    // 6. Verify total post count
    const finalCount = await getPostCount();
    expect(finalCount).toBe(1);
  });
});
