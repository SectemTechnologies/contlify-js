/**
 * Standard error codes returned by the Contlify system.
 */
export const ErrorCode = {
  // Authentication & Authorization Errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_API_KEY: "INVALID_API_KEY",

  // Request & Validation Errors
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Routing & Resource Errors
  NOT_FOUND: "NOT_FOUND",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",

  // Adapter & Database Errors
  ADAPTER_ERROR: "ADAPTER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  STORAGE_FAILURE: "STORAGE_FAILURE",

  // General & Server Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
