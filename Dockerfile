# Multi-stage Docker build for MCP Tools

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY core/package*.json ./core/
COPY gateway/package*.json ./gateway/
COPY workers/embeddings/package*.json ./workers/embeddings/
COPY web/package*.json ./web/

# Install dependencies
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/core/node_modules ./core/node_modules
COPY --from=deps /app/gateway/node_modules ./gateway/node_modules
COPY --from=deps /app/workers/embeddings/node_modules ./workers/embeddings/node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules

# Copy source code
COPY . .

# Build shared core package first
WORKDIR /app/core
RUN npm run build

# Build gateway service
WORKDIR /app/gateway
RUN npm run build

# Build embeddings worker
WORKDIR /app/workers/embeddings
RUN npm run build

# Build web client
WORKDIR /app/web
RUN npm run build

# Stage 3: Gateway Service
FROM node:18-alpine AS gateway
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 gateway

# Copy built gateway
COPY --from=builder --chown=gateway:nodejs /app/gateway/dist ./gateway/dist
COPY --from=builder --chown=gateway:nodejs /app/gateway/package*.json ./gateway/
COPY --from=builder --chown=gateway:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=gateway:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=gateway:nodejs /app/gateway/node_modules ./gateway/node_modules
COPY --from=deps --chown=gateway:nodejs /app/core/node_modules ./core/node_modules

USER gateway

EXPOSE 3000

WORKDIR /app/gateway
CMD ["npm", "start"]

# Stage 4: Embeddings Worker
FROM node:18-alpine AS embeddings-worker
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built worker
COPY --from=builder --chown=worker:nodejs /app/workers/embeddings/dist ./workers/embeddings/dist
COPY --from=builder --chown=worker:nodejs /app/workers/embeddings/package*.json ./workers/embeddings/
COPY --from=builder --chown=worker:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=worker:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=worker:nodejs /app/workers/embeddings/node_modules ./workers/embeddings/node_modules
COPY --from=deps --chown=worker:nodejs /app/core/node_modules ./core/node_modules

USER worker

WORKDIR /app/workers/embeddings
CMD ["npm", "start"]

# Stage 5: Web Client
FROM node:18-alpine AS web
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js app
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "web/server.js"]