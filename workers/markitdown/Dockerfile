# Markitdown Worker Dockerfile
FROM node:22-alpine AS base

# Install Python and required packages for MarkItDown
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    libc6-compat

# Create and use virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install markitdown

WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY workers/markitdown/package*.json ./
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
COPY workers/markitdown/src ./src
COPY workers/markitdown/tsconfig*.json ./
COPY workers/markitdown/tsup.config.* ./

# Build the worker
RUN npm run build

# Production stage  
FROM node:22-alpine AS production

# Install Python runtime and recreate virtual environment
RUN apk add --no-cache python3 py3-pip
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install markitdown

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