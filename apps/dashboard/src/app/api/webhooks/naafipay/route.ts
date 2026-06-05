import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NAAFIPAY_WEBHOOK_SECRET = process.env.NAAFIPAY_WEBHOOK_SECRET ?? '';

async function readBody(request: NextRequest): Promise<string> {
  return await request.text();
}

function verifySignature(rawBody: string, signature: string, timestamp: string): boolean {
  if (!NAAFIPAY_WEBHOOK_SECRET) return false;
  if (!signature || !timestamp) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;

  const expected = createHmac('sha256', NAAFIPAY_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await readBody(request);
  const signature = request.headers.get('x-paygate-signature-v2') ?? '';
  const timestamp = request.headers.get('x-paygate-timestamp') ?? '';

  if (NAAFIPAY_WEBHOOK_SECRET) {
    if (!verifySignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ received: false, message: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const { event, invoice_id, payment_status, metadata } = payload ?? {};
  const userId = metadata?.user_id;
  const planId = metadata?.plan_id;

  if (!userId || !planId) {
    return NextResponse.json({ received: true, ignored: 'missing metadata' });
  }

  if (event === 'payment.completed' && payment_status === 'completed') {
    try {
      await query(
        `UPDATE users
         SET plan = $1, billing_status = 'active', np_invoice_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [planId, invoice_id ?? null, userId]
      );
    } catch (err: any) {
      console.error('NaafiPay webhook profile update failed:', err);
      return NextResponse.json({ received: false, message: err.message }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  if (event === 'payment.failed' || event === 'payment.cancelled') {
    await query(
      `UPDATE users SET billing_status = $1, updated_at = NOW() WHERE id = $2`,
      [event === 'payment.cancelled' ? 'canceled' : 'payment_failed', userId]
    );
    return NextResponse.json({ received: true });
  }

  if (event === 'subscription.cancelled' || event === 'subscription.expired') {
    await query(
      `UPDATE users SET billing_status = 'canceled', updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true, ignored: event });
}
