import { ContlifyError } from "./contlify-error.js";
import { ErrorCode } from "./error-codes.js";
import { HttpStatus } from "../utils/http-status.js";

export class ValidationError extends ContlifyError {
  constructor(message: string = "Validation failed", details?: unknown) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: HttpStatus.BAD_REQUEST,
      details,
    });
  }
}
