# Kanban MCP Server Dockerfile
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

# First, set up the core package in node_modules
# Copy only package files first for better caching
COPY core/package*.json ./core/
COPY core/tsconfig.json ./core/
COPY core/tsup.config.ts ./core/
RUN cd core && npm install

# Copy core source and build
COPY core/src ./core/src
RUN cd core && npm run build

# Create proper symlink for @mcp-tools/core in node_modules
RUN mkdir -p node_modules/@mcp-tools
RUN ln -sf ../../core node_modules/@mcp-tools/core

# Copy kanban package files and install dependencies
COPY servers/kanban/package*.json ./
RUN npm install

# Copy root tsconfig.json for project references
COPY tsconfig.json ../tsconfig.json

# Copy source code
COPY servers/kanban/src ./src
COPY servers/kanban/tsconfig*.json ./
COPY servers/kanban/tsup.config.* ./

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

# Install kanban dependencies first
COPY servers/kanban/package*.json ./
RUN npm install --production

# Copy core package with built files
COPY --from=base --chown=mcp:nodejs /app/core ./core

# Create proper symlink for @mcp-tools/core in production
RUN mkdir -p node_modules/@mcp-tools
RUN ln -sf ../../core node_modules/@mcp-tools/core

# Copy built application
COPY --from=base --chown=mcp:nodejs /app/dist ./dist

USER mcp

EXPOSE 6102

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6102/health || exit 1

CMD ["npm", "start"]