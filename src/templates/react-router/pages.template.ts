/**
 * React Router v7 Framework Mode templates (Server Loaders & Actions).
 */

/**
 * Catch-all API route: app/routes/api.contlify.$.ts
 */
export function getReactRouterApiRouteTemplate(): string {
  return `import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { createContlifyHandler } from "contlify";
import { contlifyAdapter } from "../lib/contlify/adapter";

const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY,
  adapter: contlifyAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => \`/blog/post/\${post.slug}\`,
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handler(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return handler(request);
};
`;
}

/**
 * Categories grid page: app/routes/blog._index.tsx
 */
export function getReactRouterBlogListingTemplate(): string {
  return `import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { getCategories } from "../lib/contlify/queries";

export async function loader(_args: LoaderFunctionArgs) {
  const categories = await getCategories();
  return { categories };
}

export default function BlogCategories() {
  const { categories } = useLoaderData<typeof loader>();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>Blog Categories</h1>
      <p style={{ color: "#4b5563", margin: "0 0 2rem 0", fontSize: "1rem" }}>Explore topics and latest articles.</p>

      {categories.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No categories found yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>
          {categories.map((category) => {
            const imageUrl = typeof category.coverImage === "string" ? category.coverImage : (category.coverImage as { url?: string } | undefined)?.url;
            return (
              <Link
                key={category.slug}
                to={\`/blog/category/\${category.slug}\`}
                style={{ display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none", color: "inherit", backgroundColor: "#ffffff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              >
                {imageUrl && (
                  <div style={{ width: "100%", height: 140, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    <img src={imageUrl} alt={category.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#111827" }}>{category.name}</h2>
                  {category.description && (
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 1.25rem 0", lineHeight: 1.5, flex: 1 }}>{category.description}</p>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "0.45rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", backgroundColor: "#f97316", borderRadius: 6 }}>
                    Explore Category →
                  </span>
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

/**
 * Category posts page: app/routes/blog.category.$slug.tsx
 */
export function getReactRouterCategoryPostsTemplate(): string {
  return `import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { getPostsByCategory } from "../lib/contlify/queries";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const posts = slug ? await getPostsByCategory(slug) : [];
  const matchedCat = posts[0]?.categories?.find((c: any) => (typeof c === "object" ? c.slug === slug : c === slug));
  const categoryName = (typeof matchedCat === "object" ? matchedCat?.name : matchedCat) ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ") : "Category");
  return { posts, categoryName };
}


export default function CategoryPosts() {
  const { posts, categoryName } = useLoaderData<typeof loader>();

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
        <Link to="/blog" style={{ display: "inline-flex", alignItems: "center", padding: "0.55rem 1.1rem", fontSize: "0.875rem", fontWeight: 600, color: "#c2410c", backgroundColor: "#fff7ed", borderRadius: 8, textDecoration: "none", border: "1px solid #fed7aa" }}>
          ← Back to Categories
        </Link>
      </div>
      {posts.length === 0 ? (
        <div style={{ padding: "3rem 1.5rem", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", margin: "0 0 0.75rem 0" }}>Category Not Found</h1>
          <p style={{ color: "#6b7280", margin: "0 0 1.5rem 0", fontSize: "1rem" }}>The requested category does not exist or has no published articles yet.</p>
          <Link
            to="/blog"
            style={{
              display: "inline-flex",
              padding: "0.55rem 1.1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "#f97316",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Browse All Categories &rarr;
          </Link>
        </div>
      ) : (
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#111827" }}>{categoryName}</h1>
          <p style={{ color: "#6b7280", margin: "0 0 2rem 0" }}>{posts.length} {posts.length === 1 ? "article" : "articles"} in this category</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {posts.map((post) => {
            const imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage as { url?: string } | undefined)?.url;
            return (
              <article key={post.id ?? post.slug} style={{ border: "1px solid #e5e7eb", borderRadius: 10, backgroundColor: "#ffffff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {imageUrl && (
                  <div style={{ width: "100%", height: 200, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    <img src={imageUrl} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#111827" }}>{post.title}</h2>
                  {post.excerpt && <p style={{ color: "#4b5563", fontSize: "0.95rem", margin: "0 0 1rem 0", lineHeight: 1.6 }}>{post.excerpt}</p>}
                  <Link to={\`/blog/post/\${post.slug}\`} style={{ display: "inline-flex", padding: "0.45rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", backgroundColor: "#f97316", borderRadius: 6, textDecoration: "none" }}>
                    Read Article →
                  </Link>
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

/**
 * Single blog post page: app/routes/blog.post.$slug.tsx
 */
export function getReactRouterBlogPostTemplate(): string {
  return `import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { getPostBySlug } from "../lib/contlify/queries";


export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const post = slug ? await getPostBySlug(slug) : null;
  return { post };
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();

  if (!post) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "3rem 1rem", textAlign: "center", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: "2rem", color: "#111827" }}>Article Not Found</h1>
        <p style={{ color: "#6b7280", margin: "1rem 0 2rem 0" }}>The requested article does not exist or has been unpublished.</p>
        <Link to="/blog" style={{ padding: "0.6rem 1.2rem", backgroundColor: "#f97316", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
          Back to Blog
        </Link>
      </main>
    );
  }

  const primaryCategory = post.categories && post.categories.length > 0 ? post.categories[0] : null;
  const categorySlug = primaryCategory && typeof primaryCategory !== "string" ? primaryCategory.slug : null;
  const categoryName = primaryCategory && typeof primaryCategory !== "string" ? primaryCategory.name : (typeof primaryCategory === "string" ? primaryCategory : null);
  const imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage as { url?: string } | undefined)?.url;

  return (
    <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
        <Link
          to={categorySlug ? \`/blog/category/\${categorySlug}\` : "/blog"}
          style={{ display: "inline-flex", padding: "0.55rem 1.1rem", fontSize: "0.875rem", fontWeight: 600, color: "#c2410c", backgroundColor: "#fff7ed", borderRadius: 8, textDecoration: "none", border: "1px solid #fed7aa" }}
        >
          ← Back to {categoryName ?? "Categories"}
        </Link>
      </div>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "#111827", lineHeight: 1.2 }}>{post.title}</h1>
      {post.subtitle && <p style={{ fontSize: "1.2rem", color: "#4b5563", margin: "0 0 1rem 0" }}>{post.subtitle}</p>}
      {imageUrl && (
        <div style={{ width: "100%", maxHeight: 400, overflow: "hidden", borderRadius: 12, marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
          <img src={imageUrl} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div className="contlify-post-content" style={{ lineHeight: 1.8, fontSize: "1.05rem", color: "#1f2937" }} dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
`;
}
