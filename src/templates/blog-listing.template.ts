/**
 * Template for the blog listing page: app/blog/page.tsx
 * Minimal, unstyled, fully editable by the user.
 */
export function getBlogListingTemplate(): string {
  return `import Link from "next/link";
import { getAllPosts } from "@/lib/contlify/queries";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main>
      <h1>Blog</h1>

      {posts.length === 0 ? (
        <p>No posts published yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {posts.map((post) => (
            <li key={post.id} style={{ marginBottom: "2rem" }}>
              <article>
                <h2>
                  <Link href={\`/blog/\${post.slug}\`}>{post.title}</Link>
                </h2>
                {post.excerpt && <p>{post.excerpt}</p>}
                <time>
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : ""}
                </time>
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
