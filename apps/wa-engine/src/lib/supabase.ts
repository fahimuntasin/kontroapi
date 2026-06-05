// @ts-ignore - Supabase is optional, only used in cloud mode
import type { SupabaseClient } from '@supabase/supabase-js';
import { config, isCloud } from '../config';
import { localDb, query } from './localDb';

let _supabase: SupabaseClient | null = null;
if (isCloud && config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    // @ts-ignore - dynamic require
    const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.warn('Supabase not available — running in self-hosted mode');
  }
}

/**
 * @deprecated Use `db` adapter for new code. Direct Supabase access only works in cloud mode.
 */
export const supabase = _supabase as SupabaseClient | null;

export const db = {
  from(table: string) {
    if (isCloud && supabase) {
      return supabase.from(table);
    }
    return localPgFrom(table);
  },

  query,

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
  },
};

function localPgFrom(table: string) {
  return {
    select(cols = '*') {
      return {
        eq: (col: string, val: any) => ({
          single: async () => {
            const r = await query(
              `SELECT ${cols} FROM ${table} WHERE ${col} = $1 LIMIT 1`,
              [val]
            );
            return { data: r[0] ?? null, error: r.length === 0 ? { message: 'Not found' } : null };
          },
          limit: async (n: number) => {
            const r = await query(
              `SELECT ${cols} FROM ${table} WHERE ${col} = $1 LIMIT $2`,
              [val, n]
            );
            return { data: r, error: null, count: r.length };
          },
          order: (orderCol: string, opts: { ascending?: boolean } = {}) => ({
            limit: async (n: number) => {
              const dir = opts.ascending === false ? 'DESC' : 'ASC';
              const r = await query(
                `SELECT ${cols} FROM ${table} WHERE ${col} = $1 ORDER BY ${orderCol} ${dir} LIMIT $2`,
                [val, n]
              );
              return { data: r, error: null, count: r.length };
            },
          }),
        }),
        order: (col: string, opts: { ascending?: boolean } = {}) => ({
          limit: async (n: number) => {
            const dir = opts.ascending === false ? 'DESC' : 'ASC';
            const r = await query(
              `SELECT ${cols} FROM ${table} ORDER BY ${col} ${dir} LIMIT $1`,
              [n]
            );
            return { data: r, error: null, count: r.length };
          },
        }),
        limit: async (n: number) => {
          const r = await query(`SELECT ${cols} FROM ${table} LIMIT $1`, [n]);
          return { data: r, error: null, count: r.length };
        },
      };
    },
    insert(data: any) {
      const arr = Array.isArray(data) ? data : [data];
      return {
        select: () => ({
          single: async () => {
            const first = arr[0];
            const keys = Object.keys(first);
            const values = Object.values(first);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const r = await query(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
              values
            );
            return { data: r[0] ?? null, error: null };
          },
        }),
      };
    },
    update(data: any) {
      return {
        eq: async (col: string, val: any) => {
          const keys = Object.keys(data);
          const values = Object.values(data);
          const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          const r = await query(
            `UPDATE ${table} SET ${set} WHERE ${col} = $${keys.length + 1} RETURNING *`,
            [...values, val]
          );
          return { data: r, error: null };
        },
      };
    },
    delete() {
      return {
        eq: async (col: string, val: any) => {
          await query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]);
          return { data: null, error: null };
        },
      };
    },
  };
}
