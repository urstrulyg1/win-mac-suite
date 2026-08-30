/**
 * WinSuite v16 — Unified Error Code System
 *
 * Every API error response uses one of these stable codes.
 * The frontend interprets these codes for consistent UX.
 *
 * Structure:
 * {
 *   success: false,
 *   error: {
 *     code: 'PERMISSION_REQUIRED',
 *     message: 'Administrator privileges are required for this operation.',
 *     recoverable: false,
 *     remediation: 'Run the application as Administrator.'
 *   }
 * }
 */

export const ErrorCodes = {
  // Platform
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE',

  // Permissions
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  FULL_DISK_ACCESS_REQUIRED: 'FULL_DISK_ACCESS_REQUIRED',

  // Dependencies
  DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
  NETWORK_REQUIRED: 'NETWORK_REQUIRED',

  // Input
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Execution
  COMMAND_FAILED: 'COMMAND_FAILED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  COMMAND_CANCELLED: 'COMMAND_CANCELLED',

  // Verification
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',

  // Security
  SAFE_MODE_BLOCKED: 'SAFE_MODE_BLOCKED',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  INJECTION_DETECTED: 'INJECTION_DETECTED',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  BUSY: 'BUSY',
  CONFLICT: 'CONFLICT',

  // Internal
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Maps error codes to user-friendly messages.
 */
export const ErrorMessages: Record<string, string> = {
  UNSUPPORTED_PLATFORM: 'This feature is not supported on the current platform.',
  FEATURE_UNAVAILABLE: 'This information is currently unavailable.',
  PERMISSION_REQUIRED: 'Additional permissions are required for this operation.',
  ADMIN_REQUIRED: 'Administrator privileges are required for this operation.',
  FULL_DISK_ACCESS_REQUIRED: 'Full Disk Access permission is required (System Preferences → Security & Privacy).',
  DEPENDENCY_MISSING: 'A required tool or dependency is not installed.',
  NETWORK_REQUIRED: 'An internet connection is required for this operation.',
  INVALID_INPUT: 'The provided input is not valid.',
  VALIDATION_FAILED: 'Input validation failed.',
  COMMAND_FAILED: 'The system command failed.',
  COMMAND_TIMEOUT: 'The operation timed out.',
  COMMAND_CANCELLED: 'The operation was cancelled.',
  VERIFICATION_FAILED: 'The operation completed but the result could not be verified.',
  SAFE_MODE_BLOCKED: 'This operation is blocked because Safe Mode is active.',
  CONFIRMATION_REQUIRED: 'Explicit confirmation is required before proceeding.',
  INJECTION_DETECTED: 'Potentially dangerous input was detected and rejected.',
  NOT_FOUND: 'The requested resource was not found.',
  ROUTE_NOT_FOUND: 'The requested API endpoint does not exist.',
  BUSY: 'The system is busy. Please try again later.',
  CONFLICT: 'A conflicting operation is already in progress.',
  INTERNAL_ERROR: 'An internal error occurred.',
  DATABASE_ERROR: 'A database error occurred.',
};

/**
 * Creates a structured error response.
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  options?: { recoverable?: boolean; remediation?: string; details?: Record<string, unknown> }
) {
  return {
    success: false,
    error: {
      code,
      message: message || ErrorMessages[code] || 'An unknown error occurred.',
      recoverable: options?.recoverable ?? false,
      remediation: options?.remediation || null,
      details: options?.details || null,
    },
    timestamp: new Date().toISOString(),
  };
}
