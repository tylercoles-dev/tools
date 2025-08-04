# Web Client Dockerfile
FROM node:22-alpine AS base

# Install build dependencies for Next.js
RUN apk add --no-cache \
    libc6-compat \
    curl \
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

# Install the core package locally
RUN cd core && npm pack
RUN npm install ./core/mcp-tools-core-1.0.0.tgz --ignore-scripts

# Copy web package files and install all dependencies for build
COPY web/package*.json ./
RUN npm install --ignore-scripts

# Copy root tsconfig.json for project references  
COPY tsconfig.json ../tsconfig.json

# Copy source code (Next.js needs all files)
COPY web/src ./src
COPY web/next.config.js ./
COPY web/tailwind.config.js ./
COPY web/postcss.config.js ./
COPY web/tsconfig*.json ./

# Create empty public directory (Next.js expects it)
RUN mkdir -p public

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built Next.js standalone app
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public directory if it exists
COPY --from=base --chown=nextjs:nodejs /app/public ./public

# Copy the installed core package from build stage
COPY --from=base --chown=nextjs:nodejs /app/node_modules/@mcp-tools ./node_modules/@mcp-tools

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]