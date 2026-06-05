import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { generateApiKey, hashApiKey, encryptSecret } from '@kontroapi/shared';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import {
  startSession,
  disconnectSession,
  restartSession,
  unbanSession,
  getQrCode,
  getOrCreateSSEState,
} from '../lib/connections';
import { requireAuth, requirePAT } from '../middleware/auth';
import { requireInternalHmac } from '../middleware/internalHmac';
import { validate } from '../middleware/validate';
import { checkSessionLimit } from '../middleware/planCheck';
import { rateLimit } from '../middleware/rateLimit';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
  webhook_url: z.string().url().optional().nullable(),
  webhook_secret: z.string().min(8).optional().nullable(),
  proxy_url: z.string().optional().nullable(),
});

const updateSessionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  webhook_url: z.string().url().optional().nullable(),
  webhook_secret: z.string().min(8).optional().nullable(),
  webhook_events: z.array(z.string()).optional(),
  proxy_url: z.string().optional().nullable(),
  account_protection: z.boolean().optional(),
});

// GET /api/whatsapp-sessions — list user's sessions (PAT)
router.get('/', requireAuth, requirePAT, rateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('user_id', authReq.profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
});

// POST /api/whatsapp-sessions — create session (PAT)
router.post('/', requireAuth, requirePAT, checkSessionLimit, validate(createSessionSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.profile.id;

  // Generate hashed API key — raw key returned ONCE, never stored
  const { raw, hash } = generateApiKey('sk');

  // Encrypt webhook_secret if provided
  const webhookSecretEnc = (req.body as any).webhook_secret
    ? encryptSecret((req.body as any).webhook_secret)
    : null;

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert({
      user_id: userId,
      name: (req.body as any).name,
      api_key: hash,
      webhook_url: (req.body as any).webhook_url ?? null,
      webhook_secret_enc: webhookSecretEnc,
      proxy_url: (req.body as any).proxy_url ?? null,
    })
    .select('id, name, user_id, webhook_url, proxy_url, created_at')
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  // Log to local DB
  void localDb.query(
    `INSERT INTO session_logs (session_id, event, detail) VALUES ($1, $2, $3)`,
    [data.id, 'session_created', JSON.stringify({ action: 'session_created' })]
  );

  res.status(201).json({ success: true, data, api_key_raw: raw });
});

// GET /api/whatsapp-sessions/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', authReq.profile.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  res.json({ success: true, data });
});

// PUT /api/whatsapp-sessions/:id
router.put('/:id', requireAuth, requirePAT, validate(updateSessionSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  const updates: Record<string, unknown> = { ...(req.body as any) };
  // Encrypt webhook_secret if provided
  if (updates.webhook_secret) {
    updates.webhook_secret_enc = encryptSecret(updates.webhook_secret as string);
    delete updates.webhook_secret;
  }

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', authReq.profile.id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  res.json({ success: true, data });
});

// DELETE /api/whatsapp-sessions/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const sessionId = req.params.id!;

  const lookup = authReq.profile
    ? supabase.from('whatsapp_sessions').select('*').eq('id', sessionId).eq('user_id', authReq.profile.id)
    : supabase.from('whatsapp_sessions').select('*').eq('id', sessionId);

  const { data, error } = await (lookup as any).single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  // Disconnect active session
  await disconnectSession(sessionId);

  // Delete Baileys session files (creds + keys)
  const fs = await import('fs');
  const path = await import('path');
  const baileyPath = path.join(process.cwd(), '.baileys-sessions', sessionId);
  if (fs.existsSync(baileyPath)) {
    fs.rmSync(baileyPath, { recursive: true, force: true });
  }

  // Delete session_status (no need for stale status record)
  await localDb.query(`DELETE FROM session_status WHERE session_id = $1`, [sessionId]);

  // Keep session_logs and message_logs — they are historical records

  // Delete from Supabase
  await supabase
    .from('whatsapp_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', authReq.profile?.id ?? data.user_id);

  res.json({ success: true, message: 'Session logged out and deleted' });
});

// POST /api/whatsapp-sessions/:id/connect
// Accepts either PAT auth (requireAuth) or internal HMAC (requireInternalHmac)
router.post('/:id/connect', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const sessionId = req.params.id!;

  // Internal HMAC calls don't set profile — look up session by ID only
  const lookup = authReq.profile
    ? supabase.from('whatsapp_sessions').select('*').eq('id', sessionId).eq('user_id', authReq.profile.id)
    : supabase.from('whatsapp_sessions').select('*').eq('id', sessionId);

  const { data, error } = await (lookup as any).single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  const result = await startSession(data as any);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// POST /api/whatsapp-sessions/:id/disconnect
router.post('/:id/disconnect', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const sessionId = req.params.id!;

  const lookup = authReq.profile
    ? supabase.from('whatsapp_sessions').select('id').eq('id', sessionId).eq('user_id', authReq.profile.id)
    : supabase.from('whatsapp_sessions').select('id').eq('id', sessionId);

  const { data } = await (lookup as any).single();

  if (!data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  await disconnectSession(data.id);
  res.json({ success: true, message: 'Session disconnected' });
});

// POST /api/whatsapp-sessions/:id/restart
router.post('/:id/restart', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const sessionId = req.params.id!;

  const lookup = authReq.profile
    ? supabase.from('whatsapp_sessions').select('*').eq('id', sessionId).eq('user_id', authReq.profile.id)
    : supabase.from('whatsapp_sessions').select('*').eq('id', sessionId);

  const { data } = await (lookup as any).single();

  if (!data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  const result = await restartSession(data as any);
  res.json(result);
});

// POST /api/whatsapp-sessions/:id/unban
router.post('/:id/unban', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const sessionId = req.params.id!;

  const lookup = authReq.profile
    ? supabase.from('whatsapp_sessions').select('id').eq('id', sessionId).eq('user_id', authReq.profile.id)
    : supabase.from('whatsapp_sessions').select('id').eq('id', sessionId);

  const { data } = await (lookup as any).single();

  if (!data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  const result = await unbanSession(data.id);
  res.json(result);
});

// POST /api/whatsapp-sessions/:id/regenerate-key
router.post('/:id/regenerate-key', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { raw, hash } = generateApiKey('sk');

  let query = supabase
    .from('whatsapp_sessions')
    .update({ api_key: hash })
    .eq('id', req.params.id!);

  // For session_key/PAT auth, also scope by user_id
  if (authReq.auth_type !== 'internal_hmac') {
    query = query.eq('user_id', authReq.profile!.id) as any;
  }

  query = query.select().single() as any;
  const { data, error } = await (query as any);

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  res.json({ success: true, data: { api_key_raw: raw } });
});

// GET /api/whatsapp-sessions/:id/qrcode (SSE stream — sends QR + status events)
router.get('/:id/qrcode', requireAuth, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sessionId = req.params.id!;
  if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID required' });
  const state = getOrCreateSSEState(sessionId);

  const send = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  state.listeners.add(send);

  // Send current status on connect
  send(JSON.stringify({ type: 'status', status: state.currentState }));

  // Send initial QR if available
  const current = getQrCode(sessionId);
  if (current.qr) {
    send(JSON.stringify({ type: 'qr', qr: current.qr, expiresAt: current.expiresAt }));
  } else {
    send(JSON.stringify({ type: 'waiting', message: 'Waiting for QR code...' }));
  }

  const interval = setInterval(() => {
    const qr = getQrCode(sessionId);
    if (qr.qr) {
      send(JSON.stringify({ type: 'qr', qr: qr.qr, expiresAt: qr.expiresAt }));
    }
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
    state.listeners.delete(send);
    res.end();
  });
});

// GET /api/whatsapp-sessions/:id/qr (simple JSON, not SSE)
router.get('/:id/qr', requireAuth, (req: Request, res: Response) => {
  const sessionId = req.params.id!;
  if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID required' });
  const qr = getQrCode(sessionId);
  res.json({ success: true, data: { qr: qr.qr, expiresAt: qr.expiresAt } });
});

// GET /api/whatsapp-sessions/:id/message-logs — fetches from local DB
router.get('/:id/message-logs', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '20', 10) || 20));
  const direction = req.query.direction as string | undefined;
  const type = req.query.type as string | undefined;
  const level = req.query.level as string | undefined;

  let sql = `SELECT * FROM message_logs WHERE session_id = $1 AND user_id = $2`;
  const params: any[] = [req.params.id, authReq.profile.id];
  let paramIdx = 3;

  if (direction) { sql += ` AND direction = $${paramIdx++}`; params.push(direction); }
  if (type) { sql += ` AND type = $${paramIdx++}`; params.push(type); }
  if (level) { sql += ` AND level = $${paramIdx++}`; params.push(level); }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, (page - 1) * limit);

  const { rows, rowCount } = await localDb.query(sql, params);

  // Get total count
  let countSql = `SELECT COUNT(*) FROM message_logs WHERE session_id = $1 AND user_id = $2`;
  const countParams: any[] = [req.params.id, authReq.profile.id];
  if (direction) { countSql += ` AND direction = '${direction}'`; }
  if (type) { countSql += ` AND type = '${type}'`; }
  const { rows: countRows } = await localDb.query(countSql, countParams);
  const count = parseInt(countRows[0]?.count ?? '0', 10);

  res.json({ success: true, data: rows, count, page, limit });
});

// GET /api/whatsapp-sessions/:id/session-logs — fetches from local DB
router.get('/:id/session-logs', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '20', 10) || 20));

  const { rows } = await localDb.query(
    `SELECT * FROM session_logs WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.params.id, limit, (page - 1) * limit]
  );

  const { rows: countRows } = await localDb.query(
    `SELECT COUNT(*) FROM session_logs WHERE session_id = $1`,
    [req.params.id]
  );
  const count = parseInt(countRows[0]?.count ?? '0', 10);

  res.json({ success: true, data: rows, count, page, limit });
});

// GET /api/whatsapp-sessions/:id/status — reads from local PostgreSQL
router.get('/:id/status', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await localDb.query(
    `SELECT session_id, status, phone, last_qr, updated_at FROM session_status WHERE session_id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.json({ success: true, data: { status: 'disconnected', phone: null } });
  }

  res.json({ success: true, data: rows[0] });
});

export default router;
