/**
 * Validation result interface.
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Payload validator contract interface.
 */
export interface ValidatorContract<TPayload = unknown> {
  validate(data: unknown): Promise<ValidationResult<TPayload>>;
}
