import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (fields.length === 0) {
    return NextResponse.json({ success: true });
  }
  values.push(user.id);

  await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
    values
  );

  return NextResponse.json({ success: true });
}
