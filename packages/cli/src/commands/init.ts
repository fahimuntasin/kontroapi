import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs';
import { join, resolve } from 'path';
import { createHash, randomBytes } from 'crypto';
import { Client } from 'pg';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const ENV_FILE = join(CONFIG_DIR, '.env');
const DATA_DIR = join(CONFIG_DIR, 'data');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');

interface KontroConfig {
  mode: 'self-hosted';
  createdAt: string;
  ports: { dashboard: number; engine: number };
  database: { url: string };
  redis: { url: string };
  secrets: {
    jwtSecret: string;
    internalSecret: string;
    encryptionKey: string;
  };
  admin: { email: string; passwordHash: string; createdAt: string };
  branding: { name: string; supportEmail: string };
  billing: { enabled: boolean; provider: 'none' | 'naafipay'; apiKey?: string; webhookSecret?: string };
}

export async function initCommand(opts: any) {
  console.log(chalk.bold.cyan('\n  KontroAPI — Self-Hosted Setup\n'));
  console.log(chalk.gray('  Open source WhatsApp Business API gateway\n'));

  if (existsSync(CONFIG_FILE) && !opts.yes) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Existing installation found. Reinitialize?',
      default: false,
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('Aborted. Run `kontroapi start` to launch existing setup.'));
      return;
    }
  }

  const useDefaults = opts.yes === true;

  mkdirSync(CONFIG_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  // Gather config
  const config: Partial<KontroConfig> = {
    mode: 'self-hosted',
    createdAt: new Date().toISOString(),
    ports: { dashboard: parseInt(opts.port), engine: parseInt(opts.enginePort) },
    secrets: {
      jwtSecret: randomBytes(48).toString('hex'),
      internalSecret: randomBytes(32).toString('hex'),
      encryptionKey: randomBytes(32).toString('hex'),
    },
  };

  // Branding
  if (useDefaults) {
    config.branding = { name: 'KontroAPI', supportEmail: 'support@kontroapi.com' };
  } else {
    const branding = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Instance name:', default: 'KontroAPI' },
      { type: 'input', name: 'supportEmail', message: 'Support email:', default: 'support@localhost' },
    ]);
    config.branding = branding;
  }

  // Admin
  let adminEmail: string, adminPassword: string;
  if (useDefaults) {
    adminEmail = 'admin@localhost';
    adminPassword = randomBytes(12).toString('base64url');
    console.log(chalk.yellow(`\n  Default admin: ${adminEmail}`));
    console.log(chalk.yellow(`  Auto-generated password: ${adminPassword}`));
    console.log(chalk.gray('  Save this — you will not see it again.\n'));
  } else {
    const admin = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Admin email:', default: 'admin@localhost', validate: (v: string) => v.includes('@') || 'Valid email required' },
      { type: 'password', name: 'password', message: 'Admin password:', mask: '*', validate: (v: string) => v.length >= 8 || 'Min 8 chars' },
    ]);
    adminEmail = admin.email;
    adminPassword = admin.password;
  }

  config.admin = {
    email: adminEmail,
    passwordHash: createHash('sha256').update(adminPassword).digest('hex'),
    createdAt: new Date().toISOString(),
  };

  // Database
  if (opts.dbUrl) {
    config.database = { url: opts.dbUrl };
  } else {
    const hasDocker = checkDocker();
    if (hasDocker && opts.docker !== false) {
      if (useDefaults) {
        config.database = { url: 'postgres://kontroapi:kontroapi@localhost:5433/kontroapi' };
        await startDockerPostgres();
      } else {
        const { dbChoice } = await inquirer.prompt([{
          type: 'list',
          name: 'dbChoice',
          message: 'Database setup:',
          choices: [
            { name: '🐳 Docker (Postgres 16 in container — recommended)', value: 'docker' },
            { name: '🔗 Use existing Postgres (provide connection string)', value: 'external' },
          ],
        }]);
        if (dbChoice === 'docker') {
          config.database = { url: 'postgres://kontroapi:kontroapi@localhost:5433/kontroapi' };
          await startDockerPostgres();
        } else {
          const { url } = await inquirer.prompt([{ type: 'input', name: 'url', message: 'Postgres URL:', default: 'postgres://user:pass@localhost:5432/kontroapi' }]);
          config.database = { url };
        }
      }
    } else {
      config.database = { url: opts.dbUrl || 'postgres://kontroapi:kontroapi@localhost:5433/kontroapi' };
    }
  }

  // Redis
  if (opts.redisUrl) {
    config.redis = { url: opts.redisUrl };
  } else {
    if (useDefaults) {
      config.redis = { url: 'redis://localhost:6380' };
    } else {
      const { redisChoice } = await inquirer.prompt([{
        type: 'list',
        name: 'redisChoice',
        message: 'Redis setup:',
        choices: [
          { name: '🐳 Docker (Redis 7 in container — recommended)', value: 'docker' },
          { name: '🔗 Use existing Redis (provide connection string)', value: 'external' },
        ],
      }]);
      if (redisChoice === 'docker') {
        config.redis = { url: 'redis://localhost:6380' };
      } else {
        const { url } = await inquirer.prompt([{ type: 'input', name: 'url', message: 'Redis URL:', default: 'redis://localhost:6379' }]);
        config.redis = { url };
      }
    }
  }

  // Billing
  if (useDefaults) {
    config.billing = { enabled: false, provider: 'none' };
  } else {
    const { billingEnabled } = await inquirer.prompt([{ type: 'confirm', name: 'billingEnabled', message: 'Enable billing (NaafiPay)?', default: false }]);
    config.billing = { enabled: billingEnabled, provider: 'none' };
    if (billingEnabled) {
      const np = await inquirer.prompt([
        { type: 'input', name: 'apiKey', message: 'NaafiPay API key:' },
        { type: 'input', name: 'webhookSecret', message: 'NaafiPay webhook secret:' },
      ]);
      config.billing.apiKey = np.apiKey;
      config.billing.webhookSecret = np.webhookSecret;
      config.billing.provider = 'naafipay';
    }
  }

  // Write config
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  chmodSync(CONFIG_FILE, 0o600);

  // Write .env
  const envContent = generateEnv(config as KontroConfig);
  writeFileSync(ENV_FILE, envContent);
  chmodSync(ENV_FILE, 0o600);

  // Initialize database schema
  const dbSpinner = ora('Initializing database schema...').start();
  try {
    await initDatabase(config.database!.url);
    await seedDatabase(config as KontroConfig);
    dbSpinner.succeed('Database initialized');
  } catch (err: any) {
    dbSpinner.fail(`Database init failed: ${err.message}`);
    console.log(chalk.yellow('\nMake sure Postgres is running at the configured URL.'));
    console.log(chalk.gray('Retry with: kontroapi init'));
    process.exit(1);
  }

  console.log(chalk.bold.green('\n  ✓ KontroAPI initialized successfully!\n'));
  console.log(chalk.white('  Next steps:'));
  console.log(chalk.cyan('    kontroapi start') + chalk.gray('          — start the gateway'));
  console.log(chalk.cyan(`    http://localhost:${config.ports!.dashboard}`) + chalk.gray(' — open dashboard'));
  console.log(chalk.cyan('    kontroapi status') + chalk.gray('        — check service status'));
  console.log('');
  if (!useDefaults) {
    console.log(chalk.gray(`  Admin login: ${adminEmail}`));
  } else {
    console.log(chalk.yellow(`  Admin login: ${adminEmail} / ${adminPassword}`));
  }
  console.log('');
}

function checkDocker(): boolean {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    execSync('docker compose version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function startDockerPostgres() {
  const composeContent = generateDockerCompose();
  writeFileSync(DOCKER_COMPOSE_FILE, composeContent);
  const spinner = ora('Starting Postgres + Redis via Docker...').start();
  try {
    execSync('docker compose up -d', { cwd: CONFIG_DIR, stdio: 'pipe' });
    spinner.succeed('Docker services started');
    await sleep(3000);
  } catch (err: any) {
    spinner.fail(`Docker start failed: ${err.message}`);
    throw err;
  }
}

function generateDockerCompose(): string {
  return `services:
  postgres:
    image: postgres:16-alpine
    container_name: kontroapi-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: kontroapi
      POSTGRES_PASSWORD: kontroapi
      POSTGRES_DB: kontroapi
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kontroapi"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: kontroapi-redis
    restart: unless-stopped
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres_data:
  redis_data:
`;
}

function generateEnv(config: KontroConfig): string {
  return `# KontroAPI — generated by 'kontroapi init' on ${new Date().toISOString()}
# DO NOT EDIT MANUALLY — use 'kontroapi config' instead

NODE_ENV=production
KONTROAPI_MODE=self-hosted
KONTROAPI_HOME=${CONFIG_DIR}

# Ports
DASHBOARD_PORT=${config.ports.dashboard}
ENGINE_PORT=${config.ports.engine}

# Database
LOCAL_DB_URL=${config.database.url}

# Redis
REDIS_URL=${config.redis.url}

# Secrets
JWT_SECRET=${config.secrets.jwtSecret}
INTERNAL_SECRET=${config.secrets.internalSecret}
SESSION_ENCRYPTION_KEY=${config.secrets.encryptionKey}

# Branding
BRAND_NAME=${config.branding.name}
SUPPORT_EMAIL=${config.branding.supportEmail}

# Billing
BILLING_ENABLED=${config.billing.enabled}
${config.billing.apiKey ? `NAAFIPAY_API_KEY=${config.billing.apiKey}\nNAAFIPAY_WEBHOOK_SECRET=${config.billing.webhookSecret}\n` : ''}
`;
}

async function initDatabase(dbUrl: string) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const schema = readFileSync(join(import.meta.dirname || __dirname, '../../../apps/wa-engine/schema.sql'), 'utf8');
  await client.query(schema);

  await client.end();
}

async function seedDatabase(config: KontroConfig) {
  const client = new Client({ connectionString: config.database.url });
  await client.connect();

  // Users table for local auth
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [config.admin.email, config.admin.passwordHash, 'Administrator']);

  await client.end();
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
