import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "frameworks/next/index": "src/frameworks/next/index.ts",
    "bin/contlify": "bin/contlify.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    entry: {
      index: "src/index.ts",
      "frameworks/next/index": "src/frameworks/next/index.ts",
    },
  },
  external: [
    "mongodb",
    "@supabase/supabase-js",
    "pg",
    "@neondatabase/serverless",
    "@opennextjs/cloudflare",
  ],
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: false,
  banner: ({ entry }) => {
    if (entry && (entry.includes("contlify") || entry.includes("bin"))) {
      return { js: "#!/usr/bin/env node" };
    }
    return {};
  },
});
