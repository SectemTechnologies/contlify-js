import { describe, it, expect } from "vitest";
import { ApiKeyAuthStrategy } from "../../src/authentication/api-key-auth.js";
import { RequestContext } from "../../src/core/request-context.js";

describe("ApiKeyAuthStrategy", () => {
  const authStrategy = new ApiKeyAuthStrategy();
  const EXPECTED_KEY = "test-secret-key-123";

  it("should authenticate successfully with X-Truecmo-Key header", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "X-Truecmo-Key": EXPECTED_KEY },
    });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, EXPECTED_KEY);

    expect(result.authenticated).toBe(true);
    expect(result.publisherId).toBe("truecmo");
  });

  it("should authenticate successfully with x-api-key fallback header", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "x-api-key": EXPECTED_KEY },
    });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, EXPECTED_KEY);

    expect(result.authenticated).toBe(true);
    expect(result.publisherId).toBe("api-key");
  });

  it("should authenticate successfully with Authorization: Bearer <key> header", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${EXPECTED_KEY}` },
    });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, EXPECTED_KEY);

    expect(result.authenticated).toBe(true);
    expect(result.publisherId).toBe("bearer");
  });

  it("should reject invalid API key", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "X-Truecmo-Key": "wrong-key" },
    });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, EXPECTED_KEY);

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("Invalid API key");
  });

  it("should reject requests without headers", async () => {
    const req = new Request("http://localhost/api/contlify/posts", { method: "POST" });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, EXPECTED_KEY);

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("Missing API key");
  });

  it("should fail if expected API key is empty", async () => {
    const req = new Request("http://localhost/api/contlify/posts", {
      method: "POST",
      headers: { "X-Truecmo-Key": EXPECTED_KEY },
    });
    const ctx = await RequestContext.fromRequest(req);
    const result = await authStrategy.authenticate(ctx, "");

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("API key is not configured");
  });
});
