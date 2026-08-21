import { describe, it, expect, vi } from "vitest";
import { handleUpdateCategory } from "../../src/core/update-category-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleUpdateCategory", () => {
  it("updates a category name and description successfully", async () => {
    const updateCategoryMock = vi.fn().mockResolvedValue({
      id: "cat_1",
      name: "Modern Engineering",
      slug: "tech",
      description: "Updated description",
    });

    const mockAdapter: ContlifyAdapter = {
      updateCategory: updateCategoryMock,
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
    });

    const req = new Request("http://localhost/api/contlify/categories/cat_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Modern Engineering", description: "Updated description" }),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: { id: "cat_1" },
    };

    const response = await handleUpdateCategory(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { status: string; category_id: string; data: Record<string, unknown> };
    expect(body.status).toBe("success");
    expect(body.category_id).toBe("cat_1");

    expect(updateCategoryMock).toHaveBeenCalledWith(
      "cat_1",
      expect.objectContaining({
        name: "Modern Engineering",
        description: "Updated description",
      })
    );
  });

  it("normalizes and sanitizes custom_slug when provided", async () => {
    const updateCategoryMock = vi.fn().mockResolvedValue({
      id: "cat_1",
      name: "Engineering",
      slug: "modern-engineering",
    });

    const mockAdapter: ContlifyAdapter = {
      updateCategory: updateCategoryMock,
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
    });

    const req = new Request("http://localhost/api/contlify/categories/cat_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_slug: "Modern Engineering!" }),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: { id: "cat_1" },
    };

    const response = await handleUpdateCategory(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    expect(updateCategoryMock).toHaveBeenCalledWith(
      "cat_1",
      expect.objectContaining({
        slug: "modern-engineering",
      })
    );
  });

  it("returns 400 when empty payload is passed", async () => {
    const mockAdapter: ContlifyAdapter = {
      updateCategory: vi.fn(),
    };

    const config = resolveConfig({
      apiKey: "secret-key",
      adapter: mockAdapter,
    });

    const req = new Request("http://localhost/api/contlify/categories/cat_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const requestContext = await RequestContext.fromRequest(req);
    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: { id: "cat_1" },
    };

    const response = await handleUpdateCategory(routeCtx);
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });
});
