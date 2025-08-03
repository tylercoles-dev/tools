# Web Client Dockerfile
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files and install ALL dependencies (including dev) for build
COPY web/package*.json ./
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

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built Next.js app
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
# Only copy public if it exists and has content
COPY --from=base --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]