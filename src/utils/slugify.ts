/**
 * Production-grade utility to generate a URL-safe slug from a string (e.g., title).
 *
 * @param text The input string (e.g. "My First Blog Post! 🚀")
 * @returns Clean, lowercased, hypenated slug ("my-first-blog-post")
 */
export function slugify(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .normalize("NFD") // Separate accents from letter shapes
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "") // Remove non-alphanumeric except space, underscore, and hyphen
    .replace(/[\s_]+/g, "-") // Convert spaces and underscores to hyphens
    .replace(/-+/g, "-") // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Strip leading and trailing hyphens
}

/**
 * Resolves a unique slug by checking for collisions and appending an incrementing
 * numeric suffix (-1, -2, etc.) when the base slug is already taken by a different post.
 *
 * - If the slug is available: returns `baseSlug` unchanged.
 * - If the slug belongs to the same post (same `currentPostId`): returns `baseSlug` unchanged (intentional re-publish).
 * - If the slug belongs to a different post: increments suffix until a free slug is found.
 *
 * @param baseSlug     The base slug generated from title or custom_slug.
 * @param currentPostId The ID/externalId of the post being created (undefined for brand-new posts).
 * @param checkExistingId  Async function that queries the DB for a post with the given slug
 *                     and returns its `id` string (or null/undefined if none found).
 * @returns A guaranteed unique slug string.
 */
export async function resolveUniqueSlug(
  baseSlug: string,
  currentPostId: string | undefined,
  checkExistingId: (slug: string) => Promise<string | null | undefined>
): Promise<string> {
  const existingId = await checkExistingId(baseSlug);

  // No collision â€” slug is free
  if (!existingId) return baseSlug;

  // Same post being re-published â€” keep the existing slug
  if (currentPostId && existingId === currentPostId) return baseSlug;

  // Collision with a DIFFERENT post â€” find next available suffix
  let counter = 1;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const candidateId = await checkExistingId(candidate);
    if (!candidateId) return candidate;
    if (currentPostId && candidateId === currentPostId) return candidate;
    counter++;
  }
}