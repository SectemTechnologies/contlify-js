import type { HttpMethod, HttpHeaders, QueryParameters } from "../types/http.js";

/**
 * Universal Request Context class normalizing Web standard Request, NextRequest, and NextApiRequest objects.
 */
export class RequestContext {
  public readonly method: HttpMethod;
  public readonly url: string;
  public readonly path: string;
  public readonly headers: HttpHeaders;
  public readonly query: QueryParameters;
  private readonly rawRequest: unknown;
  private parsedBody: unknown | null = null;
  private bodyParsed = false;

  constructor(options: {
    method: HttpMethod;
    url: string;
    path: string;
    headers: HttpHeaders;
    query: QueryParameters;
    rawRequest: unknown;
  }) {
    this.method = options.method;
    this.url = options.url;
    this.path = options.path;
    this.headers = options.headers;
    this.query = options.query;
    this.rawRequest = options.rawRequest;
  }

  /**
   * Factory method to create RequestContext from standard Web API Request or custom input.
   */
  public static async fromRequest(req: Request | unknown): Promise<RequestContext> {
    if (req instanceof Request) {
      const parsedUrl = new URL(req.url);
      const headers: HttpHeaders = {};
      req.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const query: QueryParameters = {};
      parsedUrl.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const ctx = new RequestContext({
        method: req.method.toUpperCase() as HttpMethod,
        url: req.url,
        path: parsedUrl.pathname,
        headers,
        query,
        rawRequest: req,
      });

      return ctx;
    }

    // Support Node.js / Express / NextApiRequest like objects
    const anyReq = req as Record<string, unknown>;
    const method = (typeof anyReq?.method === "string" ? anyReq.method : "GET").toUpperCase() as HttpMethod;
    const urlStr = typeof anyReq?.url === "string" ? anyReq.url : "/";
    const dummyBase = "http://localhost";
    const parsedUrl = new URL(urlStr, dummyBase);

    const headers: HttpHeaders = (anyReq?.headers as HttpHeaders) ?? {};
    const query: QueryParameters = {};
    parsedUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const ctx = new RequestContext({
      method,
      url: urlStr,
      path: parsedUrl.pathname,
      headers,
      query,
      rawRequest: req,
    });

    if ("body" in anyReq && anyReq.body !== undefined) {
      ctx.parsedBody = anyReq.body;
      ctx.bodyParsed = true;
    }

    return ctx;
  }

  /**
   * Lazy-parses and returns JSON body content.
   */
  public async json<T = unknown>(): Promise<T | null> {
    if (this.bodyParsed) {
      return this.parsedBody as T;
    }

    if (this.rawRequest instanceof Request) {
      try {
        this.parsedBody = await this.rawRequest.json();
      } catch {
        this.parsedBody = null;
      }
      this.bodyParsed = true;
      return this.parsedBody as T;
    }

    return null;
  }

  /**
   * Extracts specific header value.
   */
  public getHeader(name: string): string | undefined {
    const val = this.headers[name.toLowerCase()];
    if (Array.isArray(val)) {
      return val[0];
    }
    return val;
  }

  /**
   * Access to raw underlying request object.
   */
  public getRawRequest(): unknown {
    return this.rawRequest;
  }
}
