import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginWithEmail } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 });
    }

    const result = await loginWithEmail(parsed.data.email, parsed.data.password);
    if (!result) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: { user: result.user, token: result.token } });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 });
  }
}
