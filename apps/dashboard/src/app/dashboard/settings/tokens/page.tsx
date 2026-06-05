import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/auth';
import TokensClient from './tokens-client';

export const dynamic = 'force-dynamic';

export default async function TokensPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <TokensClient />;
}
