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
