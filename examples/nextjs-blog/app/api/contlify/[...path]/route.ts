import { createContlifyHandler } from "../../../../../src/index.js";
import { sampleAdapter } from "../../../../lib/contlify-adapter.js";

/**
 * Contlify receive API — Site URL + CONTLIFY_API_KEY must match Contlify Integrations.
 * Do NOT fall back to a demo key; a missing env var must fail verify clearly.
 */
const apiKey = process.env.CONTLIFY_API_KEY;
if (!apiKey) {
  console.warn(
    "[contlify] CONTLIFY_API_KEY is missing. Set it in .env.local to the same value as Contlify Integrations → API Key."
  );
}

const handler = createContlifyHandler({
  apiKey,
  adapter: sampleAdapter,
  apiPathPrefix: "/api/contlify",
  siteName: process.env.CONTLIFY_SITE_NAME ?? "Contlify Demo Blog",
  siteUrl: process.env.CONTLIFY_SITE_URL,
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
