/**
 * Template for Astro catch-all API: src/pages/api/contlify/[...path].ts
 * Astro endpoints already use Web Request/Response, so the handler is passed through.
 */
export function getAstroApiRouteTemplate(): string {
  return `export const prerender = false;

import type { APIRoute } from "astro";
import { createContlifyHandler } from "contlify";
import { bindContlifyEnv, contlifyAdapter } from "../../../lib/contlify/adapter";


const handler = createContlifyHandler({
  apiKey: import.meta.env.CONTLIFY_API_KEY,
  adapter: contlifyAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => \`/blog/post/\${post.slug}\`,
});

/**
 * Bind Cloudflare/Astro env (D1) when present, then dispatch to Contlify.
 */
export const ALL: APIRoute = async (context) => {
  try {
    const runtime = (context.locals as any)?.runtime;
    if (runtime) bindContlifyEnv(runtime.env ?? runtime);
  } catch {
    // Astro v6+ removed runtime.env in favor of cloudflare:workers
  }
  return handler(context.request);
};


export const GET = ALL;
export const POST = ALL;
export const PATCH = ALL;
export const PUT = ALL;
export const DELETE = ALL;
export const OPTIONS = ALL;
export const HEAD = ALL;
`;
}

/**
 * Template for Astro categories grid: src/pages/blog/index.astro
 */
export function getAstroBlogListingTemplate(): string {
  return `---
export const prerender = false;

import { bindContlifyEnv } from "../../lib/contlify/adapter";
import { getCategories } from "../../lib/contlify/queries";

try {
  const runtime = (Astro.locals as any)?.runtime;
  if (runtime) bindContlifyEnv(runtime.env ?? runtime);
} catch {}

const categories = await getCategories();
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Blog Categories</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="font-size: 2.25rem; font-weight: 700; margin: 0 0 0.5rem 0; color: #111827;">Blog Categories</h1>
      <p style="color: #4b5563; margin: 0 0 2rem 0; font-size: 1rem;">Explore topics and latest articles.</p>

      {categories.length === 0 ? (
        <div style="padding: 3rem; text-align: center; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0;">No categories found yet.</p>
        </div>
      ) : (
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem;">
          {categories.map((category) => {
            const imageUrl = typeof category.coverImage === "string" ? category.coverImage : (category.coverImage as { url?: string })?.url;
            return (
              <a
                href={\`/blog/category/\${category.slug}\`}
                style="display: flex; flex-direction: column; border: 1px solid #e5e7eb; border-radius: 10px; text-decoration: none; color: inherit; background-color: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
              >
                {imageUrl && (
                  <div style="width: 100%; height: 140px; overflow: hidden; background-color: #f3f4f6;">
                    <img src={imageUrl} alt={category.name} style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                )}
                <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column;">
                  <h2 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; color: #111827;">{category.name}</h2>
                  {category.description && (
                    <p style="font-size: 0.875rem; color: #6b7280; margin: 0 0 1.25rem 0; line-height: 1.5; flex: 1;">{category.description}</p>
                  )}
                  <span style="display: inline-flex; align-items: center; padding: 0.45rem 0.9rem; font-size: 0.875rem; font-weight: 600; color: #ffffff; background-color: #f97316; border-radius: 6px;">
                    Explore Category →
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  </body>
</html>
`;
}

/**
 * Template for Astro category articles: src/pages/blog/category/[slug].astro
 */
export function getAstroCategoryPostsTemplate(): string {
  return `---
export const prerender = false;

import { bindContlifyEnv } from "../../../lib/contlify/adapter";
import { getPostsByCategory } from "../../../lib/contlify/queries";

try {
  const runtime = (Astro.locals as any)?.runtime;
  if (runtime) bindContlifyEnv(runtime.env ?? runtime);
} catch {}

const { slug } = Astro.params;
const posts = slug ? await getPostsByCategory(slug) : [];
const categoryName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ") : "Category";
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{categoryName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <main style="max-width: 800px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif;">
      <div style="margin-top: 1rem; margin-bottom: 2rem;">
        <a href="/blog" style="display: inline-flex; align-items: center; padding: 0.55rem 1.1rem; font-size: 0.875rem; font-weight: 600; color: #c2410c; background-color: #fff7ed; border-radius: 8px; text-decoration: none; border: 1px solid #fed7aa;">
          ← Back to Categories
        </a>
      </div>
      <h1 style="font-size: 2.25rem; font-weight: 700; margin: 0 0 0.5rem 0; color: #111827;">{categoryName}</h1>
      <p style="color: #6b7280; margin: 0 0 2rem 0;">{posts.length} {posts.length === 1 ? "article" : "articles"} in this category</p>

      {posts.length === 0 ? (
        <div style="padding: 3rem; text-align: center; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0;">No published posts found in this category.</p>
        </div>
      ) : (
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          {posts.map((post) => {
            const imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage as { url?: string })?.url;
            return (
              <article style="border: 1px solid #e5e7eb; border-radius: 10px; background-color: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                {imageUrl && (
                  <div style="width: 100%; height: 200px; overflow: hidden; background-color: #f3f4f6;">
                    <img src={imageUrl} alt={post.title} style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                )}
                <div style="padding: 1.5rem;">
                  <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0; color: #111827;">{post.title}</h2>
                  {post.excerpt && <p style="color: #4b5563; font-size: 0.95rem; margin: 0 0 1rem 0; line-height: 1.6;">{post.excerpt}</p>}
                  <a href={\`/blog/post/\${post.slug}\`} style="display: inline-flex; padding: 0.45rem 0.9rem; font-size: 0.875rem; font-weight: 600; color: #ffffff; background-color: #f97316; border-radius: 6px; text-decoration: none;">
                    Read Article →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  </body>
</html>
`;
}

/**
 * Template for Astro single post: src/pages/blog/post/[slug].astro
 */
export function getAstroBlogPostTemplate(): string {
  return `---
export const prerender = false;

import { bindContlifyEnv } from "../../../lib/contlify/adapter";
import { getPostBySlug } from "../../../lib/contlify/queries";

try {
  const runtime = (Astro.locals as any)?.runtime;
  if (runtime) bindContlifyEnv(runtime.env ?? runtime);
} catch {}

const { slug } = Astro.params;
const post = slug ? await getPostBySlug(slug) : null;

if (!post) {
  return Astro.redirect("/blog");
}

const primaryCategory = post.categories && post.categories.length > 0 ? post.categories[0] : null;
const categorySlug = primaryCategory && typeof primaryCategory !== "string" ? primaryCategory.slug : null;
const categoryName = primaryCategory && typeof primaryCategory !== "string" ? primaryCategory.name : (typeof primaryCategory === "string" ? primaryCategory : null);
const imageUrl = typeof post.coverImage === "string" ? post.coverImage : (post.coverImage as { url?: string } | undefined)?.url;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{post.title}</title>
    <meta name="description" content={post.excerpt ?? post.title} />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <article style="max-width: 800px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif;">
      <div style="margin-top: 1rem; margin-bottom: 1.5rem;">
        <a
          href={categorySlug ? \`/blog/category/\${categorySlug}\` : "/blog"}
          style="display: inline-flex; padding: 0.55rem 1.1rem; font-size: 0.875rem; font-weight: 600; color: #c2410c; background-color: #fff7ed; border-radius: 8px; text-decoration: none; border: 1px solid #fed7aa;"
        >
          ← Back to {categoryName ?? "Categories"}
        </a>
      </div>
      <h1 style="font-size: 2.5rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #111827; line-height: 1.2;">{post.title}</h1>
      {post.subtitle && <p style="font-size: 1.2rem; color: #4b5563; margin: 0 0 1rem 0;">{post.subtitle}</p>}
      {imageUrl && (
        <div style="width: 100%; max-height: 400px; overflow: hidden; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #e5e7eb;">
          <img src={imageUrl} alt={post.title} style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      )}
      <div class="contlify-post-content" style="line-height: 1.8; font-size: 1.05rem; color: #1f2937;" set:html={post.content} />
      <style>
        .contlify-post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; }
      </style>
    </article>
  </body>
</html>
`;
}
