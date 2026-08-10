/**
 * Template for the blog listing page: app/blog/page.tsx
 * Minimal, unstyled, white background, fully editable by the user.
 */
export function getBlogListingTemplate(): string {
  return `import Link from "next/link";
import { getAllPosts } from "@/lib/contlify/queries";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.25rem", marginBottom: "1.5rem" }}>Blog</h1>

      {posts.length === 0 ? (
        <p style={{ color: "#666" }}>No posts published yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {posts.map((post) => (
            <li key={post.id} style={{ marginBottom: "2rem", borderBottom: "1px solid #eee", paddingBottom: "1.5rem" }}>
              <article>
                <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>
                  <Link href={\`/blog/\${post.slug}\`} style={{ color: "#0070f3", textDecoration: "none" }}>
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
