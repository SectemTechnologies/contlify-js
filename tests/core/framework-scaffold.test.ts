import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scaffoldProject } from "../../src/cli/scaffolder.js";
import { getAstroScaffoldManifest, getReactRouterV4ScaffoldManifest, getScaffoldManifest } from "../../src/templates/index.js";

describe("Framework scaffold packs", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-fw-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("keeps Next.js as the default 7-file manifest", () => {
    expect(getScaffoldManifest()).toHaveLength(7);
    expect(getScaffoldManifest("nextjs")).toHaveLength(7);
  });

  it("scaffolds Astro into src/pages and src/lib without a src/ prefix doubling", () => {
    const results = scaffoldProject({ projectRoot: tempDir, framework: "astro" });
    expect(results.filter((r) => r.status === "created")).toHaveLength(getAstroScaffoldManifest().length);
    expect(fs.existsSync(path.join(tempDir, "src/pages/blog/index.astro"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/pages/api/contlify/[...path].ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/lib/contlify/queries.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/src/pages"))).toBe(false);

    const api = fs.readFileSync(path.join(tempDir, "src/pages/api/contlify/[...path].ts"), "utf-8");
    expect(api).toContain("export const ALL");
    expect(api).toContain("createContlifyHandler");
  });

  it("scaffolds React Router v4 pages plus Express server", () => {
    const results = scaffoldProject({ projectRoot: tempDir, framework: "react-router-v4" });
    expect(results.filter((r) => r.status === "created")).toHaveLength(getReactRouterV4ScaffoldManifest().length);
    expect(fs.existsSync(path.join(tempDir, "server/contlify-server.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/pages/BlogCategories.jsx"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "src/contlify-blog-routes.jsx"))).toBe(true);

    const server = fs.readFileSync(path.join(tempDir, "server/contlify-server.ts"), "utf-8");
    expect(server).toContain("createNodeMiddleware");
    expect(server).toContain("/api/blog/categories");

    const routes = fs.readFileSync(path.join(tempDir, "src/contlify-blog-routes.jsx"), "utf-8");
    expect(routes).toContain('exact path="/blog"');
  });
});
