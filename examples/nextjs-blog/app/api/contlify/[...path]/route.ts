import { createContlifyHandler } from "../../../../../src/index.js";
import { sampleAdapter } from "../../../../lib/contlify-adapter.js";

// Initialize Contlify publishing API handler
const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY ?? "demo-secret-key",
  adapter: sampleAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => `/blog/${post.slug}`,
});

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
