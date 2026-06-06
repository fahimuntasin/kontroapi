import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    const complete = process.env.KONTROAPI_SETUP_COMPLETE === 'true';
    return NextResponse.json({
      setupNeeded: !complete || !admin,
      adminExists: !!admin,
    });
  } catch (err: any) {
    return NextResponse.json(
      { setupNeeded: true, adminExists: false, error: err.message }
    );
  }
}
