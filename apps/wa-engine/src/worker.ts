/**
 * Standalone message worker process.
 * Run with: node dist/worker.js
 * Useful when you want to separate message processing from the main API server.
 */
import { messageWorker } from './lib/queue';
import { logger } from './lib/logger';

messageWorker.on('ready', () => {
  logger.info('Standalone message worker is running');
});

process.on('SIGINT', async () => {
  await messageWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await messageWorker.close();
  process.exit(0);
});
