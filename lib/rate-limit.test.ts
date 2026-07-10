import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it('blocks requests once the limit is exceeded within the window', () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks separate buckets per key', () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    checkRateLimit(keyA, 1, 60_000);
    const blockedA = checkRateLimit(keyA, 1, 60_000);
    const allowedB = checkRateLimit(keyB, 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it('resets the count once the window has elapsed', () => {
    vi.useFakeTimers();
    const key = `window-${Math.random()}`;
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
  });
});
