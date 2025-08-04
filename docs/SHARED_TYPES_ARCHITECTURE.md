# Shared Types Architecture

## Overview

The MCP Tools ecosystem uses a comprehensive shared types architecture to ensure type consistency, reduce duplication, and maintain API compatibility across all services and workers. All shared types are centralized in the `@mcp-tools/core` package under `src/shared/types/`.

## Architecture Principles

### 1. **Single Source of Truth**
All cross-service types are defined once in the core package and imported by dependent services.

### 2. **Type Safety**
Full TypeScript type safety with Zod schema validation for runtime type checking.

### 3. **Versioned Compatibility**
Shared types follow semantic versioning to ensure backwards compatibility.

### 4. **Documentation First**
All types include comprehensive JSDoc descriptions for API documentation generation.

### 5. **UUID Primary Keys**
All entity identifiers use UUID strings for improved performance, distributed system compatibility, and security. UUIDs are generated using PostgreSQL's `gen_random_uuid()` function or Node.js `crypto.randomUUID()`.

## Type Categories

### 1. Embedding Types (`embedding.ts`)

Core types for vector embedding operations across the system.

#### **EmbeddingRequest/Response**
```typescript
interface EmbeddingRequest {
  id: string;                    // UUID request identifier  
  text: string;                  // Text content to embed
  user_id?: string;              // UUID user tracking
  request_id: string;            // UUID correlation ID
  model?: string;                // Optional model override
  dimensions?: number;           // Optional dimension override
}

interface EmbeddingResponse {
  request_id: string;            // Matching UUID correlation ID
  embedding: number[];           // Generated vector
  dimension: number;             // Vector dimensions
  processing_time_ms: number;    // Processing duration
  model_used?: string;           // Actual model used
  error?: string;                // Error message if failed
}
```

#### **Provider Configuration**
```typescript
interface EmbeddingProviderConfig {
  type: 'ollama' | 'openai';     // Provider type
  baseUrl?: string;              // API endpoint
  apiKey?: string;               // Authentication key
  modelName: string;             // Model identifier
  dimensions?: number;           // Embedding dimensions
  timeout: number;               // Request timeout (default: 30s)
  retryAttempts: number;         // Retry count (default: 3)
  rateLimitPerSecond?: number;   // Rate limiting
}
```

#### **Batch Processing**
```typescript
interface EmbeddingBatchRequest {
  batch_id: string;              // UUID batch identifier
  requests: EmbeddingRequest[];  // Individual requests
  priority: 'low' | 'normal' | 'high';  // Processing priority
  callback_subject?: string;     // NATS callback subject
}

interface EmbeddingBatchResponse {
  batch_id: string;              // Matching UUID batch ID
  responses: EmbeddingResponse[]; // Individual responses
  errors: EmbeddingError[];      // Any errors encountered
  total_processing_time_ms: number;
  completed_at: number;          // Completion timestamp
}
```

### 2. Worker Types (`worker.ts`)

Base configuration and lifecycle types for all worker processes.

#### **Base Worker Configuration**
```typescript
interface BaseWorkerConfig {
  // NATS Configuration
  natsUrl: string;               // NATS server URL
  natsUser?: string;             // Authentication username
  natsPassword?: string;         // Authentication password
  natsToken?: string;            // Authentication token
  
  // Logging Configuration  
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
  
  // Health & Monitoring
  healthCheckInterval: number;   // Health check frequency (default: 30s)
  metricsEnabled: boolean;       // Enable metrics collection
  metricsPort?: number;          // Metrics endpoint port
  
  // Performance Settings
  maxConcurrency: number;        // Max concurrent operations (default: 10)
  shutdownTimeout: number;       // Graceful shutdown timeout (default: 30s)
  
  // Worker Identification
  workerId?: string;             // UUID instance ID
  workerName: string;            // Human-readable name
  version?: string;              // Worker version
}
```

#### **Worker Status & Health**
```typescript
interface WorkerStatus {
  workerId: string;              // UUID worker identifier
  workerName: string;
  status: 'starting' | 'healthy' | 'degraded' | 'unhealthy' | 'stopping';
  uptime: number;                // Milliseconds
  lastHealthCheck: number;       // Timestamp
  version?: string;
  metadata?: Record<string, any>; // Worker-specific data
}

interface WorkerMetrics {
  workerId: string;              // UUID worker identifier
  timestamp: number;
  
  // Performance Metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;   // Milliseconds
  
  // Resource Usage
  memoryUsage?: number;          // Bytes
  cpuUsage?: number;             // Percentage
  
  // Custom Metrics
  customMetrics?: Record<string, number>;
}
```

#### **Worker Lifecycle Events**
```typescript
interface WorkerEvent {
  workerId: string;              // UUID worker identifier
  eventType: 'started' | 'stopped' | 'error' | 'health_check' | 'metrics';
  timestamp: number;
  data?: any;                    // Event-specific data
  message?: string;              // Human-readable message
}
```

#### **Standard NATS Subjects**
```typescript
const WORKER_SUBJECTS = {
  HEALTH_CHECK: 'workers.health',
  STATUS_UPDATE: 'workers.status', 
  METRICS: 'workers.metrics',
  STARTED: 'workers.lifecycle.started',
  STOPPED: 'workers.lifecycle.stopped',
  ERROR: 'workers.lifecycle.error',
  EMBEDDINGS: 'workers.embeddings',
  VECTOR_STORE: 'workers.vector',
  ANALYSIS: 'workers.analysis',
} as const;
```

### 3. NATS Message Types (`nats.ts`)

Standardized message schemas for inter-service communication.

#### **Base Message Pattern**
```typescript
interface BaseMessage {
  messageId: string;             // UUID message ID
  timestamp: number;             // Message timestamp  
  source: string;                // Originating service
  correlationId?: string;        // UUID request correlation
  version: string;               // Schema version (default: "1.0")
}
```

#### **Memory Events**
```typescript
interface MemoryEvent extends BaseMessage {
  eventType: 'created' | 'updated' | 'deleted' | 'analyzed';
  memoryId: string;              // UUID memory identifier
  userId: string;                // UUID user identifier
  projectName?: string;
  content?: string;              // For create/update events
  metadata?: Record<string, any>;
}
```

#### **Analysis Events**
```typescript
interface AnalysisEvent extends BaseMessage {
  analysisType: 'content' | 'relationship' | 'sentiment' | 'topic';
  targetId: string;              // UUID target identifier
  targetType: 'memory' | 'document' | 'conversation';
  userId: string;                // UUID user identifier
  results: Record<string, any>;
  confidence?: number;           // 0-1 confidence score
}
```

#### **Relationship Events**  
```typescript
interface RelationshipEvent extends BaseMessage {
  eventType: 'detected' | 'confirmed' | 'rejected' | 'updated';
  sourceId: string;              // UUID source identifier
  targetId: string;              // UUID target identifier
  relationshipType: string;
  strength: number;              // 0-1 relationship strength
  metadata?: Record<string, any>;
}
```

#### **Standard NATS Subjects**
```typescript
const NATS_SUBJECTS = {
  // Memory Events
  MEMORY_CREATED: 'memories.created',
  MEMORY_UPDATED: 'memories.updated', 
  MEMORY_DELETED: 'memories.deleted',
  MEMORY_ANALYZED: 'memories.analyzed',
  
  // Analysis Events
  ANALYSIS_REQUESTED: 'analysis.requested',
  ANALYSIS_COMPLETED: 'analysis.completed',
  ANALYSIS_FAILED: 'analysis.failed',
  
  // Relationship Events
  RELATIONSHIPS_DETECTED: 'relationships.detected',
  RELATIONSHIPS_UPDATED: 'relationships.updated',
  
  // Processing Events
  BATCH_STARTED: 'processing.batch.started',
  BATCH_PROGRESS: 'processing.batch.progress',
  BATCH_COMPLETED: 'processing.batch.completed',
  BATCH_FAILED: 'processing.batch.failed',
  
  // Worker Communication
  EMBEDDINGS_REQUEST: 'workers.embeddings.request',
  EMBEDDINGS_RESPONSE: 'workers.embeddings.response',
} as const;
```

### 4. API Response Types (`api.ts`)

Standardized REST API patterns for consistent client experiences.

#### **Standard API Response**
```typescript
interface ApiResponse<T = any> {
  success: boolean;              // Request success status
  data?: T;                      // Response payload
  error?: string;                // Error message if failed
  message?: string;              // Human-readable status
  timestamp: number;             // Response timestamp
  requestId?: string;            // Request tracking ID
}
```

#### **Pagination Support**
```typescript
interface Pagination {
  page: number;                  // Current page (1-based)
  limit: number;                 // Items per page (1-100)
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: Pagination;
}
```

#### **Search Parameters**
```typescript
interface SearchParams {
  query?: string;                // Search query string
  filters?: Record<string, any>; // Filter parameters
  sort?: string;                 // Sort field
  sortOrder: 'asc' | 'desc';     // Sort direction
  page: number;                  // Page number (default: 1)
  limit: number;                 // Items per page (default: 20)
}
```

#### **Error Handling**
```typescript
interface ApiError {
  code: string;                  // Machine-readable error code
  message: string;               // Human-readable message
  details?: Record<string, any>; // Additional error context
  field?: string;                // Field causing validation error
  timestamp: number;
}

interface ApiValidationError {
  field: string;                 // Field that failed validation
  message: string;               // Validation error message
  code: string;                  // Validation error code
  value?: any;                   // The invalid value
}
```

#### **Batch Operations**
```typescript
interface BatchRequest {
  batchId?: string;              // Optional UUID batch identifier
  operations: Array<{
    id: string;                  // UUID operation identifier
    operation: string;           // Operation type
    data: any;                   // Operation data
  }>;
  options?: Record<string, any>; // Batch processing options
}

interface BatchResponse {
  batchId: string;               // UUID batch identifier
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: Array<{
    id: string;                  // UUID operation identifier
    success: boolean;
    data?: any;
    error?: string;
  }>;
  processingTimeMs: number;
}
```

#### **Health Check Response**
```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;                // Service uptime in milliseconds
  version: string;               // Service version
  timestamp: number;             // Health check timestamp
  dependencies?: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;       // Dependency response time
    lastCheck: number;           // Last check timestamp
  }>;
  details?: Record<string, any>; // Additional health details
}
```

## Usage Guidelines

### 1. **Importing Shared Types**

```typescript
// Import specific types
import { EmbeddingRequest, EmbeddingResponse } from '@mcp-tools/core/shared';

// Import worker base types
import { BaseWorkerConfig, WorkerMetrics } from '@mcp-tools/core/shared';

// Import API patterns
import { ApiResponse, PaginatedResponse } from '@mcp-tools/core/shared';

// Import NATS message types
import { MemoryEvent, AnalysisEvent } from '@mcp-tools/core/shared';
```

### 2. **Extending Base Types**

```typescript
// Extend base worker config for service-specific needs
export interface MyWorkerConfig extends BaseWorkerConfig {
  // Service-specific configuration
  databaseUrl: string;
  cacheSize: number;
}

// Extend base metrics for custom metrics
export interface MyWorkerMetrics extends WorkerMetrics {
  // Service-specific metrics
  cacheHitRate: number;
  databaseConnections: number;
}
```

### 3. **Using Zod Schemas**

```typescript
import { EmbeddingRequestSchema } from '@mcp-tools/core/shared';

// Validate incoming data
function processEmbeddingRequest(data: unknown) {
  const request = EmbeddingRequestSchema.parse(data);
  // request is now typed as EmbeddingRequest
  return generateEmbedding(request.text);
}
```

### 4. **API Response Patterns**

```typescript
import { ApiResponse } from '@mcp-tools/core/shared';

// Consistent success response
function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

// Consistent error response  
function createErrorResponse(message: string, code?: string): ApiResponse {
  return {
    success: false,
    error: message,
    timestamp: Date.now(),
  };
}
```

### 5. **NATS Message Publishing**

```typescript
import { MemoryEvent, NATS_SUBJECTS } from '@mcp-tools/core/shared';

// Publish standardized memory event
async function publishMemoryCreated(memory: Memory) {
  const event: MemoryEvent = {
    messageId: generateId(),
    timestamp: Date.now(),
    source: 'memory-service',
    eventType: 'created',
    memoryId: memory.id,
    userId: memory.userId,
    content: memory.content,
  };
  
  await nats.publish(NATS_SUBJECTS.MEMORY_CREATED, JSON.stringify(event));
}
```

## Benefits

### 1. **Type Safety**
- Full compile-time type checking across all services
- Runtime validation with Zod schemas
- IDE autocompletion and refactoring support

### 2. **Consistency**
- Standardized API response formats
- Uniform error handling patterns
- Consistent message schemas

### 3. **Maintainability**  
- Single point of type definition updates
- Automatic breaking change detection
- Simplified refactoring across services

### 4. **Documentation**
- Self-documenting types with JSDoc
- Automatic API documentation generation
- Clear contract definitions

### 5. **Development Velocity**
- Reduced boilerplate code
- Faster integration between services
- Fewer runtime type errors

## Migration Guide

### Migrating from Local Types

1. **Identify Shared Types**: Find types used across multiple services
2. **Add to Core**: Move types to appropriate shared type files
3. **Update Imports**: Replace local imports with core imports
4. **Test Integration**: Ensure all services build and run correctly
5. **Remove Duplicates**: Delete local type definitions

### Version Compatibility

- **Major Version**: Breaking changes requiring code updates
- **Minor Version**: New types and optional fields
- **Patch Version**: Documentation and bug fixes only

## Future Enhancements

### Planned Additions

1. **GraphQL Schema Generation**: Auto-generate GraphQL schemas from shared types
2. **OpenAPI Integration**: Generate OpenAPI specs from API types
3. **Runtime Type Guards**: Enhanced runtime type checking utilities
4. **Type Migrations**: Automated migration tools for breaking changes
5. **Performance Monitoring**: Built-in performance tracking for shared types

## UUID Quick Reference

| Context | Format | Example | Usage |
|---------|--------|---------|-------|
| Database | `UUID` | `gen_random_uuid()` | Primary key generation |
| TypeScript | `string` | `crypto.randomUUID()` | Client-side ID creation |
| API | `string` | `"123e4567-e89b-012d-3456-426614174000"` | HTTP requests/responses |
| Validation | `z.string().uuid()` | Zod schema validation | Runtime type checking |
| Testing | `string` | `"550e8400-e29b-41d4-a716-446655440000"` | Consistent test fixtures |

### UUID Performance Notes

- **Storage**: 16 bytes in database, 36 characters as string
- **Generation**: ~2-3μs per UUID (extremely fast)
- **Indexing**: B-tree indexes work efficiently with UUIDs
- **Uniqueness**: Practically guaranteed globally unique
- **Security**: Non-sequential, harder to guess than incremental IDs

The shared types architecture provides a solid foundation for the MCP Tools ecosystem, ensuring type safety, consistency, and maintainability across all services and workers.