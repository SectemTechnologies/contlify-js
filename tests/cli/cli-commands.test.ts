import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getMigrationSql } from "../../src/migrations/index.js";
import { scaffoldProject } from "../../src/cli/scaffolder.js";

// Mock the prompts module for all tests
vi.mock("../../src/cli/prompts.js", () => ({
  prompt: vi.fn(),
  promptWithDefault: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

import { runInit } from "../../src/cli/init-command.js";
import { runMigrate } from "../../src/cli/migrate-command.js";
import { select, confirm } from "../../src/cli/prompts.js";

describe("CLI Commands (Phase 3)", () => {
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

  describe("runInit", () => {
    it("should scaffold all files when user selects postgres and confirms", async () => {
      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      // All 6 scaffold files should exist
      expect(fs.existsSync(path.join(tempDir, "app/blog/page.tsx"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/blog/category/[slug]/page.tsx"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/blog/post/[slug]/page.tsx"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/queries.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "lib/contlify/adapter.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "app/api/contlify/[...path]/route.ts"))).toBe(true);
    });

    it("should write DB-specific adapter content for postgres", async () => {
      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const adapterContent = fs.readFileSync(path.join(tempDir, "lib/contlify/adapter.ts"), "utf-8");
      expect(adapterContent).toContain("createPostgresAdapter");
      expect(adapterContent).toContain("DATABASE_URL");
    });

    it("should write DB-specific adapter content for supabase", async () => {
      vi.mocked(select).mockResolvedValueOnce("supabase");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const adapterContent = fs.readFileSync(path.join(tempDir, "lib/contlify/adapter.ts"), "utf-8");
      expect(adapterContent).toContain("createSupabaseAdapter");
      expect(adapterContent).toContain("SUPABASE_URL");
    });

    it("should write DB-specific adapter content for d1", async () => {
      vi.mocked(select).mockResolvedValueOnce("d1");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const adapterContent = fs.readFileSync(path.join(tempDir, "lib/contlify/adapter.ts"), "utf-8");
      expect(adapterContent).toContain("createD1Adapter");
      expect(adapterContent).toContain("getCloudflareContext");
    });

    it("should write DB-specific adapter content for mongodb", async () => {
      vi.mocked(select).mockResolvedValueOnce("mongodb");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const adapterContent = fs.readFileSync(path.join(tempDir, "lib/contlify/adapter.ts"), "utf-8");
      expect(adapterContent).toContain("createMongoAdapter");
      expect(adapterContent).toContain("MONGODB_URI");
    });

    it("should write migration SQL file for postgres", async () => {
      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const sqlPath = path.join(tempDir, "contlify-postgres.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should write migration SQL file for d1", async () => {
      vi.mocked(select).mockResolvedValueOnce("d1");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      const sqlPath = path.join(tempDir, "contlify-d1.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
    });

    it("should NOT write SQL file for mongodb", async () => {
      vi.mocked(select).mockResolvedValueOnce("mongodb");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify-mongodb.sql"))).toBe(false);
    });

    it("should cancel setup without creating files when user denies", async () => {
      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(false);

      await runInit(tempDir);

      expect(fs.existsSync(path.join(tempDir, "app/blog/page.tsx"))).toBe(false);
    });

    it("should skip existing files without overwrite flag", async () => {
      // Pre-create one file
      fs.mkdirSync(path.join(tempDir, "app/blog"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "app/blog/page.tsx"), "// existing", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir, { overwrite: false });

      // Existing file should not be overwritten
      const content = fs.readFileSync(path.join(tempDir, "app/blog/page.tsx"), "utf-8");
      expect(content).toBe("// existing");
    });

    it("should overwrite existing files with overwrite flag", async () => {
      // Pre-create one file
      fs.mkdirSync(path.join(tempDir, "app/blog"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "app/blog/page.tsx"), "// existing", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runInit(tempDir, { overwrite: true });

      // File should now have template content
      const content = fs.readFileSync(path.join(tempDir, "app/blog/page.tsx"), "utf-8");
      expect(content).not.toBe("// existing");
      expect(content.length).toBeGreaterThan(10);
    });
  });

  describe("runMigrate", () => {
    it("should write postgres migration SQL file", async () => {
      vi.mocked(select).mockResolvedValueOnce("postgres");

      await runMigrate(tempDir);

      const sqlPath = path.join(tempDir, "contlify-postgres.sql");
      expect(fs.existsSync(sqlPath)).toBe(true);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      expect(sql).toContain("contlify_posts");
    });

    it("should write D1 migration SQL file", async () => {
      vi.mocked(select).mockResolvedValueOnce("d1");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify-d1.sql"))).toBe(true);
    });

    it("should not write a file for mongodb", async () => {
      vi.mocked(select).mockResolvedValueOnce("mongodb");

      await runMigrate(tempDir);

      expect(fs.existsSync(path.join(tempDir, "contlify-mongodb.sql"))).toBe(false);
    });

    it("should overwrite existing file when user confirms", async () => {
      // Pre-create file
      fs.writeFileSync(path.join(tempDir, "contlify-postgres.sql"), "-- old", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(true);

      await runMigrate(tempDir);

      const sql = fs.readFileSync(path.join(tempDir, "contlify-postgres.sql"), "utf-8");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should NOT overwrite existing file when user declines", async () => {
      fs.writeFileSync(path.join(tempDir, "contlify-postgres.sql"), "-- old", "utf-8");

      vi.mocked(select).mockResolvedValueOnce("postgres");
      vi.mocked(confirm).mockResolvedValueOnce(false);

      await runMigrate(tempDir);

      const sql = fs.readFileSync(path.join(tempDir, "contlify-postgres.sql"), "utf-8");
      expect(sql).toBe("-- old");
    });
  });
});
