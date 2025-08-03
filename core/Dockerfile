# Core package Dockerfile
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build the core package
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 core

WORKDIR /app

# Copy built core package
COPY --from=base --chown=core:nodejs /app/dist ./dist
COPY --from=base --chown=core:nodejs /app/package*.json ./
COPY --from=base --chown=core:nodejs /app/node_modules ./node_modules

USER core

CMD ["node", "dist/index.js"]