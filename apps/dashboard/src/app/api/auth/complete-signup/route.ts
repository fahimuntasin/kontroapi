import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { registerAccountSchema } from '@kontroapi/shared';
import { registerUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

function hmacHeaders(body: Record<string, unknown>): Record<string, string> {
  const secret = process.env.WA_ENGINE_INTERNAL_SECRET ?? '';
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret)
    .update(`${JSON.stringify(body)}:${timestamp}:${nonce}`)
    .digest('hex');
  return {
    'X-KontroAPI-Signature': signature,
    'X-KontroAPI-Timestamp': timestamp,
    'X-KontroAPI-Nonce': nonce,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = registerAccountSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const { full_name, email, password, phone, verify_token } = validation.data;

  const tokenBody = { phone, verify_token };
  const tokenRes = await fetch(`${process.env.WA_ENGINE_URL}/api/v1/otp/validate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...hmacHeaders(tokenBody) },
    body: JSON.stringify(tokenBody),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.valid) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired verification token' },
      { status: 400 }
    );
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1',
    [email, phone]
  );

  if (existing) {
    return NextResponse.json(
      { success: false, message: 'Email or phone already registered' },
      { status: 409 }
    );
  }

  try {
    const { user } = await registerUser(email, password, full_name, phone);
    return NextResponse.json({ success: true, user_id: user.id });
  } catch (err: any) {
    console.error('[complete-signup] Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
