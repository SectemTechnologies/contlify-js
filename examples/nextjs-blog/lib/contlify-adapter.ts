import { InMemoryContlifyAdapter } from "../../../examples/adapters/in-memory-adapter.js";

// Global singleton instance for local dev persistence across HMR reloads
const globalForAdapter = globalThis as unknown as {
  contlifyAdapter?: InMemoryContlifyAdapter;
};

export const sampleAdapter = globalForAdapter.contlifyAdapter ?? new InMemoryContlifyAdapter();

if (process.env.NODE_ENV !== "production") {
  globalForAdapter.contlifyAdapter = sampleAdapter;
}
