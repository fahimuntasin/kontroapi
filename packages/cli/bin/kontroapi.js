#!/usr/bin/env node
import('../dist/index.js').catch(() => {
  import('../src/index.ts').catch((e) => {
    console.error('Failed to start kontroapi CLI:', e.message);
    process.exit(1);
  });
});
