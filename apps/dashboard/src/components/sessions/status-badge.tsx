'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface Props {
  sessionId: string;
  initialStatus: SessionStatus;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  qr_pending: 'QR Pending',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
  authenticating: 'Authenticating',
  banned: 'Banned',
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  connected: 'bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5] border-[#3a3fd4]/20 dark:border-[#5c5ff5]/20',
  connecting: 'bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5] border-[#3a3fd4]/20 dark:border-[#5c5ff5]/20',
  qr_pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  disconnected: 'bg-muted text-muted-foreground border-border',
  reconnecting: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  authenticating: 'bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5] border-[#3a3fd4]/20 dark:border-[#5c5ff5]/20',
  banned: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function StatusBadge({ sessionId, initialStatus }: Props) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status' && msg.status) setStatus(msg.status);
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [sessionId]);

  return (
    <Badge className={cn('rounded-full border text-[11px] font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}