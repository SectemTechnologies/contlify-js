import { describe, it, expect } from "vitest";
import { RouteParamValidator } from "../../src/validation/route-param-validator.js";

describe("RouteParamValidator", () => {
  it("should successfully validate non-empty string route parameter", () => {
    const params = { id: "post-123" };
    const result = RouteParamValidator.validateParam(params, "id");
    expect(result.success).toBe(true);
    expect(result.data).toBe("post-123");
  });

  it("should fail validation if parameter is missing or whitespace", () => {
    const params = { id: "   " };
    const result = RouteParamValidator.validateParam(params, "id");
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
