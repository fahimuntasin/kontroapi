'use client';

import { useEffect, useState } from 'react';
import { Zap, RefreshCw, ShieldAlert, WifiOff, Smartphone, Wifi } from 'lucide-react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

const FUNNY_MESSAGES: Record<SessionStatus, string[]> = {
  connecting: ['Knocking on WhatsApp servers...', 'Handshaking with the cloud...', 'Warming up the engines...'],
  qr_pending: ['Waiting for your phone...', 'Ready to pair...', 'Open WhatsApp > Linked Devices...'],
  connected: ['All systems go', 'Fully operational', 'Green across the board'],
  reconnecting: ['Lost connection, trying again...', 'Re-establishing link...', 'Hold on tight...'],
  authenticating: ['Verifying your identity...', 'Auth handshake in progress...', 'Cross-checking secrets...'],
  disconnected: ['Session asleep', 'Resting...', 'Offline mode'],
  banned: ['Session banned', 'Needs intervention'],
};

const STATUS_ICONS: Record<SessionStatus, { icon: React.ReactNode; color: string }> = {
  connecting: { icon: <Zap className="h-6 w-6 animate-pulse" />, color: 'text-[#3B9EFF]' },
  qr_pending: { icon: <Smartphone className="h-6 w-6" />, color: 'text-[#F5C518]' },
  connected: { icon: <Wifi className="h-6 w-6" />, color: 'text-[#00D26A]' },
  reconnecting: { icon: <RefreshCw className="h-6 w-6 animate-spin" />, color: 'text-[#F5C518]' },
  authenticating: { icon: <ShieldAlert className="h-6 w-6" />, color: 'text-[#3B9EFF]' },
  disconnected: { icon: <WifiOff className="h-6 w-6" />, color: 'text-[#7A8088]' },
  banned: { icon: <ShieldAlert className="h-6 w-6" />, color: 'text-[#FF5C5C]' },
};

const IS_ANIMATED: Record<SessionStatus, boolean> = {
  connecting: true, qr_pending: false, connected: false, reconnecting: true, authenticating: true, disconnected: false, banned: false,
};

interface Props {
  sessionId: string;
  initialStatus: SessionStatus;
}

export function StatusMessage({ sessionId, initialStatus }: Props) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status' && msg.status) { setStatus(msg.status); setMessageIndex(0); }
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [sessionId]);

  useEffect(() => {
    if (!IS_ANIMATED[status]) return;
    const msgs = FUNNY_MESSAGES[status];
    if (msgs.length <= 1) return;
    const interval = setInterval(() => setMessageIndex(prev => (prev + 1) % msgs.length), 3000);
    return () => clearInterval(interval);
  }, [status]);

  const isAnimating = IS_ANIMATED[status];
  const messages = FUNNY_MESSAGES[status];
  const message = messages[messageIndex % messages.length];
  const meta = STATUS_ICONS[status];

  if (!isAnimating) return null;

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className={`relative mb-4 ${meta.color}`}>
        {meta.icon}
      </div>
      <p className="text-[13px] font-mono text-[#7A8088]">{`> ${message}`}</p>
    </div>
  );
}
