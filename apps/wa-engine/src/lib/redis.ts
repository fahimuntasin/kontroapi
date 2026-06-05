import IORedis from 'ioredis';
import { config } from '../config';

export const redis = new IORedis({
  host: config.REDIS_HOST,
  port: parseInt(config.REDIS_PORT, 10),
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});
