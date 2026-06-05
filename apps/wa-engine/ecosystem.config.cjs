module.exports = {
  apps: [
    {
      name: 'wa-api',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'wa-worker',
      script: './dist/worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
