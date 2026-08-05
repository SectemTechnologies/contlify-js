import { describe, it, expect } from "vitest";
import { slugify } from "../../src/utils/slugify.js";

describe("slugify utility", () => {
  it("should convert simple text into lowercased hypenated slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should handle special characters and punctuation", () => {
    expect(slugify("Hello World! This is a Test???")).toBe("hello-world-this-is-a-test");
  });

  it("should normalize NFD accents (e.g. Café & Résumé)", () => {
    expect(slugify("Café & Résumé")).toBe("cafe-resume");
  });

  it("should collapse multiple spaces and underscores into a single hyphen", () => {
    expect(slugify("my___first    blog   post")).toBe("my-first-blog-post");
  });

  it("should strip leading and trailing hyphens", () => {
    expect(slugify("---hello-world---")).toBe("hello-world");
  });

  it("should return empty string for empty or non-string input", () => {
    expect(slugify("")).toBe("");
    expect(slugify(null as unknown as string)).toBe("");
    expect(slugify(undefined as unknown as string)).toBe("");
  });
});
