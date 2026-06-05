import { NextRequest, NextResponse } from 'next/server';
import { createSessionSchema, generateApiKey } from '@kontroapi/shared';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createSessionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const { name, webhook_url, webhook_secret, proxy_url } = validation.data;
  const { raw, hash } = generateApiKey('sk');

  const session = await queryOne<{ id: string }>(
    `INSERT INTO whatsapp_sessions (user_id, name, webhook_url, proxy_url, api_key)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [user.id, name, webhook_url || null, proxy_url || null, hash]
  );

  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Failed to create session' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    session_id: session.id,
    api_key: raw,
  });
}
