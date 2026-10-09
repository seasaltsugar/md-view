/**
 * User-facing errors. Messages say what happened and what to do next.
 * Stack traces and internal details are never shown to people.
 */
export type ErrorCode =
  | 'unsupported-type'
  | 'unreadable'
  | 'empty'
  | 'too-large'
  | 'binary'
  | 'render-failed'
  | 'clipboard'
  | 'print';

export class AppError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

const GENERIC = 'Something went wrong. Your file was not changed. Try opening it again.';

/** Turns anything thrown into a message that is safe and helpful to show. */
export function toUserMessage(error: unknown): string {
  return error instanceof AppError ? error.message : GENERIC;
}
