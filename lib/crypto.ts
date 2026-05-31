import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Lazily-initialised key — computed on first encrypt/decrypt call, NOT at module load.
// This prevents Next.js from throwing during the build phase when collecting page data,
// since env vars may not be available at static analysis time.
let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;

  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. ' +
        'Set a 64-character hex string in your Vercel project environment variables.'
      );
    }
    // Dev-only fallback — intentionally all-zeros so it is obviously not secret.
    console.warn(
      '⚠️  ENCRYPTION_KEY is not set. Using a dev-only fallback key — never use this in production.'
    );
    _key = Buffer.alloc(32, 0);
    return _key;
  }

  const key = Buffer.from(envKey, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
      `Got ${key.length} bytes from a ${envKey.length}-character string.`
    );
  }
  _key = key;
  return _key;
}

/**
 * Encrypts a plaintext string → colon-separated hex (iv:ciphertext)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
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
    const key = getKey();
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    console.error('❌ Decryption failed — returning empty string to avoid leaking cipher text.', err.message);
    return '';
  }
}
