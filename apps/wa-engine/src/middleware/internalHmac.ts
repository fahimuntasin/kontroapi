import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

// Lightweight HMAC auth for dashboard → WA Engine internal calls
// Simpler than requireHmacAuth — no nonce tracking, just signature + timestamp
export async function requireInternalHmac(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-signature'] as string | undefined;
  const timestamp = req.headers['x-timestamp'] as string | undefined;
  const bearer = req.headers['authorization']?.replace('Bearer ', '').trim();
  const secret = process.env.INTERNAL_OTP_SECRET;
  const altSecret = process.env.WA_ENGINE_INTERNAL_SECRET;

  // Allow fallback via internal secret Bearer token (dashboard proxy)
  if (bearer && (bearer === secret || bearer === altSecret)) {
    return next();
  }

  const hmacSecret = secret || altSecret;
  if (!signature || !timestamp || !hmacSecret) {
    return res.status(401).json({ success: false, message: 'Missing auth headers' });
  }

  // Validate timestamp (within 5 minutes)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return res.status(401).json({ success: false, message: 'Invalid timestamp' });
  }

  // The session ID and action come from the URL path
  const sessionId = req.params.id ?? '';
  const action = req.path.split('/').pop() ?? '';

  const expected = createHmac('sha256', hmacSecret)
    .update(`${sessionId}:${action}:${timestamp}`)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  next();
}
