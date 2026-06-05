/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname),
  },
};

module.exports = nextConfig;
