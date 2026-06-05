import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const session = await queryOne<{ id: string }>(
    'SELECT id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );
  if (!session) return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  try {
    const action = 'delete';
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', internalSecret).update(`${id}:${action}:${timestamp}`).digest('hex');

    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
    });
    const data = await res.json();

    if (data.success) {
      await query('DELETE FROM whatsapp_sessions WHERE id = $1', [id]);
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach WA Engine' }, { status: 502 });
  }
}
