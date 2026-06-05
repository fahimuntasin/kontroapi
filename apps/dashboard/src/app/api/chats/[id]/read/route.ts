import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
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

  await queryOne(
    'UPDATE chat_conversations SET unread_count = 0 WHERE id = $1 RETURNING id',
    [id]
  );

  return NextResponse.json({ success: true });
}
