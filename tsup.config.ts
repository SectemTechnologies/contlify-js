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
  // CLI binary
  {
    entry: { contlify: "bin/contlify.ts" },
    format: ["esm"],
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
