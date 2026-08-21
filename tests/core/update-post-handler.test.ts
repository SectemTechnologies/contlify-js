import { describe, it, expect, vi } from "vitest";
import { handleUpdatePost } from "../../src/core/update-post-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleUpdatePost", () => {
  it("preserves existing slug when updating title without passing a slug", async () => {
    const updatePostMock = vi.fn().mockResolvedValue({
      id: "post_123",
      title: "New Updated Title",
      slug: "original-slug",
      url: "https://myblog.com/blog/original-slug",
    });

    const mockAdapter: ContlifyAdapter = {
      updatePost: updatePostMock,
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
      getPostUrl: (post) => `https://myblog.com/blog/${post.slug}`,
    });

    const req = new Request("http://localhost/api/contlify/posts/post_123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Updated Title" }),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: { id: "post_123" },
    };

    const response = await handleUpdatePost(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { status: string; post_id: string; post_url: string };
    expect(body.status).toBe("success");
    expect(body.post_id).toBe("post_123");

    // Slug should NOT be forced to new-updated-title
    expect(updatePostMock).toHaveBeenCalledWith(
      "post_123",
      expect.objectContaining({
        title: "New Updated Title",
      })
    );
    const calledPayload = updatePostMock.mock.calls[0][1] as Record<string, unknown>;
    expect(calledPayload.slug).toBeUndefined();
  });

  it("updates slug and post_url when custom_slug is explicitly provided", async () => {
    const updatePostMock = vi.fn().mockResolvedValue({
      id: "post_123",
      slug: "new-custom-slug",
      url: "https://myblog.com/blog/new-custom-slug",
    });

    const mockAdapter: ContlifyAdapter = {
      updatePost: updatePostMock,
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
      getPostUrl: (post) => `https://myblog.com/blog/${post.slug}`,
    });

    const req = new Request("http://localhost/api/contlify/posts/post_123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_slug: "new-custom-slug" }),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: { id: "post_123" },
    };

    const response = await handleUpdatePost(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    expect(updatePostMock).toHaveBeenCalledWith(
      "post_123",
      expect.objectContaining({
        slug: "new-custom-slug",
        post_url: "https://myblog.com/blog/new-custom-slug",
      })
    );
  });
});
