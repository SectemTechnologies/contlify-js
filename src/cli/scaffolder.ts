import * as fs from "node:fs";
import * as path from "node:path";
import { getV2ScaffoldManifest, type ScaffoldFileEntry, type V2ScaffoldOptions, type SupabaseConnectionMode } from "../templates/index.js";
import type { ContlifyFramework } from "../templates/framework.js";
import type { SupportedDatabaseType } from "../migrations/index.js";
import type { PostgresDeployment } from "../templates/index.js";

export interface ScaffoldFileResult {
  relativePath: string;
  description: string;
  status: "created" | "skipped" | "error";
  message?: string;
}

export interface ScaffoldV2Options {
  projectRoot: string;
  overwrite?: boolean;
  framework: ContlifyFramework;
  dbType: SupportedDatabaseType;
  migrationMode?: V2ScaffoldOptions["migrationMode"];
  postgresDeployment?: PostgresDeployment;
  supabaseMode?: SupabaseConnectionMode;
}

export type ScaffoldOptions = ScaffoldV2Options;

export function detectBaseDir(projectRoot: string): string {
  const hasSrcApp = fs.existsSync(path.join(projectRoot, "src", "app"));
  const hasSrcDir = fs.existsSync(path.join(projectRoot, "src"));
  return hasSrcApp || hasSrcDir ? "src" : "";
}

function resolveTargetPath(framework: ContlifyFramework, projectRoot: string, relativePath: string): string {
  if (framework !== "nextjs" || relativePath === "contlify.config.ts") {
    return relativePath;
  }
  const baseDir = detectBaseDir(projectRoot);
  return baseDir ? `${baseDir}/${relativePath}` : relativePath;
}

function writeEntries(
  entries: ScaffoldFileEntry[],
  projectRoot: string,
  framework: ContlifyFramework,
  overwrite: boolean
): ScaffoldFileResult[] {
  const results: ScaffoldFileResult[] = [];

  for (const entry of entries) {
    const targetRelativePath = resolveTargetPath(framework, projectRoot, entry.relativePath);
    const absolutePath = path.join(projectRoot, targetRelativePath);
    const dir = path.dirname(absolutePath);

    try {
      if (fs.existsSync(absolutePath) && !overwrite) {
        results.push({
          relativePath: targetRelativePath,
          description: entry.description,
          status: "skipped",
          message: "File already exists (use --overwrite to replace)",
        });
        continue;
      }

      fs.mkdirSync(dir, { recursive: true });
      const content = entry.getContent();
      fs.writeFileSync(absolutePath, content, "utf-8");

      results.push({
        relativePath: targetRelativePath,
        description: entry.description,
        status: "created",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      results.push({
        relativePath: targetRelativePath,
        description: entry.description,
        status: "error",
        message: errorMessage,
      });
    }
  }

  return results;
}

export function scaffoldProjectV2(options: ScaffoldV2Options): ScaffoldFileResult[] {
  const { projectRoot, overwrite = false, framework, dbType, migrationMode, postgresDeployment, supabaseMode } = options;
  const manifest = getV2ScaffoldManifest(framework, { dbType, migrationMode, postgresDeployment, supabaseMode });
  return writeEntries(manifest, projectRoot, framework, overwrite);
}

export const scaffoldProject = scaffoldProjectV2;

export function formatScaffoldResults(results: ScaffoldFileResult[]): string {
  const lines: string[] = [];
  for (const result of results) {
    switch (result.status) {
      case "created": lines.push(`  ✅ Created ${result.relativePath}`); break;
      case "skipped": lines.push(`  ⏭️  Skipped ${result.relativePath} (already exists)`); break;
      case "error": lines.push(`  ❌ Error   ${result.relativePath}: ${result.message}`); break;
    }
  }
  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  lines.push(`\n  ${created} created, ${skipped} skipped, ${errors} errors`);
  return lines.join("\n");
}
