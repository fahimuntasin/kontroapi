import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function handleAction(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  action: string
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const session = await queryOne<{ id: string }>(
    'SELECT id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  try {
    const timestamp = Date.now().toString();
    const payload = `${id}:${action}:${timestamp}`;
    const signature = createHmac('sha256', internalSecret).update(payload).digest('hex');

    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach WA Engine' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAction(request, { params }, 'restart');
}
