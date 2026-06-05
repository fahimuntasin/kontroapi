import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

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
  const { phone, otp } = body;

  if (!phone || !otp) {
    return NextResponse.json(
      { success: false, message: 'Phone and OTP are required' },
      { status: 400 }
    );
  }

  const reqBody = { phone, otp };
  const res = await fetch(`${process.env.WA_ENGINE_URL}/api/v1/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...hmacHeaders(reqBody),
    },
    body: JSON.stringify(reqBody),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
