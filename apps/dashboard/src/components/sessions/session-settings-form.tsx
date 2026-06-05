'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Send, Webhook, Key, ToggleLeft, Sparkles, RefreshCw, Eye, EyeOff, AlertTriangle, Power, RotateCcw } from 'lucide-react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface Props {
  session: {
    id: string;
    name: string;
    api_key: string;
    webhook_url: string | null;
    webhook_secret: string | null;
    webhook_events: string[] | null;
    proxy_url: string | null;
    account_protection: boolean | null;
  };
  initialStatus?: SessionStatus;
}

const ALL_EVENTS = [
  { id: 'messages.received', label: 'Incoming Messages', description: 'When you receive a message' },
  { id: 'messages.sent', label: 'Message Sent', description: 'When a message is sent' },
  { id: 'messages.update', label: 'Message Status', description: 'When message status changes' },
  { id: 'session.status', label: 'Session Status', description: 'When session connects/disconnects' },
  { id: 'qrcode.updated', label: 'QR Code Updated', description: 'When new QR code is generated' },
  { id: 'contacts.upsert', label: 'Contacts Update', description: 'When contacts change' },
  { id: 'groups.upsert', label: 'Groups Update', description: 'When groups change' },
  { id: 'messages.receipt', label: 'Message Receipt', description: 'When message is read' },
];

export default function SessionSettingsForm({ session, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>(initialStatus ?? ('disconnected' as SessionStatus));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState(session.webhook_url ?? '');
  const [webhookSecret, setWebhookSecret] = useState(session.webhook_secret ?? '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    session.webhook_events ?? ['messages.received', 'messages.sent', 'session.status']
  );

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${session.id}/sse`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status' && msg.status) setStatus(msg.status);
      } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [session.id]);

  async function handleAction(action: string) {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/sessions/${session.id}/${action}`, { method: 'POST' });
      const result = await res.json();
      if (!result.success) { toast.error(result.message || `${action} failed`); return; }
      toast.success(result.message || `${action} successful`);
    } catch { toast.error('Network error'); }
    finally { setActionLoading(null); }
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const selectAll = () => setSelectedEvents(ALL_EVENTS.map(e => e.id));
  const selectNone = () => setSelectedEvents([]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          webhook_events: selectedEvents,
        }),
      });
      const result = await res.json();
      
      if (!result.success) {
        toast.error(result.message || 'Failed to update');
        return;
      }

      toast.success('Webhook settings saved!');
      router.refresh();
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    setTestingWebhook(true);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: webhookUrl,
          secret: webhookSecret || 'test123'
        }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success('Test webhook sent! Check your server logs.');
      } else {
        toast.error(result.message || 'Failed to send test');
      }
    } catch (err) {
      toast.error('Failed to send test - check URL');
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyExamplePayload = () => {
    const example = {
      event: 'messages.received',
      session_id: session.id,
      timestamp: '2024-01-01T00:00:00Z',
      data: {
        from: '8801XXXXXXXXX',
        message_id: 'xxx',
        type: 'text',
        content: 'Hello!'
      }
    };
    navigator.clipboard.writeText(JSON.stringify(example, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedSecret = webhookSecret || 'whsec_' + Math.random().toString(36).substring(2, 18);

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80 backdrop-blur transition-all duration-200 hover:border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px]">Connection Actions</CardTitle>
          <CardDescription className="text-[11px]">Start, reconnect, or safely remove this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(status === 'disconnected' || status === 'banned') && (
              <Button onClick={() => handleAction('start')} disabled={actionLoading !== null} size="sm"
                className="gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
                {actionLoading === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                Start Session
              </Button>
            )}
            {(status === 'connected' || status === 'qr_pending' || status === 'reconnecting' || status === 'connecting') && (
              <Button variant="destructive" onClick={() => handleAction('disconnect')} disabled={actionLoading !== null} size="sm"
                className="gap-1.5 rounded-xl">
                {actionLoading === 'disconnect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                Disconnect
              </Button>
            )}
            {(status === 'connected' || status === 'disconnected') && (
              <Button variant="outline" onClick={() => handleAction('restart')} disabled={actionLoading !== null} size="sm"
                className="gap-1.5 rounded-xl">
                {actionLoading === 'restart' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Restart
              </Button>
            )}
            {status === 'banned' && (
              <Button variant="outline" onClick={() => handleAction('unban')} disabled={actionLoading !== null} size="sm"
                className="gap-1.5 rounded-xl border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                {actionLoading === 'unban' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Unban Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 backdrop-blur transition-all duration-200 hover:border-border">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Webhook Configuration</p>
            <p className="text-xs text-muted-foreground">
              Keep only the events you need for cleaner integrations.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{selectedEvents.length} selected</Badge>
            {webhookUrl ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">
                URL ready
              </Badge>
            ) : (
              <Badge variant="outline">URL missing</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 backdrop-blur transition-all duration-200 hover:border-border">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Session ID</p>
            <div className="flex items-center gap-2">
              <code className="rounded border border-border/60 bg-muted/50 px-2 py-1 text-[13px] font-mono">{session.id}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(session.id);
                  toast.success('Session ID copied!');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="border-border/60 transition-all duration-200 hover:border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Session API Key
          </CardTitle>
          <CardDescription>
            Use this key to authenticate API requests for this session. Keep it secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5 text-[13px] break-all font-mono">
              {showApiKey ? (newApiKey ?? session.api_key) : 'sk_•••••••••••••••••••••••••••••••••••••'}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
              className="shrink-0"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(newApiKey ?? session.api_key);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                toast.success('API key copied!');
              }}
              className="shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {newApiKey && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary">Copy this new key now — it won&apos;t be shown again.</p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={async () => {
              if (!confirm('Are you sure? This will invalidate the current API key and generate a new one. Any integrations using the old key will stop working.')) return;
              setRegenerating(true);
              try {
                const res = await fetch(`/api/sessions/${session.id}/regenerate-key`, { method: 'POST' });
                const result = await res.json();
                if (result.success) {
                  setNewApiKey(result.data.api_key_raw);
                  setShowApiKey(true);
                  toast.success('New API key generated!');
                } else {
                  toast.error(result.message || 'Failed to regenerate key');
                }
              } catch {
                toast.error('Network error');
              } finally {
                setRegenerating(false);
              }
            }}
            disabled={regenerating}
            className="transition-transform duration-150 hover:-translate-y-0.5"
          >
            {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerate Key
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card className="border-border/60 transition-all duration-200 hover:border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            The URL where we will send webhook events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="transition-all focus-visible:ring-2"
          />
          <Button
            variant="outline"
            onClick={testWebhook}
            disabled={testingWebhook || !webhookUrl}
            className="transition-transform duration-150 hover:-translate-y-0.5"
          >
            {testingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Test Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Secret */}
      <Card className="border-border/60 transition-all duration-200 hover:border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Webhook Secret
          </CardTitle>
          <CardDescription>
            Use this secret to verify webhook requests are from KontroAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/50 p-4">
            <code className="text-sm break-all">{generatedSecret}</code>
          </div>
          <p className="text-sm text-muted-foreground">
            This secret is used to generate the X-KontroAPI-Signature header.
            We sign requests using HMAC-SHA256.
          </p>
          <Input 
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Custom secret (optional)"
          />
          <Button
            variant="outline"
            onClick={() => setWebhookSecret(generatedSecret)}
            className="transition-transform duration-150 hover:-translate-y-0.5"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Use Generated Secret
          </Button>
        </CardContent>
      </Card>

      {/* Event Selection */}
      <Card className="border-border/60 transition-all duration-200 hover:border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToggleLeft className="w-5 h-5" />
            Webhook Events
          </CardTitle>
          <CardDescription>
            Select which events to receive at your webhook URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="transition-colors hover:border-emerald-500/40">
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Select None
            </Button>
          </div>

          <div className="grid gap-2">
            {ALL_EVENTS.map((event) => (
              <label
                key={event.id}
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                  selectedEvents.includes(event.id)
                    ? 'border-emerald-500/70 bg-emerald-500/5 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]'
                    : 'border-border hover:border-border/90 hover:bg-muted/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  className="h-4 w-4 accent-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
                {selectedEvents.includes(event.id) && (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                    Active
                  </Badge>
                )}
              </label>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Selected: {selectedEvents.length} events
          </p>
        </CardContent>
      </Card>

      {/* Payload Example */}
      <Card className="border-border/60 transition-all duration-200 hover:border-primary/40">
        <CardHeader>
          <CardTitle>Payload Format</CardTitle>
          <CardDescription>
            Example of what your webhook will receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-4 text-xs">
{`{
  "event": "messages.received",
  "session_id": "${session.id.slice(0, 8)}...",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "from": "8801XXXXXXXXX",
    "message_id": "xxx",
    "type": "text",
    "content": "Hello!"
  }
}`}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 transition-transform duration-150 hover:-translate-y-0.5"
              onClick={copyExamplePayload}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Signature Verification (Node.js):</p>
            <pre className="rounded-lg border border-border/60 bg-muted/50 p-3 text-xs">
{`const crypto = require('crypto');
const signature = req.headers['x-kontroapi-signature'];
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(body))
  .digest('hex');
if (signature === expected) {
  // Request is verified!
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={loading}
        className="w-full transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save Webhook Settings
      </Button>
    </div>
  );
}