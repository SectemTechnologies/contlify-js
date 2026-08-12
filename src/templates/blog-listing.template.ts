/**
 * Template for the blog listing page: app/blog/page.tsx
 * Minimal, unstyled, white background, fully editable by the user.
 */
export function getBlogListingTemplate(): string {
  return `import Link from "next/link";
import { getCategories } from "@/lib/contlify/queries";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const categories = await getCategories();

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>Blog Categories</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Select a category to explore articles.</p>

      {categories.length === 0 ? (
        <p style={{ color: "#666" }}>No categories found.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={\`/blog/category/\${category.slug}\`}
              style={{
                display: "block",
                padding: "1.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "#fff",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem 0", color: "#0070f3" }}>
                {category.name} &rarr;
              </h2>
              {category.description && (
                <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
                  {category.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
`;
}
