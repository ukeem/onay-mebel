# ── Stage 1: build with the complete locked dependency graph ──
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx --no-install prisma generate

COPY . .
RUN npm run build

# Compile seed separately (ts-node doesn't work in production)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --target ES2023 --skipLibCheck --resolveJsonModule

# ── Stage 2: clean production-only graph from the same lock file ──
FROM node:22-alpine AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx --no-install prisma generate
COPY scripts/verify-runtime-dependencies.mjs ./scripts/verify-runtime-dependencies.mjs
RUN node scripts/verify-runtime-dependencies.mjs

# ── Stage 3: Production ──
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy build artifacts and independently installed production dependencies.
COPY --from=builder /app/dist ./dist
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 4000

# Run migrations, seed, then start (dumb-init forwards SIGTERM for graceful shutdown)
CMD ["dumb-init", "sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
