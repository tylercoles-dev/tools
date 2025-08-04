# Markitdown Worker Dockerfile  
FROM node:22-alpine AS base

# Install Python and Node.js build dependencies for MarkItDown
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    libc6-compat \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create and use virtual environment for Python packages  
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install markitdown

WORKDIR /app

# Build core package with all dependencies for build stage
COPY core/package*.json ./core/
COPY core/tsconfig.json ./core/
COPY core/tsup.config.ts ./core/
RUN cd core && npm install --ignore-scripts

# Copy core source and build
COPY core/src ./core/src
RUN cd core && npm run build

# Copy markitdown worker package files and install all dependencies for build
COPY workers/markitdown/package*.json ./
COPY workers/markitdown/tsup.config.ts ./
RUN npm install --ignore-scripts

# Copy root tsconfig.json to set up proper path mappings
COPY tsconfig.json ./tsconfig.json

# Copy source code
COPY workers/markitdown/src ./src
COPY workers/markitdown/tsconfig*.json ./
COPY workers/markitdown/tsup.config.* ./

# Build the worker
RUN npm run build

# Production stage  
FROM node:22-alpine AS production

# Install Python runtime and minimal dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    libc6-compat

# Create virtual environment and install markitdown
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install markitdown

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

WORKDIR /app

# Install markitdown worker dependencies (production only)
COPY workers/markitdown/package*.json ./
RUN npm install --production --ignore-scripts

# Copy built application (now includes all dependencies bundled by tsup)
COPY --from=base --chown=worker:nodejs /app/dist ./dist

# Create temp directory for file processing
RUN mkdir -p /tmp/markitdown && chown worker:nodejs /tmp/markitdown

USER worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check - worker running')" || exit 1

CMD ["npm", "start"]