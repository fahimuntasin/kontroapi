import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const data = await query<any>(
    'SELECT id, name, status, phone, created_at FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );

  return NextResponse.json({ success: true, data });
}
