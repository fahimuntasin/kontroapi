import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { session_id, phone, text, conversation_id } = body;

  if (!session_id || !phone || !text) {
    return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  try {
    const timestamp = Date.now().toString();
    const sig = createHmac('sha256', internalSecret)
      .update(`${session_id}:send:${timestamp}`)
      .digest('hex');

    const res = await fetch(`${waEngineUrl}/api/v1/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': sig,
        'X-Timestamp': timestamp,
      },
      body: JSON.stringify({ to: phone, type: 'text', text }),
    });

    const data = await res.json();

    if (conversation_id) {
      const messageId = data.data?.message_id || randomUUID();
      await query(
        `INSERT INTO chat_messages (conversation_id, message_id, direction, text, type)
         VALUES ($1, $2, 'out', $3, 'text')`,
        [conversation_id, messageId, text]
      );
      await query(
        `UPDATE chat_conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
        [text, conversation_id]
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: false, message: 'Send failed' }, { status: 500 });
  }
}
