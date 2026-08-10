/**
 * Template for the API route handler: app/api/contlify/[...path]/route.ts
 * Generated into the user's Next.js project during `contlify init`.
 */
export function getApiRouteTemplate(): string {
  return `import { createContlifyHandler } from "contlify";
import { contlifyAdapter } from "@/lib/contlify/adapter";

const handler = createContlifyHandler({
  apiKey: process.env.CONTLIFY_API_KEY,
  adapter: contlifyAdapter,
  apiPathPrefix: "/api/contlify",
  getPostUrl: (post) => \`/blog/\${post.slug}\`,
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
`;
}
