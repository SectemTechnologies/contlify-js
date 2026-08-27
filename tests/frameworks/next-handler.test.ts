import { describe, it, expect, beforeEach } from "vitest";
import { createNextHandler } from "../../src/frameworks/next/index.js";
import { InMemoryContlifyAdapter } from "../../examples/adapters/in-memory-adapter.js";

describe("Framework Handlers (contlify/next createNextHandler)", () => {
  let adapter: InMemoryContlifyAdapter;
  const apiKey = "test-secret-next-key";

  beforeEach(() => {
    adapter = new InMemoryContlifyAdapter();
  });

  it("should return route handler functions for all standard HTTP methods", () => {
    const handlers = createNextHandler({
      apiKey,
      storage: adapter,
    });

    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
    expect(typeof handlers.PATCH).toBe("function");
    expect(typeof handlers.PUT).toBe("function");
    expect(typeof handlers.DELETE).toBe("function");
    expect(typeof handlers.OPTIONS).toBe("function");
    expect(typeof handlers.HEAD).toBe("function");
  });

  it("should handle GET /health check via handler", async () => {
    const handlers = createNextHandler({
      apiKey,
      apiPath: "/api/contlify/v1",
      storage: adapter,
    });

    const req = new Request("http://localhost:3000/api/contlify/v1/health", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = await handlers.GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.adapterConnected).toBe(true);
  });

  it("should handle POST /posts via handler", async () => {
    const handlers = createNextHandler({
      apiKey,
      apiPath: "/api/contlify/v1",
      storage: adapter,
      postUrl: "/blog/{slug}",
    });

    const payload = {
      title: "Created via Next Route Handler",
      content: "# Hello Next.js",
      slug: "nextjs-created-post",
      status: "published",
    };

    const req = new Request("http://localhost:3000/api/contlify/v1/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await handlers.POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.post_url).toBe("/blog/nextjs-created-post");

    // Verify stored in adapter
    const stored = await adapter.getPostBySlug("nextjs-created-post");
    expect(stored).not.toBeNull();
    expect(stored?.title).toBe("Created via Next Route Handler");
  });

  it("should reject unauthorized requests with 401", async () => {
    const handlers = createNextHandler({
      apiKey,
      apiPath: "/api/contlify/v1",
      storage: adapter,
    });

    const req = new Request("http://localhost:3000/api/contlify/v1/health", {
      method: "GET",
      headers: {
        Authorization: "Bearer wrong-key",
      },
    });

    const res = await handlers.GET(req);
    expect(res.status).toBe(401);
  });

  it("should be directly callable as a single handler function (Pattern 1: export { handler as GET, ... })", async () => {
    const handler = createNextHandler({
      apiKey,
      apiPath: "/api/contlify/v1",
      storage: adapter,
    });

    expect(typeof handler).toBe("function");

    const req = new Request("http://localhost:3000/api/contlify/v1/health", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
