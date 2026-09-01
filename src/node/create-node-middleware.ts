/**
 * Node.js / Express adapter for createContlifyHandler.
 * React Router v4 has no server routes, so Contlify is mounted on Express instead.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ContlifyHandler } from "../core/handler.js";

/**
 * Incoming Node request (http.IncomingMessage plus common Express fields).
 */
export type NodeLikeRequest = IncomingMessage & {
  originalUrl?: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
  body?: unknown;
};

/**
 * Express / Connect / Node http middleware signature.
 */
export type NodeMiddleware = (req: NodeLikeRequest, res: ServerResponse) => Promise<void>;

/**
 * Reads the raw request stream when Express has not already parsed the body.
 */
function readIncomingBody(req: IncomingMessage): Promise<Buffer> {
  if (req.readableEnded || req.destroyed) {
    return Promise.resolve(Buffer.alloc(0));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Converts a Node / Express request into a Web API Request that Contlify can dispatch.
 */
export async function nodeRequestToWebRequest(req: NodeLikeRequest): Promise<Request> {
  const host = req.get?.("host") ?? req.headers.host ?? "localhost";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const proto = req.protocol ?? protoHeader ?? "http";
  const pathAndQuery = req.originalUrl ?? req.url ?? "/";
  const url = `${proto}://${host}${pathAndQuery}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  const method = (req.method ?? "GET").toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    if (req.body !== undefined && req.body !== null) {
      // Express json()/urlencoded already parsed the body
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    } else {
      const raw = await readIncomingBody(req);
      init.body = new Uint8Array(raw);
    }
    // Undici requires duplex when a Request is created with a body from Node
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }

  return new Request(url, init);
}

/**
 * Writes a Web API Response onto a Node ServerResponse.
 */
export async function writeWebResponseToNode(webResponse: Response, res: ServerResponse): Promise<void> {
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await webResponse.arrayBuffer());
  res.end(buffer);
}

/**
 * Wraps createContlifyHandler so it can be used as Express middleware:
 * `app.all("/api/contlify/*", createNodeMiddleware(handler))`
 */
export function createNodeMiddleware(handler: ContlifyHandler): NodeMiddleware {
  return async function contlifyNodeMiddleware(req: NodeLikeRequest, res: ServerResponse): Promise<void> {
    const webRequest = await nodeRequestToWebRequest(req);
    const webResponse = await handler(webRequest);
    await writeWebResponseToNode(webResponse, res);
  };
}
