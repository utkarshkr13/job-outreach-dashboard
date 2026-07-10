import { describe, it, expect, beforeAll } from 'vitest';

// ENCRYPTION_KEY must be set before the module is imported, since the key is
// cached on first use (lib/crypto.ts computes it lazily).
beforeAll(() => {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
});

describe('encrypt/decrypt', () => {
  it('round-trips a plaintext string', async () => {
    const { encrypt, decrypt } = await import('./crypto');
    const original = 'super-secret-notion-api-key';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':'); // iv:ciphertext format
    expect(decrypt(encrypted)).toBe(original);
  });

  it('returns empty string for empty input on both encrypt and decrypt', async () => {
    const { encrypt, decrypt } = await import('./crypto');
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('treats legacy plain-text values (no colon) as already-decrypted', async () => {
    const { decrypt } = await import('./crypto');
    expect(decrypt('legacy-plaintext-value')).toBe('legacy-plaintext-value');
  });

  it('returns empty string instead of throwing on corrupt ciphertext', async () => {
    const { decrypt } = await import('./crypto');
    expect(decrypt('not-a-real-iv:not-real-ciphertext')).toBe('');
  });

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const { encrypt } = await import('./crypto');
    const a = encrypt('same-input');
    const b = encrypt('same-input');
    expect(a).not.toBe(b);
  });
});
