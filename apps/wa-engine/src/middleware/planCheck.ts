import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { localDb } from '../lib/localDb';
import type { AuthenticatedRequest } from '../types';

export async function checkSessionLimit(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();

  const authReq = req as AuthenticatedRequest;
  const profile = authReq.profile;
  if (!profile) return next();

  // First try to get session limit from local subscription
  let sessionLimit = profile.session_limit;

  try {
    const subResult = await localDb.query(
      `SELECT p.session_limit
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [profile.id]
    );

    if (subResult.rows.length > 0) {
      sessionLimit = subResult.rows[0].session_limit;
    }
  } catch {
    // Fallback to Supabase profile limit
  }

  const { count } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  if ((count ?? 0) >= sessionLimit) {
    return res.status(403).json({
      success: false,
      message: `Session limit reached. Your plan allows ${sessionLimit} session(s).`,
    });
  }

  next();
}
