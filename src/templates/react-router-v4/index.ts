/**
 * React Router v4 + Express files written by `npx contlify init`.
 */
import {
  getReactRouterV4BlogClientTemplate,
  getReactRouterV4BlogListingTemplate,
  getReactRouterV4BlogPostTemplate,
  getReactRouterV4CategoryPostsTemplate,
  getReactRouterV4ExpressServerTemplate,
  getReactRouterV4RoutesTemplate,
} from "./pages.template.js";
import { getAdapterConfigTemplate } from "../shared/adapter-config.template.js";
import { getQueriesTemplate } from "../shared/queries.template.js";
import type { ScaffoldFileEntry } from "../types.js";

export {
  getReactRouterV4BlogClientTemplate,
  getReactRouterV4BlogListingTemplate,
  getReactRouterV4BlogPostTemplate,
  getReactRouterV4CategoryPostsTemplate,
  getReactRouterV4ExpressServerTemplate,
  getReactRouterV4RoutesTemplate,
} from "./pages.template.js";

/**
 * Absolute-from-project-root paths. Do not prefix these with detectBaseDir.
 */
export function getReactRouterV4ScaffoldManifest(): ScaffoldFileEntry[] {
  return [
    {
      relativePath: "server/contlify-server.ts",
      getContent: getReactRouterV4ExpressServerTemplate,
      description: "Express server (publish API + public blog JSON)",
    },
    {
      relativePath: "src/lib/contlify/adapter.ts",
      getContent: getAdapterConfigTemplate,
      description: "Database adapter configuration",
    },
    {
      relativePath: "src/lib/contlify/queries.ts",
      getContent: getQueriesTemplate,
      description: "Blog query functions (server-side)",
    },
    {
      relativePath: "src/lib/contlify/blogClient.js",
      getContent: getReactRouterV4BlogClientTemplate,
      description: "Browser fetch helpers for public blog JSON",
    },
    {
      relativePath: "src/pages/BlogCategories.jsx",
      getContent: getReactRouterV4BlogListingTemplate,
      description: "Blog categories page (React Router v4)",
    },
    {
      relativePath: "src/pages/BlogCategory.jsx",
      getContent: getReactRouterV4CategoryPostsTemplate,
      description: "Category posts page (React Router v4)",
    },
    {
      relativePath: "src/pages/BlogPost.jsx",
      getContent: getReactRouterV4BlogPostTemplate,
      description: "Single blog post page (React Router v4)",
    },
    {
      relativePath: "src/contlify-blog-routes.jsx",
      getContent: getReactRouterV4RoutesTemplate,
      description: "Switch/Route snippet to mount inside BrowserRouter",
    },
  ];
}
