'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';

const GlassInputWrapper = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-[#5c5ff5]/70 dark:focus-within:border-[#5c5ff5]/70 focus-within:bg-[#3a3fd4]/5 dark:focus-within:bg-[#5c5ff5]/10">
      {children}
    </div>
  </div>
);

export default function SendMessagePage() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!phone || !message) { toast.error('Phone and message are required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          type: mediaUrl ? 'image' : 'text',
          text: message,
          ...(mediaUrl ? { url: mediaUrl } : {}),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Message sent! ID: ${result.data?.message_id}`);
      } else {
        toast.error(result.message || 'Failed to send message');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const curlTemplate = `curl -X POST https://wa.kontroapi.com/api/v1/send-message \\
  -H "Authorization: Bearer sk_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "to": "${phone || '8801XXXXXXXXXX'}",
  "type": "text",
  "text": "${message || 'Hello from KontroAPI!'}"
}'`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Send Message</h1>
        <p className="mt-1 text-sm text-muted-foreground">Send text, media, or documents via your connected session.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <GlassInputWrapper label="To">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="8801XXXXXXXXXX"
              className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </GlassInputWrapper>

          <GlassInputWrapper label="Message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
            />
          </GlassInputWrapper>

          <GlassInputWrapper label="Media URL (Optional)">
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://cdn.example.com/image.jpg"
              className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </GlassInputWrapper>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] py-4 font-medium text-white shadow-md shadow-[#3a3fd4]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#3a3fd4]/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
              <span className="flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Send Message
              </span>
            )}
          </button>
        </div>

        <div>
          <div className="sticky top-6 space-y-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">API Preview</span>
            <CodeBlock code={curlTemplate} language="bash" filename="send-message.sh" />
          </div>
        </div>
      </div>
    </div>
  );
}