import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Mock prompts and skip npm install in tests
vi.mock("../../src/cli/prompts.js", () => ({
  prompt: vi.fn(),
  promptWithDefault: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { runInit } from "../../src/cli/init-command.js";
import { runMigrate } from "../../src/cli/migrate-command.js";
import { select, confirm } from "../../src/cli/prompts.js";

describe("CLI Commands (v2 Hybrid Architecture)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-cli-test-"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("runInit (v2 Minimal Scaffolding)", () => {
    it("should scaffold exactly 2 files for Next.js + Postgres (skip migration mode)", async () => {
      // select framework -> select db -> select deployment -> select migration mode -> confirm scaffold
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("cloudflare")  // hosting question
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      // Exactly 2 v2 files should exist
      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"))).toBe(true);

      // Verify NO legacy v1 files exist
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/adapter.ts"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/queries.ts"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/blog/page.tsx"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/blog/loading.tsx"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/blog/category/[slug]/page.tsx"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/blog/post/[slug]/page.tsx"))).toBe(false);

      // Cloudflare deployment: should use neon() HTTP client
      const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(configContent).toContain('import { neon } from "@neondatabase/serverless";');
      expect(configContent).toContain('driver: "postgres"');
      expect(configContent).toContain('neonHttpClient');
      expect(configContent).toContain('path: "/api/contlify/v1"');
      expect(configContent).not.toContain("autoMigrate: true");

      // Verify route content
      const routeContent = fs.readFileSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"), "utf-8");
      expect(routeContent).toContain('import "../../../../../../contlify.config";');
      expect(routeContent).toContain('import { createNextHandler } from "contlify/next";');
      expect(routeContent).toContain("const handler = createNextHandler();");
    });

    it("should include autoMigrate: true in config when user chooses automatic setup", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("cloudflare")  // hosting question
        .mockResolvedValueOnce("auto");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(configContent).toContain("autoMigrate: true");
      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(false);
    });

    it("should write SQL migration file when user chooses SQL file mode", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("cloudflare")  // hosting question
        .mockResolvedValueOnce("sql");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const sqlPath = path.join(tempDir, "schema.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
      const sqlContent = fs.readFileSync(sqlPath, "utf-8");
      expect(sqlContent).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should write Supabase config and schema.sql for supabase choice", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("supabase");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(configContent).toContain('driver: "supabase"');
      expect(configContent).toContain('client: getSupabaseClient');
      expect(configContent).toContain("SUPABASE_URL");
      expect(configContent).toContain("SUPABASE_SECRET_KEY");

      const sqlPath = path.join(tempDir, "schema.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
    });

    it("should write D1 config for d1 choice", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("d1")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(configContent).toContain('driver: "d1"');
    });

    it("should write MongoDB config and patch next.config.mjs for Next.js + MongoDB", async () => {
      fs.writeFileSync(path.join(tempDir, "next.config.mjs"), "const nextConfig = {};\nexport default nextConfig;");

      // Auto-detects Next.js: confirm detected -> select db -> select deployment -> select migration -> confirm scaffold
      vi.mocked(confirm).mockResolvedValueOnce(true); // confirm Next.js
      vi.mocked(select)
        .mockResolvedValueOnce("mongodb")
        .mockResolvedValueOnce("cloudflare")
        .mockResolvedValueOnce("sql");
      vi.mocked(confirm).mockResolvedValueOnce(true); // confirm proceed

      await runInit(tempDir);

      const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(configContent).toContain('driver: "mongodb"');
      expect(configContent).toContain('uri: process.env["MONGODB_URI"]');
      expect(configContent).toContain('dbName: process.env["MONGODB_DB_NAME"] ?? "contlify"');
      expect(configContent).toContain('deployment: "cloudflare"');
      expect(configContent).not.toContain('dbProvider');

      // MongoDB doesn't create SQL file even in sql mode
      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(false);

      // next.config.mjs patched
      const nextConfig = fs.readFileSync(path.join(tempDir, "next.config.mjs"), "utf-8");
      expect(nextConfig).toContain('serverExternalPackages: ["mongodb"]');
    });

    it("should scaffold Astro files when Astro is chosen", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("astro")
        .mockResolvedValueOnce("supabase")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "src/pages/api/contlify/v1/[...path].ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "src/pages/blog/index.astro"))).toBe(false);
    });

    it("should scaffold React Router v7 files and patch app/routes.ts", async () => {
      fs.writeFileSync(path.join(tempDir, "react-router.config.ts"), "export default {};");
      fs.mkdirSync(path.join(tempDir, "app"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "app/routes.ts"),
        `import { type RouteConfig, index } from "@react-router/dev/routes";\n\nexport default [\n  index("routes/home.tsx"),\n] satisfies RouteConfig;\n`
      );

      // Auto-detects React Router: confirm detected -> select db -> select migration -> confirm scaffold
      vi.mocked(confirm).mockResolvedValueOnce(true); // confirm React Router
      vi.mocked(select)
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true); // confirm proceed

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/routes/api.contlify.$.ts"))).toBe(true);

      const routesContent = fs.readFileSync(path.join(tempDir, "app/routes.ts"), "utf-8");
      expect(routesContent).toContain('route("api/contlify/*", "routes/api.contlify.$.ts")');
    });

    it("should cancel setup without creating files when user denies confirmation", async () => {
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(false);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"))).toBe(false);
    });

    it("should skip existing files without overwrite flag", async () => {
      fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), "// existing custom config", "utf-8");

      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir, { overwrite: false });

      const content = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(content).toBe("// existing custom config");
    });

    it("should overwrite existing files with overwrite flag", async () => {
      fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), "// existing custom config", "utf-8");

      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir, { overwrite: true });

      const content = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(content).not.toBe("// existing custom config");
      expect(content).toContain("defineConfig");
    });

    it("should auto-detect framework and confirm with user", async () => {
      fs.writeFileSync(path.join(tempDir, "astro.config.mjs"), "export default {};");

      // confirm detected Astro -> select db -> select migration mode -> confirm scaffold
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(select).mockResolvedValueOnce("postgres").mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "src/pages/api/contlify/v1/[...path].ts"))).toBe(true);
    });

    it("should allow changing framework if user declines auto-detected framework", async () => {
      fs.writeFileSync(path.join(tempDir, "astro.config.mjs"), "export default {};");

      // decline detected Astro -> select nextjs -> select db -> select migration mode -> confirm scaffold
      vi.mocked(confirm).mockResolvedValueOnce(false);
      vi.mocked(select)
        .mockResolvedValueOnce("nextjs")
        .mockResolvedValueOnce("postgres")
        .mockResolvedValueOnce("skip");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"))).toBe(true);
    });
  });

  describe("runMigrate (Config-Aware & Interactive)", () => {
    it("should auto-detect driver from contlify.config.ts and write schema.sql", async () => {
      fs.writeFileSync(
        path.join(tempDir, "contlify.config.ts"),
        `import { defineConfig } from "contlify";\nexport default defineConfig({ storage: { driver: "postgres" } });\n`
      );

      // output mode choice -> "sql-file"
      vi.mocked(select).mockResolvedValueOnce("sql-file");

      await runMigrate(tempDir);

      const sqlPath = path.join(tempDir, "schema.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      expect(sql).toContain("contlify_posts");
    });

    it("should auto-detect driver for D1 from contlify.config.ts", async () => {
      fs.writeFileSync(
        path.join(tempDir, "contlify.config.ts"),
        `export default defineConfig({ storage: { driver: "d1" } });`
      );

      vi.mocked(select).mockResolvedValueOnce("sql-file");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(true);
    });

    it("should fall back to interactive selection if contlify.config.ts is missing", async () => {
      vi.mocked(select).mockResolvedValueOnce("supabase").mockResolvedValueOnce("sql-file");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(true);
    });

    it("should not write file for mongodb", async () => {
      vi.mocked(select).mockResolvedValueOnce("mongodb");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(false);
    });

    it("should handle print output mode without creating files", async () => {
      fs.writeFileSync(
        path.join(tempDir, "contlify.config.ts"),
        `export default defineConfig({ storage: { driver: "postgres" } });`
      );

      vi.mocked(select).mockResolvedValueOnce("print");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(false);
    });

    it("should handle cancel output mode without creating files", async () => {
      fs.writeFileSync(
        path.join(tempDir, "contlify.config.ts"),
        `export default defineConfig({ storage: { driver: "postgres" } });`
      );

      vi.mocked(select).mockResolvedValueOnce("cancel");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "schema.sql"))).toBe(false);
    });

    it("should enable auto-migrate in contlify.config.ts when user selects auto-migrate mode", async () => {
      fs.writeFileSync(
        path.join(tempDir, "contlify.config.ts"),
        `import { defineConfig } from "contlify";\n\nexport default defineConfig({\n  apiKey: "key",\n  storage: {\n    driver: "postgres",\n  },\n});\n`
      );

      vi.mocked(select).mockResolvedValueOnce("auto-migrate");

      await runMigrate(tempDir);

      const content = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
      expect(content).toContain("autoMigrate: true");
    });

    it("should prompt before overwriting existing schema.sql file", async () => {
      fs.writeFileSync(path.join(tempDir, "schema.sql"), "-- old sql", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres").mockResolvedValueOnce("sql-file");
      vi.mocked(confirm).mockResolvedValueOnce(true); // confirm overwrite

      await runMigrate(tempDir);

      const content = fs.readFileSync(path.join(tempDir, "schema.sql"), "utf-8");
      expect(content).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should NOT overwrite when user declines overwrite prompt", async () => {
      fs.writeFileSync(path.join(tempDir, "schema.sql"), "-- old sql", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres").mockResolvedValueOnce("sql-file");
      vi.mocked(confirm).mockResolvedValueOnce(false); // decline overwrite

      await runMigrate(tempDir);

      const content = fs.readFileSync(path.join(tempDir, "schema.sql"), "utf-8");
      expect(content).toBe("-- old sql");
    });
  });
});
