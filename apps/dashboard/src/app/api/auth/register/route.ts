import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1).max(100),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid input',
        errors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const result = await registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.full_name,
      parsed.data.phone
    );

    return NextResponse.json({ success: true, data: { user: result.user, token: result.token } });
  } catch (err: any) {
    if (err.message === 'Email already registered') {
      return NextResponse.json({ success: false, message: err.message }, { status: 409 });
    }
    console.error('Register error:', err);
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 });
  }
}
