import { ContlifyError } from "./contlify-error.js";
import { ErrorCode } from "./error-codes.js";
import { HttpStatus } from "../utils/http-status.js";

export class NotFoundError extends ContlifyError {
  constructor(message: string = "Resource not found", details?: unknown) {
    super(message, {
      code: ErrorCode.NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
      details,
    });
  }
}
