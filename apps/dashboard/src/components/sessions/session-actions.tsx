'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Power, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface Props {
  session: { id: string; name: string; status: string; api_key: string };
  initialStatus?: SessionStatus;
}

export default function SessionActions({ session, initialStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>(initialStatus ?? (session.status as SessionStatus));

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${session.id}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status' && msg.status) setStatus(msg.status);
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [session.id]);

  async function action(type: string) {
    setLoading(type);
    try {
      const res = await fetch(`/api/sessions/${session.id}/${type}`, { method: 'POST' });
      const result = await res.json();
      if (!result.success) { toast.error(result.message || `${type} failed`); return; }
      toast.success(`${type} successful`);
    } catch { toast.error('Network error'); }
    finally { setLoading(null); }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect and delete this session? You will need to scan a new QR code to reconnect.')) return;
    setLoading('disconnect');
    try {
      const res1 = await fetch(`/api/sessions/${session.id}/disconnect`, { method: 'POST' });
      const result1 = await res1.json();
      if (!result1.success) { toast.error(result1.message || 'Disconnect failed'); setLoading(null); return; }
      const res2 = await fetch(`/api/sessions/${session.id}/delete`, { method: 'POST' });
      const result2 = await res2.json();
      if (!result2.success) { toast.error(result2.message || 'Delete failed'); setLoading(null); return; }
      toast.success('Session deleted');
      router.push('/dashboard/sessions');
    } catch { toast.error('Network error'); }
    finally { setLoading(null); }
  }

  async function handleUnban() {
    if (!window.confirm('Reset session to disconnected state? You will need to re-scan the QR code.')) return;
    setLoading('unban');
    try {
      const res = await fetch(`/api/sessions/${session.id}/unban`, { method: 'POST' });
      const result = await res.json();
      if (!result.success) { toast.error(result.message || 'Unban failed'); return; }
      toast.success(result.message || 'Session unbanned');
    } catch { toast.error('Network error'); }
    finally { setLoading(null); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Actions</CardTitle>
        <CardDescription>Start, reconnect, or safely remove this session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {(status === 'disconnected' || status === 'banned') && (
            <Button onClick={() => action('start')} disabled={loading !== null}>
              {loading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Start Session
            </Button>
          )}
          {(status === 'connected' || status === 'qr_pending' || status === 'reconnecting' || status === 'connecting') && (
            <Button variant="destructive" onClick={() => handleDisconnect()} disabled={loading !== null}>
              {loading === 'disconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Disconnect
            </Button>
          )}
          {(status === 'connected' || status === 'disconnected') && (
            <Button variant="outline" onClick={() => action('restart')} disabled={loading !== null}>
              {loading === 'restart' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restart
            </Button>
          )}
          {status === 'banned' && (
            <Button variant="outline" onClick={handleUnban} disabled={loading !== null}>
              {loading === 'unban' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Unban Session
            </Button>
          )}
          {status === 'banned' && (
            <Button variant="destructive" onClick={() => handleDisconnect()} disabled={loading !== null}>
              {loading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
