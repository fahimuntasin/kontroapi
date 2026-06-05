import { createHmac, randomBytes } from 'crypto';
import { redis } from './redis';
import { config } from '../config';
import { logger } from './logger';
import axios from 'axios';

// Normalize phone: strip leading +, then ensure 88 prefix
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '');
  if (cleaned.startsWith('0')) {
    cleaned = '88' + cleaned; // 01320875770 → 8801320875770
  }
  return cleaned;
}

const OTP_TTL_SECONDS = 300; // 5 minutes
const VERIFY_TOKEN_TTL_SECONDS = 600; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW = 900; // 15 minutes lockout

function hashOtp(otp: string): string {
  return createHmac('sha256', config.INTERNAL_OTP_SECRET).update(otp).digest('hex');
}

function generateVerifyToken(phone: string): string {
  const raw = randomBytes(32).toString('hex');
  return createHmac('sha256', config.INTERNAL_OTP_SECRET)
    .update(`${phone}:${raw}`)
    .digest('hex');
}

export async function sendOtp(phone: string, brand: string): Promise<{ success: true; expires_in: number } | { success: false; message: string }> {
  const normalizedPhone = normalizePhone(phone);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `otp:${normalizedPhone}`;

  // Store hashed OTP in Redis for verification
  await redis.setex(key, OTP_TTL_SECONDS, hashOtp(otp));

  // Send via SysSMS API
  try {
    await axios.post(
      config.SMS_GATEWAY_URL,
      {
        apikey: config.SMS_GATEWAY_KEY,
        secretkey: config.SMS_GATEWAY_SECRET,
        callerID: config.SMS_GATEWAY_SENDER,
        toUser: normalizedPhone,
        messageContent: `Your ${brand} verification code is: ${otp}`,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
  } catch (error: any) {
    logger.error({ err: error, phone: normalizedPhone }, 'Failed to send OTP via SysSMS');
    // Still return success so user can see OTP in logs for testing
    console.log(`\n🔐 OTP for ${normalizedPhone}: ${otp} (SMS delivery failed — use this code)\n`);
    return { success: true, expires_in: OTP_TTL_SECONDS };
  }

  // Dev fallback: also log to console
  console.log(`\n🔐 OTP for ${normalizedPhone}: ${otp} (sent via SysSMS)\n`);

  return { success: true, expires_in: OTP_TTL_SECONDS };
}

export async function verifyOtp(phone: string, otp: string): Promise<{ success: true; verify_token: string } | { success: false; message: string; retry_after?: number }> {
  const normalizedPhone = normalizePhone(phone);
  const key = `otp:${normalizedPhone}`;
  const stored = await redis.get(key);

  if (!stored) {
    return { success: false, message: 'OTP expired. Request a new one.' };
  }

  // Brute force protection: track failed attempts
  const attemptKey = `otp_attempts:${normalizedPhone}`;
  const attempts = await redis.incr(attemptKey);
  if (attempts === 1) await redis.expire(attemptKey, OTP_ATTEMPT_WINDOW);

  if (attempts > MAX_OTP_ATTEMPTS) {
    const ttl = await redis.ttl(attemptKey);
    return {
      success: false,
      message: 'Too many failed attempts. Try again in 15 minutes.',
      retry_after: Math.max(ttl, 0),
    };
  }

  if (stored !== hashOtp(otp)) {
    const remaining = MAX_OTP_ATTEMPTS - attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  // Success: clear OTP, clear attempt counter, generate verify token
  await redis.del(key);
  await redis.del(attemptKey);

  const verifyToken = generateVerifyToken(normalizedPhone);
  const verifyKey = `otp_verified:${normalizedPhone}`;
  await redis.setex(verifyKey, VERIFY_TOKEN_TTL_SECONDS, verifyToken);

  return { success: true, verify_token: verifyToken };
}

export async function validateToken(phone: string, verifyToken: string): Promise<{ valid: boolean }> {
  const normalizedPhone = normalizePhone(phone);
  const key = `otp_verified:${normalizedPhone}`;
  const stored = await redis.get(key);

  if (!stored || stored !== verifyToken) {
    return { valid: false };
  }

  await redis.del(key); // One-time use
  return { valid: true };
}
