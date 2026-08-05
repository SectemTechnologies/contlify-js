import { describe, it, expect } from "vitest";
import { PublishPayloadValidator } from "../../src/validation/publish-payload-validator.js";

describe("PublishPayloadValidator", () => {
  const validator = new PublishPayloadValidator();

  it("should validate a correct publish post payload", async () => {
    const rawPayload = {
      title: "Building Modern Packages with TypeScript",
      content: "<p>Hello World Content</p>",
      status: "published",
      custom_slug: "modern-ts-packages",
      author: { name: "Jane Doe" },
      tags: ["typescript", "npm"],
    };

    const result = await validator.validate(rawPayload);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe("Building Modern Packages with TypeScript");
    expect(result.data?.status).toBe("published");
    expect(result.data?.custom_slug).toBe("modern-ts-packages");
  });

  it("should validate nested container payload { post: ... }", async () => {
    const containerPayload = {
      action: "publish",
      post: {
        title: "Nested Post Title",
        content: "Markdown content",
        status: "draft",
      },
    };

    const result = await validator.validate(containerPayload);

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Nested Post Title");
    expect(result.data?.status).toBe("draft");
  });

  it("should fail validation if title is missing or empty", async () => {
    const result = await validator.validate({
      content: "Valid content",
      status: "published",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "title" }),
      ])
    );
  });

  it("should fail validation if content is missing or empty", async () => {
    const result = await validator.validate({
      title: "Valid Title",
      status: "published",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "content" }),
      ])
    );
  });

  it("should fail validation if status is invalid", async () => {
    const result = await validator.validate({
      title: "Valid Title",
      content: "Valid content",
      status: "invalid-status-name",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "status" }),
      ])
    );
  });

  it("should reject non-object body", async () => {
    const result = await validator.validate(null);
    expect(result.success).toBe(false);
  });
});
