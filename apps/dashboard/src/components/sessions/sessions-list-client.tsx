'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPulse } from '@/components/layout/status-pulse';
import { toast } from 'sonner';
import { RotateCcw, Loader2, Smartphone, Settings, ShieldAlert, Copy, Check, Key, RefreshCw, Eye, EyeOff, Power } from 'lucide-react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface Session {
  id: string;
  name: string;
  status: string;
  phone?: string;
  created_at: string;
  api_key?: string;
  realStatus?: string;
}

const STATUS_META: Record<SessionStatus, { label: string; pulse: 'connected' | 'pending' | 'failed' | 'read' }> = {
  connected: { label: 'Connected', pulse: 'connected' },
  connecting: { label: 'Connecting', pulse: 'pending' },
  qr_pending: { label: 'QR Pending', pulse: 'pending' },
  disconnected: { label: 'Disconnected', pulse: 'failed' },
  reconnecting: { label: 'Reconnecting', pulse: 'pending' },
  authenticating: { label: 'Authenticating', pulse: 'pending' },
  banned: { label: 'Banned', pulse: 'failed' },
};

export default function SessionsListClient({ sessions: initialSessions }: { sessions: Session[] }) {
  const [sessions] = useState<Session[]>(initialSessions);
  const [statusMap, setStatusMap] = useState<Record<string, SessionStatus>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});
  const [showKeyFor, setShowKeyFor] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const map: Record<string, SessionStatus> = {};
    initialSessions.forEach(s => { map[s.id] = (s as any).realStatus ?? s.status as SessionStatus; });
    setStatusMap(map);
  }, [initialSessions]);

  useEffect(() => {
    const sources: EventSource[] = [];
    initialSessions.forEach(session => {
      const es = new EventSource(`/api/sessions/${session.id}/sse`);
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'status' && msg.status) {
            setStatusMap(prev => ({ ...prev, [session.id]: msg.status }));
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => { es.close(); };
      sources.push(es);
    });
    return () => { sources.forEach(es => es.close()); };
  }, [initialSessions]);

  async function handleAction(sessionId: string, action: string) {
    setActionLoading(prev => ({ ...prev, [sessionId]: action }));
    try {
      const res = await fetch(`/api/sessions/${sessionId}/${action}`, { method: 'POST' });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || `${action} failed`);
        return;
      }
      toast.success(result.message || `${action} successful`);
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: null }));
    }
  }

  async function handleRegenerate(sessionId: string) {
    if (!confirm('Are you sure? This will invalidate the current API key immediately.')) return;
    setRegenerating(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/regenerate-key`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setNewApiKey(prev => ({ ...prev, [sessionId]: result.data.api_key_raw }));
        setShowKeyFor(sessionId);
        toast.success('New API key generated!');
      } else {
        toast.error(result.message || 'Failed to regenerate key');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRegenerating(null);
    }
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const status = statusMap[session.id] ?? 'disconnected';
        const meta = STATUS_META[status];
        const loading = actionLoading[session.id];
        const revealedKey = newApiKey[session.id] ?? session.api_key;
        const isRevealed = showKeyFor === session.id;

        return (
          <div key={session.id} className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-[#3a3fd4]/5 dark:hover:shadow-[#5c5ff5]/5">
            <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${
              status === 'connected' ? 'bg-[#00D26A]' :
              status === 'connecting' || status === 'reconnecting' || status === 'authenticating' ? 'bg-[#3a3fd4]' :
              status === 'banned' ? 'bg-destructive' :
              'bg-border'
            }`} style={{ marginTop: '-20px' }} />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-[15px] font-semibold text-foreground">{session.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <StatusPulse status={meta.pulse} />
                    <span className="text-[11px] text-muted-foreground">{meta.label}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {session.phone ? `+${session.phone}` : 'No phone linked'}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground/60">
                  Created {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <code className="text-[12px] font-mono text-muted-foreground flex-1 truncate">
                    {isRevealed ? revealedKey : `${(revealedKey ?? '').slice(0, 10)}••••••••••••••••••••`}
                  </code>
                  <button onClick={() => setShowKeyFor(isRevealed ? null : session.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(revealedKey ?? ''); toast.success('API key copied!'); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {newApiKey[session.id] && isRevealed && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#3a3fd4]/30 bg-[#3a3fd4]/5 dark:bg-[#5c5ff5]/5 px-3 py-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#3a3fd4] dark:text-[#5c5ff5] shrink-0" />
                    <span className="text-[11px] text-[#3a3fd4] dark:text-[#5c5ff5] font-medium">Copy this key now — it won&apos;t be shown again</span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleAction(session.id, 'start')} disabled={loading !== null}
                  className="gap-1.5 rounded-xl text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" title="Start Session">
                  {loading === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleAction(session.id, 'disconnect')} disabled={loading !== null}
                  className="gap-1.5 rounded-xl text-red-400 hover:text-red-400 hover:bg-red-500/10" title="Disconnect">
                  {loading === 'disconnect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                </Button>
                <Link href={`/dashboard/sessions/${session.id}`}>
                  <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] text-white text-xs px-3">
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}