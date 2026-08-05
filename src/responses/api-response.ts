import { type ErrorCodeValue } from "../errors/error-codes.js";

/**
 * Metadata for pagination, timing, or execution details.
 */
export interface ResponseMeta {
  timestamp?: string;
  requestId?: string;
  version?: string;
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

/**
 * Standardized success payload contract.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Standardized error payload contract.
 */
export interface ApiErrorDetail {
  code: ErrorCodeValue | string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
  meta?: ResponseMeta;
}

/**
 * Discriminated union of standard Contlify API responses.
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
