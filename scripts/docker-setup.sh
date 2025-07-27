#!/bin/bash

# MCP Tools Docker Setup Script

set -e

echo "🚀 Setting up MCP Tools with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the application."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ssl
mkdir -p uploads
mkdir -p logs

# Generate SSL certificates for development (optional)
if [ "$1" = "--with-ssl" ]; then
    echo "🔐 Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Service logs:"
docker-compose logs --tail=50

echo "✅ MCP Tools is now running!"
echo ""
echo "🌐 Web Application: http://localhost:3001"
echo "🔧 API Gateway: http://localhost:3000"
echo "📊 Qdrant Dashboard: http://localhost:6333/dashboard"
echo ""
echo "To stop the application, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"