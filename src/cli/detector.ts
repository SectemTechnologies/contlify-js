import * as fs from "node:fs";
import * as path from "node:path";
import type { ContlifyFramework } from "../templates/framework.js";

/**
 * Automatically inspects the project directory to detect which web framework is in use.
 * Checks configuration files, package.json dependencies, and directory structures.
 *
 * @param projectRoot Absolute path to the user's project root directory.
 * @returns Detected framework ("nextjs" | "astro" | "react-router-v4") or null if unrecognized.
 */
export function detectFramework(projectRoot: string): ContlifyFramework | null {
  // 1. Check for Astro configuration files
  const astroConfigFiles = [
    "astro.config.mjs",
    "astro.config.ts",
    "astro.config.js",
    "astro.config.cjs",
  ];
  for (const file of astroConfigFiles) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      return "astro";
    }
  }

  // 2. Check for Next.js configuration files
  const nextConfigFiles = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ];
  for (const file of nextConfigFiles) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      return "nextjs";
    }
  }

  // 3. Inspect package.json dependencies and devDependencies
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if ("astro" in allDeps) {
        return "astro";
      }
      if ("next" in allDeps) {
        return "nextjs";
      }
      if ("react-router" in allDeps || "react-router-dom" in allDeps) {
        return "react-router-v4";
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 4. Fallback: inspect directory structures
  if (
    fs.existsSync(path.join(projectRoot, "src", "app")) ||
    fs.existsSync(path.join(projectRoot, "app"))
  ) {
    // Check if app/ layout has Next.js conventions
    return "nextjs";
  }

  return null;
}
