import { describe, it, expect, vi } from "vitest";
import { handleValidate } from "../../src/core/validate-handler.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import type { RouteContext } from "../../src/routing/route-context.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("handleValidate", () => {
  it("should return healthy status and invoke adapter ping if defined", async () => {
    const pingMock = vi.fn().mockResolvedValue(true);
    const mockAdapter: ContlifyAdapter = {
      ping: pingMock,
      createPost: vi.fn(),
    };

    const config = resolveConfig({ apiKey: "test-key", adapter: mockAdapter });
    const req = new Request("http://localhost/api/contlify/validate", { method: "GET" });
    const requestContext = await RequestContext.fromRequest(req);

    const routeCtx: RouteContext = {
      request: requestContext,
      config,
      adapter: mockAdapter,
      params: {},
    };

    const response = await handleValidate(routeCtx);
    expect(response.status).toBe(HttpStatus.OK);

    const body = (await response.json()) as {
      success: boolean;
      data: { valid: boolean; status: string; adapterConnected: boolean };
    };

    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.adapterConnected).toBe(true);
    expect(pingMock).toHaveBeenCalledTimes(1);
  });
});
