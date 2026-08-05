import { describe, it, expect } from "vitest";
import { Router } from "../../src/routing/router.js";
import { RequestContext } from "../../src/core/request-context.js";
import { resolveConfig } from "../../src/config/default-config.js";
import { ResponseBuilder } from "../../src/responses/response-builder.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("Router", () => {
  const config = resolveConfig({ apiKey: "test-key" });

  it("should register routes and match path parameters", () => {
    const router = new Router();
    router.register("GET", "/posts/:slug", async (ctx) => {
      return ResponseBuilder.toJsonResponse({ slug: ctx.params.slug });
    });

    const match = router.match("GET", "/posts/my-first-post");
    expect(match).not.toBeNull();
    expect(match?.params.slug).toBe("my-first-post");
  });

  it("should strip apiPathPrefix when dispatching requests", async () => {
    const router = new Router();
    router.register("POST", "/posts", async () => {
      return ResponseBuilder.toJsonResponse({ success: true }, HttpStatus.OK);
    });

    const req = new Request("http://localhost/api/contlify/posts", { method: "POST" });
    const ctx = await RequestContext.fromRequest(req);
    const response = await router.dispatch(ctx, config);

    expect(response.status).toBe(HttpStatus.OK);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("should return 404 for unknown route", async () => {
    const router = new Router();
    const req = new Request("http://localhost/api/contlify/unknown-path", { method: "GET" });
    const ctx = await RequestContext.fromRequest(req);
    const response = await router.dispatch(ctx, config);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
  });

  it("should return 405 for method not allowed", async () => {
    const router = new Router();
    router.register("POST", "/posts", async () => ResponseBuilder.toJsonResponse({ ok: true }));

    const req = new Request("http://localhost/api/contlify/posts", { method: "GET" });
    const ctx = await RequestContext.fromRequest(req);
    const response = await router.dispatch(ctx, config);

    expect(response.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
  });
});
