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

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '').replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '88' + cleaned;
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  let { phone, brand = 'KontroAPI' } = body;

  if (!phone) {
    return NextResponse.json(
      { success: false, message: 'Phone number is required' },
      { status: 400 }
    );
  }

  phone = normalizePhone(phone);

  if (!/^8801[3-9]\d{8}$/.test(phone)) {
    return NextResponse.json(
      { success: false, message: 'Enter a valid BD number (e.g., 013XXXXXXXX)' },
      { status: 400 }
    );
  }

  const reqBody = { phone, brand };
  const res = await fetch(`${process.env.WA_ENGINE_URL}/api/v1/otp/send`, {
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