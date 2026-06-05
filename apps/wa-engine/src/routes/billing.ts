import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import { requireAuth, requirePAT } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { requireInternalHmac } from '../middleware/internalHmac';
import type { AuthenticatedRequest } from '../types';
import type { Plan } from '@kontroapi/shared';

const router = Router();

const NAAFIPAY_BASE_URL = process.env.NAAFIPAY_BASE_URL ?? 'https://api.naafipay.com';
const NAAFIPAY_API_KEY = process.env.NAAFIPAY_API_KEY ?? '';
const NAAFIPAY_WEBHOOK_SECRET = process.env.NAAFIPAY_WEBHOOK_SECRET ?? '';
const DASHBOARD_PUBLIC_URL = process.env.DASHBOARD_URL ?? 'http://localhost:3001';

const checkoutSchema = z.object({
  plan_id: z.string(),
});

const PLANS = {
  trial: { id: 'trial', name: 'Trial', price: 0, session_limit: 1, rpm: 1, daily_msg: 50, features: ['1 session', '50 messages/day', 'Basic support'] },
  basic: { id: 'basic', name: 'Basic', price: 699, session_limit: 1, rpm: 256, daily_msg: null, features: ['1 session', 'Unlimited messages', 'Priority support'] },
  pro: { id: 'pro', name: 'Pro', price: 1499, session_limit: 3, rpm: 256, daily_msg: null, features: ['3 sessions', 'Unlimited messages', 'Priority support', 'Webhooks'] },
  plus: { id: 'plus', name: 'Plus', price: 2999, session_limit: 6, rpm: 256, daily_msg: null, features: ['6 sessions', 'Unlimited messages', 'Priority support', 'Webhooks', 'Advanced analytics'] },
  business: { id: 'business', name: 'Business', price: 4499, session_limit: 10, rpm: 256, daily_msg: null, features: ['10 sessions', 'Unlimited messages', 'Dedicated support', 'Webhooks', 'Advanced analytics', 'API access'] },
};

function verifyNaafipaySignature(rawBody: string, signature: string, timestamp: string): boolean {
  if (!NAAFIPAY_WEBHOOK_SECRET) return false;
  if (!signature || !timestamp) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac('sha256', NAAFIPAY_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const result = await localDb.query(
      `SELECT id, name, price, currency, session_limit, rpm, daily_msg, features, is_active
       FROM plans
       WHERE is_active = true
       ORDER BY price ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    res.json({
      success: true,
      data: Object.values(PLANS),
    });
  }
});

router.get('/subscription', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    const authReq = req as AuthenticatedRequest;
    const profile = authReq.profile;
    if (!profile) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return getSubscriptionData(profile.id, res);
  }

  return getSubscriptionData(userId, res);
});

async function getSubscriptionData(userId: string, res: Response) {
  try {
    const subResult = await localDb.query(
      `SELECT s.id, s.plan_id, s.status, s.started_at, s.canceled_at,
              s.np_invoice_id, s.np_subscription_id, s.np_payment_id,
              p.name as plan_name, p.price, p.session_limit, p.rpm, p.daily_msg, p.features
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          plan_id: 'trial',
          plan_name: 'Trial',
          price: 0,
          session_limit: 1,
          status: 'trial',
        },
      });
    }

    res.json({
      success: true,
      data: subResult.rows[0],
    });
  } catch (err) {
    res.json({
      success: true,
      data: {
        plan_id: 'trial',
        plan_name: 'Trial',
        price: 0,
        session_limit: 1,
        status: 'trial',
      },
    });
  }
}

router.get('/usage', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const sessionResult = await supabase
      .from('whatsapp_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const sessionCount = sessionResult.count ?? 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msgResult = await localDb.query(
      `SELECT COUNT(*)::int as count
       FROM message_logs
       WHERE user_id = $1 AND direction = 'out' AND created_at >= $2`,
      [userId, today]
    );

    const messageCountToday = msgResult.rows[0]?.count ?? 0;

    const subResult = await localDb.query(
      `SELECT p.session_limit, p.rpm, p.daily_msg
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [userId]
    );

    const limits = subResult.rows[0] ?? { session_limit: 1, rpm: 1, daily_msg: 50 };

    res.json({
      success: true,
      data: {
        sessions: {
          current: sessionCount,
          limit: limits.session_limit,
        },
        messages_today: {
          current: messageCountToday,
          limit: limits.daily_msg,
        },
      },
    });
  } catch (err) {
    throw err;
  }
});

router.post('/checkout', requireInternalHmac, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const parseResult = checkoutSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { plan_id } = parseResult.data;
  const plan = PLANS[plan_id as keyof typeof PLANS];

  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid plan' });
  }

  if (plan.price === 0) {
    return res.status(400).json({ success: false, message: 'Free plan, no checkout required' });
  }

  const profileResult = await supabase
    .from('profiles')
    .select('phone, email, full_name')
    .eq('id', userId)
    .single();

  const phone = profileResult.data?.phone;
  const email = profileResult.data?.email;
  const fullName = profileResult.data?.full_name ?? 'KontroAPI Customer';

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required for billing' });
  }

  if (!NAAFIPAY_API_KEY) {
    return res.status(500).json({ success: false, message: 'NaafiPay not configured' });
  }

  const successUrl = `${DASHBOARD_PUBLIC_URL}/dashboard/settings/billing?status=success`;
  const cancelUrl = `${DASHBOARD_PUBLIC_URL}/dashboard/settings/billing?status=cancelled`;
  const webhookUrl = `${DASHBOARD_PUBLIC_URL}/api/webhooks/naafipay`;

  try {
    const npResponse = await axios.post(
      `${NAAFIPAY_BASE_URL}/api/checkout`,
      {
        full_name: fullName,
        email,
        amount: plan.price,
        currency: 'BDT',
        success_url: successUrl,
        cancel_url: cancelUrl,
        webhook_url: webhookUrl,
        metadata: {
          user_id: userId,
          plan_id,
          phone: phone ?? '',
        },
      },
      {
        headers: {
          'RT-PAYMENT-API-KEY': NAAFIPAY_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const { invoice_id, checkout_url, amount, currency, status, expires_at } = npResponse.data ?? {};

    if (!invoice_id || !checkout_url) {
      return res.status(502).json({ success: false, message: 'Invalid response from NaafiPay' });
    }

    await localDb.query(
      `INSERT INTO pending_checkouts (id, user_id, plan_id, amount, currency, status, checkout_url, redirect_url, webhook_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         checkout_url = EXCLUDED.checkout_url,
         expires_at = EXCLUDED.expires_at`,
      [invoice_id, userId, plan_id, amount, currency, status, checkout_url, successUrl, webhookUrl, expires_at]
    );

    res.json({
      success: true,
      data: {
        invoice_id,
        checkout_url,
        plan_id,
        amount,
        currency,
      },
    });
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message ?? err?.message ?? 'NaafiPay checkout failed';
    console.error('NaafiPay checkout error:', status, message);
    res.status(502).json({ success: false, message, naafipay_status: status });
  }
});

router.post('/verify/:invoice_id', requireInternalHmac, async (req: Request, res: Response) => {
  const { invoice_id } = req.params;

  if (!NAAFIPAY_API_KEY) {
    return res.status(500).json({ success: false, message: 'NaafiPay not configured' });
  }

  try {
    const npResponse = await axios.post(
      `${NAAFIPAY_BASE_URL}/api/verify-payment`,
      { invoice_id },
      {
        headers: {
          'RT-PAYMENT-API-KEY': NAAFIPAY_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    res.json({ success: true, data: npResponse.data });
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message ?? err?.message ?? 'NaafiPay verify failed';
    res.status(502).json({ success: false, message, naafipay_status: status });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody as string | undefined;
  const signature = req.headers['x-paygate-signature-v2'] as string | undefined;
  const timestamp = req.headers['x-paygate-timestamp'] as string | undefined;

  if (rawBody && signature && timestamp) {
    if (!verifyNaafipaySignature(rawBody, signature, timestamp)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
  }

  const { event, invoice_id, payment_status, amount, currency, metadata } = req.body ?? {};

  if (event === 'payment.completed' && invoice_id && payment_status === 'completed' && metadata?.user_id && metadata?.plan_id) {
    try {
      await localDb.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, np_invoice_id, np_payment_id, amount, currency)
         VALUES ($1, $2, 'active', $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           status = 'active',
           np_invoice_id = EXCLUDED.np_invoice_id,
           np_payment_id = EXCLUDED.np_payment_id,
           amount = EXCLUDED.amount,
           currency = EXCLUDED.currency,
           updated_at = now()`,
        [metadata.user_id, metadata.plan_id, invoice_id, invoice_id, amount, currency]
      );

      await supabase
        .from('profiles')
        .update({ plan: metadata.plan_id, billing_status: 'active' })
        .eq('id', metadata.user_id);

      await localDb.query(
        `UPDATE pending_checkouts SET status = 'completed' WHERE id = $1`,
        [invoice_id]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error('NaafiPay webhook processing error:', err);
      return res.status(500).json({ success: false, message: 'Processing failed' });
    }
  }

  if (event === 'subscription.cancelled' && metadata?.user_id) {
    try {
      await localDb.query(
        `UPDATE subscriptions SET status = 'canceled', canceled_at = now(), updated_at = now()
         WHERE user_id = $1 AND status = 'active'`,
        [metadata.user_id]
      );
      await supabase
        .from('profiles')
        .update({ billing_status: 'canceled' })
        .eq('id', metadata.user_id);
    } catch (err) {
      console.error('NaafiPay cancel webhook error:', err);
    }
  }

  res.json({ success: true });
});

router.post('/cancel', requireAuth, requirePAT, rateLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    await localDb.query(
      `UPDATE subscriptions
       SET status = 'canceled', canceled_at = now(), updated_at = now()
       WHERE user_id = $1 AND status = 'active'`,
      [authReq.profile.id]
    );

    await supabase
      .from('profiles')
      .update({ billing_status: 'canceled' })
      .eq('id', authReq.profile.id);

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    throw err;
  }
});

export default router;
