import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: user });
}
