import { describe, it, expect, vi } from "vitest";
import { handleGetAuthors } from "../../src/core/authors-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleGetAuthors", () => {
  it("should return list of authors from adapter", async () => {
    const mockAuthors = [
      { id: "auth_1", name: "Alice", slug: "alice" },
      { id: "auth_2", name: "Bob", slug: "bob" },
    ];

    const mockAdapter: ContlifyAdapter = {
      getAuthors: vi.fn().mockResolvedValue(mockAuthors),
    };

    const config = resolveConfig({ apiKey: "key", adapter: mockAdapter });
    const req = new Request("http://localhost/api/contlify/authors", { method: "GET" });
    const requestContext = await RequestContext.fromRequest(req);

    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    const response = await handleGetAuthors(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as { success: boolean; data: typeof mockAuthors };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]?.name).toBe("Alice");
  });
});
