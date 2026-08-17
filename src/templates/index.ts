/**
 * Template System (Blog Page Scaffolding)
 * Next.js, Astro, and React Router v4 packs live in their own folders.
 */
export type { ContlifyFramework } from "./framework.js";
export type { ScaffoldFileEntry } from "./types.js";

export { getBlogListingTemplate, getCategoryPostsTemplate, getBlogPostTemplate, getBlogLoadingTemplate, getApiRouteTemplate } from "./nextjs/index.js";
export { getQueriesTemplate } from "./shared/queries.template.js";
export { getAdapterConfigTemplate } from "./shared/adapter-config.template.js";
export { getNextjsScaffoldManifest } from "./nextjs/index.js";
export { getAstroScaffoldManifest, getAstroApiRouteTemplate, getAstroBlogListingTemplate, getAstroBlogPostTemplate, getAstroCategoryPostsTemplate } from "./astro/index.js";
export {
  getReactRouterV4ScaffoldManifest,
  getReactRouterV4BlogClientTemplate,
  getReactRouterV4BlogListingTemplate,
  getReactRouterV4BlogPostTemplate,
  getReactRouterV4CategoryPostsTemplate,
  getReactRouterV4ExpressServerTemplate,
  getReactRouterV4RoutesTemplate,
} from "./react-router-v4/index.js";

import type { ContlifyFramework } from "./framework.js";
import type { ScaffoldFileEntry } from "./types.js";
import { getNextjsScaffoldManifest } from "./nextjs/index.js";
import { getAstroScaffoldManifest } from "./astro/index.js";
import { getReactRouterV4ScaffoldManifest } from "./react-router-v4/index.js";

/**
 * Returns scaffold files for the chosen framework.
 * Defaults to Next.js so existing CLI / tests stay unchanged.
 */
export function getScaffoldManifest(framework: ContlifyFramework = "nextjs"): ScaffoldFileEntry[] {
  switch (framework) {
    case "astro":
      return getAstroScaffoldManifest();
    case "react-router-v4":
      return getReactRouterV4ScaffoldManifest();
    case "nextjs":
    default:
      return getNextjsScaffoldManifest();
  }
}
