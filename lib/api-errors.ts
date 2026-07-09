/**
 * Shared, safe error-response helpers for API routes.
 *
 * Problem this fixes: every route previously did
 *   return NextResponse.json({ error: e.message }, { status: ... })
 * which sends the raw internal error message (Notion/Gmail/Firebase error
 * text, occasionally including internal detail) straight to the client.
 * Centralizing this means the client only ever sees a safe, generic message
 * while the full detail is still logged server-side via console.error at
 * the call site.
 *
 * `getAuthenticatedUser` (lib/auth-middleware.ts) wraps every failure it
 * throws as `Unauthorized: ...`, so checking for that prefix reliably
 * identifies an auth failure without needing custom error classes.
 */

export function isAuthError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return message.startsWith('Unauthorized');
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
const AUTH_MESSAGE = 'Unauthorized. Please sign in again.';

/**
 * Build a safe { error } body for NextResponse.json from a caught error.
 * Always logs the real error server-side; never forwards raw internals to the client.
 */
export function safeErrorBody(e: unknown, fallbackMessage: string = DEFAULT_MESSAGE) {
  return { error: isAuthError(e) ? AUTH_MESSAGE : fallbackMessage };
}

export function safeErrorStatus(e: unknown): 401 | 500 {
  return isAuthError(e) ? 401 : 500;
}
