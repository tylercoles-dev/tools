# MCP Tools System

A comprehensive multi-server MCP (Model Context Protocol) ecosystem for advanced work management, documentation, and memory persistence capabilities.

## Architecture

This system consists of:

- **MCP Servers** (TypeScript) - Kanban, Wiki, and Memory Graph servers
- **API Gateway** (TypeScript/Express) - Unified REST API and WebSocket server  
- **Web Client** (React/Next.js) - Frontend interface
- **Background Workers** (TypeScript) - Embeddings processing, document conversion, and analysis
- **Core Services** (TypeScript) - Shared types, services, and utilities
- **Data Layer** - SQLite (development), PostgreSQL (production), NATS messaging

## Project Structure

```
├── docs/                    # Architecture documentation
├── core/                    # Shared types, services, and utilities
├── servers/                 # MCP server implementations
│   ├── kanban/             # Task management MCP server
│   ├── wiki/               # Knowledge management MCP server
│   └── memory/             # Memory graph MCP server
├── gateway/                # API gateway and WebSocket server
├── web/                    # React/Next.js web client (planned)
├── workers/                # TypeScript background workers
│   ├── embeddings/         # Embeddings processing worker
│   └── markitdown/         # Document conversion worker
├── database/               # Database migrations and seeds
└── config/                 # Configuration files
```

## Quick Start

### Prerequisites
- Node.js 18.0.0+
- npm 8.0.0+
- TypeScript (global): `npm install -g typescript`

### Installation
```bash
# Clone and install all dependencies
git clone <repository-url>
cd mcp_tools

# Build core package first
cd core && npm install && npm run build

# Install and build other components
cd ../gateway && npm install && npm run build
cd ../workers/embeddings && npm install && npm run build
```

### Start Development Environment
```bash
# Terminal 1: API Gateway
cd gateway && npm run dev

# Terminal 2: Embeddings Worker  
cd workers/embeddings && npm run dev

# Terminal 3: MCP Servers (as needed)
cd servers/kanban && npm run dev
```

### Verify Setup
```bash
curl http://localhost:3000/api/health
```

## Documentation

### Setup and Development
- **[📚 Setup Guide](docs/SETUP_GUIDE.md)** - Complete development setup instructions
- **[🏗️ Architecture](docs/ARCHITECTURE.md)** - System overview and design
- **[🔧 Workers Architecture](docs/WORKERS_ARCHITECTURE.md)** - TypeScript workers implementation

### API and Types
- **[📋 API Specifications](docs/API_SPECIFICATIONS.md)** - Complete API schemas
- **[🎯 Shared Types](docs/SHARED_TYPES_ARCHITECTURE.md)** - Type system documentation
- **[🔌 MCP Server Details](docs/MCP_SERVER_DETAILS.md)** - MCP server implementations

## Key Features

### ✅ Implemented
- **Shared Types System** - Consistent TypeScript types with Zod validation
- **Embeddings Worker** - Text embedding processing with Ollama/OpenAI support
- **API Gateway** - REST API with MCP server integration
- **MCP Servers** - Kanban, Wiki, and Memory management servers
- **Documentation** - Comprehensive architecture and setup guides

### 🚧 In Progress
- **End-to-end Integration Testing** - Cross-service testing framework
- **Web Client** - React/Next.js frontend interface
- **Additional Workers** - Document processing and analysis

### 📋 Planned
- **Production Deployment** - Docker and Kubernetes configurations
- **Authentication System** - JWT-based user management
- **Real-time Features** - WebSocket-based collaboration

## Development Status

**Current Phase**: Core architecture complete, medium priority enhancements in progress.

All high priority tasks completed:
- ✅ TypeScript architecture consolidation
- ✅ Shared types system implementation  
- ✅ Documentation updates and creation
- ✅ Embeddings worker implementation
- ✅ Gateway shared types integration

## Contributing

1. Read the [Setup Guide](docs/SETUP_GUIDE.md)
2. Review the [Architecture Documentation](docs/ARCHITECTURE.md)
3. Follow TypeScript best practices and shared type usage
4. Run tests and type checking before submitting changes

## License

MIT License - see LICENSE file for details.