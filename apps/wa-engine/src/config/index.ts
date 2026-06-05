import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  KONTROAPI_MODE: z.enum(['self-hosted', 'cloud']).default('self-hosted'),

  // Cloud mode (Supabase) — optional in self-hosted
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Self-hosted mode (Postgres) — optional in cloud
  LOCAL_DB_URL: z.string().url().optional(),

  // Shared
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  INTERNAL_OTP_SECRET: z.string().min(32),
  SESSION_ENCRYPTION_KEY: z.string().length(64),
  WEBHOOK_SECRET_ENCRYPTION_KEY: z.string().length(64),

  SMS_GATEWAY_URL: z.string().url().optional().default('https://portal.syssms.com:2781/sendtext'),
  SMS_GATEWAY_KEY: z.string().min(1).optional().default('dev-sms-key'),
  SMS_GATEWAY_SECRET: z.string().min(1).optional().default('dev-sms-secret'),
  SMS_GATEWAY_SENDER: z.string().default('KontroAPI'),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MSG_DELAY_MS: z.coerce.number().default(1200),

  DASHBOARD_URL: z.string().url().optional(),

  // Billing (cloud only, but allowed in self-hosted for testing)
  NAAFIPAY_API_KEY: z.string().optional(),
  NAAFIPAY_WEBHOOK_SECRET: z.string().optional(),
  NAAFIPAY_BASE_URL: z.string().url().default('https://naafipay.com'),
  BILLING_ENABLED: z.coerce.boolean().default(false),

  // JWT for self-hosted dashboard auth
  JWT_SECRET: z.string().min(32).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const [field, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${field}: ${(issues as string[]).join(', ')}`);
  }
  process.exit(1);
}

const cfg = parsed.data;

// Mode-specific validations
if (cfg.KONTROAPI_MODE === 'cloud') {
  if (!cfg.SUPABASE_URL) {
    console.error('SUPABASE_URL required in cloud mode');
    process.exit(1);
  }
} else {
  if (!cfg.LOCAL_DB_URL) {
    console.error('LOCAL_DB_URL required in self-hosted mode (set KONTROAPI_HOME or run `kontroapi init`)');
    process.exit(1);
  }
  // Auto-fill secrets for self-hosted dev mode if not provided via env
  if (process.env.INTERNAL_OTP_SECRET === undefined) {
    cfg.INTERNAL_OTP_SECRET = 'dev-secret-please-change-in-production-min-32-chars';
  }
  if (process.env.SESSION_ENCRYPTION_KEY === undefined) {
    cfg.SESSION_ENCRYPTION_KEY = 'a'.repeat(64);
  }
  if (process.env.WEBHOOK_SECRET_ENCRYPTION_KEY === undefined) {
    cfg.WEBHOOK_SECRET_ENCRYPTION_KEY = 'b'.repeat(64);
  }
  if (process.env.JWT_SECRET === undefined) {
    cfg.JWT_SECRET = 'dev-jwt-secret-please-change-in-production-min-32-chars';
  }
}

export const config = cfg;
export const isSelfHosted = cfg.KONTROAPI_MODE === 'self-hosted';
export const isCloud = cfg.KONTROAPI_MODE === 'cloud';
