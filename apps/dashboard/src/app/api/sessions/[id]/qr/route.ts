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
    return NextResponse.json({ qr: null }, { status: 401 });
  }

  const session = await queryOne<{ id: string }>(
    'SELECT id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );
  if (!session) {
    return NextResponse.json({ qr: null }, { status: 404 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  try {
    const timestamp = Date.now().toString();
    const sig = createHmac('sha256', internalSecret).update(`${id}:qr:${timestamp}`).digest('hex');

    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/qr`, {
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': sig,
        'X-Timestamp': timestamp,
      },
    });
    const data = await res.json();
    return NextResponse.json({ qr: data.data?.qr ?? null });
  } catch {
    return NextResponse.json({ qr: null });
  }
}
