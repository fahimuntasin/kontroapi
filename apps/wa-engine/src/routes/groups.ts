import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getSessionSocket } from '../lib/connections';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// ============================================================
// HELPER
// ============================================================

function getGroupSocket(req: Request) {
  const jid = req.params.jid;
  if (!jid) return { error: 'jid required' } as const;

  const authReq = req as AuthenticatedRequest;
  const session = authReq.session;
  if (!session) return { error: 'Session key required' } as const;

  const socket = getSessionSocket(session.id);
  if (!socket) return { error: 'Session not connected' } as const;

  return { jid, socket } as const;
}

// ============================================================
// POST /api/v1/groups/ — create a new group
// ============================================================
router.post(
  '/',
  requireAuth,
  validate(z.object({ name: z.string().min(1).max(100), participants: z.array(z.string()).min(1) })),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const session = authReq.session;
    if (!session) return res.status(400).json({ success: false, message: 'Session key required' });

    const socket = getSessionSocket(session.id);
    if (!socket) return res.status(400).json({ success: false, message: 'Session not connected' });

    const { name, participants } = req.body as { name: string; participants: string[] };
    try {
      const jids = participants.map((p) => `${p}@s.whatsapp.net`);
      const group = await socket.groupCreate(name, jids);
      res.status(201).json({ success: true, data: group });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to create group' });
    }
  }
);

// ============================================================
// GET /api/v1/groups/ — list all groups the user is in
// ============================================================
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const groups = await result.socket.groupFetchAllParticipating();
    const list = Object.values(groups).map((g: any) => ({
      id: g.id,
      subject: g.subject,
      participants_count: g.participants?.length ?? 0,
      created: g.creation,
      owner: g.owner,
    }));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch groups' });
  }
});

// ============================================================
// GET /api/v1/groups/:jid/metadata — full group metadata
// ============================================================
router.get('/:jid/metadata', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const meta = await result.socket.groupMetadata(result.jid);
    res.json({ success: true, data: meta });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch group metadata' });
  }
});

// ============================================================
// GET /api/v1/groups/:jid/participants — list participants
// ============================================================
router.get('/:jid/participants', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const meta = await result.socket.groupMetadata(result.jid);
    res.json({ success: true, data: meta.participants });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to fetch participants' });
  }
});

// ============================================================
// POST /api/v1/groups/:jid/participants/add — add participants
// ============================================================
router.post(
  '/:jid/participants/add',
  requireAuth,
  validate(z.object({ participants: z.array(z.string()).min(1) })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const participants = (req.body as any).participants as string[];
    try {
      const jids = participants.map((p) => `${p}@s.whatsapp.net`);
      const ret = await result.socket.groupParticipantsUpdate(result.jid, jids, 'add');
      res.json({ success: true, data: ret });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to add participants' });
    }
  }
);

// ============================================================
// POST /api/v1/groups/:jid/participants/remove — remove participants
// ============================================================
router.post(
  '/:jid/participants/remove',
  requireAuth,
  validate(z.object({ participants: z.array(z.string()).min(1) })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const participants = (req.body as any).participants as string[];
    try {
      const jids = participants.map((p) => `${p}@s.whatsapp.net`);
      const ret = await result.socket.groupParticipantsUpdate(result.jid, jids, 'remove');
      res.json({ success: true, data: ret });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to remove participants' });
    }
  }
);

// ============================================================
// PUT /api/v1/groups/:jid/participants/update — promote/demote
// ============================================================
router.put(
  '/:jid/participants/update',
  requireAuth,
  validate(z.object({
    participants: z.array(z.string()).min(1),
    action: z.enum(['promote', 'demote']),
  })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const body = req.body as { participants: string[]; action: 'promote' | 'demote' };
    try {
      const jids = body.participants.map((p) => `${p}@s.whatsapp.net`);
      const ret = await result.socket.groupParticipantsUpdate(result.jid, jids, body.action);
      res.json({ success: true, data: ret });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to update participants' });
    }
  }
);

// ============================================================
// GET /api/v1/groups/:jid/picture — group profile picture URL
// ============================================================
router.get('/:jid/picture', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const url = await result.socket.profilePictureUrl(result.jid, 'image');
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(404).json({ success: false, message: 'No profile picture found' });
  }
});

// ============================================================
// PUT /api/v1/groups/:jid/picture — update group profile picture
// ============================================================
router.put('/:jid/picture', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  const body = req.body as any;
  if (!body.base64 && !body.url) {
    return res.status(400).json({ success: false, message: 'base64 or url required' });
  }

  try {
    if (body.url) {
      const res2 = await fetch(body.url);
      const buffer = Buffer.from(await res2.arrayBuffer());
      await result.socket.updateProfilePicture(result.jid, buffer);
    } else {
      const buffer = Buffer.from(body.base64, 'base64');
      await result.socket.updateProfilePicture(result.jid, buffer);
    }
    res.json({ success: true, message: 'Group picture updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to update group picture' });
  }
});

// ============================================================
// PUT /api/v1/groups/:jid/settings — update group settings
// ============================================================
router.put(
  '/:jid/settings',
  requireAuth,
  validate(z.object({
    subject: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    announce: z.boolean().optional(),
    restrict: z.boolean().optional(),
  })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const body = req.body as { subject?: string; description?: string; announce?: boolean; restrict?: boolean };
    try {
      if (body.subject) await result.socket.groupUpdateSubject(result.jid, body.subject);
      if (body.description) await result.socket.groupUpdateDescription(result.jid, body.description);
      if (body.announce !== undefined) {
        await result.socket.groupSettingUpdate(result.jid, body.announce ? 'announcement' : 'not_announcement');
      }
      if (body.restrict !== undefined) {
        await result.socket.groupSettingUpdate(result.jid, body.restrict ? 'locked' : 'unlocked');
      }
      res.json({ success: true, message: 'Group settings updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to update group settings' });
    }
  }
);

// ============================================================
// GET /api/v1/groups/:jid/invite-link — get group invite link
// ============================================================
router.get('/:jid/invite-link', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const code = await result.socket.groupInviteCode(result.jid);
    res.json({ success: true, data: { link: `https://chat.whatsapp.com/${code}`, code } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to get invite link' });
  }
});

// ============================================================
// POST /api/v1/groups/:jid/invite-link/revoke — revoke current invite link
// ============================================================
router.post('/:jid/invite-link/revoke', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    const newCode = await result.socket.groupRevokeInvite(result.jid);
    res.json({ success: true, data: { link: `https://chat.whatsapp.com/${newCode}`, code: newCode } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to revoke invite link' });
  }
});

// ============================================================
// GET /api/v1/groups/invite/:code — get group info from invite code
// ============================================================
router.get('/invite/:code', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  const code = req.params.code;
  if (!code) return res.status(400).json({ success: false, message: 'code required' });

  try {
    const info = await result.socket.groupGetInviteInfo(code);
    res.json({ success: true, data: info });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to get invite info' });
  }
});

// ============================================================
// POST /api/v1/groups/invite/accept — accept group invite
// ============================================================
router.post(
  '/invite/accept',
  requireAuth,
  validate(z.object({ code: z.string().min(1) })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const code = (req.body as any).code;
    try {
      await result.socket.groupAcceptInvite(code);
      res.json({ success: true, message: 'Joined group via invite link' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to accept invite' });
    }
  }
);

// ============================================================
// POST /api/v1/groups/:jid/leave — leave a group
// ============================================================
router.post('/:jid/leave', requireAuth, async (req: Request, res: Response) => {
  const result = getGroupSocket(req);
  if ('error' in result) return res.status(400).json({ success: false, message: result.error });

  try {
    await result.socket.groupLeave(result.jid);
    res.json({ success: true, message: 'Left group' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message ?? 'Failed to leave group' });
  }
});

// ============================================================
// POST /api/v1/groups/:jid/broadcast — broadcast message to group
// ============================================================
router.post(
  '/:jid/broadcast',
  requireAuth,
  validate(z.object({
    text: z.string().min(1),
    type: z.enum(['text', 'image', 'video']).default('text'),
    caption: z.string().optional(),
    url: z.string().optional(),
    base64: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const result = getGroupSocket(req);
    if ('error' in result) return res.status(400).json({ success: false, message: result.error });

    const body = req.body as { text: string; type: string; caption?: string; url?: string; base64?: string };

    try {
      switch (body.type) {
        case 'text':
          await result.socket.sendMessage(result.jid, { text: body.text });
          break;
        case 'image': {
          const src = body.base64 ? Buffer.from(body.base64, 'base64') : body.url ? { url: body.url } : Buffer.alloc(0);
          await result.socket.sendMessage(result.jid, { image: src as any, caption: body.caption });
          break;
        }
        case 'video': {
          const src = body.base64 ? Buffer.from(body.base64, 'base64') : body.url ? { url: body.url } : Buffer.alloc(0);
          await result.socket.sendMessage(result.jid, { video: src as any, caption: body.caption });
          break;
        }
      }
      res.json({ success: true, message: 'Broadcast message sent to group' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message ?? 'Failed to send broadcast' });
    }
  }
);

export default router;
