# Memory Graph MCP Server

A Model Context Protocol (MCP) server for long-term knowledge persistence and relationship mapping. This server provides advanced memory management capabilities through semantic search, graph relationships, and intelligent concept extraction.

## Features

### 🧠 **Core Memory Operations**
- **Store Memory** - Store memories with automatic concept extraction and tagging
- **Retrieve Memory** - Query-based memory retrieval with context filtering
- **Search Memories** - Semantic search across all stored memories
- **Memory Statistics** - Insights and analytics about memory usage

### 🕸️ **Graph Relationships**
- **Create Connections** - Explicit relationship creation between memories
- **Find Related** - Discover connected memories through graph traversal
- **Merge Memories** - Combine related memories with different strategies
- **Concept Management** - Create and manage knowledge concepts

### 🔍 **Advanced Search**
- **Vector Similarity** - Semantic search using Qdrant vector database
- **Context Filtering** - Filter by user, project, tags, and metadata
- **Relationship Traversal** - Multi-hop relationship discovery
- **Importance Weighting** - Priority-based memory ranking

## Quick Start

### 📦 **Local Development**

```bash
# Install dependencies
npm install

# Build the server (uses tsup for fast builds)
npm run build

# Start the MCP server
npm run start

# OR development mode with watch
npm run dev

# MCP Server available via stdio transport
```

### 🗄️ **Database Setup**

The server supports multiple database types:

#### SQLite (Default - No setup required)
```bash
# Uses ./memory.db file automatically
npm run db:migrate
```

#### PostgreSQL
```bash
# Set environment variables
export DATABASE_TYPE=postgres
export DATABASE_URL="postgresql://user:password@localhost:5432/memory"

# Initialize database
npm run db:migrate
```

### 🔍 **Vector Database Setup (Qdrant)**

```bash
# Start Qdrant with Docker
docker run -p 6333:6333 qdrant/qdrant:latest

# Or set custom Qdrant configuration
export QDRANT_URL="http://localhost:6333"
export QDRANT_COLLECTION="memory_nodes"
export QDRANT_API_KEY="your-api-key"
```

## MCP Tools

### Core Memory Tools

#### `store_memory`
Store a new memory with automatic relationship detection.

```json
{
  "content": "Important project insight about user behavior",
  "context": {
    "userId": "user-123",
    "projectName": "mobile-app",
    "memoryTopic": "user-research",
    "memoryType": "insight",
    "tags": ["ux", "behavior", "mobile"],
    "source": "user-interview"
  },
  "importance": 4
}
```

#### `retrieve_memory`
Query memories with flexible filtering.

```json
{
  "query": "user behavior insights",
  "context": {
    "userId": "user-123",
    "projectName": "mobile-app"
  },
  "similarityThreshold": 0.7,
  "limit": 10
}
```

#### `search_memories`
Semantic search with relationship traversal.

```json
{
  "query": "mobile app user experience",
  "includeRelated": true,
  "maxDepth": 2,
  "limit": 20
}
```

### Graph Tools

#### `create_connection`
Create explicit relationships between memories.

```json
{
  "sourceId": "memory-uuid-1",
  "targetId": "memory-uuid-2",
  "relationshipType": "causal",
  "strength": 0.8,
  "bidirectional": false
}
```

#### `get_related`
Find related memories through graph traversal.

```json
{
  "memoryId": "memory-uuid-1",
  "maxDepth": 3,
  "minStrength": 0.5
}
```

## Architecture

### Technology Stack
- **MCP Framework**: @tylercoles/mcp-server for protocol compliance
- **Database**: SQLite (dev) / PostgreSQL (prod) with Kysely ORM
- **Vector Search**: Qdrant for semantic similarity
- **Build System**: tsup for fast TypeScript compilation
- **Types**: Full TypeScript with Zod validation

### Project Structure
```
src/
├── index.ts              # Main server entry point
├── types/                # TypeScript type definitions
├── tools/                # MCP tool implementations
├── services/             # Business logic layer
├── repositories/         # Database access layer
├── graph/                # Graph engine and algorithms
└── database/             # Database schemas and migrations
```

### Data Flow
1. **Memory Storage** → Database + Vector Index + Relationship Analysis
2. **Memory Retrieval** → Vector Search + Database Query + Graph Traversal
3. **Relationship Discovery** → Semantic Analysis + Graph Algorithms

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_TYPE=sqlite|postgres
DATABASE_FILE=./memory.db              # SQLite only
DATABASE_HOST=localhost                # PostgreSQL
DATABASE_PORT=5432                     # PostgreSQL
DATABASE_NAME=memory                   # PostgreSQL
DATABASE_USER=username                 # PostgreSQL
DATABASE_PASSWORD=password             # PostgreSQL

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=memory_nodes
QDRANT_API_KEY=your-api-key           # Optional
VECTOR_SIZE=1536                       # OpenAI embedding size

# Server Configuration
PORT=3003
```

## Development

### Building
```bash
npm run build        # Build with tsup
npm run dev          # Watch mode
npm run typecheck    # Type checking only
npm run clean        # Clean build directory
```

### Database
```bash
npm run db:migrate   # Initialize database schema
```

## Integration

### Claude Desktop
Add to your Claude Desktop MCP configuration:

```json
{
  "memory-server": {
    "command": "node",
    "args": ["/path/to/servers/memory/dist/index.js"],
    "env": {
      "DATABASE_TYPE": "sqlite",
      "DATABASE_FILE": "./memory.db"
    }
  }
}
```

### API Usage
The server communicates via the Model Context Protocol over stdio transport. Use MCP client libraries to interact with the tools.

## Reference Implementation

This TypeScript implementation is based on a Rust reference implementation that can be found in `servers/memory-rust-reference/`. The Rust version provided the initial architecture and feature set, which has been adapted to use the official MCP TypeScript libraries.