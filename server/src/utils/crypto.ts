import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  let keyHex = config.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    // Hash to ensure exactly 32 bytes
    return crypto.createHash('sha256').update(keyHex || 'pp-qa-default-secret-salt-key-32b').digest();
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Output format: iv:tag:ciphertext (hex encoded)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts ciphertext (iv:tag:ciphertext) using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format. Expected iv:tag:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks a sensitive key or secret (e.g. sk-...39aF or sec-...12b)
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.startsWith('MSAL_CACHE:')) {
    return 'Delegated User (MSAL)';
  }
  if (secret.length <= 8) return '****';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}...${suffix}`;
}

