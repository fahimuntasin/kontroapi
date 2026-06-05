import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne, query } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SessionLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const session = await queryOne<{ id: string; name: string; user_id: string }>(
    'SELECT id, name, user_id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );

  if (!session) return notFound();

  const logs = await query<any>(
    'SELECT * FROM session_logs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 50',
    [id]
  );

  const messages = await query<any>(
    'SELECT * FROM message_logs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 50',
    [id]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs: {session.name}</h1>
          <p className="text-sm text-muted-foreground">Session activity and message history</p>
        </div>
        <Link href={`/dashboard/sessions/${id}`}>
          <Button variant="outline">Back to Session</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Activity</CardTitle>
          <CardDescription>Connection events and status changes</CardDescription>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium capitalize">{log.event.replace('_', ' ')}</span>
                    {log.detail && typeof log.detail === 'object' && 'phone' in (log.detail as any) && (
                      <span className="ml-2 text-muted-foreground">+{(log.detail as any).phone}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>Incoming and outgoing messages</CardDescription>
        </CardHeader>
        <CardContent>
          {!messages || messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages logged yet</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full ${msg.direction === 'in' ? 'bg-green-400' : 'bg-blue-400'}`} />
                    <span className="font-medium">{msg.direction === 'in' ? 'Received' : 'Sent'}</span>
                    <span className="text-muted-foreground">{msg.to_from}</span>
                    <span className="text-muted-foreground">({msg.type})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{msg.status}</span>
                    <span className="text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
