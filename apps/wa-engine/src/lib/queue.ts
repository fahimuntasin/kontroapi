import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { config } from '../config';
import { deliverWebhook } from './webhook';
import { decryptSecret } from '@kontroapi/shared';
import { logger } from './logger';
import { localDb } from './localDb';
import { supabase } from './supabase';

// ============================================================
// QUEUE TYPES
// ============================================================

export interface WebhookJobData {
  session_id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface MessageJobData {
  session_id: string;
  messageId: string;
}

// ============================================================
// QUEUES
// ============================================================

export const webhookQueue = new Queue('webhooks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400, count: 500 }, // Keep 500 recent, expire after 24h
    removeOnFail: false, // Keep failed jobs for DLQ inspection
  },
});

export const messageQueue = new Queue('messages', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: false,
  },
});

// ============================================================
// WEBHOOK WORKER
// ============================================================

export const webhookWorker = new Worker(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { session_id, event, data } = job.data;

    // Fetch webhook config + subscribed events
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('webhook_url, webhook_secret_enc, webhook_events')
      .eq('id', session_id)
      .single();

    if (!session?.webhook_url) return; // No webhook configured

    // Skip if this event is not subscribed
    const subscribedEvents: string[] = session.webhook_events ?? [];
    if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) return;

    const webhookSecret = session.webhook_secret_enc
      ? decryptSecret(session.webhook_secret_enc)
      : '';

    await deliverWebhook(session.webhook_url, webhookSecret, event as any, session_id, data);
  },
  {
    connection: redis,
    concurrency: config.WORKER_CONCURRENCY * 2,
    limiter: { max: 50, duration: 1000 },
  }
);

webhookWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id, event: job.data.event }, 'Webhook delivered');
});

webhookWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, sessionId: job?.data?.session_id, event: job?.data?.event, err: err.message },
    'Webhook delivery failed — moved to DLQ'
  );
});

// ============================================================
// MESSAGE WORKER
// ============================================================

export const messageWorker = new Worker(
  'messages',
  async (job: Job<MessageJobData>) => {
    const { session_id, messageId } = job.data;

    // Fetch message from local DB
    const { rows } = await localDb.query(
      'SELECT content, to_from, type, status FROM message_logs WHERE wa_message_id = $1 AND session_id = $2 LIMIT 1',
      [messageId, session_id]
    );

    if (rows.length === 0) {
      logger.warn({ messageId, session_id }, 'Message not found for job');
      return;
    }

    // Apply configurable delay to prevent rate limiting
    await new Promise((r) => setTimeout(r, config.MSG_DELAY_MS));

    logger.debug({ messageId, to: rows[0].to_from, type: rows[0].type }, 'Message job processed');
  },
  {
    connection: redis,
    concurrency: config.WORKER_CONCURRENCY,
  }
);

messageWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id, messageId: job.data.messageId }, 'Message job completed');
});

messageWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, messageId: job?.data?.messageId, err: err.message }, 'Message job failed');
});

// ============================================================
// DLQ MONITORING — periodic check for stuck DLQ jobs
// ============================================================

const DLQ_CHECK_INTERVAL = 300_000; // every 5 minutes

const dlqMonitor = setInterval(async () => {
  try {
    const webhookFailed = await webhookQueue.getFailedCount();
    const messageFailed = await messageQueue.getFailedCount();

    if (webhookFailed > 0 || messageFailed > 0) {
      logger.warn(
        { webhookDLQ: webhookFailed, messageDLQ: messageFailed },
        'DLQ backlog detected'
      );
    }
  } catch (err) {
    logger.warn({ err }, 'DLQ monitor failed');
  }
}, DLQ_CHECK_INTERVAL);
dlqMonitor.unref();

// ============================================================
// CLEANUP — purge completed jobs older than TTL on startup
// ============================================================

export async function purgeOldJobs(): Promise<void> {
  try {
    const cleaned = await webhookQueue.clean(86400 * 1000, 1000);
    if (cleaned.length > 0) {
      logger.info({ cleaned: cleaned.length }, 'Purged old completed webhook jobs');
    }
  } catch { /* ignore */ }
}
