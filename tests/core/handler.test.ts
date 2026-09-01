import { describe, it, expect, vi } from "vitest";
import { createContlifyHandler } from "../../src/core/handler.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("createContlifyHandler (End-to-End Integration)", () => {
  const API_KEY = "my-secret-contlify-api-key";

  it("should return 401 Unauthorized when X-Truecmo-Key is missing", async () => {
    const handler = createContlifyHandler({ apiKey: API_KEY });
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Post",
        content: "Content",
        status: "published",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);

    const body = (await response.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 Unauthorized when X-Truecmo-Key is invalid", async () => {
    const handler = createContlifyHandler({ apiKey: API_KEY });
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Truecmo-Key": "wrong-secret-key",
      },
      body: JSON.stringify({
        title: "Test Post",
        content: "Content",
        status: "published",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("should process POST /posts successfully when authenticated with X-Truecmo-Key", async () => {
    const mockAdapter: ContlifyAdapter = {
      posts: {
        createPost: vi.fn().mockResolvedValue({
          id: "post_xyz_123",
          slug: "publishing-with-contlify",
          url: "https://myblog.com/posts/publishing-with-contlify",
        }),
      },
    };

    const handler = createContlifyHandler({
      apiKey: API_KEY,
      adapter: mockAdapter,
      getPostUrl: (post) => `https://myblog.com/posts/${post.slug}`,
    });

    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Truecmo-Key": API_KEY,
      },
      body: JSON.stringify({
        title: "Publishing with Contlify!",
        content: "<h2>Next.js Blog Integration</h2>",
        status: "published",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as {
      status: string;
      post_id: string;
      post_url: string;
    };

    expect(body.status).toBe("success");
    expect(body.post_id).toBe("post_xyz_123");
    expect(body.post_url).toBe("https://myblog.com/posts/publishing-with-contlify");
  });

  it("should process GET /posts/:id successfully when authenticated", async () => {
    const mockPost = {
      id: "post_123",
      title: "Existing Post",
      slug: "existing-post",
      content: "Post content",
      status: "published" as const,
      categories: [],
      tags: [],
    };

    const mockAdapter: ContlifyAdapter = {
      getPostById: vi.fn().mockResolvedValue(mockPost),
    };

    const handler = createContlifyHandler({
      apiKey: API_KEY,
      adapter: mockAdapter,
    });

    const req = new Request("http://localhost/api/contlify/posts/post_123", {
      method: "GET",
      headers: {
        "X-Contlify-Key": API_KEY,
      },
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { status: string; data: typeof mockPost };
    expect(body.status).toBe("success");
    expect(body.data.id).toBe("post_123");
    expect(mockAdapter.getPostById).toHaveBeenCalledWith("post_123");
  });

  it("should interpolate postUrl: '/blog/{slug}' string pattern correctly", async () => {
    const mockAdapter: ContlifyAdapter = {
      createPost: vi.fn().mockResolvedValue({
        id: "post_456",
        slug: "pattern-slug",
      }),
    };

    const handler = createContlifyHandler({
      apiKey: API_KEY,
      adapter: mockAdapter,
      postUrl: "/blog/{slug}",
    });

    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Contlify-Key": API_KEY,
      },
      body: JSON.stringify({
        title: "Pattern Post",
        content: "Pattern Content",
        status: "published",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { post_url: string };
    expect(body.post_url).toBe("/blog/pattern-post");
  });
});
