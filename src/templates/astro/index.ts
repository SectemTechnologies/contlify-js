/**
 * Astro files written by `npx contlify init` when the user picks Astro.
 */
import {
  getAstroApiRouteTemplate,
  getAstroBlogListingTemplate,
  getAstroBlogPostTemplate,
  getAstroCategoryPostsTemplate,
} from "./pages.template.js";
import { getAdapterConfigTemplate } from "../shared/adapter-config.template.js";
import { getQueriesTemplate } from "../shared/queries.template.js";
import type { ScaffoldFileEntry } from "../types.js";

export {
  getAstroApiRouteTemplate,
  getAstroBlogListingTemplate,
  getAstroBlogPostTemplate,
  getAstroCategoryPostsTemplate,
} from "./pages.template.js";

/**
 * Absolute-from-project-root paths. Do not prefix these with detectBaseDir.
 */
export function getAstroScaffoldManifest(): ScaffoldFileEntry[] {
  return [
    {
      relativePath: "src/pages/api/contlify/[...path].ts",
      getContent: getAstroApiRouteTemplate,
      description: "Astro API endpoint (receives posts from publishers)",
    },
    {
      relativePath: "src/lib/contlify/adapter.ts",
      getContent: getAdapterConfigTemplate,
      description: "Database adapter configuration",
    },
    {
      relativePath: "src/lib/contlify/queries.ts",
      getContent: getQueriesTemplate,
      description: "Blog query functions (read-side)",
    },
    {
      relativePath: "src/pages/blog/index.astro",
      getContent: getAstroBlogListingTemplate,
      description: "Blog categories page",
    },
    {
      relativePath: "src/pages/blog/category/[slug].astro",
      getContent: getAstroCategoryPostsTemplate,
      description: "Category posts page",
    },
    {
      relativePath: "src/pages/blog/post/[slug].astro",
      getContent: getAstroBlogPostTemplate,
      description: "Single blog post page",
    },
  ];
}
