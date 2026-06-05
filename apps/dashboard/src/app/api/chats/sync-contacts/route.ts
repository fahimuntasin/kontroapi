import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ success: false, message: 'session_id required' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';

  try {
    const session = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
      [session_id, user.id]
    );
    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }

    const res = await fetch(`${waEngineUrl}/api/v1/contacts`, {
      headers: { 'Authorization': `Bearer ${process.env.WA_ENGINE_INTERNAL_SECRET ?? ''}` },
    });

    const data = await res.json();
    if (!data.success || !data.data) {
      return NextResponse.json({
        success: false,
        message: data.message || 'Failed to fetch contacts',
      });
    }

    let synced = 0;
    for (const contact of data.data as any[]) {
      const phone = contact.id?.replace(/@.*$/, '') || contact.notify;
      if (!phone) continue;

      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM chat_conversations WHERE user_id = $1 AND session_id = $2 AND phone = $3 LIMIT 1',
        [user.id, session_id, phone]
      );

      if (!existing) {
        await query(
          `INSERT INTO chat_conversations (user_id, session_id, phone, push_name, last_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, session_id, phone, contact.name || contact.notify || phone, 'Synced from contacts']
        );
        synced++;
      }
    }

    return NextResponse.json({ success: true, synced, total: data.data.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
