export class AppError extends Error {
  readonly code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "VALIDATION"
    | "CONFLICT"
    | "NOT_FOUND"
    | "RATE_LIMIT"

  constructor(
    message: string,
    code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "VALIDATION"
      | "CONFLICT"
      | "NOT_FOUND"
      | "RATE_LIMIT" = "VALIDATION"
  ) {
    super(message)
    this.name = "AppError"
    this.code = code
  }
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return error.message
  return fallback
}
