#!/usr/bin/env node
import('../dist/index.js').catch((e) => {
  console.error('Failed to start kontroapi CLI:', e.message);
  console.error('Try reinstalling: npm install -g kontroapi@latest');
  process.exit(1);
});
