import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectFramework } from "../../src/cli/detector.js";

describe("Framework Auto-Detector (detectFramework)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-detect-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return null on an empty directory", () => {
    expect(detectFramework(tempDir)).toBeNull();
  });

  it("should detect Astro when astro.config.mjs exists", () => {
    fs.writeFileSync(path.join(tempDir, "astro.config.mjs"), "export default {};");
    expect(detectFramework(tempDir)).toBe("astro");
  });

  it("should detect Next.js when next.config.js exists", () => {
    fs.writeFileSync(path.join(tempDir, "next.config.js"), "module.exports = {};");
    expect(detectFramework(tempDir)).toBe("nextjs");
  });

  it("should detect Next.js when next.config.ts exists", () => {
    fs.writeFileSync(path.join(tempDir, "next.config.ts"), "export default {};");
    expect(detectFramework(tempDir)).toBe("nextjs");
  });

  it("should detect Astro via package.json dependencies", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { astro: "^4.0.0" } })
    );
    expect(detectFramework(tempDir)).toBe("astro");
  });

  it("should detect Next.js via package.json dependencies", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { next: "^14.0.0", react: "^18.0.0" } })
    );
    expect(detectFramework(tempDir)).toBe("nextjs");
  });

  it("should detect React Router v4 via package.json dependencies", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { "react-router-dom": "^4.3.1" } })
    );
    expect(detectFramework(tempDir)).toBe("react-router-v4");
  });

  it("should detect Next.js when src/app layout exists without configs", () => {
    fs.mkdirSync(path.join(tempDir, "src", "app"), { recursive: true });
    expect(detectFramework(tempDir)).toBe("nextjs");
  });
});
