/**
 * Retry helper for transient failures against external services (Notion,
 * Gmail/Google APIs, Anthropic/Groq). Retries with exponential backoff + jitter
 * only on errors that look transient (network errors, timeouts, 429s, 5xx).
 * Non-transient errors (4xx auth/validation failures) are rethrown immediately
 * so callers don't waste time retrying something that will never succeed.
 */

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Override the default "is this worth retrying" heuristic. */
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as Record<string, unknown>;
  const status = e.status ?? e.statusCode ?? (e.response as Record<string, unknown> | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
}

export function isTransientError(error: unknown): boolean {
  const status = getStatusCode(error);
  if (status !== undefined) {
    return status === 429 || status >= 500;
  }
  // Network-level failures (no HTTP status attached) are generally transient.
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return /timeout|network|fetch failed|ECONNRESET/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying on transient failures with exponential backoff + jitter.
 * Defaults: 3 attempts total, starting at 400ms, capped at 4s.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    shouldRetry = isTransientError,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }
      onRetry?.(error, attempt + 1);
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.25;
      await sleep(backoff + jitter);
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw lastError;
}

/**
 * Rejects with a timeout error if `promise` doesn't settle within `ms`.
 * Does not cancel the underlying operation (fetch/SDK calls aren't always
 * abortable), it just stops the caller from waiting forever.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms waiting for ${label}`));
    }, ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}
