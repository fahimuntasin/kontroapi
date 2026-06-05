import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

function internalHmacHeaders(action: string): Record<string, string> {
  const secret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret)
    .update(`:${action}:${timestamp}`)
    .digest('hex');
  return { 'X-Signature': signature, 'X-Timestamp': timestamp };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { plan_id } = body;

  if (!plan_id) {
    return NextResponse.json({ success: false, message: 'Plan ID required' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';
  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': user.id,
    'Authorization': `Bearer ${internalSecret}`,
    ...internalHmacHeaders('checkout'),
  };

  const res = await fetch(`${waEngineUrl}/api/v1/billing/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan_id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
