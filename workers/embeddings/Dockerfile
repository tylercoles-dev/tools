# Embeddings Worker Dockerfile
FROM node:22-alpine AS base

# Install build dependencies (no PostgreSQL needed for embeddings worker)
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Build core package with all dependencies for build stage
COPY core/package*.json ./core/
COPY core/tsconfig.json ./core/
COPY core/tsup.config.ts ./core/
RUN cd core && npm install --ignore-scripts

# Copy core source and build
COPY core/src ./core/src
RUN cd core && npm run build

# Copy embeddings worker package files and install all dependencies for build  
COPY workers/embeddings/package*.json ./
COPY workers/embeddings/tsup.config.ts ./
RUN npm install --ignore-scripts

# Copy root tsconfig.json to set up proper path mappings
COPY tsconfig.json ./tsconfig.json

# Copy source code
COPY workers/embeddings/src ./src
COPY workers/embeddings/tsconfig*.json ./

# Build the worker using tsup
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install minimal runtime dependencies
RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

WORKDIR /app

# Install embeddings worker dependencies (production only)
COPY workers/embeddings/package*.json ./
RUN npm install --production --ignore-scripts

# Copy built application (now includes all dependencies bundled by tsup)
COPY --from=base --chown=worker:nodejs /app/dist ./dist

USER worker

CMD ["npm", "start"]