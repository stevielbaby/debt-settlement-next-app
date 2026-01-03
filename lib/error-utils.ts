/**
 * Extract a human-readable error message from various error formats
 * Handles both string errors and structured error objects
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    // Handle API error objects with message property
    if (error.message) {
      return error.message;
    }
  }

  return 'An unexpected error occurred';
}

