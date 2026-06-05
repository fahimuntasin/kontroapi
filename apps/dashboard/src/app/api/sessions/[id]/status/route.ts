import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await queryOne<any>(
    `SELECT id, name, status, phone, api_key, webhook_url, webhook_events, created_at, last_connected
     FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [id, user.id]
  );

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  const timestamp = Date.now().toString();
  const sig = createHmac('sha256', internalSecret).update(`${id}:status:${timestamp}`).digest('hex');

  try {
    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/status`, {
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': sig,
        'X-Timestamp': timestamp,
      },
    });

    if (res.ok) {
      const statusData = await res.json();
      if (statusData.data?.status) {
        session.status = statusData.data.status;
        if (statusData.data.phone) session.phone = statusData.data.phone;
      }
    }
  } catch { /* engine may be down */ }

  return NextResponse.json({ success: true, data: session });
}
