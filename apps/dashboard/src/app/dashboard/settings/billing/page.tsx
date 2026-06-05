import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/auth';
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <BillingClient />;
}
