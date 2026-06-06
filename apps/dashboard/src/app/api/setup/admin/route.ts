import { NextResponse } from 'next/server';
import { z } from 'zod';
import { queryOne } from '@/lib/db';
import { hashPassword, signToken, setSessionCookie } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error?.errors?.[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );

    const passwordHash = hashPassword(password);

    let user: {
      id: string;
      email: string;
      full_name: string | null;
      role: string;
      plan: string;
      phone: string | null;
      session_limit: number;
      billing_status: string;
    } | null;

    if (existing) {
      user = await queryOne<
        {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          plan: string;
          phone: string | null;
          session_limit: number;
          billing_status: string;
        }
      >(
        `UPDATE users SET password_hash = $1, role = 'admin'
         WHERE id = $2
         RETURNING id, email, full_name, role, plan, phone, session_limit, billing_status`,
        [passwordHash, existing.id]
      );
    } else {
      user = await queryOne<
        {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          plan: string;
          phone: string | null;
          session_limit: number;
          billing_status: string;
        }
      >(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'admin')
         RETURNING id, email, full_name, role, plan, phone, session_limit, billing_status`,
        [email.toLowerCase(), passwordHash]
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create admin user' },
        { status: 500 }
      );
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error('Setup admin error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Admin setup failed' },
      { status: 500 }
    );
  }
}
