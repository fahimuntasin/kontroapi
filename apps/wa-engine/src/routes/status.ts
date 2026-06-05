import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getSessionSocket, getQrCode } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================================
// HELPER
// ============================================================

function getAuthSocket(req: Request) {
  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return { error: 'Session key required' } as const;

  const socket = getSessionSocket(session.id);
  if (!socket) return { error: 'Session not connected' } as const;

  return { session, socket } as const;
}

// ============================================================
// GET /api/v1/status — session status from local DB
// ============================================================
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return res.status(400).json({ success: false, message: 'Session key required' });

  const socket = getSessionSocket(session.id);
  const { rows } = await localDb.query(
    `SELECT status, phone, last_qr, updated_at FROM session_status WHERE session_id = $1`,
    [session.id]
  );

  const dbStatus = rows[0]?.status ?? 'disconnected';

  res.json({
    success: true,
    data: {
      id: session.id,
      name: session.name,
      phone: rows[0]?.phone ?? session.phone,
      status: socket ? (socket.user ? 'connected' : dbStatus) : dbStatus,
      last_qr: rows[0]?.last_qr ?? null,
      updated_at: rows[0]?.updated_at ?? null,
    },
  });
});

// ============================================================
// GET /api/v1/user — full connected user profile
// ============================================================
router.get('/user', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  try {
    const sock = auth.socket as any;
    const user = sock.user;
    const creds = sock.authState?.creds;

    res.json({
      success: true,
      data: {
        id: user?.id ?? null,
        name: user?.name ?? creds?.me?.name ?? null,
        phone: user?.id?.split(':')?.[0] ?? null,
        lid: user?.lid ?? null,
        qr: creds?.qr ?? null,
        account_settings: creds?.accountSyncConfig ?? null,
        me: creds?.me ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch user info' });
  }
});

// ============================================================
// GET /api/v1/on-whatsapp/:phone — check if a number is on WhatsApp
// ============================================================
router.get('/on-whatsapp/:phone', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const phone = req.params.phone;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    const results = await auth.socket.onWhatsApp(phone);
    const first = (results ?? [])[0];
    const exists = first?.exists === true;

    res.json({
      success: true,
      data: {
        phone,
        exists,
        jid: first?.jid ?? `${phone}@s.whatsapp.net`,
        verified_name: (first as any)?.verifiedName ?? null,
        lid: first?.lid ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to check number' });
  }
});

// ============================================================
// POST /api/v1/on-whatsapp/batch — check multiple numbers
// ============================================================
router.post(
  '/on-whatsapp/batch',
  requireAuth,
  validate(z.object({ phones: z.array(z.string()).min(1).max(100) })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const phones = (req.body as any).phones as string[];

    try {
      // Process in parallel with concurrency limit of 10
      const batchSize = 10;
      const results: Array<{ phone: string; exists: boolean; jid: string | null; verified_name: string | null }> = [];

      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (phone) => {
            try {
              const r = await auth.socket.onWhatsApp(phone);
              const first = (r ?? [])[0];
              return {
                phone,
                exists: first?.exists === true,
                jid: first?.jid ?? null,
                verified_name: (first as any)?.verifiedName ?? null,
              };
            } catch {
              return { phone, exists: false, jid: null, verified_name: null };
            }
          })
        );
        results.push(...batchResults);
      }

      res.json({ success: true, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to batch check numbers' });
    }
  }
);

// ============================================================
// POST /api/v1/presence — send presence update
// ============================================================
router.post(
  '/presence',
  requireAuth,
  validate(z.object({
    to: z.string().optional(),
    type: z.enum(['typing', 'recording', 'available', 'paused', 'unavailable']),
  })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const body = req.body as { to?: string; type: string };

    try {
      switch (body.type) {
        case 'typing':
          await auth.socket.sendPresenceUpdate('composing', body.to);
          break;
        case 'recording':
          await auth.socket.sendPresenceUpdate('recording', body.to);
          break;
        case 'available':
          await auth.socket.sendPresenceUpdate('available');
          break;
        case 'paused':
          await auth.socket.sendPresenceUpdate('paused', body.to);
          break;
        case 'unavailable':
          await auth.socket.sendPresenceUpdate('unavailable');
          break;
      }
      res.json({ success: true, message: `Presence updated: ${body.type}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to update presence' });
    }
  }
);

// ============================================================
// GET /api/v1/presence/:jid — subscribe to presence updates
// ============================================================
router.get('/presence/:jid/subscribe', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const jid = req.params.jid;
  if (!jid) return res.status(400).json({ success: false, message: 'jid required' });

  try {
    await auth.socket.presenceSubscribe(jid);
    res.json({ success: true, message: `Subscribed to presence for ${jid}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to subscribe to presence' });
  }
});

// ============================================================
// POST /api/v1/read-receipt — send read receipt
// ============================================================
router.post(
  '/read-receipt',
  requireAuth,
  validate(z.object({
    jid: z.string().min(1),
    message_id: z.string().min(1),
  })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const { jid, message_id } = req.body as { jid: string; message_id: string };

    try {
      await auth.socket.readMessages([{ remoteJid: jid, fromMe: false, id: message_id }]);
      res.json({ success: true, message: 'Read receipt sent' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to send read receipt' });
    }
  }
);

// ============================================================
// GET /api/v1/privacy-settings — get privacy settings
// ============================================================
router.get('/privacy-settings', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  try {
    const sock = auth.socket as any;
    const settings = await sock.fetchPrivacySettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch privacy settings' });
  }
});

// ============================================================
// PUT /api/v1/privacy-settings — update privacy settings
// ============================================================
router.put(
  '/privacy-settings',
  requireAuth,
  validate(z.object({
    readreceipts: z.enum(['all', 'contacts', 'contact_blacklist', 'none']).optional(),
    profile: z.enum(['all', 'contacts', 'contact_blacklist', 'none']).optional(),
    status: z.enum(['all', 'contacts', 'contact_blacklist', 'none']).optional(),
    online: z.enum(['all', 'match_last_seen']).optional(),
    last: z.enum(['all', 'contacts', 'contact_blacklist', 'none']).optional(),
    groupadd: z.enum(['all', 'contacts', 'contact_blacklist', 'none']).optional(),
    calladd: z.enum(['all', 'known']).optional(),
  })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const settings = req.body as Record<string, string>;

    try {
      const sock = auth.socket as any;
      await sock.updatePrivacySettings(settings);
      res.json({ success: true, message: 'Privacy settings updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to update privacy settings' });
    }
  }
);

// ============================================================
// GET /api/v1/blocklist — get blocked contacts
// ============================================================
router.get('/blocklist', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  try {
    const sock = auth.socket as any;
    const list = await sock.fetchBlocklist();
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch blocklist' });
  }
});

export default router;
