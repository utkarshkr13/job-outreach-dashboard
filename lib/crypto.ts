import crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits).
// We expect ENCRYPTION_KEY to be a 64-character hex string in production.
// Provide a secure default or warning fallback for local development.
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    // If not provided, fallback to a local development key
    console.warn('⚠️ ENCRYPTION_KEY is missing from environment. Using a local development fallback key.');
    return Buffer.from('8f2c349a1b02d8e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', 'hex');
  }
  try {
    const key = Buffer.from(envKey, 'hex');
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length} bytes (expected 32 bytes).`);
    }
    return key;
  } catch (error: any) {
    console.error('❌ Failed to parse ENCRYPTION_KEY as 32-byte hex. Falling back to local key.', error.message);
    return Buffer.from('8f2c349a1b02d8e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', 'hex');
  }
};

const KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a plaintext string to a colon-separated hex format (iv:ciphertext)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a colon-separated hex format (iv:ciphertext) back to plaintext
 */
export function decrypt(text: string): string {
  if (!text) return '';
  if (!text.includes(':')) {
    // Fallback if the field was saved as plain unencrypted text (e.g. legacy/local-dev fields)
    return text;
  }
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error('❌ Cryptography error: Decryption failed. Returning original cipher.', error.message);
    return text;
  }
}
