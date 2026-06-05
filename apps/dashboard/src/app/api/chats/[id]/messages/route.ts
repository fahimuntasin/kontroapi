import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const convo = await queryOne<{ id: string }>(
    'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );
  if (!convo) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const since = url.searchParams.get('since');

  const messages = since
    ? await query<any>(
        'SELECT * FROM chat_messages WHERE conversation_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 200',
        [id, since]
      )
    : await query<any>(
        'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200',
        [id]
      );

  return NextResponse.json({ success: true, data: messages });
}
