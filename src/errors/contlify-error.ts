import { ErrorCode, type ErrorCodeValue } from "./error-codes.js";
import { HttpStatus, type HttpStatusCode } from "../utils/http-status.js";

export interface ContlifyErrorOptions {
  code?: ErrorCodeValue;
  statusCode?: HttpStatusCode;
  details?: unknown;
  cause?: Error;
}

/**
 * Base abstract error class for all Contlify errors.
 */
export class ContlifyError extends Error {
  public readonly code: ErrorCodeValue;
  public readonly statusCode: HttpStatusCode;
  public readonly details?: unknown;

  constructor(message: string, options: ContlifyErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code ?? ErrorCode.INTERNAL_ERROR;
    this.statusCode = options.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    this.details = options.details;

    // Restore prototype chain for built-in Error subclassing
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
