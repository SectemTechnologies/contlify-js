import type { ContlifyMiddleware } from "./middleware.interface.js";
import type { RouteContext } from "../routing/route-context.js";
import type { RouteHandler } from "../routing/route.interface.js";

/**
 * Executes a middleware pipeline sequentially, wrapping the core route handler.
 */
export function composePipeline(middlewares: ContlifyMiddleware[], targetHandler: RouteHandler): RouteHandler {
  return async (ctx: RouteContext): Promise<Response> => {
    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) {
        throw new Error("next() called multiple times in middleware");
      }
      index = i;

      if (i === middlewares.length) {
        return await targetHandler(ctx);
      }

      const middleware = middlewares[i];
      if (!middleware) {
        return await targetHandler(ctx);
      }

      return await middleware(ctx, () => dispatch(i + 1));
    };

    return await dispatch(0);
  };
}
