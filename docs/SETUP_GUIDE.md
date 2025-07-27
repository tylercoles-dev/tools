# MCP Tools Development Setup Guide

Complete guide for setting up the MCP Tools ecosystem for development, testing, and deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Component Setup](#component-setup)
4. [Configuration](#configuration)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** for version control
- **SQLite** for local development databases
- **PostgreSQL** (optional, for production)

### Optional Dependencies

- **Docker** for containerized deployment
- **NATS Server** for message-driven architecture
- **Redis** for caching (future enhancement)

### Development Tools

- **TypeScript** globally installed: `npm install -g typescript`
- **IDE/Editor** with TypeScript support (VS Code recommended)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd mcp_tools

# Install all dependencies (this will install all packages in the monorepo)
npm run install:all
```

### 2. Build All Components

```bash
# Build shared types and core services first
cd core
npm run build

# Build all other components
npm run build:all
```

### 3. Start Development Environment

```bash
# Terminal 1: Start API Gateway
cd gateway
npm run dev

# Terminal 2: Start Embeddings Worker
cd workers/embeddings
npm run dev

# Terminal 3: Start MCP Servers (as needed)
cd servers/kanban
npm run dev
```

### 4. Verify Setup

Visit the health check endpoint:
```bash
curl http://localhost:3000/api/health
```

## Component Setup

### Core Package (`core/`)

The shared types and services foundation.

```bash
cd core
npm install
npm run build
npm run typecheck  # Verify TypeScript compilation
```

**Key Files:**
- `src/shared/types/` - Shared TypeScript types with Zod schemas
- `src/services/` - Reusable service implementations
- `dist/` - Built package (used by other components)

### API Gateway (`gateway/`)

REST API and WebSocket server.

```bash
cd gateway
npm install
npm run build
npm run start    # Production mode
npm run dev      # Development mode with hot reload
```

**Configuration:**
- Default port: `3000`
- Environment: `.env` file (copy from `.env.example`)
- Database: SQLite files created automatically

**Endpoints:**
- Health: `GET /api/health`
- Kanban: `GET /api/kanban/*`
- Memory: `GET /api/memory/*`
- Wiki: `GET /api/wiki/*`

### MCP Servers

#### Kanban Server (`servers/kanban/`)

Task and project management MCP server.

```bash
cd servers/kanban
npm install
npm run build
npm run start
```

**Features:**
- Board, column, and card management
- Task tracking and analytics
- Comment and tag systems

#### Memory Server (`servers/memory/`)

Memory graph and relationship management.

```bash
cd servers/memory
npm install
npm run build
npm run start
```

**Features:**
- Memory storage and retrieval
- Relationship detection
- Graph-based queries

#### Wiki Server (`servers/wiki/`)

Knowledge management and documentation.

```bash
cd servers/wiki
npm install
npm run build
npm run start
```

**Features:**
- Page and category management
- Search functionality
- Collaborative editing

### Workers

#### Embeddings Worker (`workers/embeddings/`)

Handles text embeddings and vector operations.

```bash
cd workers/embeddings
npm install
npm run build
npm run start
```

**Providers Supported:**
- Ollama (local models)
- OpenAI (API-based)

**Configuration:**
```typescript
{
  embeddingProvider: 'ollama' | 'openai',
  batchSize: 32,
  maxRetries: 3
}
```

#### Markitdown Worker (`workers/markitdown/`)

Document conversion and processing.

```bash
cd workers/markitdown
npm install
npm run build
npm run start
```

**Features:**
- Document format conversion
- Text extraction
- Markdown processing

## Configuration

### Environment Variables

Create `.env` files in each component directory:

#### Gateway (`.env`)
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=sqlite:./memory.db
KANBAN_DATABASE_URL=sqlite:./kanban.db

# MCP Servers
MCP_KANBAN_COMMAND=node
MCP_KANBAN_ARGS=["servers/kanban/dist/index.js"]
MCP_MEMORY_COMMAND=node
MCP_MEMORY_ARGS=["servers/memory/dist/index.js"]

# Authentication (optional)
JWT_SECRET=your-jwt-secret
```

#### Embeddings Worker (`.env`)
```env
NODE_ENV=development
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=your-openai-key
BATCH_SIZE=32
MAX_RETRIES=3
```

### TypeScript Configuration

All components use consistent TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Package Scripts

Each component includes standard scripts:

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch --onSuccess \"node dist/index.js\"",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  }
}
```

## Development Workflow

### 1. Making Changes

1. **Shared Types**: Always start with `core/` for type changes
2. **Build Order**: Core → Workers → Servers → Gateway
3. **Testing**: Run unit tests before integration testing

### 2. Build Process

```bash
# Build everything in correct order
npm run build:core
npm run build:workers
npm run build:servers
npm run build:gateway
```

### 3. Type Checking

```bash
# Check all TypeScript compilation
npm run typecheck:all
```

### 4. Linting and Formatting

```bash
# Run linting (if configured)
npm run lint

# Format code (if configured)
npm run format
```

## Testing

### Unit Tests

```bash
# Run tests for specific component
cd gateway
npm test

# Run all tests
npm run test:all
```

### Integration Tests

```bash
# Start all services in test mode
npm run test:integration
```

### End-to-End Testing

```bash
# Full system testing
npm run test:e2e
```

## Deployment

### Local Production

```bash
# Build all components
npm run build:all

# Start in production mode
npm run start:prod
```

### Docker Deployment

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d
```

### Environment-Specific Deployment

#### Development
- SQLite databases
- Local file storage
- Debug logging

#### Staging
- PostgreSQL databases
- Redis caching
- Info logging

#### Production
- PostgreSQL with replication
- Redis cluster
- Error logging only
- SSL/TLS termination

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors

```bash
# Clean and rebuild
npm run clean
npm run build

# Check for circular dependencies
npm run typecheck
```

#### Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues

```bash
# Reset local databases
rm -f *.db
npm run db:setup
```

#### Port Conflicts

```bash
# Check what's running on ports
netstat -tulpn | grep :3000
lsof -i :3000

# Kill processes if needed
kill -9 <PID>
```

### Database Issues

#### SQLite File Permissions
```bash
chmod 664 *.db
chown $USER:$USER *.db
```

#### Migration Problems
```bash
# Reset and rerun migrations
npm run db:reset
npm run db:migrate
```

### Worker Communication Issues

#### NATS Connection Problems
```bash
# Check NATS server status
systemctl status nats-server

# Start NATS server
nats-server
```

#### Message Queue Issues
```bash
# Clear message queues
npm run workers:reset
```

### Performance Issues

#### Memory Usage
```bash
# Monitor memory usage
node --inspect dist/index.js
```

#### Database Performance
```bash
# Analyze query performance
npm run db:analyze
```

## Getting Help

### Documentation
- [Architecture Overview](./ARCHITECTURE.md)
- [Shared Types](./SHARED_TYPES_ARCHITECTURE.md)
- [Workers Architecture](./WORKERS_ARCHITECTURE.md)
- [API Specifications](./API_SPECIFICATIONS.md)

### Debugging
- Enable debug logging: `LOG_LEVEL=debug`
- Use TypeScript source maps for stack traces
- Check component health endpoints

### Development Tools
- VS Code with TypeScript extension
- Node.js debugger
- Database GUI tools (DB Browser for SQLite)

## Next Steps

After completing setup:

1. **Explore the APIs** using the OpenAPI documentation
2. **Run the example workflows** in the documentation
3. **Set up your development environment** with hot reload
4. **Review the architecture docs** to understand the system design
5. **Start with small changes** to get familiar with the codebase

For specific component documentation, see the README files in each directory.