import { ContlifyError } from "./contlify-error.js";
import { ErrorCode } from "./error-codes.js";
import { HttpStatus } from "../utils/http-status.js";

export class AdapterError extends ContlifyError {
  constructor(message: string = "Adapter operation failed", details?: unknown, cause?: Error) {
    super(message, {
      code: ErrorCode.ADAPTER_ERROR,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details,
      cause,
    });
  }
}
