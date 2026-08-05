import { describe, it, expect, vi } from "vitest";
import { createContlifyHandler } from "../../src/core/handler.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("createContlifyHandler (Phase 3 Full API End-to-End)", () => {
  const API_KEY = "phase3-secret-key";

  const mockAdapter: ContlifyAdapter = {
    ping: vi.fn().mockResolvedValue(true),
    createPost: vi.fn().mockResolvedValue({ id: "post_1", slug: "test-post", url: "/blog/test-post" }),
    updatePost: vi.fn().mockResolvedValue({ id: "post_1", slug: "test-post-updated", url: "/blog/test-post-updated" }),
    getAuthors: vi.fn().mockResolvedValue([{ id: "a1", name: "Alice", slug: "alice" }]),
    getCategories: vi.fn().mockResolvedValue([{ id: "c1", name: "Tech", slug: "tech" }]),
    getTags: vi.fn().mockResolvedValue([{ id: "t1", name: "NextJS", slug: "nextjs" }]),
  };

  const handler = createContlifyHandler({
    apiKey: API_KEY,
    adapter: mockAdapter,
  });

  const makeAuthHeader = () => ({
    "X-Truecmo-Key": API_KEY,
    "Content-Type": "application/json",
  });

  it("GET /validate should return health status when authenticated", async () => {
    const req = new Request("http://localhost/api/contlify/validate", {
      method: "GET",
      headers: makeAuthHeader(),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { success: boolean; data: { valid: boolean; status: string } };
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
  });

  it("POST /posts should remain fully functional (Phase 2 backward compatibility)", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: makeAuthHeader(),
      body: JSON.stringify({
        title: "Test Post",
        content: "Content",
        status: "published",
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { status: string; post_id: string };
    expect(body.status).toBe("success");
    expect(body.post_id).toBe("post_1");
  });

  it("PATCH /posts/:id should execute post update", async () => {
    const req = new Request("http://localhost/api/contlify/posts/post_1", {
      method: "PATCH",
      headers: makeAuthHeader(),
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { status: string; post_id: string };
    expect(body.status).toBe("success");
  });

  it("PUT /posts/:id should execute post replacement update", async () => {
    const req = new Request("http://localhost/api/contlify/posts/post_1", {
      method: "PUT",
      headers: makeAuthHeader(),
      body: JSON.stringify({ title: "Replaced Title", content: "New Content", status: "draft" }),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("success");
  });

  it("GET /authors should return authors list", async () => {
    const req = new Request("http://localhost/api/contlify/authors", {
      method: "GET",
      headers: makeAuthHeader(),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { success: boolean; data: Array<{ name: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.name).toBe("Alice");
  });

  it("GET /categories should return categories list", async () => {
    const req = new Request("http://localhost/api/contlify/categories", {
      method: "GET",
      headers: makeAuthHeader(),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { success: boolean; data: Array<{ name: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.name).toBe("Tech");
  });

  it("GET /tags should return tags list", async () => {
    const req = new Request("http://localhost/api/contlify/tags", {
      method: "GET",
      headers: makeAuthHeader(),
    });

    const res = await handler(req);
    expect(res.status).toBe(HttpStatus.OK);
    const body = (await res.json()) as { success: boolean; data: Array<{ name: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.name).toBe("NextJS");
  });
});
