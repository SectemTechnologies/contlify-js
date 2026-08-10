import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scaffoldProject, formatScaffoldResults } from "../../src/cli/scaffolder.js";

describe("Scaffolder", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory inside the workspace for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create all 5 scaffold files in the target directory", () => {
    const results = scaffoldProject({ projectRoot: tempDir });

    const created = results.filter((r) => r.status === "created");
    expect(created).toHaveLength(5);

    // Verify files actually exist on disk
    for (const result of created) {
      const filePath = path.join(tempDir, result.relativePath);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it("should create correct directory structure", () => {
    scaffoldProject({ projectRoot: tempDir });

    expect(fs.existsSync(path.join(tempDir, "app/api/contlify/[...path]"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/blog/[slug]"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "lib/contlify"))).toBe(true);
  });

  it("should write valid content to files", () => {
    scaffoldProject({ projectRoot: tempDir });

    const routeContent = fs.readFileSync(
      path.join(tempDir, "app/api/contlify/[...path]/route.ts"),
      "utf-8"
    );
    expect(routeContent).toContain("createContlifyHandler");

    const queriesContent = fs.readFileSync(
      path.join(tempDir, "lib/contlify/queries.ts"),
      "utf-8"
    );
    expect(queriesContent).toContain("getAllPosts");

    const blogPage = fs.readFileSync(
      path.join(tempDir, "app/blog/page.tsx"),
      "utf-8"
    );
    expect(blogPage).toContain("export default async function");
  });

  it("should skip existing files when overwrite is false", () => {
    // First scaffold
    scaffoldProject({ projectRoot: tempDir });

    // Write a custom file to one location
    const customContent = "// My custom route handler";
    fs.writeFileSync(
      path.join(tempDir, "app/api/contlify/[...path]/route.ts"),
      customContent,
      "utf-8"
    );

    // Second scaffold without overwrite
    const results = scaffoldProject({ projectRoot: tempDir, overwrite: false });

    // The route.ts should be skipped
    const routeResult = results.find((r) =>
      r.relativePath === "app/api/contlify/[...path]/route.ts"
    );
    expect(routeResult?.status).toBe("skipped");

    // Verify file was not overwritten
    const content = fs.readFileSync(
      path.join(tempDir, "app/api/contlify/[...path]/route.ts"),
      "utf-8"
    );
    expect(content).toBe(customContent);
  });

  it("should overwrite existing files when overwrite is true", () => {
    // First scaffold
    scaffoldProject({ projectRoot: tempDir });

    // Write a custom file
    fs.writeFileSync(
      path.join(tempDir, "app/api/contlify/[...path]/route.ts"),
      "// custom",
      "utf-8"
    );

    // Second scaffold with overwrite
    const results = scaffoldProject({ projectRoot: tempDir, overwrite: true });

    const routeResult = results.find((r) =>
      r.relativePath === "app/api/contlify/[...path]/route.ts"
    );
    expect(routeResult?.status).toBe("created");

    // Verify file was overwritten with template content
    const content = fs.readFileSync(
      path.join(tempDir, "app/api/contlify/[...path]/route.ts"),
      "utf-8"
    );
    expect(content).toContain("createContlifyHandler");
  });

  it("should support 'only' filter to scaffold specific files", () => {
    const results = scaffoldProject({
      projectRoot: tempDir,
      only: ["app/blog/page.tsx", "app/blog/[slug]/page.tsx"],
    });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "created")).toBe(true);

    // Only blog pages should exist
    expect(fs.existsSync(path.join(tempDir, "app/blog/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/blog/[slug]/page.tsx"))).toBe(true);

    // Other files should NOT exist
    expect(fs.existsSync(path.join(tempDir, "lib/contlify/adapter.ts"))).toBe(false);
  });

  describe("formatScaffoldResults", () => {
    it("should produce human-readable output", () => {
      const results = scaffoldProject({ projectRoot: tempDir });
      const output = formatScaffoldResults(results);

      expect(output).toContain("✅ Created");
      expect(output).toContain("5 created");
      expect(output).toContain("0 skipped");
      expect(output).toContain("0 errors");
    });

    it("should show skipped files in output", () => {
      scaffoldProject({ projectRoot: tempDir });
      const results = scaffoldProject({ projectRoot: tempDir, overwrite: false });
      const output = formatScaffoldResults(results);

      expect(output).toContain("Skipped");
      expect(output).toContain("5 skipped");
    });
  });
});
