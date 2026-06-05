import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { updateCommand } from './commands/update.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('kontroapi')
  .description('Self-hostable WhatsApp Business API gateway')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new KontroAPI instance (generates docker-compose.yml + .env + admin user)')
  .option('-y, --yes', 'use defaults without asking')
  .option('--port <port>', 'dashboard port', '3001')
  .option('--engine-port <port>', 'WA engine port', '3000')
  .option('--db-url <url>', 'Postgres connection string')
  .option('--redis-url <url>', 'Redis connection string')
  .action(initCommand);

program
  .command('start')
  .description('Start the WA engine + dashboard via docker compose')
  .option('-d, --detach', 'run in background')
  .action(startCommand);

program
  .command('stop')
  .description('Stop running services')
  .action(stopCommand);

program
  .command('status')
  .description('Show status of running services')
  .action(statusCommand);

program
  .command('update')
  .description('Update KontroAPI to the latest version')
  .action(updateCommand);

program
  .command('config')
  .description('Show or edit configuration')
  .argument('[key]', 'config key (e.g. ports.dashboard)')
  .argument('[value]', 'new value')
  .action(configCommand);

program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Quick start:'));
  console.log('  $ npx kontroapi init       ' + chalk.gray('Setup Postgres + Redis + admin'));
  console.log('  $ npx kontroapi start      ' + chalk.gray('Run the gateway'));
  console.log('  $ npx kontroapi status     ' + chalk.gray('Check if running'));
  console.log('');
  console.log(chalk.gray('Docs:    https://docs.kontroapi.com'));
  console.log(chalk.gray('GitHub:  https://github.com/kontroapi/kontroapi'));
  console.log(chalk.gray('License: AGPL-3.0 (self-host free, SaaS requires license)'));
});

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
