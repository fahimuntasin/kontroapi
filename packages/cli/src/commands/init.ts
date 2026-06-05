import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { Client } from 'pg';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const ENV_FILE = join(CONFIG_DIR, '.env');
const DATA_DIR = join(CONFIG_DIR, 'data');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');

const IMAGE_ENGINE = process.env.KONTROAPI_ENGINE_IMAGE || 'ghcr.io/fahimuntasin/kontroapi/engine:latest';
const IMAGE_DASHBOARD = process.env.KONTROAPI_DASHBOARD_IMAGE || 'ghcr.io/fahimuntasin/kontroapi/dashboard:latest';

interface KontroConfig {
  mode: 'self-hosted';
  createdAt: string;
  version: string;
  ports: { dashboard: number; engine: number };
  database: { url: string; host: string; port: number; user: string; password: string; name: string };
  redis: { url: string };
  images: { engine: string; dashboard: string };
  secrets: {
    jwtSecret: string;
    internalSecret: string;
    encryptionKey: string;
  };
  admin: { email: string; passwordHash: string; createdAt: string };
  branding: { name: string; supportEmail: string };
  billing: { enabled: boolean; provider: 'none' | 'naafipay'; apiKey?: string; webhookSecret?: string };
}

const CLI_VERSION = '0.1.0';

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

  if (!checkDocker()) {
    console.log(chalk.red('\n  ✗ Docker is required for self-hosted mode.'));
    console.log(chalk.gray('  Install: https://docs.docker.com/engine/install/\n'));
    process.exit(1);
  }

  mkdirSync(CONFIG_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, 'sessions'), { recursive: true });
  mkdirSync(join(DATA_DIR, 'logs'), { recursive: true });

  const config: Partial<KontroConfig> = {
    mode: 'self-hosted',
    createdAt: new Date().toISOString(),
    version: CLI_VERSION,
    ports: { dashboard: parseInt(opts.port) || 3001, engine: parseInt(opts.enginePort) || 3000 },
    images: { engine: IMAGE_ENGINE, dashboard: IMAGE_DASHBOARD },
    secrets: {
      jwtSecret: randomBytes(48).toString('hex'),
      internalSecret: randomBytes(32).toString('hex'),
      encryptionKey: randomBytes(32).toString('hex'),
    },
  };

  if (useDefaults) {
    config.branding = { name: 'KontroAPI', supportEmail: 'support@localhost' };
  } else {
    const branding = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Instance name:', default: 'KontroAPI' },
      { type: 'input', name: 'supportEmail', message: 'Support email:', default: 'support@localhost' },
    ]);
    config.branding = branding;
  }

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

  const { createHash } = await import('crypto');
  config.admin = {
    email: adminEmail,
    passwordHash: createHash('sha256').update(adminPassword).digest('hex'),
    createdAt: new Date().toISOString(),
  };

  if (opts.dbUrl) {
    const parsed = parseDbUrl(opts.dbUrl);
    config.database = { url: opts.dbUrl, ...parsed };
  } else {
    if (useDefaults) {
      config.database = { url: 'postgres://kontroapi:kontroapi@postgres:5432/kontroapi', host: 'postgres', port: 5432, user: 'kontroapi', password: 'kontroapi', name: 'kontroapi' };
    } else {
      const { dbChoice } = await inquirer.prompt([{
        type: 'list',
        name: 'dbChoice',
        message: 'Database setup:',
        choices: [
          { name: '🐳 Bundled Postgres container (recommended)', value: 'bundled' },
          { name: '🔗 Use existing Postgres (provide connection string)', value: 'external' },
        ],
      }]);
      if (dbChoice === 'bundled') {
        config.database = { url: 'postgres://kontroapi:kontroapi@postgres:5432/kontroapi', host: 'postgres', port: 5432, user: 'kontroapi', password: 'kontroapi', name: 'kontroapi' };
      } else {
        const { url } = await inquirer.prompt([{ type: 'input', name: 'url', message: 'Postgres URL:', default: 'postgres://user:pass@host:5432/kontroapi' }]);
        const parsed = parseDbUrl(url);
        config.database = { url, ...parsed };
      }
    }
  }

  if (opts.redisUrl) {
    config.redis = { url: opts.redisUrl };
  } else {
    if (useDefaults) {
      config.redis = { url: 'redis://redis:6379' };
    } else {
      const { redisChoice } = await inquirer.prompt([{
        type: 'list',
        name: 'redisChoice',
        message: 'Redis setup:',
        choices: [
          { name: '🐳 Bundled Redis container (recommended)', value: 'bundled' },
          { name: '🔗 Use existing Redis (provide connection string)', value: 'external' },
        ],
      }]);
      if (redisChoice === 'bundled') {
        config.redis = { url: 'redis://redis:6379' };
      } else {
        const { url } = await inquirer.prompt([{ type: 'input', name: 'url', message: 'Redis URL:', default: 'redis://localhost:6379' }]);
        config.redis = { url };
      }
    }
  }

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

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  chmodSync(CONFIG_FILE, 0o600);

  const envContent = generateEnv(config as KontroConfig);
  writeFileSync(ENV_FILE, envContent);
  chmodSync(ENV_FILE, 0o600);

  const composeContent = generateDockerCompose(config as KontroConfig);
  writeFileSync(DOCKER_COMPOSE_FILE, composeContent);

  if (config.database?.host !== 'postgres') {
    const dbSpinner = ora('Initializing database schema...').start();
    try {
      await initDatabase(config.database!.url);
      await seedAdmin(config as KontroConfig);
      dbSpinner.succeed('Database initialized');
    } catch (err: any) {
      dbSpinner.fail(`Database init failed: ${err.message}`);
      console.log(chalk.yellow('\nMake sure Postgres is running and reachable.'));
      console.log(chalk.gray('Schema will run automatically when engine container starts.'));
    }
  }

  console.log(chalk.bold.green('\n  ✓ KontroAPI initialized successfully!\n'));
  console.log(chalk.white('  Next steps:'));
  console.log(chalk.cyan('    kontroapi start') + chalk.gray('          — start the gateway'));
  console.log(chalk.cyan(`    http://localhost:${config.ports!.dashboard}`) + chalk.gray(' — open dashboard'));
  console.log(chalk.cyan('    kontroapi status') + chalk.gray('        — check service status'));
  console.log('');
  if (useDefaults) {
    console.log(chalk.yellow(`  Admin login: ${adminEmail} / ${adminPassword}`));
  } else {
    console.log(chalk.gray(`  Admin login: ${adminEmail}`));
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

function parseDbUrl(url: string): { host: string; port: number; user: string; password: string; name: string } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432'),
    user: u.username,
    password: u.password,
    name: u.pathname.replace(/^\//, ''),
  };
}

function generateDockerCompose(config: KontroConfig): string {
  const hasBundledDb = config.database.host === 'postgres';
  const hasBundledRedis = config.redis.url.startsWith('redis://redis');

  const services: string[] = [];
  const volumes: string[] = [];
  const networks: string[] = ['  kontroapi:'];

  if (hasBundledDb) {
    services.push(`  postgres:
    image: postgres:16-alpine
    container_name: kontroapi-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${config.database.user}
      POSTGRES_PASSWORD: ${config.database.password}
      POSTGRES_DB: ${config.database.name}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${config.database.user}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - kontroapi
`);
    volumes.push('  postgres_data:');
  }

  if (hasBundledRedis) {
    services.push(`  redis:
    image: redis:7-alpine
    container_name: kontroapi-redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks:
      - kontroapi
`);
    volumes.push('  redis_data:');
  }

  services.push(`  engine:
    image: ${config.images.engine}
    container_name: kontroapi-engine
    restart: unless-stopped
    depends_on:
${hasBundledDb ? '      postgres:\n        condition: service_healthy\n' : ''}${hasBundledRedis ? '      redis:\n        condition: service_healthy\n' : ''}    environment:
      NODE_ENV: production
      KONTROAPI_MODE: self-hosted
      LOCAL_DB_URL: ${config.database.url}
      REDIS_HOST: ${hasBundledRedis ? 'redis' : new URL(config.redis.url).hostname}
      REDIS_PORT: ${hasBundledRedis ? '6379' : (new URL(config.redis.url).port || '6379')}
      REDIS_PASSWORD: ${new URL(config.redis.url).password || ''}
      JWT_SECRET: \${JWT_SECRET}
      INTERNAL_SECRET: \${INTERNAL_SECRET}
      SESSION_ENCRYPTION_KEY: \${SESSION_ENCRYPTION_KEY}
      WEBHOOK_SECRET_ENCRYPTION_KEY: \${WEBHOOK_SECRET_ENCRYPTION_KEY}
      PORT: 3000
    volumes:
      - ${DATA_DIR}/sessions:/data/sessions
      - ${DATA_DIR}/logs:/data/logs
    ports:
      - "${config.ports.engine}:3000"
    networks:
      - kontroapi
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3

  dashboard:
    image: ${config.images.dashboard}
    container_name: kontroapi-dashboard
    restart: unless-stopped
    depends_on:
      - engine
    environment:
      NODE_ENV: production
      PORT: 3001
      WA_ENGINE_URL: http://engine:3000
      WA_ENGINE_INTERNAL_SECRET: \${INTERNAL_SECRET}
      JWT_SECRET: \${JWT_SECRET}
      LOCAL_DB_URL: ${config.database.url}
      NAAFIPAY_API_KEY: \${NAAFIPAY_API_KEY:-}
      NAAFIPAY_WEBHOOK_SECRET: \${NAAAFIPAY_WEBHOOK_SECRET:-}
    ports:
      - "${config.ports.dashboard}:3001"
    networks:
      - kontroapi
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/auth/me',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3
`);

  return `# Generated by kontroapi v${CLI_VERSION} — do not edit manually.
# Use 'kontroapi config' to update settings.

${services.join('\n')}
volumes:
${volumes.join('\n')}

networks:
${networks.join('\n')}
  name: kontroapi
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

# Image versions
KONTROAPI_ENGINE_IMAGE=${config.images.engine}
KONTROAPI_DASHBOARD_IMAGE=${config.images.dashboard}

# Secrets (used by docker-compose.yml)
JWT_SECRET=${config.secrets.jwtSecret}
INTERNAL_SECRET=${config.secrets.internalSecret}
SESSION_ENCRYPTION_KEY=${config.secrets.encryptionKey}
WEBHOOK_SECRET_ENCRYPTION_KEY=${config.secrets.encryptionKey}

# Branding
BRAND_NAME=${config.branding.name}
SUPPORT_EMAIL=${config.branding.supportEmail}

# Billing
BILLING_ENABLED=${config.billing.enabled}
${config.billing.apiKey ? `NAAFIPAY_API_KEY=${config.billing.apiKey}\nNAAFIPAY_WEBHOOK_SECRET=${config.billing.webhookSecret}\n` : '# NAAFIPAY_API_KEY=\n# NAAFIPAY_WEBHOOK_SECRET='}
`;
}

async function initDatabase(dbUrl: string) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.end();
}

async function seedAdmin(config: KontroConfig) {
  const client = new Client({ connectionString: config.database.url });
  await client.connect();

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
