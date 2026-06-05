'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusPulse } from '@/components/layout/status-pulse';
import { ScrollText, Search, RefreshCw, ArrowDown, ArrowUp, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  type: string;
  direction: string;
  to_from: string;
  content: string | null;
  media_url: string | null;
  message_id: string | null;
  wa_message_id: string | null;
  status: string;
  created_at: string;
}

const LEVEL_META: Record<string, { color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info: { color: 'text-[#5c5ff5]', variant: 'outline' },
  success: { color: 'text-emerald-400', variant: 'default' },
  warn: { color: 'text-yellow-400', variant: 'secondary' },
  error: { color: 'text-red-400', variant: 'destructive' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const limit = 50;

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setSessions(data.data);
        if (!selectedSession) setSelectedSession(data.data[0].id);
      }
    } catch { /* silent */ }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (levelFilter) params.set('level', levelFilter);
      if (dirFilter) params.set('direction', dirFilter);

      const res = await fetch(`/api/sessions/${selectedSession}/logs?${params}`);
      if (!res.ok) {
        setLogs([]);
        setCount(0);
        return;
      }
      const data = await res.json();
      setLogs(data.data || []);
      setCount(data.count || 0);
    } catch {
      setLogs([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedSession, page, levelFilter, dirFilter]);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(l => {
    if (!filter) return true;
    const lower = filter.toLowerCase();
    return (
      (l.content ?? '').toLowerCase().includes(lower) ||
      (l.to_from ?? '').includes(filter) ||
      (l.type ?? '').toLowerCase().includes(lower) ||
      (l.message_id ?? '').includes(lower)
    );
  });

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Message Logs</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Real-time stream of incoming and outgoing messages.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPulse status="connected" />
          <span className="text-[13px] text-muted-foreground">Live</span>
          <Button variant="ghost" size="icon-sm" onClick={loadLogs} className="ml-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSession}
            onChange={(e) => { setSelectedSession(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.id.slice(0, 8)}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              placeholder="Search messages..."
              className="w-64 pl-8 rounded-lg"
            />
          </div>
          <div className="flex gap-1">
            {(['in', 'out'] as const).map(d => (
              <button key={d} onClick={() => setDirFilter(dirFilter === d ? null : d)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  dirFilter === d ? 'bg-[#3a3fd4]/10 text-[#3a3fd4] dark:text-[#5c5ff5]' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}>
                {d === 'in' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                {d === 'in' ? 'In' : 'Out'}
              </button>
            ))}
            {(['info', 'success', 'warn', 'error'] as const).map(l => (
              <button key={l} onClick={() => setLevelFilter(levelFilter === l ? null : l)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                  levelFilter === l ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {count > 0 && (
        <p className="text-[12px] text-muted-foreground">{count} log entries</p>
      )}

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-[14px] text-muted-foreground">
                {selectedSession ? 'No logs found' : 'Connect a session to see logs'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="w-[90px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Time</TableHead>
                  <TableHead className="w-[50px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dir</TableHead>
                  <TableHead className="w-[60px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Type</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">From / To</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Content</TableHead>
                  <TableHead className="w-[60px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="border-b border-border/30">
                    <TableCell className="text-[12px] text-muted-foreground">
                      <div className="font-mono">{formatTime(log.created_at)}</div>
                      <div className="text-[10px] text-muted-foreground/50">{formatRelative(log.created_at)}</div>
                    </TableCell>
                    <TableCell>
                      {log.direction === 'out' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#5c5ff5]" />
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground capitalize">{log.type || 'text'}</TableCell>
                    <TableCell className="text-[12px] font-mono text-muted-foreground">{log.to_from || '—'}</TableCell>
                    <TableCell className="text-[12px] max-w-xs">
                      {log.content ? (
                        <span className="text-foreground truncate block">{log.content}</span>
                      ) : log.media_url ? (
                        <a href={log.media_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#5c5ff5] hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> media
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{log.status || 'sent'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[13px] text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}