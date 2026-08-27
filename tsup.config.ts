import { defineConfig } from "tsup";

export default defineConfig([
  // Main library
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: false,
  },
  // CLI binary — CJS .js so npm 11 accepts the bin field (.mjs is stripped on publish)
  {
    entry: { contlify: "bin/contlify.ts" },
    format: ["cjs"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    minify: false,
    outDir: "dist/bin",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
