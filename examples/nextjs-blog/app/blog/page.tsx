import Link from "next/link";
import { sampleAdapter } from "../../lib/contlify-adapter.js";

export const revalidate = 0; // Dynamic rendering for demo

export default async function BlogListingPage() {
  // In a real application, you would query your DB directly (e.g. prisma.post.findMany())
  const authors = await sampleAdapter.getAuthors();
  const categories = await sampleAdapter.getCategories();

  return (
    <main style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 20px" }}>
      <header style={{ marginBottom: "32px", borderBottom: "1px solid #eaeaea", paddingBottom: "16px" }}>
        <h1 style={{ fontSize: "2.25rem", margin: "0 0 8px 0" }}>Contlify Demo Blog</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Powered by <code>contlify</code> npm package publishing engine.
        </p>
      </header>

      <section style={{ marginBottom: "24px" }}>
        <h2>Available Authors ({authors.length})</h2>
        {authors.length === 0 ? (
          <p style={{ color: "#888" }}>No authors synced yet. Publish a post to populate data!</p>
        ) : (
          <ul>
            {authors.map((a) => (
              <li key={a.id}>{a.name} ({a.slug})</li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2>Categories ({categories.length})</h2>
        {categories.length === 0 ? (
          <p style={{ color: "#888" }}>No categories synced yet.</p>
        ) : (
          <ul>
            {categories.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </section>

      <footer style={{ marginTop: "48px", color: "#888", fontSize: "0.875rem" }}>
        To publish content here, send a <code>POST /api/contlify/posts</code> request with <code>X-Truecmo-Key</code> header!
      </footer>
    </main>
  );
}
