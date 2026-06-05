#!/bin/sh
set -e

# Run schema.sql on first start (idempotent — uses IF NOT EXISTS / ON CONFLICT)
if [ -n "$LOCAL_DB_URL" ]; then
  echo "[dashboard] waiting for database..."
  for i in $(seq 1 30); do
    if node -e "
      const {Client} = require('pg');
      const c = new Client({connectionString: process.env.LOCAL_DB_URL});
      c.connect()
        .then(() => c.query('SELECT 1'))
        .then(() => c.end())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    " 2>/dev/null; then
      break
    fi
    sleep 2
  done

  # Check if schema already applied
  APPLIED=$(node -e "
    const {Client} = require('pg');
    const c = new Client({connectionString: process.env.LOCAL_DB_URL});
    c.connect()
      .then(() => c.query(\"SELECT to_regclass('public.users') IS NOT NULL AS applied\"))
      .then(r => { c.end(); process.stdout.write(r.rows[0].applied ? 'yes' : 'no'); })
      .catch(() => process.stdout.write('no'));
  " 2>/dev/null || echo "no")

  if [ "$APPLIED" != "yes" ]; then
    echo "[dashboard] applying schema.sql..."
    node -e "
      const fs = require('fs');
      const {Client} = require('pg');
      const sql = fs.readFileSync('/app/apps/wa-engine/schema.sql', 'utf8');
      const c = new Client({connectionString: process.env.LOCAL_DB_URL});
      c.connect()
        .then(() => c.query(sql))
        .then(() => c.end())
        .then(() => { console.log('[dashboard] schema ready'); process.exit(0); })
        .catch((e) => { console.error('[dashboard] schema error:', e.message); process.exit(0); });
    " || true
  else
    echo "[dashboard] schema already applied, skipping"
  fi
fi

exec "$@"
