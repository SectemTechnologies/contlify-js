import * as fs from "node:fs";
import * as path from "node:path";
import type { ContlifyFramework } from "../templates/framework.js";

/**
 * Automatically inspects the project directory to detect which web framework is in use.
 * Checks configuration files, package.json dependencies, and directory structures.
 *
 * @param projectRoot Absolute path to the user's project root directory.
 * @returns Detected framework ("nextjs" | "astro" | "react-router") or null if unrecognized.
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

  // 2. Check for React Router v7 configuration files
  const reactRouterConfigFiles = [
    "react-router.config.ts",
    "react-router.config.js",
    "react-router.config.mjs",
  ];
  for (const file of reactRouterConfigFiles) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      return "react-router";
    }
  }

  // 3. Check for Next.js configuration files
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

  // 4. Inspect package.json dependencies and devDependencies
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
      if ("@react-router/dev" in allDeps || "@react-router/node" in allDeps || "@react-router/serve" in allDeps) {
        return "react-router";
      }
      if ("next" in allDeps) {
        return "nextjs";
      }
      if ("react-router" in allDeps || "react-router-dom" in allDeps) {
        return "react-router";
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 5. Fallback: inspect directory structures
  if (
    fs.existsSync(path.join(projectRoot, "src", "app")) ||
    fs.existsSync(path.join(projectRoot, "app"))
  ) {
    return "nextjs";
  }

  return null;
}
