FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ─── Stage 1: dependencies ─────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/wa-engine/package.json ./apps/wa-engine/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/
COPY packages/n8n-nodes-kontroapi/package.json ./packages/n8n-nodes-kontroapi/
RUN npm ci

# ─── Stage 2: build ───────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: production deps ─────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY apps/wa-engine/package.json ./apps/wa-engine/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/
RUN npm ci --omit=dev --ignore-scripts

# ─── Stage 4: runner ──────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV KONTROAPI_HOME=/data

# System user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 kontroapi

# Copy built artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/wa-engine/dist ./apps/wa-engine/dist
COPY --from=builder /app/apps/wa-engine/package.json ./apps/wa-engine/
COPY --from=builder /app/apps/wa-engine/schema.sql ./apps/wa-engine/
COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/package.json ./apps/dashboard/
COPY --from=builder /app/apps/dashboard/next.config.js ./apps/dashboard/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/cli/bin ./packages/cli/bin
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/cli/package.json ./packages/cli/
COPY package.json ./
COPY docker-compose.yml /docker-compose.yml

# Data directory for sessions, logs, config
RUN mkdir -p /data && chown -R kontroapi:nodejs /data /app
USER kontroapi

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["node", "packages/cli/dist/index.js"]
CMD ["start"]
