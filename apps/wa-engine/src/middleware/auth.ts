import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { hashApiKey } from '@kontroapi/shared';
import { createHmac, timingSafeEqual } from 'crypto';
import type { AuthenticatedRequest } from '../types';

// Lightweight HMAC verification for dashboard internal calls
function verifyInternalHmac(req: Request): boolean {
  const signature = req.headers['x-signature'] as string | undefined;
  const timestamp = req.headers['x-timestamp'] as string | undefined;
  const bearer = req.headers['authorization']?.replace('Bearer ', '').trim();
  const secret = process.env.INTERNAL_OTP_SECRET;
  const altSecret = process.env.WA_ENGINE_INTERNAL_SECRET;

  // Allow fallback via internal secret Bearer token (dashboard proxy)
  // Check BOTH env vars since dashboard might send either one
  if (bearer && (bearer === secret || bearer === altSecret)) {
    return true;
  }

  const hmacSecret = secret || altSecret;
  if (!signature || !timestamp || !hmacSecret) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

  const sessionId = req.params.id ?? '';
  const action = req.path.split('/').pop() ?? '';

  const expected = createHmac('sha256', hmacSecret)
    .update(`${sessionId}:${action}:${timestamp}`)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers['authorization']?.replace('Bearer ', '').trim();
  const pat = req.headers['x-api-key'] as string | undefined;

  // Check for internal HMAC auth (dashboard → WA Engine)
  if (req.headers['x-signature'] && req.headers['x-timestamp']) {
    if (verifyInternalHmac(req)) {
      // Load session + profile for downstream route handlers
      const sessionId = (req as AuthenticatedRequest).params?.id;
      if (sessionId) {
        const { data } = await supabase
          .from('whatsapp_sessions')
          .select('*, profiles!inner(id, plan, session_limit, billing_status, phone_verified)')
          .eq('id', sessionId)
          .single();
        if (data) {
          const authReq = req as AuthenticatedRequest;
          authReq.session = data as any;
          authReq.profile = data.profiles as any;
        }
      }
      const authReq = req as AuthenticatedRequest;
      authReq.auth_type = 'internal_hmac';
      return next();
    }
    return res.status(401).json({ success: false, message: 'Invalid HMAC signature' });
  }

  if (!bearer && !pat) {
    return res.status(401).json({ success: false, message: 'API key is required' });
  }

  if (bearer) {
    // Hash the incoming key before comparing — DB stores SHA-256 hashes
    const hash = hashApiKey(bearer);
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*, profiles!inner(id, plan, session_limit, billing_status, phone_verified)')
      .eq('api_key', hash)
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    const authReq = req as AuthenticatedRequest;
    authReq.session = data as any;
    authReq.profile = data.profiles as any;
    authReq.auth_type = 'session_key';
    return next();
  }

  if (pat) {
    // Hash the PAT before comparing
    const patHash = hashApiKey(pat);
    const { data: token, error: tokenError } = await supabase
      .from('personal_tokens')
      .select('*, profiles!inner(id, plan, session_limit, billing_status)')
      .eq('token', patHash)
      .single();

    if (tokenError || !token) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    const typedToken = token as any;
    if (typedToken.expires_at && new Date(typedToken.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }

    void supabase
      .from('personal_tokens')
      .update({ last_used: new Date().toISOString() })
      .eq('id', typedToken.id);

    const authReq = req as AuthenticatedRequest;
    authReq.profile = typedToken.profiles as any;
    authReq.auth_type = 'pat';
    return next();
  }

  return res.status(401).json({ success: false, message: 'Invalid authentication' });
}

export function requirePAT(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  if (authReq.auth_type !== 'pat') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint requires a Personal Access Token (X-Api-Key header)',
    });
  }
  next();
}

export function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization']?.replace('Bearer ', '');
  if (auth !== process.env.INTERNAL_OTP_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}
