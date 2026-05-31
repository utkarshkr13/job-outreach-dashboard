import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    // In local development, use a stable dev-only fallback so the app still works.
    // In production this must never happen — throw immediately.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. ' +
        'Set a 64-character hex string in your Vercel project environment variables.'
      );
    }
    console.warn(
      '⚠️  ENCRYPTION_KEY is not set. Using a local-development-only fallback key. ' +
      'This key is NOT secret — never rely on it in production.'
    );
    // Dev-only fallback — intentionally obvious, never ships to prod due to the throw above
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
  }

  const key = Buffer.from(envKey, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
      `Got ${key.length} bytes from a ${envKey.length}-character string.`
    );
  }
  return key;
};

const KEY = getEncryptionKey();

/**
 * Encrypts a plaintext string → colon-separated hex (iv:ciphertext)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a colon-separated hex string (iv:ciphertext) → plaintext.
 * Falls through to returning the raw value if it doesn't look encrypted
 * (handles legacy plain-text fields written before encryption was added).
 */
export function decrypt(text: string): string {
  if (!text) return '';
  if (!text.includes(':')) {
    // Legacy: field stored as plain text before encryption was introduced
    return text;
  }
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    console.error('❌ Decryption failed — returning empty string to avoid leaking cipher text.', err.message);
    return '';
  }
}
