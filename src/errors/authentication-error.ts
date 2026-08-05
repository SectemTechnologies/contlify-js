import { ContlifyError } from "./contlify-error.js";
import { ErrorCode, type ErrorCodeValue } from "./error-codes.js";
import { HttpStatus, type HttpStatusCode } from "../utils/http-status.js";

export class AuthenticationError extends ContlifyError {
  constructor(
    message: string = "Authentication failed",
    code: ErrorCodeValue = ErrorCode.UNAUTHORIZED,
    statusCode: HttpStatusCode = HttpStatus.UNAUTHORIZED,
    details?: unknown
  ) {
    super(message, { code, statusCode, details });
  }
}
