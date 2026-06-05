import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');

export async function statusCommand() {
  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.yellow('  Not initialized. Run: kontroapi init'));
    return;
  }

  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));

  console.log(chalk.bold('\n  KontroAPI Status\n'));
  console.log(`  Mode:           ${chalk.cyan(config.mode)}`);
  console.log(`  Version:        ${chalk.cyan(config.version || 'unknown')}`);
  console.log(`  Dashboard:      ${chalk.cyan(`http://localhost:${config.ports.dashboard}`)}`);
  console.log(`  Engine API:     ${chalk.cyan(`http://localhost:${config.ports.engine}`)}`);
  console.log(`  Database:       ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Redis:          ${config.redis.url}`);
  console.log(`  Admin:          ${config.admin.email}`);
  console.log(`  Billing:        ${config.billing.enabled ? chalk.green('enabled') : chalk.gray('disabled')}`);

  let running = false;
  try {
    const out = execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} ps --format json`, {
      encoding: 'utf8',
      cwd: CONFIG_DIR,
    });
    const containers = out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    running = containers.length > 0;
    const engine = containers.find((c: any) => c.Service === 'engine' || c.Name === 'kontroapi-engine');
    const dashboard = containers.find((c: any) => c.Service === 'dashboard' || c.Name === 'kontroapi-dashboard');
    const postgres = containers.find((c: any) => c.Service === 'postgres' || c.Name === 'kontroapi-postgres');
    const redis = containers.find((c: any) => c.Service === 'redis' || c.Name === 'kontroapi-redis');

    console.log('');
    console.log(`  Engine:         ${engine ? chalk.green('● ' + engine.State) : chalk.red('● stopped')}`);
    console.log(`  Dashboard:      ${dashboard ? chalk.green('● ' + dashboard.State) : chalk.red('● stopped')}`);
    if (postgres) console.log(`  Postgres:       ${chalk.green('● ' + postgres.State)}`);
    if (redis) console.log(`  Redis:          ${chalk.green('● ' + redis.State)}`);
  } catch {
    console.log('');
    console.log(`  Containers:     ${chalk.red('● not running')}`);
  }
  console.log('');

  if (config.database?.host !== 'postgres') {
    try {
      const db = new Client({ connectionString: config.database.url });
      await db.connect();
      const r = await db.query('SELECT COUNT(*) as count FROM users');
      console.log(`  ${chalk.green('✓')} Postgres:    ${r.rows[0].count} users`);
      await db.end();
    } catch {
      console.log(`  ${chalk.red('✗')} Postgres:    unreachable`);
    }
  }

  console.log('');
}
