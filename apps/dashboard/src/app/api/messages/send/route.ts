import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function internalHmacHeaders(action: string): Record<string, string> {
  const secret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret)
    .update(`:${action}:${timestamp}`)
    .digest('hex');
  return { 'X-Signature': signature, 'X-Timestamp': timestamp };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const sessions = await query<{ id: string; status: string }>(
    'SELECT id, status FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );
  const connectedSession = sessions.find((s) => s.status === 'connected');
  const targetSession = connectedSession || sessions[0];

  if (!targetSession) {
    return NextResponse.json({ success: false, message: 'No WhatsApp sessions found. Create a session first.' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';

  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': user.id,
    'Authorization': `Bearer ${internalSecret}`,
    ...internalHmacHeaders('send-message'),
  };

  const res = await fetch(`${waEngineUrl}/api/v1/send-message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, session_id: targetSession.id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
