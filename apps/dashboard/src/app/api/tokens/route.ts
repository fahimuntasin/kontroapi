import { NextRequest, NextResponse } from 'next/server';
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

async function makeHeaders(userId: string): Promise<Record<string, string>> {
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';
  return {
    'Content-Type': 'application/json',
    'X-User-ID': userId,
    'Authorization': `Bearer ${internalSecret}`,
    ...internalHmacHeaders('tokens'),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${waEngineUrl}/api/v1/tokens`, {
    method: 'GET',
    headers: await makeHeaders(user.id),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${waEngineUrl}/api/v1/tokens`, {
    method: 'POST',
    headers: await makeHeaders(user.id),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, message: 'Token ID required' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${waEngineUrl}/api/v1/tokens/${id}`, {
    method: 'DELETE',
    headers: await makeHeaders(user.id),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
