import { describe, it, expect } from 'vitest';
import { cleanSalary } from './format';

describe('cleanSalary', () => {
  it('strips a trailing LPA suffix', () => {
    expect(cleanSalary('16-24 LPA')).toBe('16-24');
    expect(cleanSalary('8-10 LPA')).toBe('8-10');
  });

  it('leaves non-LPA text untouched', () => {
    expect(cleanSalary('14+ (Cisco standard)')).toBe('14+ (Cisco standard)');
  });

  it('returns empty string for empty/undefined/null input', () => {
    expect(cleanSalary('')).toBe('');
    expect(cleanSalary(undefined)).toBe('');
    expect(cleanSalary(null)).toBe('');
  });

  it('strips stray standalone LPA tokens anywhere in the string', () => {
    expect(cleanSalary('LPA 20-25')).toBe('20-25');
  });
});
