'use client';

import { useEffect, useState } from 'react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface Props {
  sessionId: string;
  initialStatus: SessionStatus;
  children: Record<string, React.ReactNode>;
}

/**
 * Shows different children based on real-time session status via SSE.
 * Pass children keyed by status: <StatusContent status={status} initialStatus={initialStatus} sessionId={id}>
 *   {{ connected: <ConnectedCard />, disconnected: <DisconnectedCard />, qr_pending: <QRCode /> }}
 * </StatusContent>
 */
export function StatusContent({ sessionId, initialStatus, children }: Props) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status' && msg.status) {
          setStatus(msg.status);
        }
      } catch {
        // ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  return <>{children[status] ?? null}</>;
}
