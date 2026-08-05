import type { RequestContext } from "../core/request-context.js";

/**
 * Authentication result summary.
 */
export interface AuthResult {
  authenticated: boolean;
  publisherId?: string;
  reason?: string;
}

/**
 * Authentication strategy contract for verifying incoming API requests.
 */
export interface AuthStrategyContract {
  authenticate(requestContext: RequestContext, expectedApiKey: string): Promise<AuthResult>;
}
