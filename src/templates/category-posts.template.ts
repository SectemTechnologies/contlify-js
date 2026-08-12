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
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/blog" style={{ color: "#0070f3", textDecoration: "none", fontSize: "0.875rem" }}>
          &larr; Back to Categories
        </Link>
      </div>

      <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>{categoryName}</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        {posts.length} {posts.length === 1 ? "article" : "articles"} in this category
      </p>

      {posts.length === 0 ? (
        <p style={{ color: "#666" }}>No posts found in this category.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {posts.map((post) => (
            <li key={post.id} style={{ marginBottom: "2rem", borderBottom: "1px solid #eee", paddingBottom: "1.5rem" }}>
              <article>
                <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>
                  <Link href={\`/blog/post/\${post.slug}\`} style={{ color: "#0070f3", textDecoration: "none" }}>
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && <p style={{ color: "#555", margin: "0 0 0.5rem 0" }}>{post.excerpt}</p>}
                <div style={{ fontSize: "0.875rem", color: "#888" }}>
                  <time>
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
                  </time>
                  {post.author && <span> &middot; {post.author.name}</span>}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
`;
}
