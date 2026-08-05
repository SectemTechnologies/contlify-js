import { describe, it, expect } from "vitest";
import { UpdatePayloadValidator } from "../../src/validation/update-payload-validator.js";

describe("UpdatePayloadValidator", () => {
  const validator = new UpdatePayloadValidator();

  it("should validate a partial post update payload", async () => {
    const payload = {
      title: "Updated Title",
      status: "archived",
    };

    const result = await validator.validate(payload);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Updated Title");
    expect(result.data?.status).toBe("archived");
  });

  it("should reject an empty update object", async () => {
    const result = await validator.validate({});
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "payload" }),
      ])
    );
  });

  it("should reject invalid status value in update", async () => {
    const result = await validator.validate({ status: "invalid-status" });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "status" }),
      ])
    );
  });

  it("should reject non-array categories or tags", async () => {
    const result = await validator.validate({ categories: "not-an-array" });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "categories" }),
      ])
    );
  });
});
