import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scaffoldProject } from "../../src/cli/scaffolder.js";
import { getAstroScaffoldManifest, getReactRouterScaffoldManifest, getScaffoldManifest } from "../../src/templates/index.js";

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

  it("scaffolds React Router v7 routes with server loaders and actions", () => {
    const results = scaffoldProject({ projectRoot: tempDir, framework: "react-router" });
    expect(results.filter((r) => r.status === "created")).toHaveLength(getReactRouterScaffoldManifest().length);
    expect(fs.existsSync(path.join(tempDir, "app/routes/api.contlify.$.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/routes/blog._index.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/routes/blog.category.$slug.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/routes/blog.post.$slug.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/lib/contlify/adapter.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "app/lib/contlify/queries.ts"))).toBe(true);

    const api = fs.readFileSync(path.join(tempDir, "app/routes/api.contlify.$.ts"), "utf-8");
    expect(api).toContain("export const loader");
    expect(api).toContain("export const action");
    expect(api).toContain("createContlifyHandler");

    const listing = fs.readFileSync(path.join(tempDir, "app/routes/blog._index.tsx"), "utf-8");
    expect(listing).toContain("export async function loader");
    expect(listing).toContain("useLoaderData");
  });
});
