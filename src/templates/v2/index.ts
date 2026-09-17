/**
 * v2 Scaffold Manifests
 *
 * Returns the minimal two-file scaffold for each framework:
 *   1. contlify.config.ts / contlify.config.js  — project root, user's single configuration entry point
 *   2. framework route      — thin gateway bridging the framework router to Contlify
 */
import type { ScaffoldFileEntry } from "../types.js";
import type { ContlifyFramework } from "../framework.js";
import type { SupportedDatabaseType } from "../../migrations/index.js";
import { getContlifyConfigTemplate, type V2MigrationMode, type PostgresDeployment, type SupabaseConnectionMode } from "./contlify-config.template.js";
import { getNextjsV2RouteTemplate } from "./nextjs-route.template.js";
import { getAstroV2RouteTemplate } from "./astro-route.template.js";
import { getReactRouterV2RouteTemplate } from "./react-router-route.template.js";
import { getAngularV2RouteTemplate } from "./angular-route.template.js";

export type { V2MigrationMode, PostgresDeployment, SupabaseConnectionMode } from "./contlify-config.template.js";
export { getContlifyConfigTemplate } from "./contlify-config.template.js";
export { getNextjsV2RouteTemplate } from "./nextjs-route.template.js";
export { getAstroV2RouteTemplate } from "./astro-route.template.js";
export { getReactRouterV2RouteTemplate } from "./react-router-route.template.js";
export { getAngularV2RouteTemplate } from "./angular-route.template.js";

export interface V2ScaffoldOptions {
  dbType: SupportedDatabaseType;
  migrationMode?: V2MigrationMode;
  postgresDeployment?: PostgresDeployment;
  supabaseMode?: SupabaseConnectionMode;
  baseDir?: string;
  /** Whether to scaffold TypeScript or JavaScript files. Defaults to "ts". */
  language?: "ts" | "js";
}

/** Returns the file extension string ("ts" or "js") for generated scaffold files. */
function ext(language: "ts" | "js" = "ts"): string {
  return language;
}

/**
 * Next.js v2 scaffold manifest (2 files only).
 * The scaffolder applies src/ prefix for src/app layouts automatically.
 */
export function getNextjsV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres", baseDir = "src", language = "ts" } = options;
  const e = ext(language);
  return [
    {
      relativePath: `contlify.config.${e}`,
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "nextjs", language),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: `app/api/contlify/v1/[...path]/route.${e}`,
      getContent: () => getNextjsV2RouteTemplate(baseDir, language),
      description: "Next.js App Router gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * Astro v2 scaffold manifest (2 files only).
 */
export function getAstroV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres", language = "ts" } = options;
  const e = ext(language);
  return [
    {
      relativePath: `contlify.config.${e}`,
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "astro", language),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: `src/pages/api/contlify/v1/[...path].${e}`,
      getContent: () => getAstroV2RouteTemplate(language),
      description: "Astro API endpoint gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * React Router v7 v2 scaffold manifest (2 files only).
 */
export function getReactRouterV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres", language = "ts" } = options;
  const e = ext(language);
  return [
    {
      relativePath: `contlify.config.${e}`,
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "react-router", language),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: `app/routes/api.contlify.$.${e}`,
      getContent: () => getReactRouterV2RouteTemplate(language),
      description: "React Router v7 catch-all gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * Angular SSR v2 scaffold manifest (2 files only).
 */
export function getAngularV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "node", supabaseMode = "postgres", language = "ts" } = options;
  const e = ext(language);
  return [
    {
      relativePath: `contlify.config.${e}`,
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "angular", language),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: `server.contlify.${e}`,
      getContent: () => getAngularV2RouteTemplate(language),
      description: "Angular SSR Express gateway (mounts Contlify onto server.ts)",
    },
  ];
}

/**
 * Returns the v2 minimal scaffold manifest for the chosen framework.
 */
export function getV2ScaffoldManifest(
  framework: ContlifyFramework,
  options: V2ScaffoldOptions
): ScaffoldFileEntry[] {
  switch (framework) {
    case "angular":
      return getAngularV2ScaffoldManifest(options);
    case "astro":
      return getAstroV2ScaffoldManifest(options);
    case "react-router":
      return getReactRouterV2ScaffoldManifest(options);
    case "nextjs":
    default:
      return getNextjsV2ScaffoldManifest(options);
  }
}
