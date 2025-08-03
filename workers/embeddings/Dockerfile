# Embeddings Worker Dockerfile
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY workers/embeddings/package*.json ./
RUN npm install

# Copy core dependency (built from root context)
COPY core/dist ./core/dist
COPY core/src ./core/src
COPY core/package*.json ./core/
COPY core/tsconfig.json ./core/

# Install core as a local package to fix dependency resolution
RUN cd core && npm install && cd ..
RUN npm install ./core

# Copy root tsconfig.json for project references
COPY tsconfig.json ../tsconfig.json

# Copy source code
COPY workers/embeddings/src ./src
COPY workers/embeddings/tsconfig*.json ./
COPY workers/embeddings/tsup.config.* ./

# Build the worker
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

WORKDIR /app

# Copy built application
COPY --from=base --chown=worker:nodejs /app/dist ./dist
COPY --from=base --chown=worker:nodejs /app/package*.json ./
COPY --from=base --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=worker:nodejs /app/core ./core

USER worker

CMD ["npm", "start"]