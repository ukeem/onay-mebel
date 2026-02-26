# ── Stage 1: Build ──
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY . .
RUN npm run build

# Compile seed separately (ts-node doesn't work in production)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --target ES2023 --skipLibCheck --resolveJsonModule

# Remove dev dependencies to shrink node_modules 111
# Re-add prisma CLI (devDep) needed for runtime migrations
RUN npm prune --omit=dev && npm install --no-save prisma

# ── Stage 2: Production ──
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy built app (node_modules already pruned)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 4000

# Run migrations, seed, then start (dumb-init forwards SIGTERM for graceful shutdown)
CMD ["dumb-init", "sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
