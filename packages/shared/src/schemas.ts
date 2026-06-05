import { z } from 'zod';

// Normalizes various BD phone formats to 8801XXXXXXXXX (13 digits)
// Accepts: 01320875770, 8801320875770, +8801320875770
// Output: 8801XXXXXXXXX (13 digits starting with 8801)
export function normalizeBdPhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '').replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '88' + cleaned; // 0132... → 880132...
  }
  return cleaned;
}

// Validates that a phone number is a valid BD number after normalization
// Must be exactly 13 digits: 8801[3-9]XXXXXXXX
export const bdPhoneSchema = z.string()
  .transform(normalizeBdPhone)
  .refine(p => /^8801[3-9]\d{8}$/.test(p), 'Invalid Bangladesh phone number');

export const registerPhoneSchema = z.object({
  phone: z.string()
    .transform(normalizeBdPhone)
    .refine(p => /^8801[3-9]\d{8}$/.test(p), 'Enter a valid BD number (e.g., 013XXXXXXXX)'),
});

export const registerOtpSchema = z.object({
  phone: z.string()
    .transform(normalizeBdPhone)
    .refine(p => /^8801[3-9]\d{8}$/.test(p), 'Invalid Bangladesh phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const registerAccountSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string()
    .transform(normalizeBdPhone)
    .refine(p => /^8801[3-9]\d{8}$/.test(p), 'Enter a valid BD number (e.g., 013XXXXXXXX)'),
  verify_token: z.string().min(1, 'Verification token is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createSessionSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(50),
  webhook_url: z.string().url().optional().or(z.literal('')),
  webhook_secret: z.string().min(16).optional().or(z.literal('')),
  proxy_url: z.string().url().optional().or(z.literal('')),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  webhook_url: z.string().url().optional().or(z.literal('')),
  webhook_secret: z.string().min(16).optional().or(z.literal('')),
  webhook_events: z.array(z.string()).optional(),
  proxy_url: z.string().url().optional().or(z.literal('')),
  account_protection: z.boolean().optional(),
});

export const createTokenSchema = z.object({
  name: z.string().min(1).max(50),
  expires_at: z.string().datetime().optional().or(z.literal('')),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
});

export const sendMessageSchema = z.object({
  to: z.string().min(1, 'Recipient is required'),
  type: z.enum([
    'text', 'image', 'video', 'audio', 'document',
    'sticker', 'location', 'contact', 'poll', 'reaction',
  ]).default('text'),
  text: z.string().optional(),
  url: z.string().url().optional(),
  base64: z.string().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
  quoted_message_id: z.string().optional(),
  view_once: z.boolean().optional(),
  emoji: z.string().optional(),
  message_id: z.string().optional(),
  preview_url: z.boolean().optional(),
  gif_playback: z.boolean().optional(),
  ptt: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  multi_select: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
  template_data: z.record(z.string()).optional(),
}).refine((data) => {
  if (data.type === 'text' && !data.text) {
    return { success: false, error: { path: ['text'], message: 'Text is required for text messages' } };
  }
  if (['image', 'video', 'audio', 'document', 'sticker'].includes(data.type) && !data.url && !data.base64) {
    return { success: false, error: { path: ['url'], message: 'URL or base64 is required for media messages' } };
  }
  if (data.type === 'location' && (!data.latitude || !data.longitude)) {
    return { success: false, error: { path: ['latitude'], message: 'Latitude and longitude are required' } };
  }
  if (data.type === 'contact' && (!data.contact_name || !data.contact_phone)) {
    return { success: false, error: { path: ['contact_name'], message: 'Contact name and phone are required' } };
  }
  if (data.type === 'poll' && (!data.question || !data.options)) {
    return { success: false, error: { path: ['question'], message: 'Question and options are required' } };
  }
  if (data.type === 'reaction' && (!data.message_id || !data.emoji)) {
    return { success: false, error: { path: ['message_id'], message: 'Message ID and emoji are required' } };
  }
  return { success: true };
});

export const webhookConfigSchema = z.object({
  webhook_url: z.string().url().optional().or(z.literal('')),
  webhook_secret: z.string().min(16).optional().or(z.literal('')),
  webhook_events: z.array(z.string()).default([
    'messages.received', 'messages.sent', 'messages.update',
    'session.status', 'qrcode.updated',
  ]),
});