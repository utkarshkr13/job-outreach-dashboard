import { describe, it, expect } from 'vitest';
import { getErrorMessage, toError } from './errors';

describe('getErrorMessage', () => {
  it('extracts the message from an Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns string errors as-is', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('stringifies plain objects thrown as errors', () => {
    expect(getErrorMessage({ code: 'FOO', detail: 'bar' })).toBe('{"code":"FOO","detail":"bar"}');
  });

  it('falls back to String() for values that cannot be JSON-stringified', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(getErrorMessage(circular)).toBe(String(circular));
  });

  it('handles null/undefined without throwing', () => {
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });
});

describe('toError', () => {
  it('passes an existing Error through unchanged', () => {
    const original = new Error('already an error');
    expect(toError(original)).toBe(original);
  });

  it('wraps a non-Error value in a new Error with a safe message', () => {
    const wrapped = toError('just a string');
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe('just a string');
  });
});
