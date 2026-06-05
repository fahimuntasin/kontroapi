import type { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import type { AuthenticatedRequest } from '../types';

const PLAN_RPM: Record<string, number> = {
  trial: 1,
  basic: 256,
  pro: 256,
  plus: 256,
  business: 256,
};

const ENDPOINT_LIMITS: Record<string, { rpm: number; daily: number }> = {
  '/groups/:jid/participants': { rpm: 10, daily: 500 },
  '/contacts/:phone/picture': { rpm: 60, daily: 1000 },
  '/on-whatsapp/:phone': { rpm: 60, daily: 1000 },
};

// Track IPs that exceed burst threshold
const BURST_THRESHOLD = 50; // requests in 10 seconds

async function incrementCounter(key: string, ttl: number): Promise<number> {
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, ttl);
  const result = await pipeline.exec();
  return (result?.[0]?.[1] as number) ?? 0;
}

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const profile = authReq.profile;

  // Skip rate limiting for internal HMAC calls (dashboard → WA Engine)
  if (authReq.auth_type === 'internal_hmac') return next();

  const now = Date.now();
  const minuteWindow = Math.floor(now / 60000);
  const tenSecWindow = Math.floor(now / 10000);
  const dayWindow = new Date().toISOString().slice(0, 10);

  const sessionId = authReq.session?.id ?? profile?.id ?? 'unknown';
  const userId = profile?.id ?? 'unknown';

  // Layer 1: Burst protection (IP fallback)
  const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
  const ipKey = `ratelimit:ip:${ip}:${tenSecWindow}`;
  const ipCount = await incrementCounter(ipKey, 12);

  if (ipCount > BURST_THRESHOLD) {
    res.set('Retry-After', '10');
    return res.status(429).json({
      success: false,
      message: 'Burst limit exceeded. Please slow down.',
      retry_after: 10,
    });
  }

  // Layer 2: User-level rate limit (PAT-based)
  if (authReq.auth_type === 'pat' && profile) {
    const userKey = `ratelimit:user:${userId}:${minuteWindow}`;
    const userRpm = PLAN_RPM[profile.plan] ?? 256;
    const userCount = await incrementCounter(userKey, 60);
    const retryAfter = 60 - Math.floor((now % 60000) / 1000);

    res.set('X-RateLimit-Limit', String(userRpm));
    res.set('X-RateLimit-Remaining', String(Math.max(0, userRpm - userCount)));
    res.set('X-RateLimit-Reset', String(retryAfter));

    if (userCount > userRpm) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: `User rate limit exceeded (${profile.plan} plan: ${userRpm}/min)`,
        retry_after: retryAfter,
      });
    }
  }

  // Layer 3: Session-level rate limit — keyed by session ID (API key hash)
  if (authReq.session) {
    const sessionKey = `ratelimit:session:${sessionId}:${minuteWindow}`;
    const sessionRpm = PLAN_RPM[profile?.plan ?? 'trial'] ?? 256;
    const sessionCount = await incrementCounter(sessionKey, 60);
    const retryAfter = 60 - Math.floor((now % 60000) / 1000);

    res.set('X-RateLimit-Session-Limit', String(sessionRpm));
    res.set('X-RateLimit-Session-Remaining', String(Math.max(0, sessionRpm - sessionCount)));

    if (sessionCount > sessionRpm) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Session rate limit exceeded',
        retry_after: retryAfter,
      });
    }
  }

  // Layer 4: Endpoint-specific rate limit
  // Match the route path pattern (e.g., /on-whatsapp/:phone)
  const routePath = req.route?.path ?? '';
  const basePath = req.baseUrl;
  const endpoint = basePath + routePath;

  const endpointConfig = ENDPOINT_LIMITS[endpoint];
  if (endpointConfig) {
    const endpointKey = `ratelimit:endpoint:${sessionId}:${endpoint}:${minuteWindow}`;
    const dayKey = `ratelimit:endpoint:${sessionId}:${endpoint}:day:${dayWindow}`;
    const [epCount, dayCount] = await Promise.all([
      incrementCounter(endpointKey, 60),
      incrementCounter(dayKey, 86400),
    ]);

    const retryAfter = 60 - Math.floor((now % 60000) / 1000);
    res.set('X-RateLimit-Limit', String(endpointConfig.rpm));
    res.set('X-RateLimit-Remaining', String(Math.max(0, endpointConfig.rpm - epCount)));
    res.set('X-RateLimit-Daily-Limit', String(endpointConfig.daily));
    res.set('X-RateLimit-Daily-Remaining', String(Math.max(0, endpointConfig.daily - dayCount)));
    res.set('X-RateLimit-Reset', String(retryAfter));

    if (epCount > endpointConfig.rpm) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Endpoint rate limit exceeded',
        retry_after: retryAfter,
      });
    }

    if (dayCount > endpointConfig.daily) {
      res.set('Retry-After', '86400');
      return res.status(429).json({
        success: false,
        message: 'Daily endpoint limit exceeded',
        retry_after: 86400,
      });
    }
  }

  next();
}
