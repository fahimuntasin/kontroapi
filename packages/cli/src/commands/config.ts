import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function configCommand(key?: string, value?: string) {
  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.yellow('  Not initialized.'));
    return;
  }

  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));

  if (!key) {
    console.log(chalk.bold('\n  Configuration:\n'));
    console.log(JSON.stringify(config, null, 2));
    console.log(chalk.gray('\n  Use: kontroapi config <key> <value>'));
    console.log(chalk.gray('  e.g. kontroapi config ports.dashboard 3001'));
    return;
  }

  if (!value) {
    const v = key.split('.').reduce((o: any, k: string) => o?.[k], config);
    console.log(`${chalk.cyan(key)} = ${v !== undefined ? JSON.stringify(v) : chalk.gray('(not set)')}`);
    return;
  }

  // Set nested key
  const keys = key.split('.');
  let target: any = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof target[keys[i]] !== 'object' || target[keys[i]] === null) {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  const last = keys[keys.length - 1];
  const parsed = !isNaN(Number(value)) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value;
  target[last] = parsed;

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(chalk.green(`  ✓ Set ${key} = ${parsed}`));
}
