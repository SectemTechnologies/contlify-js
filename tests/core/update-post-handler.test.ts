import { describe, it, expect, vi } from "vitest";
import { handleUpdatePost } from "../../src/core/update-post-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleUpdatePost", () => {
  it("should process post update successfully", async () => {
    const updatePostMock = vi.fn().mockResolvedValue({
      id: "post_123",
      title: "New Updated Title",
      slug: "new-updated-title",
      url: "https://myblog.com/blog/new-updated-title",
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
    expect(body.post_url).toBe("https://myblog.com/blog/new-updated-title");

    expect(updatePostMock).toHaveBeenCalledWith(
      "post_123",
      expect.objectContaining({
        title: "New Updated Title",
        slug: "new-updated-title",
      })
    );
  });
});
