/**
 * Minimal structured logger for API routes and server-side lib code.
 *
 * Why this exists: previously every route did ad-hoc `console.error(...)`
 * calls with inconsistent shapes, and some passed whole credential/user
 * objects straight into the log line. This wraps console.* with:
 *  - a consistent { level, msg, ...context, timestamp } JSON shape (easy to
 *    grep/parse in Vercel's log viewer or pipe to a future log sink), and
 *  - redaction of common secret-shaped keys so a stray `logger.error('failed',
 *    { creds })` doesn't leak API keys/tokens into logs.
 */

import { getErrorMessage } from './errors';

const SECRET_KEY_PATTERN = /(key|secret|token|password|refreshtoken|apikey|authorization)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

type Level = 'info' | 'warn' | 'error';

function log(level: Level, msg: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    msg,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
    timestamp: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, context?: Record<string, unknown>) => log('info', msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => log('warn', msg, context),
  /** Pass the caught error as `error` in context; message is extracted safely. */
  error: (msg: string, error?: unknown, context?: Record<string, unknown>) =>
    log('error', msg, { ...context, error: error !== undefined ? getErrorMessage(error) : undefined }),
};
