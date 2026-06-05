import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';

export async function updateCommand() {
  const spinner = ora('Checking for updates...').start();
  try {
    const latest = execSync('npm view kontroapi version', { encoding: 'utf8' }).trim();
    const current = '0.1.0';
    if (latest === current) {
      spinner.succeed(`Already on latest version (${current})`);
    } else {
      spinner.info(`Updating ${current} → ${latest}`);
      execSync('npm install -g kontroapi@latest', { stdio: 'inherit' });
    }
  } catch (err: any) {
    spinner.fail(`Update failed: ${err.message}`);
  }
}
