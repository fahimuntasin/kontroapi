import chalk from 'chalk';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = process.env.KONTROAPI_HOME || join(process.env.HOME || '.', '.kontroapi');
const PID_FILE = join(CONFIG_DIR, 'kontroapi.pid');

export async function stopCommand() {
  if (!existsSync(PID_FILE)) {
    console.log(chalk.yellow('  Not running.'));
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
  try {
    process.kill(pid, 'SIGTERM');
    console.log(chalk.green(`  ✓ Stopped (PID ${pid})`));
  } catch (err: any) {
    console.log(chalk.red(`  Failed to stop PID ${pid}: ${err.message}`));
  }
  unlinkSync(PID_FILE);
}
