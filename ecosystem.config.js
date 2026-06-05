module.exports = {
  apps: [
    {
      name: 'kontro-dashboard',
      cwd: '/home/apps/wa-final/apps/dashboard',
      script: 'node_modules/.bin/next',
      args: 'start --port 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'kontro-wa-engine',
      cwd: '/home/apps/wa-final/apps/wa-engine',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'kontro-wa-worker',
      cwd: '/home/apps/wa-final/apps/wa-engine',
      script: 'node_modules/.bin/tsx',
      args: 'src/worker.ts',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};