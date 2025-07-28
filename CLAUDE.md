# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive multi-server MCP (Model Context Protocol) ecosystem design repository. The project documents the architecture for advanced work management, documentation, and memory persistence capabilities for LLMs. **This is primarily a documentation/specification repository** - the actual implementation code is not present in this directory.

## Repository Structure

The repository contains detailed architectural documentation:

- `ARCHITECTURE.md` - High-level system architecture and component overview
- `API_SPECIFICATIONS.md` - Complete API schemas and interface definitions
- `MCP_SERVER_DETAILS.md` - Detailed TypeScript implementation designs for MCP servers
- `BACKEND_INTEGRATION.md` - Database and backend service integration patterns  
- Background worker architecture now implemented in TypeScript
- `WEB_CLIENT_ARCHITECTURE.md` - React/Next.js frontend design
- `DATA_FLOW_DIAGRAMS.md` - System data flow documentation
- `FUTURE_SERVICES.md` - Roadmap for additional services

## System Components

### Core MCP Servers (TypeScript)
1. **Kanban MCP Server** - Task and project management with tools like `create_board`, `create_task`, `move_task`
2. **Wiki MCP Server** - Knowledge management with tools like `create_page`, `search_content`, `link_pages`  
3. **Memory Graph MCP Server** - Long-term knowledge persistence with tools like `store_memory`, `retrieve_memory`, `create_connection`

### Integration Layer
- **API Gateway** (TypeScript/Express) - Unified REST API and WebSocket server
- **NATS Message Broker** - Async communication between servers and workers

### Background Workers (TypeScript)
- **Embeddings Worker** - Generates vector embeddings via Ollama/OpenAI APIs
- **Memory Processing Service** - Analyzes content and detects relationships
- **Markitdown Worker** - Document conversion and processing

### Data Layer
- **Qdrant Vector Database** - Semantic search and embeddings
- **PostgreSQL** - Primary data storage
- **Redis** - Caching layer

## Architecture Patterns

The system follows a microservices architecture with:
- Each MCP server as an independent service
- Event-driven communication via NATS
- Vector embeddings for semantic search
- Graph-based relationship mapping
- Real-time updates via WebSocket

## Key Design Principles

- **Separation of Concerns** - Clear boundaries between MCP tools, business logic, and data layers
- **Event-Driven Architecture** - NATS messaging for loose coupling between components
- **Vector-First Search** - All content indexed in Qdrant for semantic similarity
- **Relationship Mapping** - Automatic discovery and maintenance of content relationships
- **Scalability** - Horizontally scalable workers and stateless design

## MCP Tool Integration Architecture

The project follows Model Context Protocol (MCP) patterns for interconnected tool ecosystem:

### Tool Categories & URI Schemes
- **Task Management Tools**: `kanban://project/{id}/task/{id}`
- **Knowledge Management Tools**: `wiki://project/{id}/page/{slug}`
- **Memory Systems**: `memory://thought/{id}` and `memory://graph/{relationship_id}`

### Cross-Tool Resource Linking
All tools expose resources via standardized URI schemes that enable:
- Semantic linking between kanban tasks and wiki pages
- Memory system integration for "thought streams" with embeddings
- LLM context awareness of related resources across tools

### Memory System Integration
The memory system uses:
- **Thought Streams**: Encoded as embeddings in vector database
- **Network of Thoughts**: Graph relationships between memory entries
- **Resource References**: Direct links to kanban tasks and wiki pages
- **Context Injection**: Retrieved memories enhance LLM context with related resources

### MCP Resource Structure
```json
{
  "resources": [
    {
      "id": "task-456",
      "type": "task", 
      "uri": "kanban://project-abc/task-456",
      "metadata": {"status": "In Progress", "linked_pages": ["wiki-001"]}
    },
    {
      "id": "wiki-001",
      "type": "wiki_page",
      "uri": "wiki://project-abc/getting-started", 
      "metadata": {"linked_tasks": ["task-456"], "thought_refs": ["thought-789"]}
    }
  ]
}
```

## Development Context

This repository serves as the comprehensive design specification for implementing the MCP tools ecosystem. When working with this codebase:

1. **Focus on Documentation** - This is a specification repository; treat it as such
2. **Cross-Reference Architecture** - Use the interconnected documentation files to understand system relationships
3. **API-First Design** - The API specifications are comprehensive and should guide any implementation
4. **Understand Data Flows** - The system relies heavily on async messaging and vector operations

## Development Commands

### Kanban MCP Server
The kanban server has been set up with the following commands:
```bash
cd servers/kanban
npm install           # Install dependencies
npm run build        # Build with tsup (fast bundler)
npm run dev          # Development mode with tsup watch
npm run start        # Run production build
npm run typecheck    # Type checking without build
npm run clean        # Clean build directory
npm run db:migrate   # Initialize database
```

The server uses **tsup** for fast, modern builds instead of plain TypeScript compiler.

### Wiki MCP Server
The wiki server has been implemented with the following structure:
```bash
cd servers/wiki
npm install           # Install dependencies including markdown processing
npm run build        # Build with tsup
npm run dev          # Development mode with tsup watch  
npm run start        # Run production build
npm run typecheck    # Type checking without build
npm run clean        # Clean build directory
npm run db:migrate   # Initialize database with wiki schema
```

Key wiki server features:
- **Markdown Processing**: GitHub Flavored Markdown with wiki-style `[[page]]` linking
- **Hierarchical Pages**: Parent-child relationships for structured content organization
- **Categories & Tags**: Flexible organization systems with color coding
- **Full-Text Search**: SQLite FTS5 and PostgreSQL tsvector search support
- **Version History**: Track changes with authorship and change reasons
- **Comments System**: Discussion functionality for pages
- **MCP Resources**: URI-based access (`wiki://page/{id}`, `wiki://slug/{slug}`)

### Database Support
Both kanban and wiki servers support multiple database types:
- SQLite (default for development) 
- PostgreSQL (production)
- MySQL (alternative production)

### Current Implementation Status
✅ **Kanban MCP Server**: Complete with task/board management, WebSocket real-time updates
✅ **Wiki MCP Server**: Complete with markdown processing, search, hierarchical organization
🚧 **Memory MCP Server**: Planned for thought streams and semantic embedding integration
🚧 **API Gateway**: Planned for unified REST API across all MCP servers

## Architectural Decisions from July 23, 2025

### Pivot to REST API Architecture
**Decision**: Changed from direct MCP client integration to REST API + React Query approach for better web client compatibility.

**Rationale**: 
- Better browser support and development experience
- Enables traditional web authentication patterns
- Simplifies state management with React Query
- Maintains MCP benefits on the backend while exposing familiar APIs

### Memory System Design
**Architecture**: LLM memory system using embeddings and vector database for "thought streams"
- Each thought encoded as embedding with metadata and relationships
- Vector similarity search for semantic memory retrieval  
- Graph relationships between thoughts, tasks, and wiki pages
- Integration with MCP resource URIs for cross-tool context

### Tool Integration Patterns
**Pattern**: All tools expose resources via standardized URI schemes
- Enables semantic linking (wiki pages ↔ kanban tasks ↔ memory thoughts)
- LLM context injection with related resources
- Shared metadata fields like `project_id` for tool interoperability

## No Build/Test Commands for Documentation

The root documentation files don't have build commands - the value is in the comprehensive architectural specifications and design patterns documented across the markdown files.

# User Notes
- Please make sure to commit changes to git after finishing features. If features are significant enough, a new branch can be created and merged back to main/dev branch later on.
- Always check `work_items.md` and keep it update to date with current status of work items. If new items are needed, please add them. You may sort the order of work items once a feature is completed depending on necessity, ONLY AFTER CONFIRMING WITH THE USER.