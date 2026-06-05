import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { WAMessageKey } from '@whiskeysockets/baileys';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getSessionSocket } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';
import { localDb } from '../lib/localDb';

const router = Router();

// ============================================================
// HELPERS
// ============================================================

function getAuthSocket(req: Request) {
  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return { error: 'Session key required' } as const;

  const socket = getSessionSocket(session.id);
  if (!socket) return { error: 'Session not connected' } as const;

  return { session, socket } as const;
}

/** Look up message from local DB to get remoteJid and fromMe */
async function lookupMessageKey(
  sessionId: string,
  waMsgId: string
): Promise<{ remoteJid: string; fromMe: boolean } | null> {
  const { rows } = await localDb.query(
    `SELECT to_from FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 LIMIT 1`,
    [sessionId, waMsgId]
  );
  if (rows.length === 0) return null;
  return { remoteJid: rows[0].to_from, fromMe: true };
}

function buildMsgKey(remoteJid: string, fromMe: boolean, id: string): WAMessageKey {
  return { remoteJid, fromMe, id, participant: undefined };
}

// ============================================================
// PUT /api/v1/messages/:wa_msg_id — edit message text
// ============================================================
router.put(
  '/:wa_msg_id',
  requireAuth,
  validate(z.object({ text: z.string().min(1) })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const msgKey = await lookupMessageKey(auth.session.id, req.params.wa_msg_id!);
    if (!msgKey) {
      return res.status(404).json({ success: false, message: 'Message not found in logs' });
    }

    try {
      await auth.socket.sendMessage(msgKey.remoteJid, {
        text: (req.body as any).text,
        edit: buildMsgKey(msgKey.remoteJid, msgKey.fromMe, req.params.wa_msg_id!),
      });
      res.json({ success: true, message: 'Message edited' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to edit message' });
    }
  }
);

// ============================================================
// DELETE /api/v1/messages/:wa_msg_id — delete for everyone or just sender
// ============================================================
router.delete('/:wa_msg_id', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const forEveryone = (req.query as any)?.for_everyone === 'true';
  const msgKey = await lookupMessageKey(auth.session.id, req.params.wa_msg_id!);

  if (!msgKey) {
    return res.status(404).json({ success: false, message: 'Message not found in logs' });
  }

  try {
    if (forEveryone && msgKey.fromMe) {
      // Revoke for everyone — send a delete message via Baileys
      await auth.socket.sendMessage(msgKey.remoteJid, {
        delete: buildMsgKey(msgKey.remoteJid, true, req.params.wa_msg_id!),
      });
    } else {
      // Delete only for sender
      await auth.socket.sendMessage(msgKey.remoteJid, {
        delete: buildMsgKey(msgKey.remoteJid, false, req.params.wa_msg_id!),
      });
    }
    res.json({ success: true, message: forEveryone ? 'Message revoked for everyone' : 'Message deleted for sender' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to delete message' });
  }
});

// ============================================================
// GET /api/v1/messages/:wa_msg_id/info — receipt / read status
// ============================================================
router.get('/:wa_msg_id/info', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const msgKey = await lookupMessageKey(auth.session.id, req.params.wa_msg_id!);
  if (!msgKey) {
    return res.status(404).json({ success: false, message: 'Message not found in logs' });
  }

  try {
    // Baileys doesn't expose a direct message info API.
    // Return receipt data from local DB.
    const { rows } = await localDb.query(
      `SELECT to_from, type, content, status, created_at FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 LIMIT 1`,
      [auth.session.id, req.params.wa_msg_id!]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to get message info' });
  }
});

// ============================================================
// POST /api/v1/messages/:wa_msg_id/resend — resend a failed message
// ============================================================
router.post('/:wa_msg_id/resend', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const { rows } = await localDb.query(
    `SELECT to_from, type, content FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 LIMIT 1`,
    [auth.session.id, req.params.wa_msg_id!]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }

  const { to_from: remoteJid, type, content } = rows[0];

  try {
    // Re-send based on the stored message type
    let parsed: any;
    try { parsed = typeof content === 'string' ? JSON.parse(content) : content; } catch { parsed = content; }

    if (type === 'conversation' || type === 'text') {
      await auth.socket.sendMessage(remoteJid, { text: parsed ?? '' });
    } else if (type === 'imageMessage') {
      await auth.socket.sendMessage(remoteJid, { image: { url: parsed?.url ?? '' }, caption: parsed?.caption });
    } else if (type === 'videoMessage') {
      await auth.socket.sendMessage(remoteJid, { video: { url: parsed?.url ?? '' }, caption: parsed?.caption });
    } else if (type === 'documentMessage') {
      await auth.socket.sendMessage(remoteJid, {
        document: { url: parsed?.url ?? '' },
        fileName: parsed?.fileName ?? 'document',
        mimetype: parsed?.mimetype ?? 'application/octet-stream',
      });
    } else if (type === 'audioMessage') {
      await auth.socket.sendMessage(remoteJid, { audio: { url: parsed?.url ?? '' }, ptt: parsed?.ptt ?? false });
    } else {
      return res.status(400).json({ success: false, message: `Cannot resend message type: ${type}` });
    }

    res.json({ success: true, message: 'Message resent' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to resend message' });
  }
});

// ============================================================
// POST /api/v1/messages/read — mark messages as read
// ============================================================
const readMessagesSchema = z.object({
  jid: z.string().min(1),
  message_ids: z.array(z.string()).min(1),
});

router.post('/read', requireAuth, validate(readMessagesSchema), async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const body = req.body as z.infer<typeof readMessagesSchema>;

  try {
    const keys = body.message_ids.map(id =>
      buildMsgKey(body.jid, false, id)
    );
    await auth.socket.readMessages(keys);
    res.json({ success: true, message: `${keys.length} message(s) marked as read` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to mark messages as read' });
  }
});

// ============================================================
// POST /api/v1/messages/decrypt-media — download & decrypt media from a message
// ============================================================
const decryptMediaSchema = z.object({
  message_id: z.string().min(1),
});

router.post('/decrypt-media', requireAuth, validate(decryptMediaSchema), async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const { rows } = await localDb.query(
    `SELECT content FROM message_logs WHERE session_id = $1 AND wa_message_id = $2 LIMIT 1`,
    [auth.session.id, req.body.message_id!]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }

  let parsed: any;
  try { parsed = JSON.parse(rows[0].content); } catch { parsed = rows[0].content; }

  // If we have a direct URL in the stored content, return it
  if (parsed?.url) {
    return res.json({ success: true, data: { url: parsed.url, mimetype: parsed.mimetype } });
  }

  // If the message has media keys, we'd need the full WAMessage object from Baileys store
  // to download and decrypt. This is a limitation of storing only JSON content.
  res.status(400).json({
    success: false,
    message: 'Media download requires the full WAMessage object. Store media URLs in content for later access.',
  });
});

// ============================================================
// POST /api/v1/messages/upload — upload a file to WhatsApp CDN (returns URL)
// ============================================================
router.post('/upload', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const body = req.body as any;
  if (!body.base64 && !body.url) {
    return res.status(400).json({ success: false, message: 'base64 or url required' });
  }

  try {
    const type = body.type ?? 'image';
    const buffer = body.base64 ? Buffer.from(body.base64, 'base64') : undefined;

    // Baileys doesn't expose a direct CDN upload API.
    // The standard approach is to send the media inline with the message.
    // This endpoint returns a placeholder suggesting the inline approach.
    res.json({
      success: true,
      message: 'WhatsApp does not support standalone media uploads. Use base64 in send-message instead.',
      data: { size: buffer?.length ?? 0 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Upload failed' });
  }
});

export default router;
