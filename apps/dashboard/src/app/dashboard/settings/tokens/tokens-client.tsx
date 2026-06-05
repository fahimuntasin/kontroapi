'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { toast } from 'sonner';
import { Copy, Check, Trash2, Key, ExternalLink, Shield, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: string;
  name: string;
  api_key: string;
  status: string;
  created_at: string;
}

export default function APIKeysPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState<Record<string, string>>({});
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.success ? (data.data || []) : []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(sessionId: string) {
    if (!confirm('Regenerate API key? The old key will stop working immediately. Make sure to update your integrations.')) return;
    setRegenerating(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/regenerate-key`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setNewKey(prev => ({ ...prev, [sessionId]: result.data.api_key_raw }));
        setRevealed(prev => ({ ...prev, [sessionId]: true }));
        toast.success('New API key generated!');
      } else {
        toast.error(result.message || 'Failed to regenerate');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRegenerating(null);
    }
  }

  function copyKey(sessionId: string, key: string) {
    navigator.clipboard.writeText(key);
    setCopied(sessionId);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Session API keys for sending messages via the API.</p>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-32 rounded-xl bg-muted/50" />
          <div className="h-32 rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Each session has its own unique API key. Use it to send messages via the API.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions} className="gap-1.5 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-muted/50">
              <Key className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-[15px] font-medium text-foreground">No sessions yet</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">Create a session to get your API key.</p>
            <Link href="/dashboard/sessions">
              <Button size="sm" className="mt-6 gap-1.5 rounded-xl">Create Session</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const displayKey = newKey[session.id] ?? session.api_key;
            const isRevealed = revealed[session.id];
            const isRegenerating = regenerating === session.id;
            const justGenerated = !!newKey[session.id];

            return (
              <Card key={session.id} className="border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-[#5c5ff5]" />
                      <span className="text-[14px] font-semibold text-foreground">{session.name || 'Unnamed Session'}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{session.status}</Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Created {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {justGenerated && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                        <p className="text-[12px] text-emerald-400 font-medium">
                          New key generated! Copy it now and update your integrations.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Your API Key</p>
                        <code className="text-[14px] font-mono font-medium text-foreground break-all">
                          {isRevealed ? displayKey : 'sk_•••••••••••••••••••••••••••••••••••••'}
                        </code>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevealed(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                        className="gap-1.5 rounded-xl"
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isRevealed ? 'Hide Key' : 'Reveal Key'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyKey(session.id, displayKey)}
                        className="gap-1.5 rounded-xl"
                      >
                        {copied === session.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied === session.id ? 'Copied!' : 'Copy Key'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRegenerate(session.id)}
                        disabled={isRegenerating}
                        className="gap-1.5 rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] text-white hover:opacity-90"
                      >
                        {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {isRegenerating ? 'Generating...' : 'Regenerate Key'}
                      </Button>
                      <Link href={`/dashboard/sessions/${session.id}`} className="ml-auto">
                        <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-muted-foreground">
                          Webhook Settings
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border/60">
        <div className="px-5 pt-5 pb-0">
          <h2 className="text-[14px] font-semibold text-foreground">How to use your API key</h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            Copy your session API key and use it in the Authorization header.
          </p>
        </div>
        <div className="p-5 space-y-4">
          <CodeBlock
            code={`curl -X POST ${process.env.NEXT_PUBLIC_WA_ENGINE_URL ?? 'http://localhost:3000'}/api/v1/send-message \\
  -H "Authorization: Bearer sk_your_session_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "type": "text",
    "text": "Hello from KontroAPI!"
  }'`}
            language="bash"
            filename="send-message.sh"
          />
          <ul className="space-y-2 text-[12px] text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#5c5ff5] mt-0.5">—</span>
              Replace <code className="rounded bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono">sk_your_session_api_key</code> with your actual session API key
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5c5ff5] mt-0.5">—</span>
              Each session has its own unique API key — keep them secret
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5c5ff5] mt-0.5">—</span>
              Rate limit: 256 messages per minute per session
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5c5ff5] mt-0.5">—</span>
              Regenerating a key will invalidate the old one immediately
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}