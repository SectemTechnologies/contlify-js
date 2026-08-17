/**
 * React Router v4 (class components + Switch/Route) plus Express server.
 * The browser cannot talk to the database, so pages fetch public /api/blog JSON.
 */

/**
 * Public JSON read helpers used by the React Router v4 pages.
 */
export function getReactRouterV4BlogClientTemplate(): string {
  return `/**
 * Public blog reads (no API key). Express serves these from the adapter.
 */
export async function fetchCategories() {
  const res = await fetch("/api/blog/categories");
  const json = await res.json();
  return json.data || [];
}

export async function fetchPostsByCategory(slug) {
  const res = await fetch("/api/blog/categories/" + encodeURIComponent(slug) + "/posts");
  const json = await res.json();
  return json.data || [];
}

export async function fetchPostBySlug(slug) {
  const res = await fetch("/api/blog/posts/" + encodeURIComponent(slug));
  if (res.status === 404) return null;
  const json = await res.json();
  return json.data || null;
}
`;
}

/**
 * Categories grid page (React Router v4 class component).
 */
export function getReactRouterV4BlogListingTemplate(): string {
  return `import React, { Component } from "react";
import { Link } from "react-router-dom";
import { fetchCategories } from "../lib/contlify/blogClient";

class BlogCategories extends Component {
  constructor(props) {
    super(props);
    this.state = { categories: [], loading: true };
  }

  componentDidMount() {
    fetchCategories()
      .then((categories) => this.setState({ categories: categories, loading: false }))
      .catch(() => this.setState({ categories: [], loading: false }));
  }

  render() {
    const { categories, loading } = this.state;

    if (loading) {
      return <p style={{ padding: "2rem", fontFamily: "system-ui" }}>Loading articles...</p>;
    }

    return (
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "#111827" }}>Blog Categories</h1>
        <p style={{ color: "#4b5563", margin: "0 0 2rem 0" }}>Explore topics and latest articles.</p>
        {categories.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No categories found yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {categories.map(function (category) {
              var imageUrl = typeof category.coverImage === "string" ? category.coverImage : (category.coverImage && category.coverImage.url);
              return (
                <Link
                  key={category.id || category.slug}
                  to={"/blog/category/" + category.slug}
                  style={{ display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderRadius: "10px", textDecoration: "none", color: "inherit", background: "#fff", overflow: "hidden" }}
                >
                  {imageUrl ? <img src={imageUrl} alt={category.name} style={{ width: "100%", height: "140px", objectFit: "cover" }} /> : null}
                  <div style={{ padding: "1.25rem" }}>
                    <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem 0" }}>{category.name}</h2>
                    <span style={{ display: "inline-block", padding: "0.45rem 0.9rem", background: "#f97316", color: "#fff", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem" }}>Explore Category →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    );
  }
}

export default BlogCategories;
`;
}

/**
 * Category articles page (React Router v4).
 */
export function getReactRouterV4CategoryPostsTemplate(): string {
  return `import React, { Component } from "react";
import { Link } from "react-router-dom";
import { fetchPostsByCategory } from "../lib/contlify/blogClient";

class BlogCategory extends Component {
  constructor(props) {
    super(props);
    this.state = { posts: [], loading: true };
  }

  componentDidMount() {
    this.loadPosts(this.props.match.params.slug);
  }

  componentDidUpdate(prevProps) {
    var nextSlug = this.props.match.params.slug;
    if (prevProps.match.params.slug !== nextSlug) {
      this.setState({ loading: true });
      this.loadPosts(nextSlug);
    }
  }

  loadPosts(slug) {
    fetchPostsByCategory(slug)
      .then((posts) => this.setState({ posts: posts, loading: false }))
      .catch(() => this.setState({ posts: [], loading: false }));
  }

  render() {
    var slug = this.props.match.params.slug || "";
    var categoryName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
    var posts = this.state.posts;

    if (this.state.loading) {
      return <p style={{ padding: "2rem", fontFamily: "system-ui" }}>Loading articles...</p>;
    }

    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
        <Link to="/blog" style={{ display: "inline-block", marginBottom: "1.5rem", color: "#c2410c", fontWeight: 600 }}>← Back to Categories</Link>
        <h1 style={{ fontSize: "2.25rem", margin: "0 0 0.5rem 0" }}>{categoryName}</h1>
        {posts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No published posts found in this category.</p>
        ) : (
          posts.map(function (post) {
            var imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage && post.coverImage.url);
            return (
              <article key={post.id || post.slug} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", marginBottom: "1.5rem", overflow: "hidden" }}>
                {imageUrl ? <img src={imageUrl} alt={post.title} style={{ width: "100%", height: "200px", objectFit: "cover" }} /> : null}
                <div style={{ padding: "1.5rem" }}>
                  <h2 style={{ margin: "0 0 0.5rem 0" }}>{post.title}</h2>
                  {post.excerpt ? <p style={{ color: "#4b5563" }}>{post.excerpt}</p> : null}
                  <Link to={"/blog/post/" + post.slug} style={{ display: "inline-block", padding: "0.45rem 0.9rem", background: "#f97316", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}>Read Article →</Link>
                </div>
              </article>
            );
          })
        )}
      </main>
    );
  }
}

export default BlogCategory;
`;
}

/**
 * Single post page (React Router v4).
 */
export function getReactRouterV4BlogPostTemplate(): string {
  return `import React, { Component } from "react";
import { Link } from "react-router-dom";
import { fetchPostBySlug } from "../lib/contlify/blogClient";

class BlogPost extends Component {
  constructor(props) {
    super(props);
    this.state = { post: null, loading: true };
  }

  componentDidMount() {
    fetchPostBySlug(this.props.match.params.slug)
      .then((post) => this.setState({ post: post, loading: false }))
      .catch(() => this.setState({ post: null, loading: false }));
  }

  render() {
    if (this.state.loading) {
      return <p style={{ padding: "2rem", fontFamily: "system-ui" }}>Loading articles...</p>;
    }

    var post = this.state.post;
    if (!post) {
      return (
        <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
          <p>Post not found.</p>
          <Link to="/blog">← Back to Categories</Link>
        </main>
      );
    }

    var primary = post.categories && post.categories[0];
    var categorySlug = primary && primary.slug;
    var categoryName = primary && primary.name;
    var imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage && post.coverImage.url);

    return (
      <article style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
        <Link to={categorySlug ? "/blog/category/" + categorySlug : "/blog"} style={{ display: "inline-block", marginBottom: "1.5rem", color: "#c2410c", fontWeight: 600 }}>
          ← Back to {categoryName || "Categories"}
        </Link>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem 0" }}>{post.title}</h1>
        {imageUrl ? <img src={imageUrl} alt={post.title} style={{ width: "100%", maxHeight: "400px", objectFit: "cover", borderRadius: "12px", marginBottom: "2rem" }} /> : null}
        <div className="contlify-post-content" style={{ lineHeight: "1.8" }} dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    );
  }
}

export default BlogPost;
`;
}

/**
 * Switch/Route snippet to drop inside the user's existing BrowserRouter.
 */
export function getReactRouterV4RoutesTemplate(): string {
  return `import React from "react";
import { Route, Switch } from "react-router-dom";
import BlogCategories from "./pages/BlogCategories";
import BlogCategory from "./pages/BlogCategory";
import BlogPost from "./pages/BlogPost";

/**
 * Mount this inside your existing <BrowserRouter> / <HashRouter>:
 *
 *   import ContlifyBlogRoutes from "./contlify-blog-routes";
 *   <BrowserRouter>
 *     <ContlifyBlogRoutes />
 *   </BrowserRouter>
 */
function ContlifyBlogRoutes() {
  return (
    <Switch>
      <Route exact path="/blog" component={BlogCategories} />
      <Route exact path="/blog/category/:slug" component={BlogCategory} />
      <Route exact path="/blog/post/:slug" component={BlogPost} />
    </Switch>
  );
}

export default ContlifyBlogRoutes;
`;
}

/**
 * Express server: Contlify publish API + public blog JSON for the SPA.
 */
export function getReactRouterV4ExpressServerTemplate(): string {
  return `/**
 * Express server for React Router v4 + Contlify.
 * Run: npx tsx server/contlify-server.ts
 *
 * Contlify CMS destination: https://yourdomain.com/api/contlify/posts
 * Header: X-Truecmo-Key
 */
import express from "express";
import { createContlifyHandler, createNodeMiddleware } from "contlify";
import { bindContlifyEnv, contlifyAdapter } from "../src/lib/contlify/adapter";
import { getCategories, getPostBySlug, getPostsByCategory } from "../src/lib/contlify/queries";

const app = express();
app.use(express.json({ limit: "2mb" }));

const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY,
  adapter: contlifyAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => \`/blog/post/\${post.slug}\`,
});

// Authenticated publish/update/validate endpoints from Contlify
app.all("/api/contlify", createNodeMiddleware(handler));
app.all("/api/contlify/*", createNodeMiddleware(handler));

// Public reads for the React Router v4 SPA (published content only)
app.get("/api/blog/categories", async (_req, res) => {
  try {
    bindContlifyEnv();
    const data = await getCategories();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to load categories" });
  }
});

app.get("/api/blog/categories/:slug/posts", async (req, res) => {
  try {
    bindContlifyEnv();
    const data = await getPostsByCategory(req.params.slug);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to load posts" });
  }
});

app.get("/api/blog/posts/:slug", async (req, res) => {
  try {
    bindContlifyEnv();
    const data = await getPostBySlug(req.params.slug);
    if (!data) {
      res.status(404).json({ success: false, error: "Post not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to load post" });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log("[contlify] Express listening on http://localhost:" + port);
  console.log("[contlify] Publish endpoint: POST /api/contlify/posts");
});
`;
}
