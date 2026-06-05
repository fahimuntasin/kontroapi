'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

interface Props {
  sessionId: string;
}

export default function SessionQRCode({ sessionId }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchQR() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qr`);
      const data = await res.json();
      if (data.qr) setQr(data.qr);
      else setError('No QR code available. Try refreshing.');
    } catch { setError('Failed to fetch QR code'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchQR();
    const eventSource = new EventSource(`/api/sessions/${sessionId}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'qr' && data.qr) { setQr(data.qr); setError(null); }
        if (data.type === 'status' && data.status !== 'qr_pending') setQr(null);
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [sessionId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>Open WhatsApp → Linked Devices → Link a Device</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQR} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00D26A]" />
            <p className="mt-2 text-[13px] text-[#7A8088]">Loading QR code...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-[#FF5C5C]">{error}</p>
          </div>
        ) : qr ? (
          <div className="rounded-lg border border-[#00D26A]/20 bg-white p-4 shadow-[0_0_40px_rgba(0,210,106,0.1)]">
            <QRCodeSVG value={qr} size={256} />
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-[13px] text-[#7A8088]">No QR code available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
