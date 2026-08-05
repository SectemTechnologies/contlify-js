import { describe, it, expect, vi } from "vitest";
import { handleGetTags } from "../../src/core/tags-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleGetTags", () => {
  it("should return tags from adapter", async () => {
    const mockTags = [{ id: "tag_1", name: "TypeScript", slug: "typescript" }];
    const mockAdapter: ContlifyAdapter = {
      getTags: vi.fn().mockResolvedValue(mockTags),
    };

    const config = resolveConfig({ apiKey: "key", adapter: mockAdapter });
    const req = new Request("http://localhost/api/contlify/tags", { method: "GET" });
    const requestContext = await RequestContext.fromRequest(req);

    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    const response = await handleGetTags(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { success: boolean; data: typeof mockTags };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockTags);
  });
});
