# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive production-ready MCP (Model Context Protocol) ecosystem implementing advanced work management, documentation, and memory persistence capabilities for LLMs. The system consists of multiple TypeScript services working together as a unified platform.

## Architecture

### Core Components
- **MCP Servers** (TypeScript) - Kanban, Wiki, and Memory Graph servers implementing MCP protocol
- **API Gateway** (TypeScript/Express) - Unified REST API with WebSocket real-time updates  
- **Web Client** (React/Next.js) - Production-ready frontend with authentication and real-time collaboration
- **Background Workers** (TypeScript) - Embeddings processing, document conversion, and analysis
- **Core Services** (TypeScript) - Shared types, services, and utilities with comprehensive Zod validation

### Key Technologies
- **TypeScript** - All services use strict TypeScript with shared type system
- **MCP Protocol** - Model Context Protocol for AI tool integration
- **Vector Search** - Qdrant for semantic search and embeddings
- **Real-time** - WebSocket connections for live collaboration
- **Databases** - SQLite (development), PostgreSQL (production)
- **Bundling** - tsup for fast TypeScript compilation

## Monorepo Structure & Path Aliases

The project uses a comprehensive TypeScript path alias system defined in the root `tsconfig.json`:

```typescript
"@mcp-tools/core": "./core/src/index.ts"           // Core shared services
"@mcp-tools/gateway": "./gateway/src/index.ts"     // API gateway
"@mcp-tools/web": "./web/src/index.ts"             // Web client
"@mcp-tools/kanban": "./servers/kanban/src/index.ts"
"@mcp-tools/memory": "./servers/memory/src/index.ts" 
"@mcp-tools/wiki": "./servers/wiki/src/index.ts"
"@shared/*": "./core/src/shared/*"                 // Shared utilities
"@types/*": "./core/src/shared/types/*"            // Shared types
```

**Critical**: Always build the core package first before building other components, as they depend on the compiled core module.

## Development Commands

### Essential Build Order
```bash
# 1. Build core package FIRST (required by all other components)
cd core && npm install && npm run build

# 2. Build other components (can be done in parallel)
cd ../gateway && npm install && npm run build
cd ../web && npm install && npm run build
cd ../servers/kanban && npm install && npm run build
cd ../servers/wiki && npm install && npm run build
cd ../servers/memory && npm install && npm run build
```

### Core Package
```bash
cd core
npm install           # Install dependencies
npm run build        # Build with tsup (MUST run first)
npm run dev          # Development mode with tsup watch
npm run typecheck    # Type checking without build
npm run clean        # Clean build directory
```

### API Gateway
```bash
cd gateway
npm install           # Install dependencies
npm run build        # Build with tsup
npm run dev          # Development mode with hot reload
npm run start        # Run production build
npm run typecheck    # Type checking
```

### Web Client (Next.js)
```bash
cd web
npm install           # Install dependencies
npm run build        # Production build
npm run dev          # Development server (http://localhost:3000)
npm run start        # Run production build
npm run lint         # ESLint checking
npm run type-check   # TypeScript checking
```

### MCP Servers
Each MCP server (kanban, wiki, memory) follows the same pattern:
```bash
cd servers/[server-name]
npm install           # Install dependencies
npm run build        # Build with tsup
npm run dev          # Development mode with tsup watch
npm run start        # Run production build
npm run typecheck    # Type checking without build
npm run clean        # Clean build directory
npm run db:migrate   # Initialize database (kanban/wiki only)
```

### Background Workers
```bash
cd workers/embeddings
npm install && npm run build && npm run dev

cd workers/markitdown  
npm install && npm run build && npm run dev
```

### Testing
```bash
cd tests
npm install           # Install test dependencies
npm test             # Run all tests
npm run test:integration  # Integration tests
npm run test:e2e     # End-to-end tests
```

## System Architecture Patterns

### MCP Protocol Integration
- **Tool Categories**: Each server exposes MCP tools for specific domains (kanban, wiki, memory)
- **Resource URIs**: `kanban://project/{id}/task/{id}`, `wiki://page/{id}`, `memory://thought/{id}`
- **Cross-tool Linking**: Resources can reference each other via standardized URI schemes

### Type System Architecture
- **Shared Types**: All TypeScript types defined in `core/src/shared/types/` with Zod validation
- **Export Pattern**: Core package exports all types for consumption by other services
- **Validation**: Runtime validation using Zod schemas for API boundaries

### Database Architecture  
- **Multi-database Support**: SQLite (development), PostgreSQL (production), MySQL (alternative)
- **Schema Management**: SQL schema files in each server's `database/` directory
- **Migration System**: `npm run db:migrate` initializes database schemas

### Real-time Updates
- **WebSocket Integration**: Gateway provides WebSocket endpoints for live collaboration
- **Event-driven**: NATS messaging for async communication between services
- **State Synchronization**: Real-time updates for kanban boards, wiki pages, and memory graphs

## Key Implementation Details

### MCP Server Structure
Each MCP server follows a consistent pattern:
```
src/
├── index.ts          # MCP server entry point
├── tools/            # MCP tool implementations
├── services/         # Business logic services  
├── database/         # Database schemas and connections
├── types/            # Server-specific types
└── repositories/     # Data access layer
```

### Web Client Architecture
- **Next.js App Router**: Modern React architecture with server components
- **TypeScript Path Resolution**: Configured for `@/` imports and core module imports
- **Real-time Integration**: WebSocket connections for live updates
- **Component Structure**: Modular UI components with Tailwind CSS styling

### API Gateway Pattern
- **Unified REST API**: Single endpoint for all MCP server operations
- **WebSocket Support**: Real-time bidirectional communication
- **Authentication**: JWT-based auth system (production-ready)
- **Request Routing**: Routes requests to appropriate MCP servers

## Production Features

### Authentication System
- JWT-based login/signup with secure sessions
- User management and authorization
- Session persistence and refresh tokens

### Real-time Collaboration
- WebSocket connections for live updates
- Multi-user collaboration on kanban boards
- Real-time wiki editing and comments
- Live memory graph updates

### Docker Deployment
- Production-ready Docker configuration
- Nginx reverse proxy setup
- Database persistence and backups
- Environment-based configuration

## Development Workflow

1. **Start Core**: Always build core package first: `cd core && npm run build`
2. **Development Mode**: Run `npm run dev` in each component directory for hot reload
3. **Type Checking**: Use `npm run typecheck` to verify TypeScript without building
4. **Testing**: Run integration tests with `cd tests && npm test`
5. **Production Build**: Use `npm run build` in each component for production deployment

## Critical Notes

- **Build Dependencies**: Core package must be built before other components
- **Path Resolution**: Web client requires specific tsconfig.json configuration for module resolution
- **MCP Protocol**: Servers implement MCP tools for AI integration - maintain tool schemas
- **Real-time Features**: WebSocket connections require gateway to be running
- **Database Support**: Multiple database types supported - configure via environment variables

## Troubleshooting

### TypeScript Path Resolution Issues
If you see module resolution errors:
1. Ensure core package is built: `cd core && npm run build`
2. Check tsconfig.json path mappings
3. For web client, verify both tsconfig.json and next.config.js configurations

### MCP Server Connection Issues  
- Verify MCP server is running on correct port
- Check authentication credentials
- Ensure database is initialized with `npm run db:migrate`

### Real-time Updates Not Working
- Confirm gateway WebSocket server is running
- Check WebSocket connection in browser developer tools
- Verify authentication tokens are valid

## Tooling Notes
- Use @docs\TECHNICAL_DEBT.md as a tracking file for work items