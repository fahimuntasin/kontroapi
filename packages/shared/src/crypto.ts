import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================
// API KEY / PAT HASHING (SHA-256)
// Keys are hashed before storing — never stored in plain text
// ============================================================

export function generateApiKey(prefix: 'sk' | 'pat'): { raw: string; hash: string } {
  const raw = `${prefix}_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ============================================================
// AES-256-GCM FILE ENCRYPTION
// Format: [iv(12 bytes)][tag(16 bytes)][ciphertext]
// Used for: Baileys session creds.json + keys/*.json
// ============================================================

let _SESSION_KEY: Buffer | null = null;
function getSessionKey(): Buffer {
  if (!_SESSION_KEY) {
    const key = process.env.SESSION_ENCRYPTION_KEY;
    if (!key) throw new Error('SESSION_ENCRYPTION_KEY is not set');
    _SESSION_KEY = Buffer.from(key, 'hex');
    if (_SESSION_KEY.length !== 32) {
      throw new Error('SESSION_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
  }
  return _SESSION_KEY;
}

export function encryptFile(plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getSessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptFile(data: Buffer): Buffer {
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getSessionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ============================================================
// WEBHOOK SECRET ENCRYPTION (AES-256-GCM)
// Returns base64-encoded "iv:tag:ciphertext" string
// ============================================================

let _WEBHOOK_KEY: Buffer | null = null;
function getWebhookKey(): Buffer {
  if (!_WEBHOOK_KEY) {
    const key = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
    if (!key) throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY is not set');
    _WEBHOOK_KEY = Buffer.from(key, 'hex');
    if (_WEBHOOK_KEY.length !== 32) {
      throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
  }
  return _WEBHOOK_KEY;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getWebhookKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(encrypted: string): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(':');
  const iv = Buffer.from(ivB64!, 'base64');
  const tag = Buffer.from(tagB64!, 'base64');
  const ciphertext = Buffer.from(dataB64!, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', getWebhookKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();
}
