import type { ContlifyMiddleware } from "./middleware.interface.js";
import { ApiKeyAuthStrategy } from "../authentication/api-key-auth.js";
import { ResponseBuilder } from "../responses/response-builder.js";
import { HttpStatus } from "../utils/http-status.js";
import { ErrorCode } from "../errors/error-codes.js";

const authStrategy = new ApiKeyAuthStrategy();

/**
 * Creates authentication middleware enforcing API key verification.
 */
export function createAuthMiddleware(): ContlifyMiddleware {
  return async (ctx, next) => {
    const authResult = await authStrategy.authenticate(ctx.request, ctx.config.apiKey);

    if (!authResult.authenticated) {
      ctx.config.logger.warn(`Authentication failed for request ${ctx.request.method} ${ctx.request.path}: ${authResult.reason}`);
      return ResponseBuilder.toJsonResponse(
        ResponseBuilder.error(authResult.reason ?? "Unauthorized", ErrorCode.UNAUTHORIZED),
        HttpStatus.UNAUTHORIZED
      );
    }

    return await next();
  };
}
