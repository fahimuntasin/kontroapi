import { createHmac } from 'crypto';
import axios from 'axios';
import { localDb } from './localDb';
import { logger } from './logger';
import type { WebhookEvent, WebhookPayload } from '../types';

export function signPayload(payload: WebhookPayload, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')}`;
}

export async function deliverWebhook(
  url: string,
  secret: string,
  event: WebhookEvent,
  sessionId: string,
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    data,
  };

  const signature = signPayload(payload, secret);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-KontroAPI-Signature': signature,
        },
        timeout: 10000,
      });

      if (res.status < 400) {
        void logDelivery(sessionId, event, 'delivered', attempt, url);
        return;
      }
    } catch (error: any) {
      logger.warn({ attempt, sessionId, event, err: error?.message }, 'Webhook delivery attempt failed');
    }

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }
  }

  void logDelivery(sessionId, event, 'failed', 3, url);
  logger.error({ sessionId, event }, 'Webhook delivery failed after 3 attempts');
}

function logDelivery(
  sessionId: string,
  event: WebhookEvent,
  status: string,
  attempts: number,
  url: string
): void {
  if (sessionId === 'test') return;
  
  void localDb.query(
    `INSERT INTO session_logs (session_id, event, detail) VALUES ($1, $2, $3)`,
    [sessionId, 'webhook_delivery', JSON.stringify({ event, status, attempts, url })]
  );
}
