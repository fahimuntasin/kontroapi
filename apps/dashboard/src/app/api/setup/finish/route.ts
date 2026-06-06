import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    process.env.KONTROAPI_SETUP_COMPLETE = 'true';

    await query(
      `INSERT INTO system_settings (key, value)
       VALUES ('setup_complete', 'true')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
    );

    await query(
      `INSERT INTO system_settings (key, value)
       VALUES ('setup_completed_at', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [new Date().toISOString()]
    );

    return NextResponse.json({
      success: true,
      dashboardUrl: 'http://localhost:3001/dashboard',
    });
  } catch (err: any) {
    console.error('Setup finish error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Setup completion failed' },
      { status: 500 }
    );
  }
}
