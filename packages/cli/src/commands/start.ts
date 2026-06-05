import chalk from 'chalk';
import ora from 'ora';
import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { createClient as createRedisClient } from 'redis';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const ENV_FILE = join(CONFIG_DIR, '.env');
const PID_FILE = join(CONFIG_DIR, 'kontroapi.pid');
const LOG_FILE = join(CONFIG_DIR, 'kontroapi.log');

export async function startCommand(opts: any) {
  console.log(chalk.bold.cyan('\n  Starting KontroAPI...\n'));

  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.red('  ✗ Not initialized. Run: kontroapi init'));
    process.exit(1);
  }

  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
    if (isRunning(pid)) {
      console.log(chalk.yellow(`  Already running (PID ${pid})`));
      return;
    }
  }

  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  const env = loadEnvFile(ENV_FILE);

  // Pre-flight checks
  const checkSpinner = ora('Running pre-flight checks...').start();
  try {
    await checkDatabase(config.database.url);
    await checkRedis(config.redis.url);
    checkSpinner.succeed('Pre-flight checks passed');
  } catch (err: any) {
    checkSpinner.fail(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }

  if (opts.detach) {
    runDetached(env, opts);
  } else {
    runForeground(env, opts);
  }
}

function runForeground(env: Record<string, string>, opts: any) {
  const args: string[] = [];
  if (opts.engineOnly) args.push('--engine-only');
  if (opts.dashboardOnly) args.push('--dashboard-only');

  const child = spawn('node', [join(CONFIG_DIR, '..', '..', 'apps', 'wa-engine', 'dist', 'index.js')], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  child.on('exit', (code) => process.exit(code || 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

function runDetached(env: Record<string, string>, opts: any) {
  const out = require('fs').openSync(LOG_FILE, 'a');
  const err = require('fs').openSync(LOG_FILE, 'a');
  const child = spawn('node', [join(CONFIG_DIR, '..', '..', 'apps', 'wa-engine', 'dist', 'index.js')], {
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env, ...env },
  });
  child.unref();
  writeFileSync(PID_FILE, String(child.pid));
  console.log(chalk.green(`  ✓ Started in background (PID ${child.pid})`));
  console.log(chalk.gray(`    Logs: ${LOG_FILE}`));
  console.log(chalk.gray(`    Stop: kontroapi stop`));
}

async function checkDatabase(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
}

async function checkRedis(url: string) {
  const client = createRedisClient({ url });
  await client.connect();
  await client.ping();
  await client.disconnect();
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function loadEnvFile(path: string): Record<string, string> {
  const content = readFileSync(path, 'utf8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
