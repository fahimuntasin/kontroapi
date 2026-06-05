import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getSessionSocket } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';

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

function toJid(phone: string): string {
  if (phone.includes('@')) return phone;
  return `${phone}@s.whatsapp.net`;
}

// ============================================================
// GET /api/v1/contacts/ — list all contacts from store
// ============================================================
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  try {
    const store = (auth.socket as any).store;
    if (!store?.contacts) {
      return res.status(400).json({ success: false, message: 'Contact store not available' });
    }

    const contacts = store.contacts.all();
    // Enrich with profile picture URLs (non-blocking)
    const enriched = contacts.map((c: any) => ({
      id: c.id,
      name: c.name ?? c.notify ?? c.verifiedName ?? null,
      notify: c.notify ?? null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch contacts' });
  }
});

// ============================================================
// GET /api/v1/contacts/:phone — check if on WhatsApp
// ============================================================
router.get('/:phone', requireAuth, async (req: Request, res: Response) => {
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
        jid: first?.jid ?? toJid(phone),
        verified_name: (first as any)?.verifiedName ?? null,
        lid: first?.lid ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to check number' });
  }
});

// ============================================================
// GET /api/v1/contacts/:phone/picture — profile picture URL
// ============================================================
router.get('/:phone/picture', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const phone = req.params.phone;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    const jid = toJid(phone);
    const url = await auth.socket.profilePictureUrl(jid, 'image');
    res.json({ success: true, data: { phone, jid, url } });
  } catch (error: any) {
    res.status(404).json({ success: false, message: 'No profile picture found' });
  }
});

// ============================================================
// POST /api/v1/contacts/:phone/block — block a contact
// ============================================================
router.post('/:phone/block', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const phone = req.params.phone;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    await auth.socket.updateBlockStatus(toJid(phone), 'block');
    res.json({ success: true, message: `Blocked +${phone}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to block contact' });
  }
});

// ============================================================
// POST /api/v1/contacts/:phone/unblock — unblock a contact
// ============================================================
router.post('/:phone/unblock', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const phone = req.params.phone;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    await auth.socket.updateBlockStatus(toJid(phone), 'unblock');
    res.json({ success: true, message: `Unblocked +${phone}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to unblock contact' });
  }
});

// ============================================================
// PUT /api/v1/contacts/:phone/name — update contact name (pushName)
// ============================================================
router.put(
  '/:phone/name',
  requireAuth,
  validate(z.object({ name: z.string().min(1).max(100) })),
  async (req: Request, res: Response) => {
    const auth = getAuthSocket(req);
    if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

    const phone = req.params.phone;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

    try {
      const name = (req.body as any).name;
      // Update local store name
      const store = (auth.socket as any).store;
      if (store?.contacts) {
        const jid = toJid(phone);
        const existing = store.contacts.get(jid) ?? {};
        store.contacts.upsert({ ...existing, id: jid, name });
      }
      res.json({ success: true, message: `Contact name updated: +${phone} → ${name}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to update contact name' });
    }
  }
);

// ============================================================
// GET /api/v1/contacts/lid-from-pn/:phone — get LID from phone number
// ============================================================
router.get('/lid-from-pn/:phone', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const phone = req.params.phone;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

  try {
    const results = await auth.socket.onWhatsApp(phone);
    const first = (results ?? [])[0];
    res.json({
      success: true,
      data: {
        phone,
        lid: first?.lid ?? null,
        jid: first?.jid ?? toJid(phone),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to resolve LID' });
  }
});

// ============================================================
// GET /api/v1/contacts/pn-from-lid/:lid — get phone number from LID
// ============================================================
router.get('/pn-from-lid/:lid', requireAuth, async (req: Request, res: Response) => {
  const auth = getAuthSocket(req);
  if ('error' in auth) return res.status(400).json({ success: false, message: auth.error });

  const lid = req.params.lid;
  if (!lid) return res.status(400).json({ success: false, message: 'LID required' });

  try {
    // Baileys can resolve LID to phone via store contacts
    const store = (auth.socket as any).store;
    if (store?.contacts) {
      const contact = store.contacts.get(lid);
      if (contact?.notify) {
        return res.json({ success: true, data: { lid, phone: contact.notify } });
      }
    }
    // Fallback: try onWhatsApp with LID
    res.json({ success: true, data: { lid, phone: null, note: 'Could not resolve phone from LID' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to resolve phone from LID' });
  }
});

export default router;
