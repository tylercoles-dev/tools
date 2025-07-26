# Data Flow Diagrams

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [Backend Integration](BACKEND_INTEGRATION.md) | [API Specifications](API_SPECIFICATIONS.md)

## Overview

This document provides detailed data flow diagrams showing how information moves through the MCP Tools system, including inter-server communication, real-time updates, and background processing workflows.

## 1. Task Creation Flow

🔗 **Implementation**: [Kanban MCP Server](MCP_SERVER_DETAILS.md#kanban-mcp-server) | [Embeddings Worker](WORKERS_ARCHITECTURE.md#embeddings-worker)

```mermaid
sequenceDiagram
    participant LLM as LLM Client
    participant KS as Kanban MCP Server
    participant PG as PostgreSQL
    participant NATS as NATS Message Broker
    participant VW as Embeddings Worker
    participant RW as Memory Processing Worker
    participant QD as Qdrant
    participant WS as WebSocket
    participant WEB as Web Client

    LLM->>KS: create_task(title, description, boardId)
    KS->>PG: INSERT task
    PG-->>KS: task_id, created_task
    KS-->>LLM: Task created response
    
    Note over KS,NATS: Async processing begins
    KS->>NATS: Publish mcp.kanban.task.created
    KS->>WS: Broadcast task.created event
    WS->>WEB: Real-time task update
    
    NATS->>VW: Consume vector.index.request
    VW->>VW: Generate embedding
    VW->>QD: Store vector + metadata
    QD-->>VW: Vector stored confirmation
    
    NATS->>RW: Consume relationship.analyze.request  
    RW->>QD: Search for similar content
    QD-->>RW: Similar entities list
    RW->>PG: Store relationships
    PG-->>RW: Relationships stored
```

## 2. Cross-Server Search Flow

🔗 **Implementation**: [API Gateway](BACKEND_INTEGRATION.md#api-gateway-design) | [Search API](API_SPECIFICATIONS.md#universal-search-api)

```mermaid
sequenceDiagram
    participant WEB as Web Client
    participant API as API Gateway
    participant CACHE as Redis Cache
    participant EMB as Embedding Service
    participant QD as Qdrant
    participant PG as PostgreSQL
    participant KS as Kanban Server
    participant WS as Wiki Server
    participant MS as Memory Server

    WEB->>API: GET /api/search?q="project planning"
    
    API->>CACHE: Check cached results
    alt Cache Hit
        CACHE-->>API: Cached search results
        API-->>WEB: Return cached results
    else Cache Miss
        API->>EMB: Generate query embedding
        EMB-->>API: Query vector [0.1, 0.2, ...]
        
        par Vector Search
            API->>QD: Search kanban_tasks collection
            QD-->>API: Task matches with scores
        and
            API->>QD: Search wiki_pages collection  
            QD-->>API: Page matches with scores
        and
            API->>QD: Search memory_nodes collection
            QD-->>API: Memory matches with scores
        end
        
        API->>API: Merge and rank results
        
        par Enrich Results
            API->>KS: Get full task data for matches
            KS->>PG: SELECT task details
            PG-->>KS: Task data
            KS-->>API: Enriched task results
        and
            API->>WS: Get full page data for matches
            WS->>PG: SELECT page details
            PG-->>WS: Page data
            WS-->>API: Enriched page results
        and
            API->>MS: Get full memory data for matches
            MS->>PG: SELECT memory details
            PG-->>MS: Memory data
            MS-->>API: Enriched memory results
        end
        
        API->>API: Combine enriched results
        API->>CACHE: Store results (TTL: 300s)
        API-->>WEB: Return search results
    end
```

## 3. Memory Graph Creation and Relationship Discovery

🔗 **Implementation**: [Memory Server](MCP_SERVER_DETAILS.md#memory-graph-mcp-server) | [Memory Processing Worker](WORKERS_ARCHITECTURE.md#memory-processing-worker)

```mermaid
sequenceDiagram
    participant LLM as LLM Client
    participant MS as Memory MCP Server
    participant PG as PostgreSQL
    participant NATS as NATS
    participant RW as Memory Processing Worker
    participant VW as Embeddings Worker
    participant QD as Qdrant
    participant WS as WebSocket
    participant WEB as Web Client

    LLM->>MS: store_memory(content, context, concepts)
    MS->>PG: INSERT memory_node
    PG-->>MS: memory_id, created_memory
    MS-->>LLM: Memory stored response
    
    Note over MS,NATS: Background processing pipeline
    MS->>NATS: Publish mcp.memory.node.stored
    MS->>WS: Broadcast memory.created event
    WS->>WEB: Real-time memory update
    
    par Vector Processing
        NATS->>VW: vector.index.request message
        VW->>VW: Generate content embedding
        VW->>QD: Store in memory_nodes collection
        QD-->>VW: Vector indexed
    and Relationship Analysis
        NATS->>RW: relationship.analyze.request message
        RW->>QD: Search for semantic similarities
        QD-->>RW: Similar memory nodes (score > 0.8)
        
        loop For each similar memory
            RW->>PG: INSERT semantic_similarity relationship
        end
        
        RW->>RW: Extract cross-references from content
        loop For each cross-reference
            RW->>PG: INSERT cross_reference relationship
        end
        
        RW->>RW: Analyze conceptual hierarchy
        RW->>PG: INSERT conceptual_hierarchy relationships
    end
    
    Note over RW,WEB: Real-time relationship updates
    RW->>WS: Broadcast relationships.updated
    WS->>WEB: Update memory graph visualization
```

## 4. Wiki Page Update with Cross-Linking

🔗 **Implementation**: [Wiki MCP Server](MCP_SERVER_DETAILS.md#wiki-mcp-server) | [Cache Service](BACKEND_INTEGRATION.md#cache-service)

```mermaid
sequenceDiagram
    participant LLM as LLM Client
    participant WS as Wiki MCP Server
    participant PG as PostgreSQL
    participant NATS as NATS
    participant RW as Memory Processing Worker
    participant VW as Embeddings Worker
    participant QD as Qdrant
    participant CACHE as Redis Cache
    participant WEB as Web Client via WebSocket

    LLM->>WS: update_page(pageId, content, metadata)
    WS->>PG: UPDATE wiki_page SET content=$1, updated_at=NOW()
    PG-->>WS: Updated page data
    
    WS->>WS: Extract auto-links from content
    WS->>PG: INSERT/UPDATE page_links
    
    WS-->>LLM: Page updated response
    
    Note over WS,NATS: Trigger reprocessing
    WS->>NATS: Publish mcp.wiki.page.updated
    WS->>WEB: Broadcast page.updated event
    
    par Vector Reindexing
        NATS->>VW: vector.index.request (updated content)
        VW->>QD: DELETE old vector by page_id
        VW->>VW: Generate new content embedding
        VW->>QD: INSERT new vector with metadata
        QD-->>VW: Reindexing complete
    and Relationship Reanalysis
        NATS->>RW: relationship.analyze.request
        RW->>PG: DELETE old relationships WHERE source_id=pageId
        RW->>QD: Search for new similar content
        QD-->>RW: Updated similarity matches
        
        loop For each new relationship
            RW->>PG: INSERT new relationship
        end
    and Cache Invalidation
        WS->>CACHE: DEL search:* (invalidate search cache)
        WS->>CACHE: DEL page:${pageId}:* (invalidate page cache)
    end
    
    Note over RW,WEB: Notify of relationship changes
    RW->>WEB: Broadcast relationships.updated
    VW->>WEB: Broadcast vectors.updated
```

## 5. Real-Time Collaboration Flow

🔗 **Implementation**: [WebSocket Integration](WEB_CLIENT_ARCHITECTURE.md#websocket-integration) | [API Gateway](BACKEND_INTEGRATION.md#api-gateway-design)

```mermaid
sequenceDiagram
    participant U1 as User 1 (Web)
    participant U2 as User 2 (LLM)
    participant WS as WebSocket Server
    participant API as API Gateway
    participant KS as Kanban Server
    participant PG as PostgreSQL
    participant CACHE as Redis Cache

    Note over U1,U2: User 1 and User 2 working on same board
    
    U1->>WS: Connect to board:${boardId} room
    U2->>KS: create_task(boardId, "New task", ...)
    
    KS->>PG: INSERT task
    PG-->>KS: Task created with ID
    KS-->>U2: Task creation response
    
    KS->>WS: Broadcast to board:${boardId} room
    WS->>U1: task.created event
    
    Note over U1,CACHE: User 1 updates task in UI
    U1->>API: PATCH /api/kanban/tasks/${taskId}
    API->>CACHE: Check for conflicts/locks
    
    alt No conflicts
        API->>KS: Forward update request
        KS->>PG: UPDATE task SET ...
        PG-->>KS: Task updated
        KS-->>API: Update successful
        API-->>U1: Update confirmed
        
        API->>WS: Broadcast task.updated
        WS->>U2: Real-time task update
        
        API->>CACHE: Update cached task data
    else Conflict detected
        API-->>U1: Conflict error with latest state
        U1->>U1: Show conflict resolution UI
    end
```

## 6. Background Data Sync and Consistency

```mermaid
flowchart TD
    A[Scheduled Sync Trigger] --> B{Data Consistency Check}
    
    B -->|Inconsistencies Found| C[Generate Sync Tasks]
    B -->|All Consistent| D[Log Success & Exit]
    
    C --> E[Publish data.sync.request to NATS]
    E --> F[Data Sync Worker Processes Request]
    
    F --> G{Sync Type?}
    
    G -->|Incremental| H[Incremental Sync Process]
    G -->|Full Sync| I[Full Sync Process] 
    G -->|Validation| J[Data Validation Process]
    
    H --> K[Update Search Indexes]
    H --> L[Invalidate Stale Cache]
    H --> M[Update Vector Embeddings]
    
    I --> N[Rebuild All Indexes]
    I --> O[Clear All Cache]
    I --> P[Regenerate All Vectors]
    
    J --> Q[Check Orphaned Relationships]
    J --> R[Validate Cross-References]
    J --> S[Verify Data Integrity]
    
    K --> T[Notify Completion]
    L --> T
    M --> T
    N --> T
    O --> T
    P --> T
    Q --> U[Clean Up Orphaned Data]
    R --> U
    S --> U
    
    U --> T
    T --> V[Log Sync Results]
    V --> W[Update Monitoring Metrics]
```

## 7. Insight Generation Pipeline

🔗 **Implementation**: [Insights API](API_SPECIFICATIONS.md#insights-api) | [Vector Service](BACKEND_INTEGRATION.md#vector-service-implementation)

```mermaid
sequenceDiagram
    participant SCHED as Scheduler
    participant API as API Gateway
    participant QD as Qdrant
    participant PG as PostgreSQL
    participant AI as AI Analysis Service
    participant CACHE as Redis Cache
    participant WEB as Web Client

    Note over SCHED,WEB: Daily insight generation
    SCHED->>API: Trigger insight generation
    
    par Gather Task Patterns
        API->>PG: Query recent task completions
        PG-->>API: Task completion data
        API->>AI: Analyze productivity patterns
        AI-->>API: Task insights
    and Gather Knowledge Gaps  
        API->>QD: Vector search for sparse areas
        QD-->>API: Under-documented topics
        API->>PG: Cross-reference with wiki pages
        PG-->>API: Knowledge gap analysis
        API->>AI: Generate knowledge recommendations
        AI-->>API: Knowledge insights
    and Gather Memory Connections
        API->>QD: Analyze memory relationship density
        QD-->>API: Connection patterns
        API->>PG: Query relationship strengths
        PG-->>API: Relationship data
        API->>AI: Identify knowledge clusters
        AI-->>API: Memory insights
    end
    
    API->>API: Merge and prioritize insights
    API->>CACHE: Store insights with TTL
    API->>WEB: Push real-time insight notifications
    
    Note over API,WEB: User requests insights
    WEB->>API: GET /api/insights
    API->>CACHE: Retrieve cached insights
    CACHE-->>API: Latest insights
    API-->>WEB: Return personalized insights
```

## 8. Error Handling and Recovery Flow

```mermaid
flowchart TD
    A[Operation Failure] --> B{Error Type?}
    
    B -->|Network Error| C[Retry with Exponential Backoff]
    B -->|Validation Error| D[Log Error & Return to User]
    B -->|Database Error| E[Check Database Health]
    B -->|Processing Error| F[Send to Dead Letter Queue]
    
    C --> G{Retry Count < Max?}
    G -->|Yes| H[Wait & Retry]
    G -->|No| I[Escalate to Dead Letter Queue]
    
    H --> J{Operation Success?}
    J -->|Yes| K[Log Recovery & Continue]
    J -->|No| G
    
    E --> L{Database Available?}
    L -->|Yes| M[Retry Database Operation]
    L -->|No| N[Use Cached Data/Degrade Gracefully]
    
    M --> O{Database Operation Success?}
    O -->|Yes| K
    O -->|No| P[Escalate Alert]
    
    F --> Q[Dead Letter Queue Processing]
    I --> Q
    Q --> R[Manual Review Required]
    
    D --> S[User Error Response]
    K --> T[Normal Operation Resumes]
    N --> U[Degraded Mode Operation]
    P --> V[System Alert Triggered]
    R --> W[Admin Intervention]
```

## Key Data Flow Characteristics

### Asynchronous Processing
- All heavy operations (vector indexing, relationship analysis) happen asynchronously
- NATS ensures reliable message delivery with retries
- WebSocket provides real-time updates to connected clients

### Caching Strategy
- Redis caches frequent searches and computed insights
- Cache invalidation happens automatically on data changes
- TTL-based expiration for time-sensitive data

### Consistency Model
- Eventual consistency for search indexes and relationships
- Strong consistency for core entity data (tasks, pages, memories)
- Conflict resolution for concurrent updates

### Scalability Patterns
- Horizontal scaling of worker processes via NATS queue groups
- Database read replicas for query scaling
- Vector database clustering for search performance
- CDN for static assets and cached responses

### Monitoring Points
- Message processing rates and latencies
- Database connection pool utilization
- Vector search performance metrics
- WebSocket connection counts
- Cache hit/miss ratios
- Error rates and recovery success rates

## Next Steps

- 📋 **Implementation Details**: [MCP Server Details](MCP_SERVER_DETAILS.md)
- 🔗 **Backend Systems**: [Backend Integration](BACKEND_INTEGRATION.md)
- 📦 **Worker Processes**: [TypeScript Workers](WORKERS_ARCHITECTURE.md)
- ⚛️ **Frontend Integration**: [Web Client Architecture](WEB_CLIENT_ARCHITECTURE.md)
- 🔌 **API Reference**: [API Specifications](API_SPECIFICATIONS.md)