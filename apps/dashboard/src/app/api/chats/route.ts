import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await query<any>(
    'SELECT * FROM chat_conversations WHERE user_id = $1 ORDER BY last_message_at DESC NULLS LAST',
    [user.id]
  );

  return NextResponse.json({ success: true, data: conversations });
}
