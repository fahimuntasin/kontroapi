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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '50';
  const direction = searchParams.get('direction') ?? '';
  const type = searchParams.get('type') ?? '';
  const level = searchParams.get('level') ?? '';

  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': user.id,
    'Authorization': `Bearer ${process.env.WA_ENGINE_INTERNAL_SECRET}`,
    ...internalHmacHeaders('get-logs'),
  };

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const query = new URLSearchParams({ page, limit });
  if (direction) query.set('direction', direction);
  if (type) query.set('type', type);
  if (level) query.set('level', level);

  const res = await fetch(
    `${waEngineUrl}/api/v1/whatsapp-sessions/${sessionId}/message-logs?${query}`,
    { headers }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
