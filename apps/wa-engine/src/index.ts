import express from 'express';
import { applySecurityMiddleware } from './middleware/security';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';
import { logger } from './lib/logger';
import { webhookWorker, messageWorker, purgeOldJobs } from './lib/queue';
import { initLocalDb } from './lib/localDb';
import otpRoutes from './routes/otp';
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import messageRoutes from './routes/messages';
import messageActionsRoutes from './routes/messageActions';
import contactRoutes from './routes/contacts';
import groupRoutes from './routes/groups';
import statusRoutes from './routes/status';
import channelRoutes from './routes/channels';
import tokenRoutes from './routes/tokens';
import billingRoutes from './routes/billing';
import docsRoutes from './routes/docs';
import webhookRoutes from './routes/webhook';

async function start() {
  const app = express();

  // Parse JSON bodies before routes — capture rawBody for signature verification (NaafiPay webhooks)
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf?.toString('utf8') ?? '';
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  // Security: helmet, CORS, error handler, hide x-powered-by
  applySecurityMiddleware(app);

  // Request ID on every response
  app.use(requestId);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), worker: process.env.WORKER_ID ?? 'main' });
  });

  // All routes under /api/v1/
  app.use('/api/v1/otp', otpRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/whatsapp-sessions', sessionRoutes);
  app.use('/api/v1', messageRoutes);
  app.use('/api/v1/messages', messageActionsRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/groups', groupRoutes);
  app.use('/api/v1', statusRoutes);
  app.use('/api/v1/channels', channelRoutes);
  app.use('/api/v1/tokens', tokenRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api', docsRoutes);
  app.use('/api/v1/webhook', webhookRoutes);

  // Structured error handler — never leaks stack traces (FIX 9)
  app.use(errorHandler);

  const port = parseInt(config.PORT, 10);

  // Initialize local PostgreSQL connection
  await initLocalDb();

  // Start BullMQ workers
  await Promise.all([
    webhookWorker.waitUntilReady(),
    messageWorker.waitUntilReady(),
  ]);
  logger.info('BullMQ workers ready');

  // Purge old completed jobs to free Redis memory
  await purgeOldJobs();

  const server = app.listen(port, () => {
    logger.info({ port, env: config.NODE_ENV }, 'WA Engine started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    server.close();
    await Promise.all([
      webhookWorker.close(),
      messageWorker.close(),
    ]);
    await require('./lib/redis').redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start WA Engine');
  process.exit(1);
});
