import { describe, it, expect, vi } from "vitest";
import { handleGetCategories } from "../../src/core/categories-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleGetCategories", () => {
  it("should return categories from adapter", async () => {
    const mockCategories = [{ id: "cat_1", name: "Engineering", slug: "engineering" }];
    const mockAdapter: ContlifyAdapter = {
      getCategories: vi.fn().mockResolvedValue(mockCategories),
    };

    const config = resolveConfig({ apiKey: "key", adapter: mockAdapter });
    const req = new Request("http://localhost/api/contlify/categories", { method: "GET" });
    const requestContext = await RequestContext.fromRequest(req);

    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    const response = await handleGetCategories(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { success: boolean; data: typeof mockCategories };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockCategories);
  });
});
