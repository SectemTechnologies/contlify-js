import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  getV2ScaffoldManifest,
  getNextjsV2ScaffoldManifest,
  getAstroV2ScaffoldManifest,
  getReactRouterV2ScaffoldManifest,
  getAngularV2ScaffoldManifest,
  getContlifyConfigTemplate,
  getNextjsV2RouteTemplate,
  getAstroV2RouteTemplate,
  getReactRouterV2RouteTemplate,
  getAngularV2RouteTemplate,
} from "../../src/templates/v2/index.js";
import { scaffoldProjectV2 } from "../../src/cli/scaffolder.js";

describe("v2 Scaffold Templates & Manifests", () => {
  describe("getContlifyConfigTemplate", () => {
    it("should generate valid config for postgres (cloudflare)", () => {
      const content = getContlifyConfigTemplate("postgres", "skip", "cloudflare");
      expect(content).toContain('import { neon } from "@neondatabase/serverless";');
      expect(content).toContain('import { defineConfig } from "contlify";');
      expect(content).toContain('driver: "postgres"');
      expect(content).toContain('neonHttpClient');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('path: "/api/contlify/v1"');
      expect(content).toContain('postUrl: "/blog/{slug}"');
      expect(content).not.toContain("autoMigrate: true");
    });

    it("should generate valid config for postgres (node)", () => {
      const content = getContlifyConfigTemplate("postgres", "skip", "node");
      expect(content).toContain('import { Pool } from "pg";');
      expect(content).toContain('driver: "postgres"');
      expect(content).toContain('client: pool');
    });

    it("should generate valid config for supabase (pure JS SDK mode)", () => {
      const content = getContlifyConfigTemplate("supabase", "skip");
      expect(content).toContain('driver: "supabase"');
      expect(content).toContain('client: getSupabaseClient');
      expect(content).toContain("SUPABASE_URL");
      expect(content).toContain("SUPABASE_SECRET_KEY");
      expect(content).not.toContain("autoMigrate: true");
    });

    it("should generate valid config for d1 (nextjs)", () => {
      const content = getContlifyConfigTemplate("d1", "skip", "cloudflare", "postgres", "nextjs");
      expect(content).toContain('driver: "d1"');
      expect(content).toContain('dbProvider');
      expect(content).toContain('getCloudflareContext');
    });

    it("should generate valid config for d1 (astro / standard)", () => {
      const content = getContlifyConfigTemplate("d1", "skip", "cloudflare", "postgres", "astro");
      expect(content).toContain('driver: "d1"');
      expect(content).toContain('dbProvider');
      expect(content).not.toContain('getCloudflareContext');
      expect(content).toContain('globalThis');
    });

    it("should generate valid config for mongodb (cloudflare)", () => {
      const content = getContlifyConfigTemplate("mongodb", "skip", "cloudflare");
      expect(content).toContain('driver: "mongodb"');
      expect(content).toContain('uri: process.env["MONGODB_URI"]');
      expect(content).toContain('dbName: process.env["MONGODB_DB_NAME"] ?? "contlify"');
      expect(content).toContain('deployment: "cloudflare"');
      expect(content).not.toContain('dbProvider');
    });

    it("should generate valid config for mongodb (node)", () => {
      const content = getContlifyConfigTemplate("mongodb", "skip", "node");
      expect(content).toContain('driver: "mongodb"');
      expect(content).toContain('uri: process.env["MONGODB_URI"]');
      expect(content).toContain('dbName: process.env["MONGODB_DB_NAME"] ?? "contlify"');
      expect(content).not.toContain('deployment: "cloudflare"');
      expect(content).not.toContain('dbProvider');
    });

    it("should include autoMigrate: true when mode is auto", () => {
      const content = getContlifyConfigTemplate("postgres", "auto");
      expect(content).toContain("autoMigrate: true");
    });

    it("should NOT include autoMigrate when mode is sql", () => {
      const content = getContlifyConfigTemplate("postgres", "sql");
      expect(content).not.toContain("autoMigrate: true");
    });
  });

  describe("Gateway Route Templates", () => {
    it("should generate Next.js v2 route with createNextHandler", () => {
      const content = getNextjsV2RouteTemplate();
      expect(content).toContain('import "../../../../../../contlify.config";');
      expect(content).toContain('import { createNextHandler } from "contlify/next";');
      expect(content).toContain("const handler = createNextHandler();");
      expect(content).toContain("handler as GET");
      expect(content).toContain("handler as POST");
    });

    it("should generate Astro v2 route with createContlifyHandler", () => {
      const content = getAstroV2RouteTemplate();
      expect(content).toContain('import "../../../../../contlify.config";');
      expect(content).toContain('import { createContlifyHandler } from "contlify";');
      expect(content).toContain("const handler = createContlifyHandler();");
      expect(content).toContain("export const ALL: APIRoute");
    });

    it("should generate React Router v2 route with createContlifyHandler", () => {
      const content = getReactRouterV2RouteTemplate();
      expect(content).toContain('import "../../contlify.config";');
      expect(content).toContain('import { createContlifyHandler } from "contlify";');
      expect(content).toContain("const handler = createContlifyHandler();");
      expect(content).toContain("export const loader = async");
      expect(content).toContain("export const action = async");
    });

    it("should generate Angular v2 route with mountContlify", () => {
      const content = getAngularV2RouteTemplate();
      expect(content).toContain('import "./contlify.config";');
      expect(content).toContain("createContlifyHandler");
      expect(content).toContain("createNodeMiddleware");
      expect(content).toContain("getAllPosts");
      expect(content).toContain("getCategories");
      expect(content).toContain("const contlifyHandler = createContlifyHandler();");
      expect(content).toContain("export function mountContlify(app: Express): void");
    });
  });

  describe("v2 Manifests (Exactly 2 files per framework)", () => {
    it("Next.js manifest should have exactly 2 files", () => {
      const manifest = getNextjsV2ScaffoldManifest({ dbType: "postgres" });
      expect(manifest).toHaveLength(2);
      expect(manifest[0].relativePath).toBe("contlify.config.ts");
      expect(manifest[1].relativePath).toBe("app/api/contlify/v1/[...path]/route.ts");
    });

    it("Astro manifest should have exactly 2 files", () => {
      const manifest = getAstroV2ScaffoldManifest({ dbType: "supabase" });
      expect(manifest).toHaveLength(2);
      expect(manifest[0].relativePath).toBe("contlify.config.ts");
      expect(manifest[1].relativePath).toBe("src/pages/api/contlify/v1/[...path].ts");
    });

    it("React Router manifest should have exactly 2 files", () => {
      const manifest = getReactRouterV2ScaffoldManifest({ dbType: "mongodb" });
      expect(manifest).toHaveLength(2);
      expect(manifest[0].relativePath).toBe("contlify.config.ts");
      expect(manifest[1].relativePath).toBe("app/routes/api.contlify.$.ts");
    });

    it("Angular manifest should have exactly 2 files", () => {
      const manifest = getAngularV2ScaffoldManifest({ dbType: "postgres" });
      expect(manifest).toHaveLength(2);
      expect(manifest[0].relativePath).toBe("contlify.config.ts");
      expect(manifest[1].relativePath).toBe("server.contlify.ts");
    });

    it("getV2ScaffoldManifest dispatcher routes correctly", () => {
      expect(getV2ScaffoldManifest("nextjs", { dbType: "postgres" })[1].relativePath).toContain("app/api/contlify/v1");
      expect(getV2ScaffoldManifest("astro", { dbType: "postgres" })[1].relativePath).toContain("src/pages/api/contlify/v1");
      expect(getV2ScaffoldManifest("react-router", { dbType: "postgres" })[1].relativePath).toContain("app/routes/api.contlify");
      expect(getV2ScaffoldManifest("angular", { dbType: "postgres" })[1].relativePath).toContain("server.contlify.ts");
    });
  });

  describe("scaffoldProjectV2 Execution", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-v2-scaffold-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should scaffold exactly 2 files for Next.js root layout", () => {
      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
        migrationMode: "skip",
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === "created")).toBe(true);

      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"))).toBe(true);

      // Verify no legacy v1 files exist
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/adapter.ts"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/queries.ts"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/blog/page.tsx"))).toBe(false);
    });

    it("should place route under src/app when project has src layout while keeping config at root", () => {
      fs.mkdirSync(path.join(tempDir, "src", "app"), { recursive: true });

      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "supabase",
        migrationMode: "auto",
      });

      expect(results).toHaveLength(2);
      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "src/app/api/contlify/v1/[...path]/route.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "src/contlify.config.ts"))).toBe(false);
    });

    it("should skip existing files when overwrite is false", () => {
      fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), "// custom config", "utf-8");

      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
        overwrite: false,
      });

      const configResult = results.find((r) => r.relativePath === "contlify.config.ts");
      expect(configResult?.status).toBe("skipped");
      expect(fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8")).toBe("// custom config");
    });

    it("should overwrite existing files when overwrite is true", () => {
      fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), "// custom config", "utf-8");

      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
        overwrite: true,
      });

      const configResult = results.find((r) => r.relativePath === "contlify.config.ts");
      expect(configResult?.status).toBe("created");
      expect(fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8")).toContain("defineConfig");
    });

    it("should scaffold exactly 2 files for Angular", () => {
      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "angular",
        dbType: "postgres",
        postgresDeployment: "node",
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === "created")).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "server.contlify.ts"))).toBe(true);
    });
  });
});
