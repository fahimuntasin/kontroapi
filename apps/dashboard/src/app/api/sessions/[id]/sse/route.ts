import { createHmac } from 'crypto';
import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM whatsapp_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
    [id, user.id]
  );

  if (!session) return new Response('Not found', { status: 404 });

  const waEngineUrl = process.env.WA_ENGINE_URL ?? 'http://localhost:3000';
  const internalSecret = process.env.WA_ENGINE_INTERNAL_SECRET!;

  const headers = new Headers({
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'X-Accel-Buffering': 'no',
  });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let keepAliveTimer: ReturnType<typeof setInterval>;

  async function send(data: string) {
    try {
      await writer.write(new TextEncoder().encode(`data: ${data}\n\n`));
    } catch { /* stream closed */ }
  }

  async function getStatus(): Promise<string> {
    try {
      const ts = Date.now().toString();
      const sig = createHmac('sha256', internalSecret).update(`${id}:status:${ts}`).digest('hex');
      const res = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/status`, {
        headers: { 'Authorization': `Bearer ${internalSecret}`, 'X-Signature': sig, 'X-Timestamp': ts },
      });
      if (res.ok) {
        const json = await res.json();
        return json.data?.status ?? 'disconnected';
      }
    } catch { /* ignore */ }
    return 'disconnected';
  }

  async function start() {
    const initialStatus = session?.status ?? 'disconnected';
    await send(JSON.stringify({ type: 'status', status: initialStatus }));

    const ts = Date.now().toString();
    const sig = createHmac('sha256', internalSecret).update(`${id}:qrcode:${ts}`).digest('hex');

    try {
      const sseRes = await fetch(`${waEngineUrl}/api/v1/whatsapp-sessions/${id}/qrcode`, {
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${internalSecret}`,
          'X-Signature': sig,
          'X-Timestamp': ts,
        },
      });

      if (sseRes.ok && sseRes.body) {
        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                await send(line.slice(6));
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'status' && data.status) {
                    await send(JSON.stringify({ type: 'status', status: data.status }));
                  }
                } catch { /* not json */ }
              }
            }
          }

          keepAliveTimer = setInterval(async () => {
            const status = await getStatus();
            await send(JSON.stringify({ type: 'status', status }));
          }, 5000);
        };
        pump().catch(() => {
          keepAliveTimer = setInterval(async () => {
            const status = await getStatus();
            await send(JSON.stringify({ type: 'status', status }));
          }, 5000);
        });
      } else {
        keepAliveTimer = setInterval(async () => {
          const status = await getStatus();
          await send(JSON.stringify({ type: 'status', status }));
        }, 5000);
      }
    } catch {
      keepAliveTimer = setInterval(async () => {
        const status = await getStatus();
        await send(JSON.stringify({ type: 'status', status }));
      }, 5000);
    }
  }

  start();

  request.signal.addEventListener('abort', () => {
    clearInterval(keepAliveTimer);
    writer.close();
  });

  return new Response(stream.readable, { headers });
}