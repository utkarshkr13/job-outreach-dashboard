import { describe, it, expect, vi } from 'vitest';
import { withRetry, withTimeout, isTransientError } from './retry';

describe('isTransientError', () => {
  it('treats 429 and 5xx status codes as transient', () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
  });

  it('treats 4xx (other than 429) as non-transient', () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 401 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
  });

  it('treats common network error codes as transient', () => {
    expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('treats timeout-ish messages as transient', () => {
    expect(isTransientError(new Error('Timed out after 5000ms'))).toBe(true);
  });

  it('treats a generic validation error as non-transient', () => {
    expect(isTransientError(new Error('Missing company or role'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401 });
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toEqual({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 500 });
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1, maxDelayMs: 2 })).rejects.toEqual({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('withTimeout', () => {
  it('resolves normally when the promise settles in time', async () => {
    const result = await withTimeout(Promise.resolve('fast'), 100, 'test op');
    expect(result).toBe('fast');
  });

  it('rejects with a timeout error when the promise takes too long', async () => {
    const slow = new Promise(resolve => setTimeout(() => resolve('slow'), 50));
    await expect(withTimeout(slow, 5, 'test op')).rejects.toThrow(/Timed out after 5ms waiting for test op/);
  });
});
