import {
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ResponseMeta,
} from "./api-response.js";
import { type ErrorCodeValue, ErrorCode } from "../errors/error-codes.js";
import { ContlifyError } from "../errors/contlify-error.js";
import { HttpStatus, type HttpStatusCode } from "../utils/http-status.js";

/**
 * Utility class for constructing standardized API responses and Web API Response objects.
 */
export class ResponseBuilder {
  /**
   * Constructs a success payload object.
   */
  public static success<T>(data: T, meta?: ResponseMeta): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Constructs an error payload object.
   */
  public static error(
    message: string,
    code: ErrorCodeValue | string = ErrorCode.INTERNAL_ERROR,
    details?: unknown,
    meta?: ResponseMeta
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Wraps a payload into a Web Standard Response object with JSON headers.
   */
  public static toJsonResponse<T = unknown>(
    body: T,
    statusCode: HttpStatusCode = HttpStatus.OK,
    headers: Record<string, string> = {}
  ): Response {
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  }

  /**
   * Converts a ContlifyError or unknown error directly into a standard Web API JSON Response.
   * Security (H-4 / CWE-209): Prevents internal database driver / SQL error leakage in API responses.
   */
  public static fromError(error: unknown, headers: Record<string, string> = {}): Response {
    if (error instanceof ContlifyError) {
      const isInternalError = error.statusCode >= 500;
      const clientMessage = isInternalError
        ? "A database or internal adapter error occurred while processing the request."
        : error.message;

      const payload = this.error(clientMessage, error.code, isInternalError ? undefined : error.details);
      return this.toJsonResponse(payload, error.statusCode, headers);
    }

    const payload = this.error("An unexpected internal error occurred", ErrorCode.INTERNAL_ERROR);
    return this.toJsonResponse(payload, HttpStatus.INTERNAL_SERVER_ERROR, headers);
  }
}

