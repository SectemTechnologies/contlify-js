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

  return (
    <article style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "2rem" }}>
        {primaryCategory ? (
          <Link
            href={\`/blog/category/\${primaryCategory.slug}\`}
            style={{ color: "#0070f3", textDecoration: "none", display: "inline-block", marginBottom: "1rem", fontSize: "0.875rem" }}
          >
            &larr; Back to {primaryCategory.name}
          </Link>
        ) : (
          <Link
            href="/blog"
            style={{ color: "#0070f3", textDecoration: "none", display: "inline-block", marginBottom: "1rem", fontSize: "0.875rem" }}
          >
            &larr; Back to Categories
          </Link>
        )}

        <h1 style={{ fontSize: "2.25rem", margin: "0 0 0.5rem 0" }}>{post.title}</h1>
        {post.subtitle && <p style={{ fontSize: "1.15rem", color: "#666", margin: "0 0 1rem 0" }}>{post.subtitle}</p>}
        <div style={{ fontSize: "0.875rem", color: "#888" }}>
          <time>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
          </time>
          {post.author && <span> &middot; {post.author.name}</span>}
        </div>
      </header>

      <div
        style={{ lineHeight: "1.7", fontSize: "1.05rem", color: "#222" }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.tags && post.tags.length > 0 && (
        <footer style={{ marginTop: "3rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
          <p style={{ color: "#666", margin: 0 }}>
            Tags:{" "}
            {post.tags.map((tag) => (
              <span key={tag.id} style={{ marginRight: "0.5rem", background: "#f0f0f0", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem" }}>
                #{tag.name}
              </span>
            ))}
          </p>
        </footer>
      )}
    </article>
  );
}
`;
}
