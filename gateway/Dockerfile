# Gateway service Dockerfile
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY gateway/package*.json ./
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
COPY gateway/src ./src
COPY gateway/tsconfig*.json ./
COPY gateway/tsup.config.* ./

# Build the gateway
RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 gateway

WORKDIR /app

# Copy built application
COPY --from=base --chown=gateway:nodejs /app/dist ./dist
COPY --from=base --chown=gateway:nodejs /app/package*.json ./
COPY --from=base --chown=gateway:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=gateway:nodejs /app/core ./core

USER gateway

EXPOSE 6100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6100/api/health || exit 1

CMD ["npm", "start"]