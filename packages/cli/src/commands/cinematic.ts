import chalk from 'chalk';
import boxen from 'boxen';
import ora, { type Ora } from 'ora';
import cliProgress from 'cli-progress';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clear = () => process.stdout.write('\x1Bc');

export async function cinematicExperience(): Promise<void> {
  try { await sceneOne(); } catch { /* silent */ }
  await sleep(1000);

  try { await sceneTwo(); } catch { /* silent */ }
  await sleep(1200);

  try { await sceneThree(); } catch { /* silent */ }
  await sleep(1000);

  try { await sceneFour(); } catch { /* silent */ }
  await sleep(1200);

  try { await sceneFive(); } catch { /* silent */ }
  await sleep(1000);

  try { await sceneSix(); } catch { /* silent */ }
  await sleep(1500);

  try { await sceneSeven(); } catch { /* silent */ }
  await sleep(1200);

  try { await sceneEight(); } catch { /* silent */ }

  clear();
  console.log(chalk.cyan('\n  Start the gateway:     ') + chalk.white('kontroapi start -d'));
  console.log(chalk.cyan('  Open setup wizard:     ') + chalk.white('http://localhost:3001/setup'));
  console.log(chalk.cyan('  Status check:          ') + chalk.white('kontroapi status'));
  console.log('');
}

async function sceneOne(): Promise<void> {
  clear();

  const boxTop = chalk.dim('╔══════════════════════════════════════════════════════════╗');
  const boxMid = chalk.dim('║') + '                                                          ' + chalk.dim('║');
  const boxTitle = chalk.dim('║') + '           ✦  Somewhere in the world...  ✦                ' + chalk.dim('║');
  const boxBot = chalk.dim('╚══════════════════════════════════════════════════════════╝');

  console.log(boxTop);
  console.log(boxMid);
  console.log(boxTitle);
  console.log(boxMid);
  console.log(boxBot);

  await sleep(1000);

  const developers = [
    { icon: '👨‍💻', text: ' Developer in Bangladesh coding at 2:43 AM' },
    { icon: '👩‍💻', text: ' Developer in Germany fixing a critical bug' },
    { icon: '👨‍💻', text: ' Developer in Brazil reviewing pull requests' },
    { icon: '👩‍💻', text: ' Developer in Japan maintaining essential packages' },
    { icon: '👨‍💻', text: ' Developer in India answering community questions' },
  ];

  for (const dev of developers) {
    console.log('  ' + chalk.cyan(dev.icon) + chalk.dim(dev.text));
    await sleep(500);
  }

  await sleep(1500);
}

async function sceneTwo(): Promise<void> {
  clear();

  console.log(chalk.white('$ ') + chalk.dim('git log --oneline --since="last 24 hours"'));
  console.log('');

  const commits: { text: string; color: (s: string) => string }[] = [
    { text: '+ fix memory leak in queue processor', color: chalk.green },
    { text: '+ improve session reconnection performance', color: chalk.green },
    { text: '+ update contributing docs', color: chalk.yellow },
    { text: '+ review community pull request #341', color: chalk.magenta },
    { text: '+ answer issue #512 (webhook timeout)', color: chalk.cyan },
    { text: '+ merge @community-contributor: fix typo', color: chalk.blue },
  ];

  for (const commit of commits) {
    console.log('  ' + commit.color(commit.text));
    await sleep(250);
  }

  await sleep(1500);
}

async function sceneThree(): Promise<void> {
  clear();

  const stages = [
    { icon: '👨‍💻', label: 'Developer' },
    { icon: '✨', label: 'Contribution' },
    { icon: '📦', label: 'Package' },
    { icon: '🚀', label: 'Project' },
    { icon: '👥', label: 'Community' },
    { icon: '💡', label: 'Innovation' },
  ];

  const spinner = ora({ text: '', isSilent: true });

  for (let i = 0; i < stages.length; i++) {
    if (i > 0) {
      console.log(chalk.dim('       ' + '  ↓'));
    }
    console.log('       ' + stages[i].icon + ' ' + chalk.bold(stages[i].label));
    await sleep(400);
  }

  await sleep(1500);
}

async function sceneFour(): Promise<void> {
  clear();

  const crowdRows = [
    '  👤',
    '  👤👤',
    '  👤👤👤',
    '  👤👤👤👤',
    '  👤👤👤👤👤',
    '  👤👤👤👤👤👤',
    '  👤👤👤👤👤👤👤👤',
    '  👤👤👤👤👤👤👤👤👤👤',
  ];

  for (const row of crowdRows) {
    console.log(chalk.dim(row));
    await sleep(200);
  }

  await sleep(600);

  const boxTop = chalk.dim('  ╔════════════════════════════════════╗');
  const boxLine1 = chalk.dim('  ║  ') + 'Behind every dependency...' + chalk.dim('       ║');
  const boxLine2 = chalk.dim('  ║  ') + '...there is a human.' + chalk.dim('             ║');
  const boxBot = chalk.dim('  ╚════════════════════════════════════╝');

  console.log('');
  console.log(boxTop);
  console.log(boxLine1);
  console.log(boxLine2);
  console.log(boxBot);
  console.log('');

  const messages = [
    '"Someone skipped sleep."',
    '"Someone spent weekends debugging."',
    '"Someone fixed a bug you never knew existed."',
    '"Someone helped a stranger they\'ll never meet."',
  ];

  for (const msg of messages) {
    console.log(chalk.dim.italic('  ' + msg));
    await sleep(800);
  }

  await sleep(1500);
}

async function sceneFive(): Promise<void> {
  clear();

  const technologies = ['Linux', 'Node.js', 'TypeScript', 'Docker', 'Baileys', 'Express', 'Git'];

  const spinners: Ora[] = [];

  for (const tech of technologies) {
    const s = ora({
      text: chalk.dim('[') + chalk.cyan(tech) + chalk.dim(']') + '  ...',
      stream: process.stdout,
    }).start();
    spinners.push(s);
  }

  for (let i = 0; i < spinners.length; i++) {
    await sleep(400);
    const tech = technologies[i];
    spinners[i].stopAndPersist({
      symbol: chalk.green('✓'),
      text: chalk.dim('[') + chalk.cyan(tech) + chalk.dim(']') + chalk.green('  ✓'),
    });
  }

  await sleep(1500);
}

async function sceneSix(): Promise<void> {
  clear();

  const content = [
    '  ❤️  Thank You Open Source Developers',
    '',
    '  To every maintainer.',
    '  To every contributor.',
    '  To every bug reporter.',
    '  To every documentation writer.',
    '  To every package author.',
    '',
    '  Your work powers millions of apps.',
  ].join('\n');

  console.log(
    boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'magenta',
    })
  );

  await sleep(2000);
}

async function sceneSeven(): Promise<void> {
  clear();

  console.log(chalk.bold('  ⭐  GitHub Stars'));
  console.log('');

  const bar = new cliProgress.SingleBar(
    {
      format: '  {bar} {value} stars',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  const targets = [14, 73, 251, 812, 1402];
  let value = 0;
  bar.start(1402, 0);

  for (const target of targets) {
    while (value < target) {
      const step = Math.max(1, Math.ceil((target - value) / 8));
      value = Math.min(value + step, target);
      bar.update(value);
      await sleep(150);
    }
  }

  bar.stop();
  console.log('');

  const messages = [
    chalk.dim('  "If KontroAPI helped you..."'),
    chalk.dim('  "Please consider starring the project."'),
    chalk.cyan('  github.com/fahimuntasin/kontroapi'),
  ];

  for (const msg of messages) {
    console.log(msg);
    await sleep(500);
  }

  await sleep(1500);
}

async function sceneEight(): Promise<void> {
  clear();

  // Figlet ASCII art banner
  try {
    const figletModule: any = await import('figlet');
    const figlet = figletModule.default || figletModule;

    let figletGradient: ((s: string) => string) | null = null;
    try {
      const gradientModule: any = await import('gradient-string');
      const gradient = gradientModule.default || gradientModule;
      figletGradient =
        typeof gradient.morning === 'function'
          ? gradient.morning
          : typeof gradient.pastel === 'function'
            ? gradient.pastel
            : typeof gradient === 'function'
              ? (s: string) => gradient(s)
              : null;
    } catch {
      figletGradient = null;
    }

    const figletText: string = await new Promise((resolve, reject) => {
      figlet(
        'KONTROAPI',
        { font: 'Standard' },
        (err: Error | null, data: string | undefined) => {
          if (err) reject(err);
          else resolve(data || '');
        }
      );
    });

    if (figletGradient) {
      console.log(figletGradient(figletText));
    } else {
      console.log(chalk.cyan(figletText));
    }
  } catch {
    console.log(chalk.cyan.bold('  KONTROAPI'));
  }

  console.log('');

  // Nanospinner checklist
  try {
    const nanoModule: any = await import('nanospinner');
    const createSpinner = nanoModule.createSpinner || nanoModule.default?.createSpinner;

    const checklist: { name: string; color: (s: string) => string }[] = [
      { name: 'Gateway ............. READY', color: chalk.green },
      { name: 'Dashboard ........... READY', color: chalk.green },
      { name: 'Security ............ READY', color: chalk.green },
      { name: 'Containers .......... READY', color: chalk.green },
      { name: 'Community ........... READY', color: chalk.blue },
    ];

    for (const item of checklist) {
      const pendingText = chalk.dim(item.name.replace(' READY', ' ...'));
      const spinner = createSpinner(pendingText).start();
      await sleep(400);
      spinner.success({ text: item.color(item.name) });
    }

    console.log('');
  } catch {
    console.log(chalk.green('  ✓  All systems ready'));
    console.log('');
  }

  // Final box
  const finalContent = [
    '        🚀  KONTROAPI IS READY',
    '',
    '        Build. Share. Contribute. Inspire.',
    '',
    '        Open Source First.',
    '        Community Always.',
  ].join('\n');

  console.log(
    boxen(finalContent, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );

  console.log('');

  const links = [
    chalk.dim('  📦  npm:  npmjs.com/package/@kontroapis/cli'),
    chalk.dim('  🐙  GitHub:  github.com/fahimuntasin/kontroapi'),
    chalk.dim('  🌐  Docs:  kontroapi.com/docs'),
    chalk.dim('  💬  Community:  github.com/fahimuntasin/kontroapi/discussions'),
  ];

  for (const link of links) {
    console.log(link);
    await sleep(250);
  }

  console.log('');
  console.log(chalk.cyan('  Press ENTER to begin your journey...'));

  // Wait for ENTER or timeout after 10 seconds
  await Promise.race([
    new Promise<void>((resolve) => {
      const onData = (buf: Buffer) => {
        const key = buf.toString();
        if (key === '\n' || key === '\r' || key === '\r\n') {
          process.stdin.removeListener('data', onData);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          resolve();
        }
      };
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.on('data', onData);
    }),
    sleep(10000),
  ]);

  // Clean up stdin
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}
