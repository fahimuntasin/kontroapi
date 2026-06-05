import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { WASocket } from '@whiskeysockets/baileys';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { getSessionSocket, checkAdaptiveThrottleForSession } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';
import { redis } from '../lib/redis';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================================
// SCHEMA — all message types in one place
// ============================================================
const sendMessageSchema = z.object({
  to: z.string().min(1),
  type: z.enum([
    'text', 'image', 'video', 'audio', 'document',
    'sticker', 'location', 'contact', 'poll', 'reaction',
  ]).default('text'),
  text: z.string().optional(),
  preview_url: z.boolean().optional(),
  template_data: z.record(z.string()).optional(),
  url: z.string().optional(),
  base64: z.string().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
  gif_playback: z.boolean().optional(),
  ptt: z.boolean().optional(),
  view_once: z.boolean().optional(),
  quoted_message_id: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  multi_select: z.boolean().optional(),
  emoji: z.string().optional(),
  message_id: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  session_id: z.string().optional(),
});

// ============================================================
// HELPERS
// ============================================================

function applyTemplate(text: string, templateData?: Record<string, string>): string {
  if (!templateData) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => templateData[key] ?? _match);
}

/**
 * Normalize a raw phone number to a JID.
 * Accepts: "1234567890", "1234567890@s.whatsapp.net", group JIDs, etc.
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '').replace(/\s/g, '');
  if (cleaned.startsWith('0')) cleaned = '88' + cleaned;
  return cleaned;
}

function toJid(phone: string): string {
  if (phone.includes('@')) return phone;
  if (phone.includes('-')) return phone;
  const normalized = normalizePhone(phone);
  return `${normalized}@s.whatsapp.net`;
}

/**
 * Look up a quoted message from the local DB so we can forward its key.
 * Returns Baileys MessageKey shape.
 */
async function getQuotedKey(sessionId: string, messageId: string): Promise<{
  remoteJid: string; fromMe: boolean; id: string;
} | null> {
  const { localDb } = await import('../lib/localDb');
  const { rows } = await localDb.query(
    `SELECT to_from, status FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [sessionId, messageId]
  );
  if (rows.length === 0) return null;
  return {
    remoteJid: rows[0].to_from,
    fromMe: rows[0].status === 'sent',
    id: messageId,
  };
}

/**
 * Build a quoted message object for Baileys.
 */
function buildQuoted(quotedKey: { remoteJid: string; fromMe: boolean; id: string }, quotedText?: string) {
  return {
    key: quotedKey,
    message: {
      conversation: quotedText ?? '',
    },
  };
}

/**
 * Resolve mentions to JIDs and build the mentions array.
 */
function buildMentions(mentions?: string[]): string[] {
  if (!mentions || mentions.length === 0) return [];
  return mentions.map(m => toJid(m));
}

interface HandlerCtx {
  socket: WASocket;
  session: NonNullable<AuthenticatedRequest['session']>;
  body: z.infer<typeof sendMessageSchema>;
  quotedKey?: { remoteJid: string; fromMe: boolean; id: string };
}

// ============================================================
// MESSAGE HANDLERS
// ============================================================

async function textHandler(ctx: HandlerCtx) {
  const text = applyTemplate(ctx.body.text ?? '', ctx.body.template_data);
  const mentions = buildMentions(ctx.body.mentions);
  return ctx.socket.sendMessage(ctx.body.to, {
    text,
    linkPreview: ctx.body.preview_url === false ? null : undefined,
    mentions: mentions.length > 0 ? mentions : undefined,
    ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey, text) } : {}),
  });
}

async function mediaHandler(
  ctx: HandlerCtx,
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker'
) {
  const payload = ctx.body;
  const buffer = payload.base64 ? Buffer.from(payload.base64, 'base64') : undefined;
  const mediaSrc = payload.url ? { url: payload.url } : (buffer ?? Buffer.alloc(0));
  const mentions = buildMentions(ctx.body.mentions);

  switch (type) {
    case 'image':
      return ctx.socket.sendMessage(ctx.body.to, {
        image: mediaSrc as any,
        caption: payload.caption,
        viewOnce: payload.view_once ?? false,
        mentions: mentions.length > 0 ? mentions : undefined,
        ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey, payload.caption) } : {}),
      });
    case 'video':
      return ctx.socket.sendMessage(ctx.body.to, {
        video: mediaSrc as any,
        caption: payload.caption,
        gifPlayback: payload.gif_playback ?? false,
        viewOnce: payload.view_once ?? false,
        mentions: mentions.length > 0 ? mentions : undefined,
        ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey, payload.caption) } : {}),
      });
    case 'audio':
      return ctx.socket.sendMessage(ctx.body.to, {
        audio: mediaSrc as any,
        ptt: payload.ptt ?? false,
        mimetype: payload.mimetype,
        ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey) } : {}),
      });
    case 'document':
      return ctx.socket.sendMessage(ctx.body.to, {
        document: mediaSrc as any,
        fileName: payload.filename ?? 'document',
        mimetype: payload.mimetype ?? 'application/octet-stream',
        caption: payload.caption,
        ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey, payload.caption) } : {}),
      });
    case 'sticker':
      return ctx.socket.sendMessage(ctx.body.to, {
        sticker: mediaSrc as any,
        ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey) } : {}),
      });
  }
}

async function locationHandler(ctx: HandlerCtx) {
  const { latitude, longitude, name, address } = ctx.body;
  if (latitude == null || longitude == null) {
    throw new Error('latitude and longitude required');
  }
  return ctx.socket.sendMessage(ctx.body.to, {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      name: name ?? undefined,
      address: address ?? undefined,
    },
    ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey) } : {}),
  });
}

function buildVCard(body: {
  contact_name: string;
  contact_phone: string;
  name?: string;
  address?: string;
}): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${body.contact_name}`,
    `FN:${body.contact_name}`,
    `TEL;type=CELL;waid=${body.contact_phone.replace(/[^0-9]/g, '')}:+${body.contact_phone}`,
  ];
  if (body.name) lines.push(`ORG:${body.name}`);
  if (body.address) lines.push(`ADR;type=HOME:;;${body.address};;;;`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

async function contactHandler(ctx: HandlerCtx) {
  const { contact_name, contact_phone, name, address } = ctx.body;
  if (!contact_name || !contact_phone) {
    throw new Error('contact_name and contact_phone required');
  }
  return ctx.socket.sendMessage(ctx.body.to, {
    contacts: {
      displayName: contact_name,
      contacts: [{
        vcard: buildVCard({ contact_name, contact_phone, name, address }),
      }],
    },
    ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey) } : {}),
  });
}

async function pollHandler(ctx: HandlerCtx) {
  const { question, options, multi_select } = ctx.body;
  if (!question || !options || options.length < 2) {
    throw new Error('question and at least 2 options required');
  }
  if (options.length > 12) {
    throw new Error('polls support a maximum of 12 options');
  }
  return ctx.socket.sendMessage(ctx.body.to, {
    poll: {
      name: question,
      values: options,
      selectableCount: multi_select ? options.length : 0,
    },
    ...(ctx.quotedKey ? { quotedMessage: buildQuoted(ctx.quotedKey) } : {}),
  });
}

async function reactionHandler(ctx: HandlerCtx) {
  const { emoji, message_id } = ctx.body;
  if (!message_id || !emoji) {
    throw new Error('message_id and emoji required');
  }
  // Reaction must target the original message's remoteJid
  // Try to look up the original message to get the correct remoteJid
  let remoteJid = ctx.body.to;
  let fromMe = false;
  const { localDb } = await import('../lib/localDb');
  const { rows } = await localDb.query(
    `SELECT to_from FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 LIMIT 1`,
    [ctx.session.id, message_id]
  );
  if (rows.length > 0) {
    remoteJid = rows[0].to_from;
    fromMe = true;
  }
  return ctx.socket.sendMessage(ctx.body.to, {
    react: {
      text: emoji,
      key: { remoteJid, fromMe, id: message_id },
    },
  });
}

// ============================================================
// ROUTE: POST /api/v1/send-message
// ============================================================
router.post('/send-message', requireAuth, rateLimit, validate(sendMessageSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  let session = authReq.session;

  // If authenticated via PAT or internal HMAC, session isn't set automatically.
  // Accept session_id in the body to determine which session to use.
  const userId = authReq.profile?.id ?? (req.headers['x-user-id'] as string);
  if (!session && userId && (req.body as any).session_id) {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', (req.body as any).session_id)
      .eq('user_id', userId)
      .single();
    if (data) session = data as any;
  }

  if (!session) {
    return res.status(400).json({ success: false, message: 'Session key required. Provide a session API key or include session_id in the body.' });
  }

  const socket = getSessionSocket(session.id);
  if (!socket) {
    return res.status(400).json({ success: false, message: 'Session is not connected' });
  }

  const body = req.body as z.infer<typeof sendMessageSchema>;
  const jid = toJid(body.to);

  // Account protection: 1 msg per 5s
  if (session.account_protection) {
    const key = `msg_cooldown:${session.id}`;
    const lastMsg = await redis.get(key);
    if (lastMsg) {
      const elapsed = Date.now() - parseInt(lastMsg, 10);
      if (elapsed < 5000) {
        return res.status(429).json({
          success: false,
          message: 'Account protection active: 1 message per 5 seconds',
          retry_after: Math.ceil((5000 - elapsed) / 1000),
        });
      }
    }
    await redis.setex(key, 6, Date.now().toString());
  }

  // Adaptive ban protection
  const throttle = checkAdaptiveThrottleForSession(session.id, body.to);
  if (!throttle.allowed) {
    return res.status(429).json({
      success: false,
      message: `Adaptive throttle: recipient ${body.to} receiving too many messages`,
      retry_after: Math.ceil(throttle.waitMs / 1000),
    });
  }

  // Resolve quoted message
  let quotedKey: HandlerCtx['quotedKey'] | undefined;
  if (body.quoted_message_id) {
    quotedKey = await getQuotedKey(session.id, body.quoted_message_id) ?? undefined;
  }

  const ctx: HandlerCtx = { socket, session, body: { ...body, to: jid }, quotedKey };

  try {
    let result: any;

    switch (body.type) {
      case 'text':
        result = await textHandler(ctx);
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
      case 'sticker':
        result = await mediaHandler(ctx, body.type);
        break;
      case 'location':
        result = await locationHandler(ctx);
        break;
      case 'contact':
        result = await contactHandler(ctx);
        break;
      case 'poll':
        result = await pollHandler(ctx);
        break;
      case 'reaction':
        result = await reactionHandler(ctx);
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown message type: ${body.type}` });
    }

    return res.json({
      success: true,
      data: {
        message_id: result?.key?.id,
        status: 'sent',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to send message: ${error?.message ?? 'Unknown error'}`,
    });
  }
});

export default router;
