import { describe, it, expect, vi } from "vitest";
import { createContlifyHandler } from "../../src/core/handler.js";
import type { ContlifyAdapter } from "../../src/adapters/adapter.interface.js";
import { HttpStatus } from "../../src/utils/http-status.js";

describe("Edge-Case & Resilience Unit Test Suite", () => {
  const API_KEY = "edge-case-secret-key";

  it("should handle malformed JSON request body gracefully (400 Bad Request)", async () => {
    const handler = createContlifyHandler({ apiKey: API_KEY });
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: {
        "X-Truecmo-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: "{ malformed_json_without_quotes: ",
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);

    const body = (await response.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
  });

  it("should handle unexpected adapter exception without exposing stack traces to caller (500 Error)", async () => {
    const failingAdapter: ContlifyAdapter = {
      createPost: vi.fn().mockRejectedValue(new Error("Database connection pool exhausted")),
    };

    const handler = createContlifyHandler({ apiKey: API_KEY, adapter: failingAdapter });
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: {
        "X-Truecmo-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Resilience Test Post",
        content: "Content",
        status: "published",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    const body = (await response.json()) as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ADAPTER_ERROR");
    expect(body.error.message).toContain("Database connection pool exhausted");
  });

  it("should handle URI encoded special characters in route parameters", async () => {
    const updatePostMock = vi.fn().mockResolvedValue({ id: "special-post" });
    const mockAdapter: ContlifyAdapter = { updatePost: updatePostMock };

    const handler = createContlifyHandler({ apiKey: API_KEY, adapter: mockAdapter });
    const req = new Request("http://localhost/api/contlify/posts/hello%20world%26special", {
      method: "PATCH",
      headers: {
        "X-Truecmo-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.OK);
    expect(updatePostMock).toHaveBeenCalledWith("hello world&special", expect.anything());
  });

  it("should support lowercased bearer authorization token", async () => {
    const handler = createContlifyHandler({ apiKey: API_KEY });
    const req = new Request("http://localhost/api/contlify/validate", {
      method: "GET",
      headers: {
        Authorization: `bearer ${API_KEY}`,
      },
    });

    const response = await handler(req);
    expect(response.status).toBe(HttpStatus.OK);
  });
});
