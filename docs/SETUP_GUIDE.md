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
- **PostgreSQL** 12+ (required for all environments with UUID support)

### Optional Dependencies

- **Docker** for containerized deployment
- **NATS Server** for message-driven architecture
- **Redis** for caching ⚠️ (implementation pending)

### Development Tools

- **TypeScript** globally installed: `npm install -g typescript`
- **IDE/Editor** with TypeScript support (VS Code recommended)

### Important Architecture Notes

- **UUID Primary Keys**: All database tables use UUID primary keys for improved performance and distributed system compatibility
- **PostgreSQL-Only**: The system is designed exclusively for PostgreSQL and uses PostgreSQL-specific features like `gen_random_uuid()`
- **Consolidated Migration**: Single migration script creates the complete schema - no incremental migration history needed since the app hasn't been released

### UUID Architecture Best Practices

#### Working with UUIDs
- **Generation**: Use PostgreSQL's `gen_random_uuid()` for database inserts
- **Client-side**: Use Node.js `crypto.randomUUID()` for client-generated IDs
- **Validation**: All UUIDs are validated using Zod schemas in the type system
- **Performance**: UUIDs are indexed as strings - no performance concerns for lookups
- **Format**: Standard UUID v4 format: `123e4567-e89b-012d-3456-426614174000`

#### Common UUID Operations
```typescript
// Creating new entities
const newTaskId = crypto.randomUUID();

// Database queries with UUID
const task = await db.selectFrom('tasks').where('id', '=', taskId).executeTakeFirst();

// Type-safe UUID handling
const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  boardId: z.string().uuid(),
});

// Validation helper
const isValidUUID = (id: string): boolean => {
  try {
    return z.string().uuid().parse(id) === id;
  } catch {
    return false;
  }
};
```

#### Database Performance with UUIDs
- **Indexing**: UUID primary keys perform excellently with proper indexing
- **Storage**: UUIDs use 16 bytes vs 8 bytes for bigint, acceptable trade-off  
- **Joins**: Join performance identical to integer keys with proper indexes
- **Clustering**: UUIDs distribute evenly, preventing hotspots
- **Memory**: String UUIDs have minimal memory overhead
- **Network**: 36-character UUIDs vs 8-character integers - negligible impact

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd mcp_tools
```

### 2. Build All Components (Critical Order)

**IMPORTANT**: Always build the core package first, as all other components depend on it.

```bash
# 1. Build core package FIRST (required by all other components)
cd core
npm install
npm run build

# 2. Build other components (can be done in parallel after core is built)
cd ../gateway
npm install
npm run build

cd ../web
npm install
npm run build

cd ../servers/kanban
npm install
npm run build

cd ../servers/wiki
npm install
npm run build

cd ../servers/memory
npm install
npm run build

cd ../workers/embeddings
npm install
npm run build

cd ../workers/markitdown
npm install
npm run build

cd ../tests
npm install
```

### 3. Start Development Environment

For full development, you'll typically want to run multiple services:

```bash
# Terminal 1: Web Client (Frontend)
cd web
npm run dev
# Runs on http://localhost:3000

# Terminal 2: API Gateway (Backend API)
cd gateway
npm run dev
# Runs on http://localhost:3001

# Terminal 3: MCP Servers (as needed)
cd servers/kanban
npm run dev

# Terminal 4: Background Workers (optional)
cd workers/embeddings
npm run dev
```

**Note**: The web client expects the API gateway to be running on port 3001 by default.

### ✅ **Web Client Features Available**

The web client is fully implemented and includes:
- 🏠 Landing page with feature overview
- 🔐 Authentication system (login/signup)
- 📋 Kanban boards with drag-and-drop
- 🧠 Memory management with search
- 📖 Wiki pages with markdown editing
- 📊 Analytics dashboard with real-time insights
- 🔄 Real-time collaboration via WebSocket
- 📱 Responsive design for mobile devices
- ♿ Accessibility features and testing

### 4. Database Setup

Before starting the services, set up the PostgreSQL database:

```bash
# Navigate to migrations directory
cd migrations

# Build migration script
npm install
npm run build

# Run consolidated migration with essential seed data
POSTGRES_PASSWORD=your_password POSTGRES_DB=mcp_tools node dist/migrate.js

# Alternative: Fresh database without seed data
POSTGRES_PASSWORD=your_password POSTGRES_DB=mcp_tools SEED_LEVEL=none node dist/migrate.js
```

**Migration Details:**
- Creates complete schema with UUID primary keys
- Includes all tables for Kanban, Wiki, and Memory systems  
- Adds performance indexes for optimal query performance
- Uses PostgreSQL-specific features for best performance

#### Database Schema Highlights

The consolidated migration creates 30+ tables with UUID primary keys:

**Kanban System Tables:**
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Wiki System Tables:**
```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  parent_id UUID REFERENCES pages(id) ON DELETE SET NULL
);
```

**Memory System Tables:**
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  context JSONB NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexing Strategy:**
- UUID primary keys are automatically indexed
- Foreign key UUID columns have dedicated indexes  
- Composite indexes on commonly queried UUID combinations
- GIN indexes for UUID arrays (tags, mentions)
- Performance indexes on frequently joined tables

### 5. Verify Setup

Once your development environment is running, verify the setup:

```bash
# Check API Gateway health
curl http://localhost:3001/api/health

# Check Web Client
# Open browser to http://localhost:3000
```

You should see the web client interface and a successful health check response.

## Migration from Previous Versions

### Database Migration Process

Since this application uses a consolidated migration approach, there are no incremental migrations to run. However, if you're working with an existing development database or need to reset your schema:

#### Fresh Database Setup
```bash
# Create new PostgreSQL database
createdb mcp_tools

# Run consolidated migration
cd migrations
POSTGRES_PASSWORD=your_password POSTGRES_DB=mcp_tools node dist/migrate.js
```

#### Reset Existing Database
```bash
# Drop and recreate database
dropdb mcp_tools
createdb mcp_tools

# Run migration again
POSTGRES_PASSWORD=your_password POSTGRES_DB=mcp_tools node dist/migrate.js
```

#### Verification Commands
```sql
-- Connect to your database
psql -d mcp_tools

-- Verify all tables use UUID primary keys
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'id' AND table_schema = 'public';
-- Should return 'uuid' for all id columns

-- Check table count (should be 30+ tables)
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Verify UUID generation works
SELECT gen_random_uuid();
```

### Code Migration Checklist

If you have existing code that worked with integer IDs, here's what needs to be updated:

#### Before Migration (Integer IDs)
```typescript
interface Task {
  id: number;        // ❌ Old format
  boardId: number;   // ❌ Old format
  title: string;
}

// Database queries
const task = await db.selectFrom('tasks').where('id', '=', 123).executeTakeFirst();
```

#### After Migration (UUID Strings)
```typescript
interface Task {
  id: string;        // ✅ UUID string
  boardId: string;   // ✅ UUID string  
  title: string;
}

// Database queries  
const taskId = crypto.randomUUID();
const task = await db.selectFrom('tasks').where('id', '=', taskId).executeTakeFirst();
```

#### API Client Updates
```typescript
// Update API calls to handle UUID strings
const taskId = crypto.randomUUID(); // Generate UUID
const response = await fetch(`/api/tasks/${taskId}`);
const task = await response.json();
console.log(task.id); // Logs UUID string like "123e4567-e89b-012d-3456-426614174000"
```

### Troubleshooting Migration Issues

#### Common Issues After UUID Migration

1. **TypeScript Type Errors**
   ```bash
   # Error: Argument of type 'number' is not assignable to parameter of type 'string'
   # Fix: Update interfaces to use string for ID fields
   ```
   ```typescript
   // ❌ Before
   const taskId: number = 123;
   
   // ✅ After  
   const taskId: string = crypto.randomUUID();
   ```

2. **Database Query Errors**
   ```bash
   # Error: operator does not exist: uuid = integer
   # Fix: Ensure query parameters are UUID strings, not numbers
   ```
   ```typescript
   // ❌ Before
   const result = await db.query('SELECT * FROM tasks WHERE id = $1', [123]);
   
   // ✅ After
   const result = await db.query('SELECT * FROM tasks WHERE id = $1', [uuidString]);
   ```

3. **Frontend State Management**
   ```typescript
   // ❌ Before
   const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
   
   // ✅ After
   const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
   ```

4. **Testing Fixtures**
   ```typescript
   // ❌ Before
   const mockTask = { id: 1, title: 'Test Task' };
   
   // ✅ After  
   const mockTask = { 
     id: '123e4567-e89b-012d-3456-426614174000', 
     title: 'Test Task' 
   };
   ```

#### Quick Fixes Reference
```typescript
// UUID Generation
const id = crypto.randomUUID(); // ✅ Client-side
// Database: gen_random_uuid() // ✅ Server-side

// Type Validation
import { z } from 'zod';
const uuidSchema = z.string().uuid(); // ✅ Runtime validation

// Common Patterns
const isValidUUID = (str: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
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
- Database: PostgreSQL connection required

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
DATABASE_URL=postgresql://user:password@localhost:5432/mcp_tools
KANBAN_DATABASE_URL=postgresql://user:password@localhost:5432/mcp_tools

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
- PostgreSQL databases
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
# Reset PostgreSQL databases
psql -c "DROP DATABASE IF EXISTS mcp_tools;"
psql -c "CREATE DATABASE mcp_tools;"
npm run db:migrate
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

#### PostgreSQL Connection Issues
```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
```

#### Migration Problems
```bash
# Run the consolidated migration script
cd migrations
POSTGRES_PASSWORD=your_password node dist/migrate.js

# For fresh database setup
POSTGRES_PASSWORD=your_password SEED_LEVEL=essential node dist/migrate.js
```

**Note**: The system uses a single consolidated migration that creates the complete schema with UUID primary keys. This approach was chosen since the application hasn't been released yet, eliminating the need for incremental migration history.

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
- Database GUI tools (pgAdmin for PostgreSQL)

## Next Steps

After completing setup:

1. **Explore the APIs** using the OpenAPI documentation
2. **Run the example workflows** in the documentation
3. **Set up your development environment** with hot reload
4. **Review the architecture docs** to understand the system design
5. **Start with small changes** to get familiar with the codebase

For specific component documentation, see the README files in each directory.