import { describe, it, expect, vi } from "vitest";
import { handleCreatePost } from "../../src/core/posts-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleCreatePost", () => {
  it("should process valid payload, auto-generate slug, execute adapter, and return success JSON", async () => {
    const createPostMock = vi.fn().mockResolvedValue({
      id: "post_db_999",
      slug: "awesome-post-title",
      post_url: "https://mywebsite.com/blog/awesome-post-title",
    });

    const mockAdapter: ContlifyAdapter = {
      createPost: createPostMock,
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
      getPostUrl: (post) => `https://mywebsite.com/blog/${post.slug}`,
    });

    const payload = {
      title: "Awesome Post Title!",
      content: "<p>Hello Content</p>",
      status: "published",
    };

    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    const response = await handleCreatePost(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as {
      status: string;
      post_id: string;
      post_url: string;
    };

    expect(body.status).toBe("success");
    expect(body.post_id).toBe("post_db_999");
    expect(body.post_url).toBe("https://mywebsite.com/blog/awesome-post-title");

    expect(createPostMock).toHaveBeenCalledTimes(1);
    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Awesome Post Title!",
        slug: "awesome-post-title",
        post_url: "https://mywebsite.com/blog/awesome-post-title",
      })
    );
  });

  it("should use custom_slug when provided", async () => {
    const createPostMock = vi.fn().mockResolvedValue({ id: "post_123" });
    const mockAdapter: ContlifyAdapter = { createPost: createPostMock };
    const config = resolveConfig({ apiKey: "key", adapter: mockAdapter });

    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Title Here",
        content: "Content",
        status: "draft",
        custom_slug: "my-custom-slug",
      }),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    await handleCreatePost(routeCtx);

    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "my-custom-slug",
        custom_slug: "my-custom-slug",
      })
    );
  });

  it("should return 400 Bad Request when payload validation fails", async () => {
    const config = resolveConfig({ apiKey: "key" });
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }), // missing content and status
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      params: {},
    };

    const response = await handleCreatePost(routeCtx);
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);

    const body = (await response.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
