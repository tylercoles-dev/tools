# MCP Tools Deployment Guide

This guide covers deployment options for MCP Tools, from local development to production environments.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis (if not using Docker)

### Production Deployment

1. **Clone and Configure**
   ```bash
   git clone <repository-url>
   cd mcp_tools
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Run Setup Script**
   ```bash
   chmod +x scripts/docker-setup.sh
   ./scripts/docker-setup.sh
   ```

3. **Access Application**
   - Web App: http://localhost:3001
   - API: http://localhost:3000
   - Qdrant: http://localhost:6333/dashboard

### Development Environment

```bash
chmod +x scripts/docker-dev.sh
./scripts/docker-dev.sh
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Web Client    │    │   Gateway API   │
│ (Reverse Proxy) │◄──►│   (Next.js)     │◄──►│   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────┐              │
                       │  Embeddings     │              │
                       │   Worker        │◄─────────────┤
                       └─────────────────┘              │
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │    Qdrant       │
│   (Database)    │◄──►│    (Cache)      │◄──►│  (Vector DB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
POSTGRES_PASSWORD=secure_password

# Cache
REDIS_URL=redis://:password@host:port
REDIS_PASSWORD=secure_password

# Vector Database
QDRANT_URL=http://localhost:6333

# Authentication
JWT_SECRET=minimum_32_character_secret_key
JWT_EXPIRES_IN=7d

# API Keys (optional)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_BASE_URL=http://localhost:11434
```

### Production Security

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 16  # For passwords
```

## Service Configuration

### 1. Gateway Service

**Ports**: 3000 (HTTP), 9229 (Debug in dev)

**Dependencies**: PostgreSQL, Redis, Qdrant

**Health Check**: `GET /api/health`

**Environment**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=...
REDIS_URL=...
QDRANT_URL=...
JWT_SECRET=...
```

### 2. Web Client

**Ports**: 3001

**Dependencies**: Gateway Service

**Health Check**: `GET /health`

**Environment**:
```bash
NODE_ENV=production
API_BASE_URL=http://gateway:3000
WS_BASE_URL=ws://gateway:3000
```

### 3. Embeddings Worker

**Dependencies**: Redis, Qdrant

**Environment**:
```bash
NODE_ENV=production
REDIS_URL=...
QDRANT_URL=...
OPENAI_API_KEY=...
OLLAMA_BASE_URL=...
```

### 4. Nginx (Reverse Proxy)

**Ports**: 80 (HTTP), 443 (HTTPS)

**Configuration**: See `nginx.conf`

**Features**:
- Rate limiting
- Gzip compression
- Security headers
- WebSocket support
- SSL termination

## Database Setup

### PostgreSQL Schema

The database schema is automatically created via `scripts/init-db.sql`:

- Users & authentication
- Kanban boards, columns, cards
- Memory storage
- Wiki pages & versions
- Activity logs
- Indexes for performance

### Migrations

```bash
# Run in gateway container
npm run migrate

# Or via Docker
docker-compose exec gateway npm run migrate
```

## Scaling & Performance

### Horizontal Scaling

1. **Load Balancer**: Add multiple gateway instances
2. **Database**: Use read replicas for PostgreSQL
3. **Cache**: Redis cluster for high availability
4. **CDN**: Serve static assets via CDN

### Performance Optimization

1. **Database**:
   - Connection pooling
   - Query optimization
   - Index tuning

2. **Cache**:
   - Redis for session storage
   - Application-level caching
   - Query result caching

3. **API**:
   - Rate limiting
   - Response compression
   - Keep-alive connections

## Monitoring & Logging

### Health Checks

- **Gateway**: `GET /api/health`
- **Database**: PostgreSQL `pg_isready`
- **Cache**: Redis `PING`
- **Vector DB**: Qdrant `/health`

### Logging

```bash
# View service logs
docker-compose logs -f [service]

# Application logs location
/app/logs/
```

### Metrics

- API response times
- Database query performance
- Memory usage
- Error rates
- User activity

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
docker-compose exec postgres pg_dump -U mcp_user mcp_tools > backup.sql

# Restore
docker-compose exec -T postgres psql -U mcp_user mcp_tools < backup.sql
```

### Vector Database Backup

```bash
# Qdrant backup
curl -X POST "http://localhost:6333/collections/memories/snapshots"
```

### File Backups

- Application uploads: `/app/uploads/`
- SSL certificates: `/etc/nginx/ssl/`
- Configuration files: `/app/.env`

## Security Considerations

### Network Security

- Use HTTPS in production
- Configure firewall rules
- VPN for internal services
- Rate limiting & DDoS protection

### Application Security

- JWT token validation
- Input sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration

### Data Security

- Database encryption at rest
- SSL/TLS for data in transit
- Secure password hashing
- Regular security updates

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   docker-compose logs [service]
   docker-compose ps
   ```

2. **Database Connection**
   ```bash
   docker-compose exec gateway npm run db:test
   ```

3. **Memory Issues**
   ```bash
   docker stats
   ```

4. **Performance Issues**
   ```bash
   docker-compose top
   ```

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development LOG_LEVEL=debug

# Access container shell
docker-compose exec gateway sh
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups scheduled
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Health checks working
- [ ] Error tracking setup
- [ ] Performance monitoring

## Cloud Deployment

### AWS Deployment

- **ECS/Fargate**: For containerized services
- **RDS**: Managed PostgreSQL
- **ElastiCache**: Managed Redis
- **ALB**: Application Load Balancer
- **CloudFront**: CDN for static assets

### Google Cloud

- **Cloud Run**: Serverless containers
- **Cloud SQL**: Managed PostgreSQL
- **Memorystore**: Managed Redis
- **Load Balancer**: HTTP(S) load balancing
- **CDN**: Global content delivery

### Azure

- **Container Instances**: Container hosting
- **Database for PostgreSQL**: Managed database
- **Cache for Redis**: Managed cache
- **Application Gateway**: Load balancing
- **CDN**: Content delivery network

## Support & Maintenance

### Regular Maintenance

- Update dependencies monthly
- Security patches weekly
- Database optimization quarterly
- Log cleanup automation
- Performance reviews

### Support Channels

- GitHub Issues for bugs
- Documentation for guides
- Community discussions
- Professional support available