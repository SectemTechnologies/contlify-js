/**
 * Next.js App Router files written by `npx contlify init` when the user picks Next.js.
 */
import { getApiRouteTemplate } from "./api-route.template.js";
import { getBlogLoadingTemplate } from "./blog-loading.template.js";
import { getBlogListingTemplate } from "./blog-listing.template.js";
import { getBlogPostTemplate } from "./blog-post.template.js";
import { getCategoryPostsTemplate } from "./category-posts.template.js";
import { getAdapterConfigTemplate } from "../shared/adapter-config.template.js";
import { getQueriesTemplate } from "../shared/queries.template.js";
import type { ScaffoldFileEntry } from "../types.js";

export { getApiRouteTemplate } from "./api-route.template.js";
export { getBlogLoadingTemplate } from "./blog-loading.template.js";
export { getBlogListingTemplate } from "./blog-listing.template.js";
export { getBlogPostTemplate } from "./blog-post.template.js";
export { getCategoryPostsTemplate } from "./category-posts.template.js";

/**
 * Next.js scaffold paths. Scaffolder prefixes `src/` when the project uses a src/ layout.
 */
export function getNextjsScaffoldManifest(): ScaffoldFileEntry[] {
  return [
    {
      relativePath: "app/api/contlify/[...path]/route.ts",
      getContent: getApiRouteTemplate,
      description: "API route handler (receives posts from publishers)",
    },
    {
      relativePath: "lib/contlify/adapter.ts",
      getContent: getAdapterConfigTemplate,
      description: "Database adapter configuration",
    },
    {
      relativePath: "lib/contlify/queries.ts",
      getContent: getQueriesTemplate,
      description: "Blog query functions (read-side)",
    },
    {
      relativePath: "app/blog/loading.tsx",
      getContent: getBlogLoadingTemplate,
      description: "Blog page loading state component",
    },
    {
      relativePath: "app/blog/page.tsx",
      getContent: getBlogListingTemplate,
      description: "Blog categories page",
    },
    {
      relativePath: "app/blog/category/[slug]/page.tsx",
      getContent: getCategoryPostsTemplate,
      description: "Category posts page",
    },
    {
      relativePath: "app/blog/post/[slug]/page.tsx",
      getContent: getBlogPostTemplate,
      description: "Single blog post page",
    },
  ];
}
