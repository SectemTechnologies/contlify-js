/**
 * Template for the single blog post page: app/blog/[slug]/page.tsx
 * Minimal, unstyled, fully editable by the user.
 */
export function getBlogPostTemplate(): string {
  return `import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getAllPosts } from "@/lib/contlify/queries";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

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

  return (
    <article>
      <header>
        <Link href="/blog">&larr; Back to Blog</Link>
        <h1>{post.title}</h1>
        {post.subtitle && <p>{post.subtitle}</p>}
        <time>
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString()
            : ""}
        </time>
        {post.author && <span> &middot; {post.author.name}</span>}
      </header>

      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      {post.tags && post.tags.length > 0 && (
        <footer>
          <p>
            Tags:{" "}
            {post.tags.map((tag) => (
              <span key={tag.id} style={{ marginRight: "0.5rem" }}>
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
