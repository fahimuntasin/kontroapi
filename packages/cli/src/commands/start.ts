import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, openSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { createClient as createRedisClient } from 'redis';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');
const LOG_FILE = join(CONFIG_DIR, 'kontroapi.log');

export async function startCommand(opts: any) {
  console.log(chalk.bold.cyan('\n  Starting KontroAPI...\n'));

  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.red('  ✗ Not initialized. Run: kontroapi init'));
    process.exit(1);
  }

  if (!existsSync(DOCKER_COMPOSE_FILE)) {
    console.log(chalk.red('  ✗ docker-compose.yml missing. Run: kontroapi init'));
    process.exit(1);
  }

  const checkSpinner = ora('Running pre-flight checks...').start();
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    if (config.database?.host !== 'postgres') {
      await checkDatabase(config.database.url);
    }
    checkSpinner.succeed('Pre-flight checks passed');
  } catch (err: any) {
    checkSpinner.fail(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }

  if (opts.detach) {
    runDetached();
  } else {
    runForeground();
  }
}

function runForeground() {
  const child = spawn('docker', ['compose', '-f', DOCKER_COMPOSE_FILE, 'up'], {
    cwd: CONFIG_DIR,
    stdio: 'inherit',
  });

  child.on('exit', (code) => process.exit(code || 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

function runDetached() {
  try {
    execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} up -d`, {
      cwd: CONFIG_DIR,
      stdio: 'inherit',
    });
    console.log(chalk.green('\n  ✓ Started in background'));
    console.log(chalk.gray(`    Logs: docker compose -f ${DOCKER_COMPOSE_FILE} logs -f`));
    console.log(chalk.gray(`    Stop: kontroapi stop`));
    console.log('');
  } catch (err: any) {
    console.log(chalk.red(`  ✗ Failed to start: ${err.message}`));
    process.exit(1);
  }
}

async function checkDatabase(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('SELECT 1');
  await client.end();
}
