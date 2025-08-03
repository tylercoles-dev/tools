# Memory MCP Server Dockerfile
FROM node:22-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    curl \
    python3 \
    py3-pip \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY servers/memory/package*.json ./
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
COPY servers/memory/src ./src
COPY servers/memory/tsconfig*.json ./
COPY servers/memory/tsup.config.* ./

# Build the server
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    curl \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

WORKDIR /app

# Copy built application
COPY --from=base --chown=mcp:nodejs /app/dist ./dist
COPY --from=base --chown=mcp:nodejs /app/package*.json ./
COPY --from=base --chown=mcp:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=mcp:nodejs /app/core ./core

USER mcp

EXPOSE 6104

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6104/health || exit 1

CMD ["npm", "start"]