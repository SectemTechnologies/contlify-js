/**
 * v2 Scaffold Manifests
 *
 * Returns the minimal two-file scaffold for each framework:
 *   1. contlify.config.ts  — project root, user's single configuration entry point
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
}

/**
 * Next.js v2 scaffold manifest (2 files only).
 * The scaffolder applies src/ prefix for src/app layouts automatically.
 */
export function getNextjsV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres" } = options;
  return [
    {
      relativePath: "contlify.config.ts",
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "nextjs"),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: "app/api/contlify/v1/[...path]/route.ts",
      getContent: getNextjsV2RouteTemplate,
      description: "Next.js App Router gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * Astro v2 scaffold manifest (2 files only).
 */
export function getAstroV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres" } = options;
  return [
    {
      relativePath: "contlify.config.ts",
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "astro"),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: "src/pages/api/contlify/v1/[...path].ts",
      getContent: getAstroV2RouteTemplate,
      description: "Astro API endpoint gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * React Router v7 v2 scaffold manifest (2 files only).
 */
export function getReactRouterV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "cloudflare", supabaseMode = "postgres" } = options;
  return [
    {
      relativePath: "contlify.config.ts",
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "react-router"),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: "app/routes/api.contlify.$.ts",
      getContent: getReactRouterV2RouteTemplate,
      description: "React Router v7 catch-all gateway (thin bridge to Contlify library)",
    },
  ];
}

/**
 * Angular SSR v2 scaffold manifest (2 files only).
 */
export function getAngularV2ScaffoldManifest(options: V2ScaffoldOptions): ScaffoldFileEntry[] {
  const { dbType, migrationMode = "skip", postgresDeployment = "node", supabaseMode = "postgres" } = options;
  return [
    {
      relativePath: "contlify.config.ts",
      getContent: () => getContlifyConfigTemplate(dbType, migrationMode, postgresDeployment, supabaseMode, "angular"),
      description: "Contlify declarative configuration (database, API key, URL pattern)",
    },
    {
      relativePath: "server.contlify.ts",
      getContent: getAngularV2RouteTemplate,
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
