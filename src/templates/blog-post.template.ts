/**
 * Template for the single blog post page: app/blog/[slug]/page.tsx
 * Minimal, unstyled, white background, fully editable by the user.
 */
export function getBlogPostTemplate(): string {
  return `import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug } from "@/lib/contlify/queries";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt ?? post.title,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const primaryCategory = post.categories && post.categories.length > 0 ? post.categories[0] : null;
  const imageUrl = typeof post.coverImage === "string" ? post.coverImage : post.coverImage?.url;

  return (
    <article style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          {primaryCategory ? (
            <Link
              href={\`/blog/category/\${primaryCategory.slug}\`}
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
              &larr; Back to {primaryCategory.name}
            </Link>
          ) : (
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
          )}
        </div>

        <h1 style={{ fontSize: "2.5rem", fontWeight: "800", margin: "0 0 0.5rem 0", color: "#111827", lineHeight: "1.2" }}>
          {post.title}
        </h1>
        {post.subtitle && (
          <p style={{ fontSize: "1.2rem", color: "#4b5563", margin: "0 0 1rem 0", lineHeight: "1.5" }}>
            {post.subtitle}
          </p>
        )}
        <div style={{ fontSize: "0.875rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <time>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}</time>
          {post.author && <span> &middot; {post.author.name}</span>}
        </div>
      </header>

      {imageUrl && (
        <div style={{ width: "100%", maxHeight: "400px", overflow: "hidden", borderRadius: "12px", marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
          <img src={imageUrl} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div
        style={{ lineHeight: "1.8", fontSize: "1.05rem", color: "#1f2937" }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.tags && post.tags.length > 0 && (
        <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#4b5563" }}>Tags:</span>
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}
`;
}
