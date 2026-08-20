import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { createContlifyHandler } from "../../src/index.js";
import { createNodeMiddleware } from "../../src/node/index.js";

describe("createNodeMiddleware", () => {
  it("converts a Node HTTP request into Contlify GET /validate", async () => {
    const handler = createContlifyHandler({
      apiKey: "test-key",
      apiPathPrefix: "/api/contlify",
      adapter: {
        ping: async () => true,
        createPost: async () => ({ postId: "1", slug: "x", status: "published", action: "created" as const }),
      },
    });

    const middleware = createNodeMiddleware(handler);

    await new Promise<void>((resolve, reject) => {
      const server = createServer((req, res) => {
        middleware(req, res).catch(reject);
      });

      server.listen(0, () => {
        const { port } = server.address() as { port: number };
        fetch(`http://127.0.0.1:${port}/api/contlify/validate`, {
          headers: { "x-api-key": "test-key" },
        })
          .then(async (res) => {
            expect(res.status).toBe(200);
            const json = (await res.json()) as { data?: { valid?: boolean } };
            expect(json.data?.valid).toBe(true);
            server.close();
            resolve();
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
});
