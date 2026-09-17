import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectFramework, detectLanguage } from "../../src/cli/detector.js";

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

  it("should detect React Router v7 when react-router.config.ts exists", () => {
    fs.writeFileSync(path.join(tempDir, "react-router.config.ts"), "export default {};");
    expect(detectFramework(tempDir)).toBe("react-router");
  });

  it("should detect Next.js when next.config.js exists", () => {
    fs.writeFileSync(path.join(tempDir, "next.config.js"), "module.exports = {};");
    expect(detectFramework(tempDir)).toBe("nextjs");
  });

  it("should detect Next.js when next.config.ts exists", () => {
    fs.writeFileSync(path.join(tempDir, "next.config.ts"), "export default {};");
    expect(detectFramework(tempDir)).toBe("nextjs");
  });

  it("should detect Next.js when src/app layout exists without configs", () => {
    fs.mkdirSync(path.join(tempDir, "src", "app"), { recursive: true });
    expect(detectFramework(tempDir)).toBe("nextjs");
  });
});

describe("Language Auto-Detector (detectLanguage)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "contlify-lang-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return 'js' when no tsconfig.json exists", () => {
    expect(detectLanguage(tempDir)).toBe("js");
  });

  it("should return 'ts' when tsconfig.json exists", () => {
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    expect(detectLanguage(tempDir)).toBe("ts");
  });

  it("should still return 'js' even if framework config files are present (but no tsconfig)", () => {
    fs.writeFileSync(path.join(tempDir, "astro.config.mjs"), "export default {};");
    expect(detectLanguage(tempDir)).toBe("js");
  });

  it("should return 'ts' if both tsconfig.json and framework config exist", () => {
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "next.config.js"), "module.exports = {};");
    expect(detectLanguage(tempDir)).toBe("ts");
  });

  it("should return 'js' for an Angular JavaScript project even when tsconfig.json exists", () => {
    // Angular CLI always generates tsconfig.json even for pure JS projects.
    // The distinguishing signal is src/main.js exists but src/main.ts does not.
    fs.writeFileSync(path.join(tempDir, "angular.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
    fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "src", "main.js"), "");
    expect(detectLanguage(tempDir)).toBe("js");
  });

  it("should return 'ts' for an Angular TypeScript project when tsconfig.json and src/main.ts exist", () => {
    fs.writeFileSync(path.join(tempDir, "angular.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
    fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "src", "main.ts"), "");
    expect(detectLanguage(tempDir)).toBe("ts");
  });
});

