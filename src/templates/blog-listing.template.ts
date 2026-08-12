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
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: "2.25rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "#111827" }}>Blog Categories</h1>
      <p style={{ color: "#4b5563", margin: "0 0 2rem 0", fontSize: "1rem" }}>Explore topics and latest articles.</p>

      {categories.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No categories found yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>
          {categories.map((category) => {
            const imageUrl = typeof category.coverImage === "string" ? category.coverImage : (category.coverImage as any)?.url;
            return (
              <Link
                key={category.id}
                href={\`/blog/category/\${category.slug}\`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "inherit",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {imageUrl && (
                  <div style={{ width: "100%", height: "140px", overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    <img
                      src={imageUrl}
                      alt={category.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: "0 0 0.5rem 0", color: "#111827" }}>
                    {category.name}
                  </h2>
                  {category.description && (
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 1.25rem 0", lineHeight: "1.5", flex: 1 }}>
                      {category.description}
                    </p>
                  )}
                  <div style={{ marginTop: "auto" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.45rem 0.9rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#ffffff",
                      backgroundColor: "#f97316",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(249, 115, 22, 0.2)",
                    }}>
                      Explore Category &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
`;
}
