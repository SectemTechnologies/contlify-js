import * as fs from "node:fs";
import * as path from "node:path";
import { getScaffoldManifest, type ScaffoldFileEntry } from "../templates/index.js";

/**
 * Result of scaffolding a single file.
 */
export interface ScaffoldFileResult {
  relativePath: string;
  description: string;
  status: "created" | "skipped" | "error";
  message?: string;
}

/**
 * Options for the scaffold operation.
 */
export interface ScaffoldOptions {
  /** Absolute path to the user's project root directory. */
  projectRoot: string;
  /** If true, overwrite existing files. Default: false. */
  overwrite?: boolean;
  /** If provided, only scaffold files whose relativePath matches one of these entries. */
  only?: string[];
}

/**
 * Scaffolds contlify template files into the user's project directory.
 *
 * Creates directories as needed. Skips existing files unless `overwrite` is true.
 * Returns a report of each file's status.
 *
 * @param options Scaffold configuration.
 * @returns Array of results indicating what was created, skipped, or errored.
 */
export function scaffoldProject(options: ScaffoldOptions): ScaffoldFileResult[] {
  const { projectRoot, overwrite = false, only } = options;
  const manifest = getScaffoldManifest();

  const filesToScaffold: ScaffoldFileEntry[] = only
    ? manifest.filter((entry) => only.includes(entry.relativePath))
    : manifest;

  const results: ScaffoldFileResult[] = [];

  for (const entry of filesToScaffold) {
    const absolutePath = path.join(projectRoot, entry.relativePath);
    const dir = path.dirname(absolutePath);

    try {
      // Check if file already exists
      if (fs.existsSync(absolutePath) && !overwrite) {
        results.push({
          relativePath: entry.relativePath,
          description: entry.description,
          status: "skipped",
          message: "File already exists (use --overwrite to replace)",
        });
        continue;
      }

      // Create directories if they don't exist
      fs.mkdirSync(dir, { recursive: true });

      // Write the template content
      const content = entry.getContent();
      fs.writeFileSync(absolutePath, content, "utf-8");

      results.push({
        relativePath: entry.relativePath,
        description: entry.description,
        status: "created",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      results.push({
        relativePath: entry.relativePath,
        description: entry.description,
        status: "error",
        message: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Returns a human-readable summary string from scaffold results.
 */
export function formatScaffoldResults(results: ScaffoldFileResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    switch (result.status) {
      case "created":
        lines.push(`  ✅ Created ${result.relativePath}`);
        break;
      case "skipped":
        lines.push(`  ⏭️  Skipped ${result.relativePath} (already exists)`);
        break;
      case "error":
        lines.push(`  ❌ Error   ${result.relativePath}: ${result.message}`);
        break;
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  lines.push("");
  lines.push(`  ${created} created, ${skipped} skipped, ${errors} errors`);

  return lines.join("\n");
}
