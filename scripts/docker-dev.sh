#!/bin/bash

# MCP Tools Development Docker Setup Script

set -e

echo "🚀 Setting up MCP Tools for development with Docker..."

# Check dependencies
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env.dev file if it doesn't exist
if [ ! -f .env.dev ]; then
    echo "📝 Creating .env.dev file..."
    cat > .env.dev << EOF
NODE_ENV=development
DATABASE_URL=postgresql://mcp_user:dev_password@localhost:5433/mcp_tools_dev
REDIS_URL=redis://:dev_redis_password@localhost:6380
QDRANT_URL=http://localhost:6335
JWT_SECRET=dev_jwt_secret_key_for_development_only
API_BASE_URL=http://localhost:3000
WS_BASE_URL=ws://localhost:3000
WEB_BASE_URL=http://localhost:3001
OPENAI_API_KEY=${OPENAI_API_KEY:-}
OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
EOF
fi

# Create necessary directories
echo "📁 Creating development directories..."
mkdir -p logs/dev
mkdir -p uploads/dev
mkdir -p data/dev

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Build development images
echo "🔨 Building development Docker images..."
docker-compose -f docker-compose.dev.yml build

# Start development services
echo "🚀 Starting development services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Install dependencies in development containers
echo "📦 Installing dependencies..."
docker-compose -f docker-compose.dev.yml exec -T gateway-dev npm install
docker-compose -f docker-compose.dev.yml exec -T embeddings-worker-dev npm install
docker-compose -f docker-compose.dev.yml exec -T web-dev npm install

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.dev.yml exec -T gateway-dev npm run migrate

# Check service health
echo "🔍 Checking development service health..."
docker-compose -f docker-compose.dev.yml ps

echo "✅ MCP Tools development environment is now running!"
echo ""
echo "🌐 Web Development Server: http://localhost:3001"
echo "🔧 API Gateway (Development): http://localhost:3000"
echo "🗄️ PostgreSQL (Development): localhost:5433"
echo "📦 Redis (Development): localhost:6380"
echo "📊 Qdrant (Development): http://localhost:6335/dashboard"
echo ""
echo "📝 Development commands:"
echo "  View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  Restart service: docker-compose -f docker-compose.dev.yml restart [service]"
echo "  Run tests: docker-compose -f docker-compose.dev.yml exec gateway-dev npm test"
echo "  Access shell: docker-compose -f docker-compose.dev.yml exec gateway-dev sh"
echo ""
echo "🛑 To stop development environment: docker-compose -f docker-compose.dev.yml down"