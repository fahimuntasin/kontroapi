/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '..', '..'),
  turbopack: {
    root: path.resolve(__dirname, '..', '..'),
  },
};

module.exports = nextConfig;
