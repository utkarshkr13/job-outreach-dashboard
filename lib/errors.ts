/**
 * Small helpers for working with `unknown` catch-clause errors (the default
 * type since TypeScript's `useUnknownInCatchVariables`). Centralizes the
 * "safely get a string message out of whatever got thrown" logic instead of
 * repeating `e instanceof Error ? e.message : String(e)` or unsafe `e.message`
 * (which breaks when something throws a non-Error) across every route.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(getErrorMessage(error));
}
