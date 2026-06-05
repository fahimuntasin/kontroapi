import { NextRequest, NextResponse } from 'next/server';
import { updateSessionSchema, encryptSecret } from '@kontroapi/shared';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
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

  const body = await request.json();
  const validation = updateSessionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ success: false, message: validation.error.errors[0]?.message }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...validation.data };
  if (updates.webhook_url === '') updates.webhook_url = null;
  if (updates.webhook_secret === '') updates.webhook_secret = null;
  if (updates.proxy_url === '') updates.proxy_url = null;

  if (typeof updates.webhook_secret === 'string' && updates.webhook_secret.length > 0) {
    (updates as any).webhook_secret_enc = encryptSecret(updates.webhook_secret as string);
    delete updates.webhook_secret;
  }

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (fields.length === 0) return NextResponse.json({ success: true });
  values.push(id);

  await query(
    `UPDATE whatsapp_sessions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
    values
  );

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;
  try {
    const timestamp = Date.now().toString();
    const sig = createHmac('sha256', internalSecret).update(`${id}:settings:${timestamp}`).digest('hex');
    await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'X-Signature': sig,
        'X-Timestamp': timestamp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
  } catch { /* engine may be down */ }

  return NextResponse.json({ success: true });
}
