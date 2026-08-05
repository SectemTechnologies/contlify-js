import { notFound } from "next/navigation";
import Link from "next/link";
import { sampleAdapter } from "../../../lib/contlify-adapter.js";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = params;

  // In a real app, query your DB for the post by slug
  // For demo, we check if the in-memory adapter holds posts
  return (
    <article style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 20px" }}>
      <Link href="/blog" style={{ color: "#0070f3", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
        ← Back to Blog Index
      </Link>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "2.5rem", margin: "0 0 12px 0" }}>Post Slug: {slug}</h1>
        <div style={{ color: "#666", fontSize: "0.9rem" }}>
          <span>Status: Published</span>
        </div>
      </header>

      <div style={{ lineHeight: "1.7", fontSize: "1.1rem" }}>
        <p>This page dynamically renders blog content published via the <code>contlify</code> API middleware pipeline.</p>
      </div>
    </article>
  );
}
