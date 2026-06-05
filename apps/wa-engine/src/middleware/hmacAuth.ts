import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// HMAC signed requests for server-to-server auth
// Replaces the single static Bearer token with:
// - HMAC signature of the request body
// - Timestamp (prevents replay older than 5 minutes)
// - Nonce (prevents replay within the window)

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_TTL_MS = MAX_AGE_MS;
const NONCE_KEY_PREFIX = 'nonce:';

function signPayload(body: string, timestamp: string, nonce: string): string {
  return createHmac('sha256', config.INTERNAL_OTP_SECRET)
    .update(`${body}:${timestamp}:${nonce}`)
    .digest('hex');
}

export async function requireHmacAuth(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-kontroapi-signature'] as string | undefined;
  const timestamp = req.headers['x-kontroapi-timestamp'] as string | undefined;
  const nonce = req.headers['x-kontroapi-nonce'] as string | undefined;

  if (!signature || !timestamp || !nonce) {
    return res.status(401).json({
      success: false,
      message: 'Missing required headers: X-KontroAPI-Signature, X-KontroAPI-Timestamp, X-KontroAPI-Nonce',
    });
  }

  // Validate timestamp
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    return res.status(401).json({
      success: false,
      message: 'Request timestamp expired or too far in the future',
    });
  }

  // Check nonce hasn't been used (replay prevention)
  const nonceKey = `${NONCE_KEY_PREFIX}${nonce}`;
  const existing = await require('../lib/redis').redis.get(nonceKey);
  if (existing) {
    return res.status(401).json({
      success: false,
      message: 'Nonce already used — possible replay attack',
    });
  }

  // Store nonce
  await require('../lib/redis').redis.setex(nonceKey, Math.ceil(NONCE_TTL_MS / 1000), '1');

  // Verify signature
  const rawBody = JSON.stringify(req.body);
  const expected = signPayload(rawBody, timestamp, nonce);

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid signature',
    });
  }

  next();
}

/**
 * Generate HMAC auth headers for a request.
 * Call this from the dashboard side when making server-to-server calls.
 */
export function generateHmacHeaders(body: Record<string, unknown>, secret: string): {
  'X-KontroAPI-Signature': string;
  'X-KontroAPI-Timestamp': string;
  'X-KontroAPI-Nonce': string;
} {
  const timestamp = Date.now().toString();
  const nonce = require('crypto').randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret)
    .update(`${JSON.stringify(body)}:${timestamp}:${nonce}`)
    .digest('hex');

  return {
    'X-KontroAPI-Signature': signature,
    'X-KontroAPI-Timestamp': timestamp,
    'X-KontroAPI-Nonce': nonce,
  };
}
