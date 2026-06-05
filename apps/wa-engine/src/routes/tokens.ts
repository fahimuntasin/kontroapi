import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import { requireInternalHmac } from '../middleware/internalHmac';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const createTokenSchema = z.object({
  name: z.string().min(1).max(50),
  expires_at: z.string().datetime().optional().or(z.literal('')),
});

// POST /api/tokens — create new PAT
router.post('/', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const parseResult = createTokenSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { name, expires_at } = parseResult.data;
  const token = 'pat_' + crypto.randomUUID().replace(/-/g, '');
  const expiresAt = expires_at ? new Date(expires_at) : null;

  try {
    const result = await localDb.query(
      `INSERT INTO personal_tokens (user_id, name, token, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, token, expires_at, created_at`,
      [userId, name, token, expiresAt]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        token: row.token,
        expires_at: row.expires_at,
        created_at: row.created_at,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return res.status(409).json({ success: false, message: 'Token generation failed, please try again' });
    }
    throw err;
  }
});

// GET /api/tokens — list user's tokens
router.get('/', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const result = await localDb.query(
      `SELECT id, name, last_used, expires_at, created_at
       FROM personal_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    throw err;
  }
});

// GET /api/tokens/:id — get single token
router.get('/:id', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await localDb.query(
      `SELECT id, name, last_used, expires_at, created_at
       FROM personal_tokens
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    throw err;
  }
});

// DELETE /api/tokens/:id — revoke token
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await localDb.query(
      `DELETE FROM personal_tokens
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    res.json({ success: true, message: 'Token revoked' });
  } catch (err) {
    throw err;
  }
});

export default router;