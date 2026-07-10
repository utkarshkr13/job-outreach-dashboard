/**
 * Minimal in-memory rate limiter for API routes.
 *
 * Scope/limitation (intentional, documented rather than silently assumed):
 * this is per-instance, in-memory state — it resets on cold start and is
 * NOT shared across serverless function instances. That's a real limitation
 * on Vercel, but it's a meaningful improvement over "no rate limiting at
 * all" for the common case of a single warm instance handling bursts of
 * requests (e.g. a user double-clicking "Send All" or a retry storm), and it
 * requires zero new infra/secrets. A durable, cross-instance limiter would
 * need Redis/Vercel KV, which is out of scope without the user provisioning
 * that account/service.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this doesn't grow unbounded on a
// long-lived instance.
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key Identifies the caller + route, e.g. `${userId}:send-bulk`.
 * @param limit Max requests allowed per window.
 * @param windowMs Window size in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
    if (buckets.size > MAX_BUCKETS) {
      // Cheap eviction: drop the oldest entry. Good enough for a
      // best-effort, single-instance limiter.
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  const retryAfterMs = allowed ? 0 : windowMs - (now - bucket.windowStart);

  return { allowed, remaining: Math.max(0, limit - bucket.count), retryAfterMs };
}
