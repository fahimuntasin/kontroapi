import { notFound, redirect } from 'next/navigation';
import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SessionSettingsForm from '@/components/sessions/session-settings-form';
import SessionQRCode from '@/components/sessions/session-qr-code';
import SessionActions from '@/components/sessions/session-actions';
import { StatusBadge } from '@/components/sessions/status-badge';
import { StatusMessage } from '@/components/sessions/status-message';
import Link from 'next/link';

type SessionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'banned';

async function fetchRealTimeStatus(sessionId: string): Promise<SessionStatus> {
  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET;

  if (!internalSecret) return 'disconnected';

  const timestamp = Date.now().toString();
  const sig = createHmac('sha256', internalSecret).update(`${sessionId}:status:${timestamp}`).digest('hex');

  try {
    const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${sessionId}/status`, {
      headers: {
        Authorization: `Bearer ${internalSecret}`,
        'X-Signature': sig,
        'X-Timestamp': timestamp,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      return json.data?.status ?? 'disconnected';
    }
  } catch {
    // WA engine unavailable
  }

  return 'disconnected';
}

export default async function SessionSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 md:p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{session.name}</h1>
            <StatusBadge sessionId={session.id} initialStatus={realStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            Quick QR linking and webhook settings in one place
          </p>
        </div>
        <Link href={`/dashboard/sessions/${id}`}>
          <Button variant="outline">Back to Session</Button>
        </Link>
      </div>

      <SessionActions session={session} initialStatus={realStatus} />

      {(realStatus === 'connecting' || realStatus === 'reconnecting' || realStatus === 'authenticating') && (
        <StatusMessage sessionId={session.id} initialStatus={realStatus} />
      )}

      {realStatus === 'qr_pending' && <SessionQRCode sessionId={session.id} />}

      <SessionSettingsForm session={session} />

      <Card className="border-red-500/35 bg-red-500/[0.04]">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={`/api/sessions/${id}/delete`} method="POST">
            <Button type="submit" variant="destructive">Delete Session</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
