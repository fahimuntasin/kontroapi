# ─── base ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── deps ──────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/wa-engine/package.json ./apps/wa-engine/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --ignore-scripts

# ─── shared-builder (shared package needed by all apps) ──
FROM base AS shared-builder
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
RUN cd packages/shared && npx tsc

# ─── engine-builder ────────────────────────────────────
FROM base AS engine-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=shared-builder /app/packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY package.json package-lock.json* ./
COPY apps/wa-engine/package.json ./apps/wa-engine/
COPY packages/shared/package.json ./packages/shared/
RUN npm install -w apps/wa-engine --include=dev --ignore-scripts --no-audit --no-fund
COPY apps/wa-engine ./apps/wa-engine
RUN cd apps/wa-engine && npx tsc --build

# ─── dashboard-builder ─────────────────────────────────
FROM base AS dashboard-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/
COPY apps/dashboard ./apps/dashboard
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/dashboard && npx next build

# ─── engine-deps (production) ──────────────────────────
FROM base AS engine-prod-deps
COPY package.json package-lock.json* ./
COPY apps/wa-engine/package.json ./apps/wa-engine/
COPY packages/shared/package.json ./packages/shared/
RUN npm install -w apps/wa-engine --omit=dev --ignore-scripts --no-audit --no-fund

# ─── dashboard-deps (production) ───────────────────────
FROM base AS dashboard-prod-deps
COPY package.json package-lock.json* ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
RUN npm install -w apps/dashboard --omit=dev --ignore-scripts --no-audit --no-fund

# ─── engine:runtime ────────────────────────────────────
FROM base AS engine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs kontroapi

COPY --from=engine-prod-deps /app/apps/wa-engine/node_modules /app/apps/wa-engine/node_modules
COPY --from=shared-builder /app/packages/shared ./packages/shared
COPY --from=engine-builder /app/apps/wa-engine/dist ./apps/wa-engine/dist
COPY --from=engine-builder /app/apps/wa-engine/schema.sql ./apps/wa-engine/
COPY --from=engine-builder /app/apps/wa-engine/package.json ./apps/wa-engine/
COPY docker-entrypoint-engine.sh /usr/local/bin/docker-entrypoint-engine.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-engine.sh

USER kontroapi
ENV NODE_ENV=production
ENV KONTROAPI_MODE=self-hosted
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint-engine.sh"]
CMD ["node", "apps/wa-engine/dist/index.js"]

# ─── dashboard:runtime ─────────────────────────────────
FROM base AS dashboard
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs kontroapi

COPY --from=dashboard-prod-deps /app/apps/dashboard/node_modules /app/apps/dashboard/node_modules
COPY --from=shared-builder /app/packages/shared ./packages/shared
COPY --from=dashboard-builder /app/apps/dashboard/.next/standalone ./
COPY --from=dashboard-builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=dashboard-builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=engine-builder /app/apps/wa-engine/schema.sql ./apps/wa-engine/schema.sql
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER kontroapi
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/auth/me',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/dashboard/server.js"]
