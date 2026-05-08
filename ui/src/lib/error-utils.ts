export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export function isAuthError(_error: unknown): boolean {
  return false;
}

export function isNetworkError(_error: unknown): boolean {
  return false;
}

export function isPlatformError(_error: unknown): boolean {
  return false;
}
