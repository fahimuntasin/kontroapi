'use client';

import { useState, useEffect, useCallback } from 'react';

type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'authenticating' | 'connected' | 'reconnecting' | 'banned';

interface SessionStatusData {
  status: SessionStatus;
  phone: string | null;
  lastQr: number | null;
}

export function useSessionStatus(sessionId: string, initialStatus: SessionStatus, initialPhone?: string | null) {
  const [data, setData] = useState<SessionStatusData>({
    status: initialStatus,
    phone: initialPhone ?? null,
    lastQr: null,
  });

  const updateStatus = useCallback((status: SessionStatus, extra?: Record<string, unknown>) => {
    setData((prev) => ({
      ...prev,
      status,
      phone: (extra?.phone as string) ?? prev.phone,
      lastQr: (extra?.expiresAt as number) ?? prev.lastQr,
    }));
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status') {
          updateStatus(msg.status, msg);
        }
        if (msg.type === 'qr') {
          updateStatus('qr_pending', { expiresAt: msg.expiresAt });
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, updateStatus]);

  return { ...data, updateStatus };
}
