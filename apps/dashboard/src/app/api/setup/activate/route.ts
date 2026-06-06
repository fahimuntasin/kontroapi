import { NextResponse } from 'next/server';
import { z } from 'zod';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const activateSchema = z.object({
  action: z.literal('activate'),
  key: z.string().min(1, 'Activation key is required'),
});

const requestSchema = z.object({
  action: z.literal('request'),
  email: z.string().email('Invalid email format'),
});

const actionSchema = z.discriminatedUnion('action', [activateSchema, requestSchema]);

const VALID_KEYS = [
  'kapi-free-community-0001',
  'kapi-beta-tester-000001',
  'kapi-dev-unlimited-000001',
];

function isValidKeyFormat(key: string): boolean {
  return /^kapi-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/i.test(key);
}

async function ensureSystemSettingsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`
  );
}

async function ensureActivationRequestsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS activation_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error?.errors?.[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    if (action === 'activate') {
      const { key } = parsed.data;

      if (!isValidKeyFormat(key)) {
        return NextResponse.json(
          { success: false, error: 'Invalid activation key format' },
          { status: 400 }
        );
      }

      if (!VALID_KEYS.includes(key)) {
        return NextResponse.json(
          { success: false, error: 'Invalid activation key' },
          { status: 400 }
        );
      }

      await ensureSystemSettingsTable();
      await query(
        `INSERT INTO system_settings (key, value)
         VALUES ('activation_key', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key]
      );

      return NextResponse.json({
        success: true,
        plan: 'community',
        expiresAt: null,
      });
    }

    if (action === 'request') {
      const { email } = parsed.data;

      await ensureActivationRequestsTable();
      await query(
        `INSERT INTO activation_requests (email) VALUES ($1)`,
        [email.toLowerCase()]
      );

      return NextResponse.json({
        success: true,
        message: 'Check your email for the activation key',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Activation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Activation failed' },
      { status: 500 }
    );
  }
}
