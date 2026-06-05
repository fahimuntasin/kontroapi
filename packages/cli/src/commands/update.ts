import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const DOCKER_COMPOSE_FILE = join(CONFIG_DIR, 'docker-compose.yml');

export async function updateCommand() {
  const spinner = ora('Checking for updates...').start();
  try {
    const latest = execSync('npm view @kontroapis/cli version', { encoding: 'utf8' }).trim();
    const currentPkg = require('../../package.json');
    const current = currentPkg.version;
    if (latest === current) {
      spinner.succeed(`Already on latest version (${current})`);
    } else {
      spinner.info(`Updating CLI ${current} → ${latest}`);
      execSync('npm install -g @kontroapis/cli@latest', { stdio: 'inherit' });
    }

    if (existsSync(DOCKER_COMPOSE_FILE)) {
      const imageSpinner = ora('Pulling latest Docker images...').start();
      try {
        execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} pull`, {
          cwd: CONFIG_DIR,
          stdio: 'inherit',
        });
        execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} up -d`, {
          cwd: CONFIG_DIR,
          stdio: 'inherit',
        });
        imageSpinner.succeed('Containers updated and restarted');
      } catch (err: any) {
        imageSpinner.fail(`Image pull failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    spinner.fail(`Update failed: ${err.message}`);
  }
}
