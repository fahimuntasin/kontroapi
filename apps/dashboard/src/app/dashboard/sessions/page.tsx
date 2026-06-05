import { redirect } from 'next/navigation';
import { createHmac } from 'crypto';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';
import SessionsListClient from '@/components/sessions/sessions-list-client';
import { Plus, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SessionRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  status: string;
  api_key: string | null;
  created_at: string;
  updated_at: string;
  webhook_url: string | null;
  webhook_secret: string | null;
}

interface SessionClient {
  id: string;
  name: string;
  status: string;
  phone?: string;
  created_at: string;
  api_key?: string;
  realStatus: string;
}

async function fetchSessionStatus(sessionId: string): Promise<string> {
  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET;
  if (!internalSecret) return 'disconnected';

  const timestamp = Date.now().toString();
  const sig = createHmac('sha256', internalSecret).update(`${sessionId}:status:${timestamp}`).digest('hex');

  try {
    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${sessionId}/status`, {
      headers: { 'Authorization': `Bearer ${internalSecret}`, 'X-Signature': sig, 'X-Timestamp': timestamp },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      return json.data?.status ?? 'disconnected';
    }
  } catch { /* ignore */ }
  return 'disconnected';
}

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) return redirect('/login');

  const sessions = await query<SessionRow>(
    'SELECT * FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );

  const sessionsWithStatus: SessionClient[] = await Promise.all(
    sessions.map(async (s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      phone: s.phone ?? undefined,
      created_at: s.created_at,
      api_key: s.api_key ?? undefined,
      realStatus: await fetchSessionStatus(s.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your WhatsApp connection state and health.</p>
        </div>
        <Link
          href="/dashboard/sessions/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] px-4 text-sm font-medium text-white shadow-md shadow-[#3a3fd4]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#3a3fd4]/30 hover:scale-[1.02]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Session
        </Link>
        <Link
          href="/dashboard/sessions"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10 mb-4">
            <Plus className="h-7 w-7 text-[#3a3fd4] dark:text-[#5c5ff5]" />
          </div>
          <p className="text-sm text-muted-foreground">No sessions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first WhatsApp session to get started</p>
          <Link
            href="/dashboard/sessions/new"
            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] px-4 text-sm font-medium text-white shadow-md shadow-[#3a3fd4]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#3a3fd4]/30"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <SessionsListClient sessions={sessionsWithStatus} />
      )}
    </div>
  );
}
