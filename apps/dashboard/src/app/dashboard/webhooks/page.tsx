'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CodeBlock } from '@/components/ui/code-block';
import { toast } from 'sonner';
import { Save, Globe, Zap, MessageSquare, CheckCircle, Unplug, QrCode, RefreshCw, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import Link from 'next/link';

interface SessionSummary {
  id: string;
  name: string;
  status: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_events: string[] | null;
}

const events = [
  { id: 'messages.received', label: 'Message Received', desc: 'Incoming text or media from users', icon: MessageSquare },
  { id: 'messages.sent', label: 'Message Sent', desc: 'Delivery receipt confirmed', icon: CheckCircle },
  { id: 'messages.update', label: 'Message Status', desc: 'Read receipt / blue tick', icon: CheckCircle },
  { id: 'session.status', label: 'Session Status', desc: 'WhatsApp session goes online/offline', icon: Zap },
  { id: 'session.qr', label: 'QR Code Generated', desc: 'New QR code for pairing', icon: QrCode },
];

const webhookExample = (sessionId: string) => `{
  "event": "messages.received",
  "session_id": "${sessionId.slice(0, 8)}...",
  "timestamp": "2026-05-14T12:00:00Z",
  "data": {
    "from": "8801XXXXXXXXX",
    "message_id": "msg_xyz789",
    "type": "text",
    "content": "Hello from KontroAPI!"
  }
}`;

const signatureVerification = `const crypto = require('crypto');

// Express example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-kontroapi-signature'];
  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle the webhook event
  const { event, data } = req.body;
  console.log('Webhook event:', event, data);

  res.status(200).json({ received: true });
});`;

export default function WebhooksPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setSessions(data.data);
        setSelectedSession(prev => {
          if (prev && data.data.find((s: SessionSummary) => s.id === prev.id)) {
            return data.data.find((s: SessionSummary) => s.id === prev.id);
          }
          return data.data[0];
        });
      } else {
        setSessions([]);
        setSelectedSession(null);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const saveWebhook = async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: selectedSession.webhook_url,
          webhook_secret: selectedSession.webhook_secret,
          webhook_events: selectedSession.webhook_events,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Webhook saved!');
        loadSessions();
      } else {
        toast.error(result.message || 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!selectedSession?.webhook_url) {
      toast.error('Enter a webhook URL first');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: selectedSession.webhook_url,
          secret: selectedSession.webhook_secret,
          session_id: selectedSession.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Test webhook sent!');
      } else {
        toast.error(result.message || 'Failed to send test');
      }
    } catch {
      toast.error('Failed to send test');
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    if (!selectedSession) return;
    const current = selectedSession.webhook_events ?? [];
    const next = current.includes(eventId)
      ? current.filter(e => e !== eventId)
      : [...current, eventId];
    setSelectedSession({ ...selectedSession, webhook_events: next });
  };

  const selectAll = () => {
    if (!selectedSession) return;
    setSelectedSession({ ...selectedSession, webhook_events: events.map(e => e.id) });
  };

  const selectNone = () => {
    if (!selectedSession) return;
    setSelectedSession({ ...selectedSession, webhook_events: [] });
  };

  const useGeneratedSecret = () => {
    if (!selectedSession) return;
    const secret = 'whsec_' + Math.random().toString(36).substring(2, 18);
    setSelectedSession({ ...selectedSession, webhook_secret: secret });
  };

  const handleCopy = () => {
    if (!selectedSession?.id) return;
    navigator.clipboard.writeText(selectedSession.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Session ID copied!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Configure endpoint URL and event subscriptions.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-[15px] font-medium text-foreground">No sessions found</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">Create a session first to configure webhooks.</p>
            <Link href="/dashboard/sessions">
              <Button size="sm" className="mt-6 gap-1.5 rounded-lg">
                <Plus className="h-3.5 w-3.5" />
                New Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Configure endpoint URL and event subscriptions.</p>
        </div>
        <select
          value={selectedSession?.id ?? ''}
          onChange={(e) => {
            const s = sessions.find(s => s.id === e.target.value);
            setSelectedSession(s ?? null);
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name || s.id.slice(0, 8)}</option>
          ))}
        </select>
      </div>

      {selectedSession && (
        <>
          <Card className="border-border/60">
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Webhook Configuration</p>
                <p className="text-xs text-muted-foreground">
                  Keep only the events you need for cleaner integrations.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{(selectedSession.webhook_events ?? []).length} selected</Badge>
                {selectedSession.webhook_url ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300">URL ready</Badge>
                ) : (
                  <Badge variant="outline">URL missing</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedSession.id && (
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Session ID</p>
                  <div className="flex items-center gap-2">
                    <code className="rounded border border-border/60 bg-muted/50 px-2 py-1 text-[13px] font-mono">
                      {selectedSession.id}
                    </code>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <a
                      href={`/dashboard/sessions/${selectedSession.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Globe className="w-4 h-4" />
                Webhook URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={selectedSession.webhook_url ?? ''}
                onChange={(e) => setSelectedSession({ ...selectedSession, webhook_url: e.target.value })}
                placeholder="https://your-server.com/webhook"
                className="rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={testWebhook}
                disabled={testing || !selectedSession.webhook_url}
                className="gap-1.5 rounded-lg"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Test Webhook
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Webhook Secret
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/50 p-4">
                <code className="text-sm break-all">
                  {selectedSession.webhook_secret || 'whsec_not_set'}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                This secret generates the <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">X-KontroAPI-Signature</code> header using HMAC-SHA256.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={useGeneratedSecret} className="gap-1.5 rounded-lg">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate New Secret
                </Button>
                <Input
                  value={selectedSession.webhook_secret ?? ''}
                  onChange={(e) => setSelectedSession({ ...selectedSession, webhook_secret: e.target.value })}
                  placeholder="Custom secret (optional)"
                  className="rounded-lg text-[13px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <MessageSquare className="w-4 h-4" />
                Webhook Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone} className="rounded-lg">
                  Select None
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => (
                  <label
                    key={ev.id}
                    className={`group flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-all duration-200 ${
                      (selectedSession.webhook_events ?? []).includes(ev.id)
                        ? 'border-emerald-500/70 bg-emerald-500/5'
                        : 'border-border hover:border-border/90 hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(selectedSession.webhook_events ?? []).includes(ev.id)}
                      onChange={() => toggleEvent(ev.id)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{ev.label}</p>
                      <p className="text-[11px] text-muted-foreground">{ev.desc}</p>
                    </div>
                    {(selectedSession.webhook_events ?? []).includes(ev.id) && (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {(selectedSession.webhook_events ?? []).length} events
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-medium text-muted-foreground">Payload Example</span>
              </div>
              <CodeBlock
                code={webhookExample(selectedSession.id)}
                language="json"
                filename="webhook-payload.json"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-[13px] font-medium text-muted-foreground">Signature Verification</span>
              </div>
              <CodeBlock code={signatureVerification} language="javascript" filename="verify-webhook.js" />
            </div>
          </div>

          <Button onClick={saveWebhook} disabled={saving} size="lg" className="w-full rounded-xl gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Webhook Settings
          </Button>
        </>
      )}
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);