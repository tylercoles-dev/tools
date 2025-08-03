# Multi-stage Docker build for MCP Tools

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for all workspaces
COPY core/package*.json ./core/
COPY gateway/package*.json ./gateway/
COPY workers/embeddings/package*.json ./workers/embeddings/
COPY workers/markitdown/package*.json ./workers/markitdown/
COPY servers/kanban/package*.json ./servers/kanban/
COPY servers/wiki/package*.json ./servers/wiki/
COPY servers/memory/package*.json ./servers/memory/
COPY web/package*.json ./web/

# Install dependencies for all workspaces
RUN cd core && npm ci --omit=dev && \
    cd ../gateway && npm ci --omit=dev && \
    cd ../workers/embeddings && npm ci --omit=dev && \
    cd ../workers/markitdown && npm ci --omit=dev && \
    cd ../servers/kanban && npm ci --omit=dev && \
    cd ../servers/wiki && npm ci --omit=dev && \
    cd ../servers/memory && npm ci --omit=dev && \
    cd ../web && npm ci --omit=dev

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/core/node_modules ./core/node_modules
COPY --from=deps /app/gateway/node_modules ./gateway/node_modules
COPY --from=deps /app/workers/embeddings/node_modules ./workers/embeddings/node_modules
COPY --from=deps /app/workers/markitdown/node_modules ./workers/markitdown/node_modules
COPY --from=deps /app/servers/kanban/node_modules ./servers/kanban/node_modules
COPY --from=deps /app/servers/wiki/node_modules ./servers/wiki/node_modules
COPY --from=deps /app/servers/memory/node_modules ./servers/memory/node_modules
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

# Build markitdown worker
WORKDIR /app/workers/markitdown
RUN npm run build

# Build MCP servers
WORKDIR /app/servers/kanban
RUN npm run build

WORKDIR /app/servers/wiki
RUN npm run build

WORKDIR /app/servers/memory
RUN npm run build

# Build web client
WORKDIR /app/web
RUN npm run build

# Stage 3: Gateway Service
FROM node:22-alpine AS gateway
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
FROM node:22-alpine AS embeddings-worker
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
FROM node:22-alpine AS web
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

# Stage 6: Markitdown Worker
FROM node:22-alpine AS markitdown-worker
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built worker
COPY --from=builder --chown=worker:nodejs /app/workers/markitdown/dist ./workers/markitdown/dist
COPY --from=builder --chown=worker:nodejs /app/workers/markitdown/package*.json ./workers/markitdown/
COPY --from=builder --chown=worker:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=worker:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=worker:nodejs /app/workers/markitdown/node_modules ./workers/markitdown/node_modules
COPY --from=deps --chown=worker:nodejs /app/core/node_modules ./core/node_modules

USER worker

WORKDIR /app/workers/markitdown
CMD ["npm", "start"]

# Stage 7: Kanban MCP Server
FROM node:22-alpine AS kanban-server
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

# Copy built server
COPY --from=builder --chown=mcp:nodejs /app/servers/kanban/dist ./servers/kanban/dist
COPY --from=builder --chown=mcp:nodejs /app/servers/kanban/package*.json ./servers/kanban/
COPY --from=builder --chown=mcp:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=mcp:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=mcp:nodejs /app/servers/kanban/node_modules ./servers/kanban/node_modules
COPY --from=deps --chown=mcp:nodejs /app/core/node_modules ./core/node_modules

USER mcp

EXPOSE 3002

WORKDIR /app/servers/kanban
CMD ["npm", "start"]

# Stage 8: Wiki MCP Server
FROM node:22-alpine AS wiki-server
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

# Copy built server
COPY --from=builder --chown=mcp:nodejs /app/servers/wiki/dist ./servers/wiki/dist
COPY --from=builder --chown=mcp:nodejs /app/servers/wiki/package*.json ./servers/wiki/
COPY --from=builder --chown=mcp:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=mcp:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=mcp:nodejs /app/servers/wiki/node_modules ./servers/wiki/node_modules
COPY --from=deps --chown=mcp:nodejs /app/core/node_modules ./core/node_modules

USER mcp

EXPOSE 3003

WORKDIR /app/servers/wiki
CMD ["npm", "start"]

# Stage 9: Memory MCP Server
FROM node:22-alpine AS memory-server
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

# Copy built server
COPY --from=builder --chown=mcp:nodejs /app/servers/memory/dist ./servers/memory/dist
COPY --from=builder --chown=mcp:nodejs /app/servers/memory/package*.json ./servers/memory/
COPY --from=builder --chown=mcp:nodejs /app/core/dist ./core/dist
COPY --from=builder --chown=mcp:nodejs /app/core/package*.json ./core/

# Copy production dependencies
COPY --from=deps --chown=mcp:nodejs /app/servers/memory/node_modules ./servers/memory/node_modules
COPY --from=deps --chown=mcp:nodejs /app/core/node_modules ./core/node_modules

USER mcp

EXPOSE 3004

WORKDIR /app/servers/memory
CMD ["npm", "start"]