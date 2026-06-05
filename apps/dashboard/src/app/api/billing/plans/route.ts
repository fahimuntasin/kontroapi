import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  
  const res = await fetch(`${waEngineUrl}/api/v1/billing/plans`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}