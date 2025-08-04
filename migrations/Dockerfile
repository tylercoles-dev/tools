# Migration Container for MCP Tools Database Setup (PostgreSQL Only)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY migrations/package*.json ./
COPY migrations/tsconfig.json ./
COPY migrations/tsup.config.ts ./

# Install dependencies (no native modules needed for PostgreSQL only)
RUN npm install

# Copy source code
COPY migrations/src/ ./src/

# Build the migration runner
RUN npm run build

# Remove dev dependencies and source to reduce image size
RUN npm prune --production && rm -rf src/ tsconfig.json tsup.config.ts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S migration -u 1001

# Change ownership of the app directory
RUN chown -R migration:nodejs /app

# Switch to non-root user
USER migration

# Health check to ensure migration completed
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD [ "sh", "-c", "[ -f /tmp/migration-complete ] || exit 1" ]

# Run migrations and create completion marker
CMD ["sh", "-c", "node dist/migrate.js && touch /tmp/migration-complete && sleep 30"]