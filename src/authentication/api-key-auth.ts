import type { RequestContext } from "../core/request-context.js";
import type { AuthStrategyContract, AuthResult } from "./auth.interface.js";

/**
 * Standard API Key authentication strategy implementation for Contlify.
 * Compares incoming headers (X-Truecmo-Key, X-Api-Key, Authorization) against configured API key.
 */
export class ApiKeyAuthStrategy implements AuthStrategyContract {
  /**
   * Authenticates an incoming request against expected API key.
   */
  public async authenticate(requestContext: RequestContext, expectedApiKey: string): Promise<AuthResult> {
    const keyToMatch = expectedApiKey.trim();

    if (!keyToMatch) {
      return {
        authenticated: false,
        reason: "API key is not configured on server",
      };
    }

    // 1. Primary header: X-Truecmo-Key
    const truecmoKey = requestContext.getHeader("x-truecmo-key");
    if (truecmoKey && truecmoKey.trim() === keyToMatch) {
      return { authenticated: true, publisherId: "truecmo" };
    }

    // 2. Fallback header: x-api-key
    const apiKeyHeader = requestContext.getHeader("x-api-key");
    if (apiKeyHeader && apiKeyHeader.trim() === keyToMatch) {
      return { authenticated: true, publisherId: "api-key" };
    }

    // 3. Fallback header: Authorization: Bearer <key>
    const authHeader = requestContext.getHeader("authorization");
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1]?.trim() === keyToMatch) {
        return { authenticated: true, publisherId: "bearer" };
      }
    }

    const hasAnyHeader = Boolean(truecmoKey || apiKeyHeader || authHeader);

    return {
      authenticated: false,
      reason: hasAnyHeader ? "Invalid API key provided" : "Missing API key in request headers (X-Truecmo-Key required)",
    };
  }
}
