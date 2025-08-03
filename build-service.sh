#!/bin/bash

# Service build script that handles core dependency
# Usage: ./build-service.sh <service-name>

set -e

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service-name>"
    echo "Available services: gateway, kanban-server, wiki-server, memory-server, embeddings-worker, markitdown-worker, web"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure core is built first
print_info "Building core package..."
cd core && npm run build && cd ..

# Map service names to their directories
case $SERVICE in
    "gateway")
        SERVICE_DIR="gateway"
        ;;
    "kanban-server")
        SERVICE_DIR="servers/kanban"
        ;;
    "wiki-server")
        SERVICE_DIR="servers/wiki"
        ;;
    "memory-server")
        SERVICE_DIR="servers/memory"
        ;;
    "embeddings-worker")
        SERVICE_DIR="workers/embeddings"
        ;;
    "markitdown-worker")
        SERVICE_DIR="workers/markitdown"
        ;;
    "web")
        SERVICE_DIR="web"
        ;;
    *)
        print_error "Unknown service: $SERVICE"
        exit 1
        ;;
esac

print_info "Building service: $SERVICE in $SERVICE_DIR"

# Create a temporary build context that includes core
TEMP_DIR=$(mktemp -d)
print_info "Creating build context in $TEMP_DIR"

# Copy service files
cp -r "$SERVICE_DIR"/* "$TEMP_DIR/"

# Copy core dist to the service build context
mkdir -p "$TEMP_DIR/core"
cp -r core/dist "$TEMP_DIR/core/"
cp core/package*.json "$TEMP_DIR/core/"

# Create a modified Dockerfile that uses local core
cat > "$TEMP_DIR/Dockerfile.local" << 'EOF'
# Service Dockerfile with local core dependency
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy local core dependency
COPY core ./core

# Copy source code
COPY src ./src
COPY tsconfig*.json ./
COPY tsup.config.* ./

# Build the service
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

WORKDIR /app

# Copy built application
COPY --from=base --chown=app:nodejs /app/dist ./dist
COPY --from=base --chown=app:nodejs /app/package*.json ./
COPY --from=base --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=app:nodejs /app/core ./core

USER app

CMD ["npm", "start"]
EOF

# Handle special cases for different services
if [ "$SERVICE" = "markitdown-worker" ]; then
    # Add Python dependencies for markitdown
    cat > "$TEMP_DIR/Dockerfile.local" << 'EOF'
# Markitdown Worker with Python dependencies
FROM node:22-alpine AS base

# Install Python and required packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    libc6-compat \
    curl \
    && python3 -m pip install --upgrade pip \
    && pip3 install markitdown

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy local core dependency
COPY core ./core

# Copy source code
COPY src ./src
COPY tsconfig*.json ./
COPY tsup.config.* ./

# Build the service
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install Python runtime
RUN apk add --no-cache \
    python3 \
    py3-pip \
    && python3 -m pip install --upgrade pip \
    && pip3 install markitdown

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

WORKDIR /app

# Copy built application
COPY --from=base --chown=worker:nodejs /app/dist ./dist
COPY --from=base --chown=worker:nodejs /app/package*.json ./
COPY --from=base --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=worker:nodejs /app/core ./core

# Create temp directory for file processing
RUN mkdir -p /tmp/markitdown && chown worker:nodejs /tmp/markitdown

USER worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check - worker running')" || exit 1

CMD ["npm", "start"]
EOF
fi

if [ "$SERVICE" = "web" ]; then
    # Special handling for Next.js web client
    cat > "$TEMP_DIR/Dockerfile.local" << 'EOF'
# Web Client Dockerfile
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy local core dependency
COPY core ./core

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built Next.js app
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
EOF
fi

# Build the Docker image
print_info "Building Docker image for $SERVICE..."
docker build -f "$TEMP_DIR/Dockerfile.local" -t "mcp-tools-$SERVICE:latest" "$TEMP_DIR"

# Clean up
rm -rf "$TEMP_DIR"

print_success "Successfully built $SERVICE image: mcp-tools-$SERVICE:latest"
print_info "You can now run: docker run --rm mcp-tools-$SERVICE:latest"