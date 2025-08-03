# MCP Tools Docker Deployment Guide

This guide covers deploying the MCP Tools ecosystem using Docker and Docker Compose. The system is designed with independent, scalable microservices that can be deployed and scaled separately.

## Architecture Overview

The MCP Tools ecosystem consists of these containerized services:

### Core Services
- **PostgreSQL** - Primary database for persistent data
- **Redis** - Caching and message queue
- **Qdrant** - Vector database for embeddings and semantic search
- **Nginx** - Reverse proxy and load balancer

### Application Services
- **Gateway** - API gateway and WebSocket server (Port 3000)
- **Web Client** - Next.js frontend application (Port 3001)

### MCP Servers (Model Context Protocol)
- **Kanban Server** - Task and project management (Port 3002)
- **Wiki Server** - Knowledge base and documentation (Port 3003)
- **Memory Server** - AI memory and relationship management (Port 3004)

### Background Workers
- **Embeddings Worker** - Processes text embeddings for semantic search
- **Markitdown Worker** - Converts documents to markdown format

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM (4GB minimum)
- 10GB+ disk space

### 1. Clone and Setup
```bash
git clone <repository-url>
cd tools
cp .env.example .env
# Edit .env with your configuration
```

### 2. Deploy with Script
```bash
# Local development
./deploy.sh

# Production deployment
./deploy.sh --env prod --pull

# Development with rebuild
./deploy.sh --env dev --build
```

### 3. Manual Docker Compose
```bash
# Local development
docker-compose up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Configuration Files

### Environment Files
- `.env.example` - Template with all configuration options
- `.env` - Your local configuration (copy from .env.example)

### Docker Compose Files
- `docker-compose.yml` - Base configuration
- `docker-compose.override.yml` - Local development overrides
- `docker-compose.dev.yml` - Development environment
- `docker-compose.prod.yml` - Production scaling and configuration

## Environment Variables

### Required Variables
```bash
# Database
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://mcp_user:password@postgres:5432/mcp_tools

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:password@redis:6379

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# AI Services (Optional)
OPENAI_API_KEY=your_openai_api_key
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

### Service URLs (Internal Docker Network)
```bash
KANBAN_SERVER_URL=http://kanban-server:3002
WIKI_SERVER_URL=http://wiki-server:3003
MEMORY_SERVER_URL=http://memory-server:3004
QDRANT_URL=http://qdrant:6333
```

## Service Scaling

### Automatic Scaling (Production)
The production configuration (`docker-compose.prod.yml`) includes:
- **Gateway**: 3 replicas
- **Kanban Server**: 3 replicas
- **Wiki Server**: 3 replicas
- **Memory Server**: 2 replicas
- **Web Client**: 4 replicas
- **Embeddings Worker**: 4 replicas

### Manual Scaling
```bash
# Scale specific service
docker-compose up -d --scale embeddings-worker=4

# Using deployment script
./deploy.sh --scale embeddings-worker=4
```

### Resource Limits
Each service has configured resource limits:
- **Gateway**: 512M RAM, 0.5 CPU
- **MCP Servers**: 512M RAM, 0.5 CPU each
- **Memory Server**: 1G RAM, 0.75 CPU (higher for vector operations)
- **Embeddings Worker**: 1G RAM, 1.0 CPU (scalable to 2G/2.0 CPU)

## Port Mapping

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Nginx | 80/443 | 80/443 | Reverse proxy |
| Gateway | 3000 | 3000 | API Gateway |
| Web Client | 3001 | 3001 | Frontend UI |
| Kanban Server | 3002 | 3002 | Kanban MCP API |
| Wiki Server | 3003 | 3003 | Wiki MCP API |
| Memory Server | 3004 | 3004 | Memory MCP API |
| PostgreSQL | 5432 | 5432 | Database |
| Redis | 6379 | 6379 | Cache |
| Qdrant | 6333/6334 | 6333/6334 | Vector DB |

## Health Checks

All services include health checks:
- **HTTP Services**: Curl health endpoints every 30s
- **Databases**: Connection tests every 10s
- **Automatic Recovery**: Failed containers restart automatically

## Development Workflow

### Local Development
```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f gateway

# Rebuild specific service
docker-compose build gateway
docker-compose up -d gateway
```

### Debugging
```bash
# Access container shell
docker-compose exec gateway sh

# View service logs
./deploy.sh --logs gateway

# Check service status
./deploy.sh --status
```

## Production Deployment

### 1. Server Setup
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy from Registry
```bash
# Pull pre-built images from GitHub Container Registry
./deploy.sh --env prod --pull

# Or build locally
./deploy.sh --env prod --build
```

### 3. SSL/HTTPS Setup
Update `nginx.conf` for SSL:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://web:3001;
    }
}
```

## Using GitHub Container Registry Images

### Pull Pre-built Images
```bash
# Set registry in environment
export REGISTRY=ghcr.io/tylercoles-dev

# Pull specific service
docker pull $REGISTRY/mcp-tools-gateway:latest
docker pull $REGISTRY/mcp-tools-kanban-server:latest
docker pull $REGISTRY/mcp-tools-wiki-server:latest
docker pull $REGISTRY/mcp-tools-memory-server:latest
docker pull $REGISTRY/mcp-tools-embeddings-worker:latest
docker pull $REGISTRY/mcp-tools-markitdown-worker:latest
docker pull $REGISTRY/mcp-tools-web:latest
```

### Use Registry Images in Compose
Create `docker-compose.ghcr.yml`:
```yaml
version: '3.8'
services:
  gateway:
    image: ghcr.io/tylercoles-dev/mcp-tools-gateway:latest
  kanban-server:
    image: ghcr.io/tylercoles-dev/mcp-tools-kanban-server:latest
  # ... other services
```

Deploy with registry images:
```bash
docker-compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

## Monitoring and Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway

# Last 100 lines
docker-compose logs --tail=100 gateway
```

### Monitor Resources
```bash
# Container stats
docker stats

# Service status
docker-compose ps

# System usage
docker system df
```

## Backup and Recovery

### Database Backup
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U mcp_user mcp_tools > backup.sql

# Restore
docker-compose exec -T postgres psql -U mcp_user mcp_tools < backup.sql
```

### Volume Backup
```bash
# Backup all volumes
docker-compose down
sudo tar -czf mcp-tools-volumes.tar.gz /var/lib/docker/volumes/tools_*
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check logs
   docker-compose logs SERVICE_NAME
   
   # Verify environment variables
   docker-compose config
   ```

2. **Port conflicts**
   ```bash
   # Check port usage
   netstat -tlnp | grep :3000
   
   # Modify ports in docker-compose.yml
   ```

3. **Memory issues**
   ```bash
   # Check Docker resources
   docker system df
   docker system prune
   ```

4. **Database connection issues**
   ```bash
   # Test database connection
   docker-compose exec postgres psql -U mcp_user -d mcp_tools -c "SELECT 1;"
   ```

### Service Dependencies
Services start in this order:
1. PostgreSQL, Redis, Qdrant (databases)
2. MCP Servers (kanban, wiki, memory)
3. Gateway (depends on MCP servers)
4. Web Client (depends on gateway)
5. Workers (depend on databases)
6. Nginx (depends on gateway and web)

### Performance Optimization
- Increase Docker memory limit to 4GB+
- Use SSD storage for better I/O performance
- Configure PostgreSQL shared_buffers and work_mem
- Scale embeddings workers based on workload

## Security Considerations

1. **Change default passwords** in `.env`
2. **Use strong JWT secrets**
3. **Enable SSL/TLS** in production
4. **Restrict database access** to Docker network only
5. **Regular security updates** for base images
6. **Use secrets management** for sensitive data

## Next Steps

After successful deployment:
1. Access web UI at `http://localhost:80`
2. Test MCP server endpoints
3. Configure AI services (OpenAI/Ollama)
4. Set up monitoring and alerting
5. Configure backups
6. Test scaling scenarios