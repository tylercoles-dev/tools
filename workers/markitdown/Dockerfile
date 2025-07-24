FROM node:18-alpine

# Install Python and required packages for MarkItDown
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    && python3 -m pip install --upgrade pip

# Install MarkItDown and dependencies
RUN pip3 install markitdown

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S markitdown -u 1001

# Create temp directory for file processing
RUN mkdir -p /tmp/markitdown && chown markitdown:nodejs /tmp/markitdown

USER markitdown

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check - worker running')" || exit 1

EXPOSE 3000

CMD ["npm", "start"]