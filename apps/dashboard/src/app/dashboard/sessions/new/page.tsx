'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createSessionSchema } from '@kontroapi/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CodeBlock } from '@/components/ui/code-block';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Plus, AlertTriangle, Smartphone } from 'lucide-react';

const curlExample = `curl -X POST https://api.kontroapi.com/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Main Business",
    "webhook_url": "https://your-server.com/webhook",
    "webhook_secret": "whsec_••••••••••••••"
  }'`;

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState<{ id: string; apiKey: string } | null>(null);
  const [setupWebhook, setSetupWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { name: '', webhook_url: '', webhook_secret: '', proxy_url: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || 'Failed to create session');
        return;
      }
      setCreatedSession({ id: result.session_id, apiKey: result.api_key });
      toast.success('Session created! Save your API key.');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, (errors) => {
    const messages = Object.entries(errors).map(([field, err]) => `${field}: ${err?.message}`).filter(Boolean);
    toast.error(messages.length ? messages.join(', ') : 'Please fix the form errors');
  });

  const generateSecret = () => {
    setWebhookSecret('whsec_' + Math.random().toString(36).substring(2, 18));
  };

  const copyKey = () => {
    if (createdSession) {
      navigator.clipboard.writeText(createdSession.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    }
  };

  if (createdSession) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session Created</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Save this API key — you won&apos;t see it again.</p>
        </div>
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-signal-amber" />
              <span className="text-[13px] font-medium text-signal-amber">Save this key securely</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[13px] break-all">
                {createdSession.apiKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey} className="rounded-lg shrink-0">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => router.push(`/dashboard/sessions/${createdSession.id}`)} className="rounded-lg">Go to Session</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/sessions')} className="rounded-lg">Back to Sessions</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Session</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Create a new WhatsApp session connection.</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">Session Name</Label>
              <Input {...register('name')} placeholder="e.g., Main Business, Support" className="rounded-lg" />
              {errors.name && <p className="text-[12px] text-destructive">{errors.name.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[13px] font-medium">Webhook</Label>
                <p className="text-[12px] text-muted-foreground">Receive real-time event notifications</p>
              </div>
              <Switch checked={setupWebhook} onCheckedChange={setSetupWebhook} />
            </div>
            {setupWebhook && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Webhook URL</Label>
                  <Input value={webhookUrl} onChange={(e) => register('webhook_url').onChange(e)} placeholder="https://your-server.com/webhook" className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Auto-generated if empty" className="rounded-lg" />
                    <Button type="button" variant="outline" onClick={generateSecret} className="rounded-lg shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">Proxy URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input {...register('proxy_url')} placeholder="socks5://user:pass@host:port" className="rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={onSubmit} disabled={loading} className="rounded-lg">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Session
          </Button>
          <Button variant="outline" onClick={() => router.back()} className="rounded-lg">Cancel</Button>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-2">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">cURL Example</span>
          </div>
          <CodeBlock code={curlExample} language="bash" filename="create-session.sh" />
        </div>
      </div>
    </div>
  );
}