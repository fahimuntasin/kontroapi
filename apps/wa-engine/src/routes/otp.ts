import { Router } from 'express';
import { requireHmacAuth } from '../middleware/hmacAuth';
import { validate } from '../middleware/validate';
import { sendOtp, verifyOtp, validateToken } from '../lib/otp';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const router = Router();

// Normalize phone: strip +, leading 0 → 88 prefix
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '').replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '88' + cleaned;
  }
  return cleaned;
}

const phoneSchema = z.string()
  .transform(normalizePhone)
  .refine(p => /^8801[3-9]\d{8}$/.test(p), 'Enter a valid BD number (e.g., 013XXXXXXXX)');

const sendSchema = z.object({
  phone: phoneSchema,
  brand: z.string().min(1).max(50),
});

const verifySchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6).regex(/^\d+$/),
});

const validateTokenSchema = z.object({
  phone: phoneSchema,
  verify_token: z.string().min(1),
});

// POST /api/v1/otp/send
router.post('/send', requireHmacAuth, validate(sendSchema), async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);

    // Check if this phone number is already registered
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingProfile) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered. Please log in instead.' });
    }

    const result = await sendOtp(phone, req.body.brand);
    if (!result.success) {
      return res.status(502).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// POST /api/v1/otp/verify
router.post('/verify', requireHmacAuth, validate(verifySchema), async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const result = await verifyOtp(phone, req.body.otp);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// POST /api/v1/otp/validate-token
router.post('/validate-token', requireHmacAuth, validate(validateTokenSchema), async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const result = await validateToken(phone, req.body.verify_token);
    res.json(result);
  } catch (error) {
    console.error('OTP validate-token error:', error);
    res.status(500).json({ valid: false });
  }
});

export default router;