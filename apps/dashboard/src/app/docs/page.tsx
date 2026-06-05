'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, MessageSquare, Send, Key, Webhook, CreditCard, Users, FileText, Shield, Zap, Menu, X, ArrowLeft, ExternalLink, Play } from 'lucide-react';

const sections = [
  { id: 'intro', label: 'Introduction', icon: MessageSquare },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'send-message', label: 'Send Message', icon: Send },
  { id: 'media', label: 'Media', icon: FileText },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'n8n', label: 'N8N Workflow', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'errors', label: 'Error Codes', icon: FileText },
];

const COPY_BASE = process.env.NEXT_PUBLIC_WA_ENGINE_URL ?? 'http://localhost:3000';

export default function ApiDocsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>}>
      <ApiDocsContent />
    </Suspense>
  );
}

function ApiDocsContent() {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'intro';
  const [copied, setCopied] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function copyToClipboard(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <img src="/kontrologo.png" alt="KontroAPI" className="h-6 w-6 rounded object-contain" />
              <span className="font-semibold">KontroAPI</span>
              <span className="text-muted-foreground">Docs</span>
            </div>
          </div>
          <button
            className="md:hidden p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl flex">
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`
          fixed top-14 left-0 z-20 h-[calc(100dvh-3.5rem)] w-64 shrink-0 border-r border-border bg-background overflow-y-auto
          transition-transform duration-200 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <nav className="p-4 space-y-1">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/docs?section=${section.id}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10 text-[#3a3fd4] dark:text-[#5c5ff5] font-medium border border-[#3a3fd4]/20 dark:border-[#5c5ff5]/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1 p-6 md:p-10 pb-24 md:pb-10 min-w-0">
          <div className="max-w-3xl mx-auto space-y-12">

            {/* Introduction */}
            {activeSection === 'intro' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Getting Started</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Introduction</h1>
                <p className="text-muted-foreground mb-6">
                  KontroAPI is a production-grade WhatsApp Business API that allows you to send messages,
                  manage sessions, and receive webhooks for real-time events — all through a simple REST API.
                </p>

                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h2 className="text-xl font-semibold">Base URL</h2>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
                    <code className="text-sm flex-1 font-mono break-all">{COPY_BASE}</code>
                    <button onClick={() => copyToClipboard(COPY_BASE, 'base-url')} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                      {copied === 'base-url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-400">Development Note</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        During local development, use <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">http://localhost:3000</code> as your base URL.
                        In production, use <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">https://wa.kontroapi.com</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { icon: Send, title: 'Send Messages', desc: 'Text, images, videos, documents, and more' },
                    { icon: Webhook, title: 'Webhooks', desc: 'Real-time event delivery to your server' },
                    { icon: Key, title: 'Secure Auth', desc: 'API keys and PAT authentication' },
                  ].map((f) => (
                    <div key={f.title} className="glass-card rounded-xl p-4 text-center">
                      <f.icon className="w-6 h-6 text-[#5c5ff5] mx-auto mb-2" />
                      <p className="text-[13px] font-medium">{f.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Authentication */}
            {activeSection === 'authentication' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Auth</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Authentication</h1>
                <p className="text-muted-foreground mb-6">
                  KontroAPI supports two authentication methods. Use <strong>Session API Keys</strong> for sending messages,
                  and <strong>Personal Access Tokens (PAT)</strong> for account management.
                </p>

                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-[#5c5ff5]" />
                      Session API Key
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      Found in your session settings. Use in the <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Authorization</code> header:
                    </p>
                    <div className="relative">
                      <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`Authorization: Bearer YOUR_API_KEY`}
                      </pre>
                      <button onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY', 'auth-session')} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted transition-colors">
                        {copied === 'auth-session' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-[#5c5ff5]" />
                      Personal Access Token
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create in <strong>Settings → API Keys</strong>. Use in the <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">X-Api-Key</code> header for account operations:
                    </p>
                    <div className="relative">
                      <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`X-Api-Key: pat_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
                      </pre>
                      <button onClick={() => copyToClipboard('X-Api-Key: pat_live_xxxx', 'auth-pat')} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted transition-colors">
                        {copied === 'auth-pat' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Send Message */}
            {activeSection === 'send-message' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">API</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Send Message</h1>
                <p className="text-muted-foreground mb-6">
                  Send text, images, videos, documents, and more using the unified send-message endpoint.
                  Phone numbers are normalized automatically — <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">013XXXXXXXX</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">8801XXXXXXXXX</code> both work.
                </p>

                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Send Text Message</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border mb-4">
{`curl -X POST ${COPY_BASE}/api/v1/send-message \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "type": "text",
    "text": "Hello from KontroAPI!"
  }'`}
                    </pre>
                    <button onClick={() => copyToClipboard(`curl -X POST ${COPY_BASE}/api/v1/send-message -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"to":"8801XXXXXXXXX","type":"text","text":"Hello!"}'`, 'curl-text')} className="text-[13px] text-[#5c5ff5] hover:underline flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy curl
                    </button>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Response</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`{
  "success": true,
  "data": {
    "message_id": "msg_abc123xyz",
    "to": "8801XXXXXXXXX",
    "type": "text",
    "status": "queued"
  }
}`}
                    </pre>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Reply to a Message</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`curl -X POST ${COPY_BASE}/api/v1/send-message \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "type": "text",
    "text": "Thanks for your message!",
    "quoted_message_id": "msg_abc123xyz"
  }'`}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* Media */}
            {activeSection === 'media' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Media</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Send Media</h1>
                <p className="text-muted-foreground mb-6">
                  Send images, videos, audio, and documents by providing a public URL. Files must be publicly accessible.
                </p>

                <div className="space-y-6">
                  {[
                    { type: 'image', caption: true, example: `curl -X POST ${COPY_BASE}/api/v1/send-message \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "to": "8801XXXXXXXXX",\n    "type": "image",\n    "url": "https://cdn.example.com/photo.jpg",\n    "caption": "Check this out!"\n  }'` },
                    { type: 'video', caption: true, example: `curl -X POST ${COPY_BASE}/api/v1/send-message \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "to": "8801XXXXXXXXX",\n    "type": "video",\n    "url": "https://cdn.example.com/video.mp4"\n  }'` },
                    { type: 'audio', caption: false, example: `curl -X POST ${COPY_BASE}/api/v1/send-message \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "to": "8801XXXXXXXXX",\n    "type": "audio",\n    "url": "https://cdn.example.com/voice.mp3"\n  }'` },
                    { type: 'document', caption: true, example: `curl -X POST ${COPY_BASE}/api/v1/send-message \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "to": "8801XXXXXXXXX",\n    "type": "document",\n    "url": "https://cdn.example.com/invoice.pdf",\n    "fileName": "invoice-may-2026.pdf"\n  }'` },
                  ].map((m) => (
                    <div key={m.type} className="glass-card rounded-2xl p-6">
                      <h2 className="text-lg font-semibold mb-2 capitalize">{m.type}</h2>
                      <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-xs font-mono border border-border">
{m.example}
                      </pre>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Webhooks */}
            {activeSection === 'webhooks' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Events</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Webhooks</h1>
                <p className="text-muted-foreground mb-6">
                  Configure a webhook URL in your session settings to receive real-time events.
                  Each request is signed with HMAC-SHA256 for verification.
                </p>

                <div className="glass-card rounded-2xl p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Webhook Payload</h2>
                  <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-xs font-mono border border-border">
{`{
  "event": "messages.received",
  "session_id": "uuid",
  "timestamp": "2026-05-14T12:00:00.000Z",
  "data": {
    "from": "8801XXXXXXXXX",
    "message_id": "msg_abc123",
    "type": "text",
    "content": "Hello!",
    "push_name": "John Doe"
  }
}`}
                  </pre>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-lg">Available Events</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { id: 'messages.received', desc: 'Incoming message from a contact' },
                      { id: 'messages.sent', desc: 'Your sent message was delivered to server' },
                      { id: 'messages.update', desc: 'Message status changed (sent/delivered/read)' },
                      { id: 'session.status', desc: 'Session connected or disconnected' },
                      { id: 'session.qr', desc: 'New QR code generated for pairing' },
                      { id: 'contacts.upsert', desc: 'Contact info updated' },
                    ].map((e) => (
                      <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                        <div className="w-2 h-2 rounded-full bg-[#5c5ff5] mt-1.5 shrink-0" />
                        <div>
                          <code className="text-xs font-mono text-[#5c5ff5]">{e.id}</code>
                          <p className="text-[12px] text-muted-foreground mt-0.5">{e.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Signature Verification (Node.js)</h2>
                  <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-xs font-mono border border-border">
{`const crypto = require('crypto');

// Express.js example
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

  const { event, data } = req.body;
  console.log('Webhook:', event, data);

  res.status(200).json({ received: true });
});`}
                  </pre>
                </div>
              </section>
            )}

            {/* N8N */}
            {activeSection === 'n8n' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Automation</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">N8N Workflow Integration</h1>
                <p className="text-muted-foreground mb-6">
                  Automate KontroAPI with N8N — receive WhatsApp messages, trigger actions, and send replies automatically.
                </p>

                <div className="glass-card rounded-2xl p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Workflow: Auto-Reply Bot
                  </h2>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5c5ff5]/20 text-[#5c5ff5] text-xs font-bold">1</span>
                      <div>
                        <strong className="text-foreground">Setup Webhook Trigger</strong>
                        <p className="text-[12px] mt-0.5">Add an N8N Webhook node. Set the HTTP Method to POST. Copy the webhook URL.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5c5ff5]/20 text-[#5c5ff5] text-xs font-bold">2</span>
                      <div>
                        <strong className="text-foreground">Configure KontroAPI Webhook</strong>
                        <p className="text-[12px] mt-0.5">In your KontroAPI dashboard, go to Sessions → Webhook URL. Paste the N8N webhook URL. Enable <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">messages.received</code> event.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5c5ff5]/20 text-[#5c5ff5] text-xs font-bold">3</span>
                      <div>
                        <strong className="text-foreground">Process the Message</strong>
                        <p className="text-[12px] mt-0.5">Use an N8N Switch node to check <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">body.data.content</code> for keywords.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5c5ff5]/20 text-[#5c5ff5] text-xs font-bold">4</span>
                      <div>
                        <strong className="text-foreground">Send Reply</strong>
                        <p className="text-[12px] mt-0.5">Add an HTTP Request node with POST to <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{COPY_BASE}/api/v1/send-message</code></p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="glass-card rounded-2xl p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">N8N HTTP Request Node Config</h2>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                      <span className="text-muted-foreground">Method</span>
                      <span className="col-span-2 font-mono text-[13px]">POST</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                      <span className="text-muted-foreground">URL</span>
                      <span className="col-span-2 font-mono text-[13px] break-all">{COPY_BASE}/api/v1/send-message</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                      <span className="text-muted-foreground">Headers</span>
                      <div className="col-span-2 font-mono text-[13px]">
                        <div>Authorization: Bearer YOUR_API_KEY</div>
                        <div>Content-Type: application/json</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                      <span className="text-muted-foreground">Body (JSON)</span>
                      <div className="col-span-2 font-mono text-[12px]">
                        <pre className="whitespace-pre-wrap">{`{
  "to": "{{ $json.body.data.from }}",
  "type": "text",
  "text": "Got your message! I'll respond shortly."
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-emerald-400" />
                    Advanced: AI-Powered Replies (OpenAI + N8N)
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chain an OpenAI node to generate intelligent auto-replies:
                  </p>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li>Webhook → Switch (keyword check) → <strong className="text-foreground">OpenAI (Chat)</strong> → HTTP Request (send reply)</li>
                    <li>Pass <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">$json.body.data.content</code> as the user message to OpenAI</li>
                    <li>Use <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">$json.choices[0].message.content</code> as the reply text</li>
                  </ol>
                </div>
              </section>
            )}

            {/* Billing */}
            {activeSection === 'billing' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Pricing</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Billing & Plans</h1>
                <p className="text-muted-foreground mb-6">Plans via UddoktaPay (Bangladesh)</p>

                <div className="glass-card rounded-2xl p-6 space-y-3">
                  {[
                    { name: 'Trial', price: 'Free', sessions: '1', badge: 'bg-emerald-500/20 text-emerald-300' },
                    { name: 'Basic', price: '৳699/mo', sessions: '1' },
                    { name: 'Pro', price: '৳1499/mo', sessions: '3' },
                    { name: 'Plus', price: '৳2999/mo', sessions: '6' },
                    { name: 'Business', price: '৳4499/mo', sessions: '10' },
                  ].map((plan) => (
                    <div key={plan.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {(plan as any).badge && <span className={`text-[10px] px-2 py-0.5 rounded-full ${(plan as any).badge}`}>Current</span>}
                      </div>
                      <span className="text-muted-foreground text-sm">{plan.price} · {plan.sessions} sessions</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-[#5c5ff5]/10 border border-[#5c5ff5]/20">
                  <p className="text-sm text-muted-foreground">
                    Upgrade from your <Link href="/dashboard/settings/billing" className="text-[#5c5ff5] hover:underline font-medium">Dashboard → Billing</Link> page.
                    All payments are securely processed via UddoktaPay.
                  </p>
                </div>
              </section>
            )}

            {/* Contacts */}
            {activeSection === 'contacts' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">API</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Contacts</h1>
                <p className="text-muted-foreground mb-6">Check if a number is on WhatsApp and get contact details.</p>

                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Check if on WhatsApp</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`curl -X GET ${COPY_BASE}/api/v1/on-whatsapp/8801XXXXXXXXX \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                    </pre>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Get Contact Info</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`curl -X GET ${COPY_BASE}/api/v1/contacts/8801XXXXXXXXX \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* Groups */}
            {activeSection === 'groups' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">API</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Groups</h1>
                <p className="text-muted-foreground mb-6">Create and manage WhatsApp groups.</p>

                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Create Group</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`curl -X POST ${COPY_BASE}/api/v1/groups \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Business Group",
    "participants": ["8801XXXXXXXXX", "8801YYYYYYYYY"]
  }'`}
                    </pre>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Send Message to Group</h2>
                    <pre className="p-4 bg-muted/50 rounded-xl overflow-x-auto text-sm font-mono border border-border">
{`curl -X POST ${COPY_BASE}/api/v1/send-message \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "group-jid@s.whatsapp.net",
    "type": "text",
    "text": "Hello group!"
  }'`}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* Errors */}
            {activeSection === 'errors' && (
              <section>
                <div className="inline-flex items-center rounded-full border border-[#5c5ff5]/20 bg-[#5c5ff5]/10 px-3.5 py-1 mb-4">
                  <span className="text-xs font-medium text-[#5c5ff5]">Reference</span>
                </div>
                <h1 className="text-3xl font-bold mb-4">Error Codes</h1>

                <div className="space-y-3">
                  {[
                    { code: 400, name: 'Bad Request', desc: 'Invalid request parameters or missing required fields', color: 'text-red-400' },
                    { code: 401, name: 'Unauthorized', desc: 'Invalid or missing API key', color: 'text-red-400' },
                    { code: 403, name: 'Forbidden', desc: 'Session limit reached or access denied', color: 'text-red-400' },
                    { code: 404, name: 'Not Found', desc: 'Session or resource not found', color: 'text-red-400' },
                    { code: 429, name: 'Too Many Requests', desc: 'Rate limit exceeded (256 requests/minute)', color: 'text-yellow-400' },
                    { code: 503, name: 'Service Unavailable', desc: 'WhatsApp session disconnected or engine down', color: 'text-yellow-400' },
                  ].map((e) => (
                    <div key={e.code} className="flex gap-4 p-4 glass-card rounded-2xl">
                      <div className={`w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center ${e.color} font-bold text-sm shrink-0`}>{e.code}</div>
                      <div><p className="font-semibold">{e.name}</p><p className="text-sm text-muted-foreground">{e.desc}</p></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}