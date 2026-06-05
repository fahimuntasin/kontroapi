import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/sessions/status-badge';
import { StatusContent } from '@/components/sessions/status-content';
import { StatusMessage } from '@/components/sessions/status-message';
import { Smartphone, Clock, Phone, ArrowLeft, ShieldCheck } from 'lucide-react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

async function fetchRealTimeStatus(sessionId: string): Promise<SessionStatus> {
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
  } catch { /* fall through */ }
  return 'disconnected';
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const session = await queryOne<any>(
    'SELECT * FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );

  if (!session) return notFound();
  const realStatus = await fetchRealTimeStatus(session.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-[#3a3fd4] dark:text-[#5c5ff5]" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{session.name}</h1>
          <StatusBadge sessionId={session.id} initialStatus={realStatus} />
        </div>
        <Link href="/dashboard/sessions">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        </Link>
      </div>

      <StatusContent sessionId={session.id} initialStatus={realStatus}>
        {{
          qr_pending: (
            <>
              <SessionQRCode sessionId={session.id} />
              <StatusMessage sessionId={session.id} initialStatus={realStatus} />
            </>
          ),
          connected: (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
                  <ShieldCheck className="h-6 w-6 text-[#3a3fd4] dark:text-[#5c5ff5]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Session Active</h2>
                  <p className="text-sm text-muted-foreground">Your WhatsApp session is connected</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="grid gap-3 sm:grid-cols-2">
                {session.phone && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3">
                    <Phone className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground">+{session.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3">
                  <Clock className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Created</p>
                    <p className="text-sm font-medium text-foreground">{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                {session.last_connected && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3">
                    <Clock className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Last connected</p>
                      <p className="text-sm font-medium text-foreground">{new Date(session.last_connected).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ),
          disconnected: (
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Smartphone className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Session Disconnected</h2>
              <p className="mt-1 text-sm text-muted-foreground">Click Start Session to connect your WhatsApp</p>
            </div>
          ),
          connecting: <StatusMessage sessionId={session.id} initialStatus={realStatus} />,
          reconnecting: <StatusMessage sessionId={session.id} initialStatus={realStatus} />,
          authenticating: <StatusMessage sessionId={session.id} initialStatus={realStatus} />,
          banned: (
            <div className="glass-card rounded-2xl p-6 border-destructive/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-4">
                <ShieldCheck className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-destructive text-center">Session Banned</h2>
              <p className="mt-1 text-sm text-muted-foreground text-center">This session has been banned. Contact support.</p>
            </div>
          ),
        }}
      </StatusContent>

      <SessionSettingsForm session={session} initialStatus={realStatus} />
    </div>
  );
}

import SessionQRCode from '@/components/sessions/session-qr-code';
import SessionSettingsForm from '@/components/sessions/session-settings-form';