#!/usr/bin/env node
/**
 * contlify CLI entry point
 *
 * Usage:
 *   npx contlify init       — Interactive project setup (generates contlify.config.ts + API gateway)
 *   npx contlify migrate    — Generate database migration SQL file or inspect schema
 *   npx contlify --version  — Print package version
 *   npx contlify --help     — Print help text
 */

import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { runInit } from "../src/cli/init-command.js";
import { runMigrate } from "../src/cli/migrate-command.js";

const COLORS = {
  bold: "\x1b[1m",
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function getVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.join(__dirname, "../../package.json"),
      path.join(__dirname, "../package.json"),
      path.join(__dirname, "package.json"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, "utf-8")) as { version?: string };
        if (pkg?.version) return pkg.version;
      }
    }
  } catch {}
  return "1.0.0";
}

function printHelp(): void {
  console.log(`
${COLORS.bold}  contlify CLI${COLORS.reset}

  ${COLORS.cyan}Usage:${COLORS.reset}
    npx contlify <command> [options]

  ${COLORS.cyan}Commands:${COLORS.reset}
    init         Interactive setup — generate contlify.config.ts and framework gateway
    migrate      Generate database migration SQL or view schema

  ${COLORS.cyan}Options:${COLORS.reset}
    --overwrite  Overwrite existing files during init
    --version    Print version number
    --help       Show this help message

  ${COLORS.dim}Examples:${COLORS.reset}
    ${COLORS.dim}npx contlify init${COLORS.reset}
    ${COLORS.dim}npx contlify init --overwrite${COLORS.reset}
    ${COLORS.dim}npx contlify migrate${COLORS.reset}
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const validFlags = new Set(["--overwrite", "--help", "-h", "--version", "-v"]);
  const unknownFlags = args.filter((a) => a.startsWith("-") && !validFlags.has(a));
  if (unknownFlags.length > 0) {
    console.error(`\n  ❌ Unknown option(s): ${unknownFlags.join(", ")}\n`);
    printHelp();
    process.exit(1);
  }

  const flags = {
    overwrite: args.includes("--overwrite"),
    help: args.includes("--help") || args.includes("-h"),
    version: args.includes("--version") || args.includes("-v"),
  };

  if (flags.version) {
    console.log(`contlify v${getVersion()}`);
    return;
  }

  const command = args.find((a) => !a.startsWith("-"));

  if (!command || flags.help) {
    printHelp();
    return;
  }

  const projectRoot = process.cwd();

  switch (command) {
    case "init":
      await runInit(projectRoot, { overwrite: flags.overwrite });
      break;

    case "migrate":
      await runMigrate(projectRoot);
      break;

    default:
      console.error(`\n  ❌ Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n  ❌ An unexpected error occurred:");
  console.error(" ", err instanceof Error ? err.message : err);
  process.exit(1);
});
