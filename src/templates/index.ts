/**
 * Contlify Template System (v2 Minimal Scaffolding)
 */
export type { ContlifyFramework } from "./framework.js";
export type { ScaffoldFileEntry } from "./types.js";

// v2 minimal scaffold manifests & templates
export {
  getV2ScaffoldManifest,
  getNextjsV2ScaffoldManifest,
  getAstroV2ScaffoldManifest,
  getReactRouterV2ScaffoldManifest,
  getContlifyConfigTemplate,
  getNextjsV2RouteTemplate,
  getAstroV2RouteTemplate,
  getReactRouterV2RouteTemplate,
  type V2ScaffoldOptions,
  type V2MigrationMode,
  type PostgresDeployment,
  type SupabaseConnectionMode,
} from "./v2/index.js";
