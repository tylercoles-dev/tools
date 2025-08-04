# Kanban MCP Server Dockerfile
FROM node:22-alpine AS base

# Install build dependencies for PostgreSQL and native modules
RUN apk add --no-cache \
    libc6-compat \
    curl \
    python3 \
    make \
    g++ \
    postgresql-client \
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

# Install the core package locally
RUN cd core && npm pack
RUN npm install ./core/mcp-tools-core-1.0.0.tgz --ignore-scripts

# Copy kanban package files and install all dependencies for build
COPY servers/kanban/package*.json ./
RUN npm install --ignore-scripts

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

# Install runtime dependencies for PostgreSQL client
RUN apk add --no-cache \
    libc6-compat \
    curl \
    postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcp

WORKDIR /app

# Install kanban dependencies (production only)
COPY servers/kanban/package*.json ./
RUN npm install --production --ignore-scripts

# Copy the installed core package from build stage
COPY --from=base --chown=mcp:nodejs /app/node_modules/@mcp-tools ./node_modules/@mcp-tools

# Copy built application
COPY --from=base --chown=mcp:nodejs /app/dist ./dist

USER mcp

EXPOSE 6102

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6102/health || exit 1

CMD ["npm", "start"]