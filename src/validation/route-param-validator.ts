import type { ValidationResult } from "./validator.interface.js";

/**
 * Route parameter validator for checking dynamic path arguments (e.g. :id or :slug).
 */
export class RouteParamValidator {
  /**
   * Validates required route string parameter.
   */
  public static validateParam(
    params: Record<string, string>,
    paramName: string
  ): ValidationResult<string> {
    const value = params[paramName];

    if (!value || typeof value !== "string" || value.trim() === "") {
      return {
        success: false,
        errors: [
          {
            field: paramName,
            message: `Route parameter '${paramName}' is required and cannot be empty`,
          },
        ],
      };
    }

    return {
      success: true,
      data: value.trim(),
    };
  }
}
