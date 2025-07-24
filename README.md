# MCP Tools System

A comprehensive multi-server MCP (Model Context Protocol) ecosystem for advanced work management, documentation, and memory persistence capabilities.

## Architecture

This system consists of:

- **MCP Servers** (TypeScript) - Kanban, Wiki, and Memory Graph servers
- **API Gateway** (TypeScript/Express) - Unified REST API and WebSocket server  
- **Web Client** (React/Next.js) - Frontend interface
- **Background Workers** (Rust) - Vector indexing, relationship analysis, and sync
- **Data Layer** - Qdrant (vector DB), PostgreSQL, Redis

## Project Structure

```
├── docs/                    # Architecture documentation
├── servers/                 # MCP server implementations
│   ├── kanban/             # Task management MCP server
│   ├── wiki/               # Knowledge management MCP server
│   └── memory/             # Memory graph MCP server
├── gateway/                # API gateway and WebSocket server
├── web/                    # React/Next.js web client
├── workers/                # Rust background workers
│   ├── vector/             # Vector indexing worker
│   ├── relationship/       # Relationship analysis worker
│   └── sync/               # Data synchronization worker
├── shared/                 # Shared types and utilities
├── database/               # Database migrations and seeds
└── config/                 # Configuration files
```

## Getting Started

See the comprehensive documentation in the `docs/` folder:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System overview and high-level design
- [`docs/API_SPECIFICATIONS.md`](docs/API_SPECIFICATIONS.md) - Complete API schemas
- [`docs/MCP_SERVER_DETAILS.md`](docs/MCP_SERVER_DETAILS.md) - MCP server implementation details

## Development

This is the foundational structure for the MCP tools ecosystem. Each component will be implemented according to the specifications in the documentation.