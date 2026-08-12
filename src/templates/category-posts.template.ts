/**
 * Template for the category posts listing page: app/blog/category/[slug]/page.tsx
 * Displays all blog posts belonging to a specific category.
 */
export function getCategoryPostsTemplate(): string {
  return `import Link from "next/link";
import { getPostsByCategory } from "@/lib/contlify/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPostsPage({ params }: PageProps) {
  const { slug } = await params;
  const posts = await getPostsByCategory(slug);
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/blog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "#374151",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            textDecoration: "none",
            border: "1px solid #e5e7eb",
          }}
        >
          &larr; Back to Categories
        </Link>
      </div>

      <h1 style={{ fontSize: "2.25rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "#111827" }}>{categoryName}</h1>
      <p style={{ color: "#6b7280", margin: "0 0 2rem 0", fontSize: "1rem" }}>
        {posts.length} {posts.length === 1 ? "article" : "articles"} in this category
      </p>

      {posts.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No published posts found in this category.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {posts.map((post) => {
            const imageUrl = typeof post.coverImage === "string" ? post.coverImage : post.coverImage?.url;
            return (
              <article
                key={post.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {imageUrl && (
                  <div style={{ width: "100%", height: "200px", overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    <img src={imageUrl} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.5rem 0", color: "#111827" }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{ color: "#4b5563", fontSize: "0.95rem", margin: "0 0 1rem 0", lineHeight: "1.6" }}>
                      {post.excerpt}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                      <time>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}</time>
                      {post.author && <span> &middot; {post.author.name}</span>}
                    </div>
                    <Link
                      href={\`/blog/post/\${post.slug}\`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.4rem 0.85rem",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#2563eb",
                        backgroundColor: "#eff6ff",
                        borderRadius: "6px",
                        textDecoration: "none",
                      }}
                    >
                      Read Article &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
`;
}
