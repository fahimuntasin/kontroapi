import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { WAMessage } from '@whiskeysockets/baileys';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getSessionSocket } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const sendChannelSchema = z.object({
  channel_id: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'poll']).default('text'),
  text: z.string().optional(),
  caption: z.string().optional(),
  url: z.string().optional(),
  base64: z.string().optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
});

const newsletterSchema = z.object({
  action: z.enum(['list', 'get', 'create', 'update', 'delete', 'mute', 'unmute', 'follow', 'unfollow', 'picture', 'stats']),
  newsletter_id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  picture_url: z.string().optional(),
});

// POST /api/v1/channels/send — send message to a channel/newsletter
router.post('/send', requireAuth, validate(sendChannelSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return res.status(400).json({ success: false, message: 'Session key required' });

  const socket = getSessionSocket(session.id);
  if (!socket) return res.status(400).json({ success: false, message: 'Session not connected' });

  const body = req.body as z.infer<typeof sendChannelSchema>;

  try {
    switch (body.type) {
      case 'text': {
        if (!body.text) throw new Error('text required for channel text message');
        await socket.sendMessage(body.channel_id, { text: body.text });
        break;
      }
      case 'image': {
        const src = body.base64
          ? Buffer.from(body.base64, 'base64')
          : body.url
            ? { url: body.url }
            : Buffer.alloc(0);
        await socket.sendMessage(body.channel_id, { image: src as any, caption: body.caption });
        break;
      }
      case 'video': {
        const src = body.base64
          ? Buffer.from(body.base64, 'base64')
          : body.url
            ? { url: body.url }
            : Buffer.alloc(0);
        await socket.sendMessage(body.channel_id, { video: src as any, caption: body.caption });
        break;
      }
      case 'audio': {
        const src = body.base64
          ? Buffer.from(body.base64, 'base64')
          : body.url
            ? { url: body.url }
            : Buffer.alloc(0);
        await socket.sendMessage(body.channel_id, { audio: src as any, mimetype: body.mimetype });
        break;
      }
      case 'document': {
        const src = body.base64
          ? Buffer.from(body.base64, 'base64')
          : body.url
            ? { url: body.url }
            : Buffer.alloc(0);
        await socket.sendMessage(body.channel_id, {
          document: src as any,
          fileName: body.filename ?? 'document',
          mimetype: body.mimetype ?? 'application/octet-stream',
          caption: body.caption,
        });
        break;
      }
      case 'poll': {
        if (!body.question || !body.options || body.options.length < 2) {
          throw new Error('question and at least 2 options required');
        }
        await socket.sendMessage(body.channel_id, {
          poll: { name: body.question, values: body.options, selectableCount: 0 },
        });
        break;
      }
      default:
        return res.status(400).json({ success: false, message: `Unsupported channel message type: ${body.type}` });
    }

    return res.json({ success: true, data: { message_id: 'sent' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message ?? 'Unknown error' });
  }
});

// POST /api/v1/channels/newsletter — manage WhatsApp newsletters
router.post('/newsletter', requireAuth, validate(newsletterSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return res.status(400).json({ success: false, message: 'Session key required' });

  const socket = getSessionSocket(session.id);
  if (!socket) return res.status(400).json({ success: false, message: 'Session not connected' });

  const body = req.body as z.infer<typeof newsletterSchema>;
  const sock = socket as any;

  try {
    switch (body.action) {
      case 'list': {
        const newsletters = await sock.newsletterSubscribed();
        return res.json({ success: true, data: newsletters });
      }
      case 'get': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        const meta = await sock.newsletterMetadata('id', body.newsletter_id);
        return res.json({ success: true, data: meta });
      }
      case 'create': {
        if (!body.name) throw new Error('name required');
        const created = await sock.newsletterCreate(body.name, body.description);
        return res.json({ success: true, data: created });
      }
      case 'update': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        const update: Record<string, string> = {};
        if (body.name) update.name = body.name;
        if (body.description) update.description = body.description;
        await sock.newsletterUpdate(body.newsletter_id, update);
        return res.json({ success: true, message: 'Newsletter updated' });
      }
      case 'delete': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        await sock.newsletterDelete(body.newsletter_id);
        return res.json({ success: true, message: 'Newsletter deleted' });
      }
      case 'mute': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        await sock.newsletterToggleMute(body.newsletter_id, true);
        return res.json({ success: true, message: 'Newsletter muted' });
      }
      case 'unmute': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        await sock.newsletterToggleMute(body.newsletter_id, false);
        return res.json({ success: true, message: 'Newsletter unmuted' });
      }
      case 'follow': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        await sock.newsletterFollow(body.newsletter_id);
        return res.json({ success: true, message: 'Newsletter followed' });
      }
      case 'unfollow': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        await sock.newsletterUnfollow(body.newsletter_id);
        return res.json({ success: true, message: 'Newsletter unfollowed' });
      }
      case 'picture': {
        if (!body.newsletter_id || !body.picture_url) throw new Error('newsletter_id and picture_url required');
        const imgRes = await fetch(body.picture_url);
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        await sock.newsletterUpdatePicture(body.newsletter_id, imgBuffer);
        return res.json({ success: true, message: 'Newsletter picture updated' });
      }
      case 'stats': {
        if (!body.newsletter_id) throw new Error('newsletter_id required');
        const stats = await sock.newsletterReactionList(body.newsletter_id);
        return res.json({ success: true, data: stats });
      }
      default:
        return res.status(400).json({ success: false, message: `Unknown action: ${body.action}` });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message ?? 'Unknown error' });
  }
});

export default router;
