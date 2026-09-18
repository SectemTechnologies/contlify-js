import { describe, it, expect } from "vitest";
import { resolveUniqueSlug } from "../../src/utils/slugify.js";

describe("resolveUniqueSlug", () => {
  it("returns baseSlug when no collision exists", async () => {
    const result = await resolveUniqueSlug("my-post", undefined, async () => null);
    expect(result).toBe("my-post");
  });

  it("returns baseSlug when the slug belongs to the SAME post (intentional re-publish)", async () => {
    const result = await resolveUniqueSlug("my-post", "post_123", async (slug) => {
      if (slug === "my-post") return "post_123";
      return null;
    });
    expect(result).toBe("my-post");
  });

  it("returns baseSlug-1 when slug belongs to a DIFFERENT post (single collision)", async () => {
    const result = await resolveUniqueSlug("my-post", "post_NEW", async (slug) => {
      if (slug === "my-post") return "post_EXISTING";
      return null;
    });
    expect(result).toBe("my-post-1");
  });

  it("returns baseSlug-2 when both base and -1 are taken by different posts", async () => {
    const result = await resolveUniqueSlug("my-post", "post_NEW", async (slug) => {
      if (slug === "my-post") return "post_A";
      if (slug === "my-post-1") return "post_B";
      return null;
    });
    expect(result).toBe("my-post-2");
  });

  it("resolves correctly when -1 is taken by the SAME post", async () => {
    const result = await resolveUniqueSlug("my-post", "post_123", async (slug) => {
      if (slug === "my-post") return "post_OTHER";
      if (slug === "my-post-1") return "post_123";
      return null;
    });
    expect(result).toBe("my-post-1");
  });

  it("handles many consecutive collisions (my-post through my-post-9 taken)", async () => {
    const taken: Record<string, string> = {
      "my-post":   "post_A",
      "my-post-1": "post_B",
      "my-post-2": "post_C",
      "my-post-3": "post_D",
      "my-post-4": "post_E",
      "my-post-5": "post_F",
      "my-post-6": "post_G",
      "my-post-7": "post_H",
      "my-post-8": "post_I",
      "my-post-9": "post_J",
    };
    const result = await resolveUniqueSlug("my-post", "post_NEW", async (slug) => taken[slug] ?? null);
    expect(result).toBe("my-post-10");
  });

  it("returns baseSlug when currentPostId is undefined and slug is free", async () => {
    const result = await resolveUniqueSlug("clean-title", undefined, async () => null);
    expect(result).toBe("clean-title");
  });
});