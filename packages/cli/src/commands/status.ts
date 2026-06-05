import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { createClient as createRedisClient } from 'redis';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const PID_FILE = join(CONFIG_DIR, 'kontroapi.pid');

export async function statusCommand() {
  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.yellow('  Not initialized.'));
    return;
  }

  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  const running = existsSync(PID_FILE);

  console.log(chalk.bold('\n  KontroAPI Status\n'));
  console.log(`  Mode:           ${chalk.cyan(config.mode)}`);
  console.log(`  Dashboard:      ${chalk.cyan(`http://localhost:${config.ports.dashboard}`)}`);
  console.log(`  Engine API:     ${chalk.cyan(`http://localhost:${config.ports.engine}`)}`);
  console.log(`  Database:       ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Redis:          ${config.redis.url}`);
  console.log(`  Admin:          ${config.admin.email}`);
  console.log(`  Billing:        ${config.billing.enabled ? chalk.green('enabled') : chalk.gray('disabled')}`);
  console.log(`  Engine:         ${running ? chalk.green('● running') : chalk.red('● stopped')}`);
  console.log('');

  // Check services
  try {
    const db = new Client({ connectionString: config.database.url });
    await db.connect();
    const r = await db.query('SELECT COUNT(*) FROM users');
    console.log(`  ${chalk.green('✓')} Postgres:    ${r.rows[0].count} users`);
    await db.end();
  } catch {
    console.log(`  ${chalk.red('✗')} Postgres:    unreachable`);
  }

  try {
    const r = createRedisClient({ url: config.redis.url });
    await r.connect();
    await r.ping();
    console.log(`  ${chalk.green('✓')} Redis:       connected`);
    await r.disconnect();
  } catch {
    console.log(`  ${chalk.red('✗')} Redis:       unreachable`);
  }
  console.log('');
}
