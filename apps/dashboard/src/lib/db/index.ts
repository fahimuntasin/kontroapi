import { Pool, type PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.LOCAL_DB_URL || process.env.DATABASE_URL || 'postgres://kontroapi:kontroapi@localhost:5433/kontroapi';

export const pool: Pool = global.__pgPool ?? new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
}

pool.on('error', (err) => {
  console.error('Postgres pool error:', err.message);
});

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[db] ${Date.now() - start}ms ${text.split('\n')[0]}`);
  }
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
