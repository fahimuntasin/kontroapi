import { Pool } from 'pg';
import { config, isSelfHosted } from '../config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Local PostgreSQL pool for self-hosted mode
// Uses Unix socket for peer auth in dev, or TCP for production
export const localDb = new Pool({
  connectionString: config.LOCAL_DB_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// For peer auth via Unix socket, we need to handle missing password gracefully
localDb.on('error', (err: Error) => {
  console.error('Local PostgreSQL pool error:', err.message);
});

let dbInitialized = false;

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await localDb.query(text, params);
  return res.rows as T[];
}

export const localPg = {
  async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    return await query<T>(text, params);
  },
  async queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] ?? null;
  },
};

export async function initLocalDb() {
  try {
    await localDb.query('SELECT 1');
    console.log('✓ Local PostgreSQL connected');

    if (isSelfHosted && !dbInitialized) {
      await runMigrations();
      dbInitialized = true;
    }
  } catch (err) {
    console.error('Failed to connect to local PostgreSQL:', (err as Error).message);
    if (isSelfHosted) {
      console.error('\n  Self-hosted mode requires a working Postgres.');
      console.error('  Run: kontroapi init  (or ensure LOCAL_DB_URL is reachable)\n');
      process.exit(1);
    }
    console.warn('  message logs will be skipped');
  }
}

async function runMigrations() {
  const schemaPaths = [
    join(process.cwd(), 'apps', 'wa-engine', 'schema.sql'),
    join(__dirname, '..', '..', 'schema.sql'),
    join(__dirname, '..', '..', '..', 'schema.sql'),
  ];

  let schema: string | null = null;
  for (const p of schemaPaths) {
    if (existsSync(p)) {
      schema = readFileSync(p, 'utf8');
      break;
    }
  }

  if (!schema) {
    console.warn('schema.sql not found, skipping migrations');
    return;
  }

  console.log('  Running schema migrations...');
  try {
    await localDb.query(schema);
    console.log('✓ Schema ready');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('✓ Schema already initialized');
    } else {
      throw err;
    }
  }
}
