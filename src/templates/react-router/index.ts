/**
 * React Router v7 files written by `npx contlify init`.
 */
import {
  getReactRouterApiRouteTemplate,
  getReactRouterBlogListingTemplate,
  getReactRouterBlogPostTemplate,
  getReactRouterCategoryPostsTemplate,
} from "./pages.template.js";
import { getAdapterConfigTemplate } from "../shared/adapter-config.template.js";
import { getQueriesTemplate } from "../shared/queries.template.js";
import type { ScaffoldFileEntry } from "../types.js";

export {
  getReactRouterApiRouteTemplate,
  getReactRouterBlogListingTemplate,
  getReactRouterBlogPostTemplate,
  getReactRouterCategoryPostsTemplate,
} from "./pages.template.js";

/**
 * React Router v7 Scaffold Manifest.
 */
export function getReactRouterScaffoldManifest(): ScaffoldFileEntry[] {
  return [
    {
      relativePath: "app/routes/api.contlify.$.ts",
      getContent: getReactRouterApiRouteTemplate,
      description: "React Router catch-all API route handler (receives posts from publishers)",
    },
    {
      relativePath: "app/lib/contlify/adapter.ts",
      getContent: getAdapterConfigTemplate,
      description: "Database adapter configuration",
    },
    {
      relativePath: "app/lib/contlify/queries.ts",
      getContent: getQueriesTemplate,
      description: "Blog query functions (server-side)",
    },
    {
      relativePath: "app/routes/blog._index.tsx",
      getContent: getReactRouterBlogListingTemplate,
      description: "Blog categories page (React Router v7)",
    },
    {
      relativePath: "app/routes/blog.category.$slug.tsx",
      getContent: getReactRouterCategoryPostsTemplate,
      description: "Category posts page (React Router v7)",
    },
    {
      relativePath: "app/routes/blog.post.$slug.tsx",
      getContent: getReactRouterBlogPostTemplate,
      description: "Single blog post page (React Router v7)",
    },
  ];
}
