import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scaffoldProjectV2, formatScaffoldResults, detectBaseDir } from "../../src/cli/scaffolder.js";

describe("v2 Scaffolder", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create minimal 2 scaffold files for Next.js (contlify.config.ts + route.ts)", () => {
    const results = scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
    });

    const created = results.filter((r) => r.status === "created");
    expect(created).toHaveLength(2);

    for (const result of created) {
      const filePath = path.join(tempDir, result.relativePath);
      expect(fs.existsSync(filePath)).toBe(true);
    }

    expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"))).toBe(true);
  });

  it("should write valid v2 config and route handler content", () => {
    scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
      migrationMode: "auto",
      postgresDeployment: "cloudflare",
    });

    const configContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
    expect(configContent).toContain("defineConfig");
    expect(configContent).toContain('driver: "postgres"');
    expect(configContent).toContain("autoMigrate: true");

    const routeContent = fs.readFileSync(
      path.join(tempDir, "app/api/contlify/v1/[...path]/route.ts"),
      "utf-8"
    );
    expect(routeContent).toContain("createNextHandler");
    expect(routeContent).toContain("contlify.config");
  });

  it("should skip existing files when overwrite is false", () => {
    scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
    });

    const customContent = "// My custom config";
    fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), customContent, "utf-8");

    const results = scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
      overwrite: false,
    });

    const configResult = results.find((r) => r.relativePath === "contlify.config.ts");
    expect(configResult?.status).toBe("skipped");

    const afterContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
    expect(afterContent).toBe(customContent);
  });

  it("should overwrite existing files when overwrite is true", () => {
    scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
    });

    fs.writeFileSync(path.join(tempDir, "contlify.config.ts"), "// custom", "utf-8");

    const results = scaffoldProjectV2({
      projectRoot: tempDir,
      framework: "nextjs",
      dbType: "postgres",
      overwrite: true,
    });

    const configResult = results.find((r) => r.relativePath === "contlify.config.ts");
    expect(configResult?.status).toBe("created");

    const afterContent = fs.readFileSync(path.join(tempDir, "contlify.config.ts"), "utf-8");
    expect(afterContent).toContain("defineConfig");
  });

  describe("detectBaseDir & src/ layout support", () => {
    it("should return 'src' when src/app exists", () => {
      fs.mkdirSync(path.join(tempDir, "src", "app"), { recursive: true });
      expect(detectBaseDir(tempDir)).toBe("src");
    });

    it("should return 'src' when src/ exists", () => {
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      expect(detectBaseDir(tempDir)).toBe("src");
    });

    it("should return empty string when src/ does not exist", () => {
      expect(detectBaseDir(tempDir)).toBe("");
    });

    it("should place route in src/app and keep contlify.config.ts at root when src/ exists", () => {
      fs.mkdirSync(path.join(tempDir, "src", "app"), { recursive: true });

      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
      });

      expect(results.every((r) => r.status === "created")).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "contlify.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "src/app/api/contlify/v1/[...path]/route.ts"))).toBe(true);
    });
  });

  describe("formatScaffoldResults", () => {
    it("should produce human-readable output", () => {
      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
      });
      const output = formatScaffoldResults(results);

      expect(output).toContain("✅ Created");
      expect(output).toContain("2 created");
      expect(output).toContain("0 skipped");
      expect(output).toContain("0 errors");
    });

    it("should show skipped files in output", () => {
      scaffoldProjectV2({ projectRoot: tempDir, framework: "nextjs", dbType: "postgres" });
      const results = scaffoldProjectV2({
        projectRoot: tempDir,
        framework: "nextjs",
        dbType: "postgres",
        overwrite: false,
      });
      const output = formatScaffoldResults(results);

      expect(output).toContain("Skipped");
      expect(output).toContain("2 skipped");
    });
  });
});
