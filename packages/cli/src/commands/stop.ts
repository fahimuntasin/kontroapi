import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');

export async function stopCommand() {
  if (!existsSync(DOCKER_COMPOSE_FILE)) {
    console.log(chalk.yellow('  Not running. Run `kontroapi init` first.'));
    return;
  }

  try {
    execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} down`, { stdio: 'inherit' });
    console.log(chalk.green('  ✓ Stopped'));
  } catch (err: any) {
    console.log(chalk.red(`  ✗ Failed: ${err.message}`));
    process.exit(1);
  }
}
