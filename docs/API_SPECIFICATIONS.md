# API Specifications and Schemas

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [MCP Server Details](MCP_SERVER_DETAILS.md) | [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)

## Overview

This document provides comprehensive API specifications, schemas, and interface definitions for all components in the MCP Tools system.

**Important**: All entity identifiers in the system use UUID strings for improved performance, distributed system compatibility, and security. UUIDs are generated using PostgreSQL's `gen_random_uuid()` function or Node.js `crypto.randomUUID()`.

## Common Schemas

### Base Types

```typescript
// Common types used across all services
export interface BaseEntity {
  id: string;                    // UUID identifier
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  createdBy?: string;            // UUID User ID
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

## Kanban MCP Server API

🔗 **Implementation**: [Kanban MCP Server Details](MCP_SERVER_DETAILS.md#kanban-mcp-server)

### MCP Tools

```typescript
// Tool argument schemas
export interface CreateBoardArgs {
  name: string;
  description?: string;
  template?: 'basic' | 'scrum' | 'kanban';
  columns?: Array<{
    name: string;
    wip_limit?: number;
  }>;
}

export interface CreateTaskArgs {
  boardId: string;               // UUID board identifier
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;           // UUID assignee identifier
  tags?: string[];
  dueDate?: string;              // ISO 8601
  estimatedHours?: number;
}

export interface UpdateTaskArgs {
  taskId: string;                // UUID task identifier
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;           // UUID assignee identifier
  tags?: string[];
  dueDate?: string;
  estimatedHours?: number;
}

export interface MoveTaskArgs {
  taskId: string;                // UUID task identifier
  newStatus: 'todo' | 'in_progress' | 'done';
  position?: number;             // Position within the column
}

export interface AssignTaskArgs {
  taskId: string;                // UUID task identifier
  assigneeId: string;            // UUID assignee identifier
}

export interface AddCommentArgs {
  taskId: string;                // UUID task identifier
  content: string;
  mentionedUsers?: string[];     // UUID array of mentioned users
}

export interface GetBoardArgs {
  boardId: string;               // UUID board identifier
  includeArchived?: boolean;
}

export interface ListBoardsArgs extends PaginationParams {
  ownerId?: string;              // UUID owner identifier
  status?: 'active' | 'archived';
  searchQuery?: string;
}
```

### Data Models

```typescript
export interface Board extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;               // UUID owner identifier
  status: 'active' | 'archived';
  columns: Column[];
  settings: BoardSettings;
}

export interface Column {
  id: string;                    // UUID column identifier
  name: string;
  position: number;
  wipLimit?: number;
  color?: string;
}

export interface BoardSettings {
  allowComments: boolean;
  autoAssign: boolean;
  timeTracking: boolean;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  taskCreated: boolean;
  taskUpdated: boolean;
  taskCompleted: boolean;
  dueDateReminders: boolean;
}

export interface Task extends BaseEntity {
  boardId: string;               // UUID board identifier
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;           // UUID assignee identifier
  assignee?: User;
  tags: string[];
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  position: number;
  comments: Comment[];
  attachments: Attachment[];
  dependencies: TaskDependency[];
}

export interface Comment extends BaseEntity {
  taskId: string;                // UUID task identifier
  content: string;
  authorId: string;              // UUID author identifier
  author: User;
  mentionedUsers: string[];      // UUID array of mentioned users
  edited: boolean;
  editedAt?: string;
}

export interface TaskDependency {
  id: string;                    // UUID dependency identifier
  dependentTaskId: string;       // UUID task that depends on another
  dependencyTaskId: string;      // UUID task that must be completed first
  type: 'blocks' | 'related';
}

export interface User {
  id: string;                    // UUID user identifier
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
}
```

### REST API Endpoints

```typescript
// Board Management
GET    /api/kanban/boards              // List boards
POST   /api/kanban/boards              // Create board
GET    /api/kanban/boards/{id}         // Get board
PATCH  /api/kanban/boards/{id}         // Update board
DELETE /api/kanban/boards/{id}         // Archive board

// Task Management  
GET    /api/kanban/boards/{boardId}/tasks    // List tasks
POST   /api/kanban/boards/{boardId}/tasks    // Create task
GET    /api/kanban/tasks/{id}                // Get task
PATCH  /api/kanban/tasks/{id}                // Update task
DELETE /api/kanban/tasks/{id}                // Delete task
POST   /api/kanban/tasks/{id}/move           // Move task
POST   /api/kanban/tasks/{id}/assign         // Assign task

// Comments
GET    /api/kanban/tasks/{taskId}/comments   // List comments
POST   /api/kanban/tasks/{taskId}/comments   // Add comment
PATCH  /api/kanban/comments/{id}             // Update comment
DELETE /api/kanban/comments/{id}             // Delete comment
```

## Wiki MCP Server API

🔗 **Implementation**: [Wiki MCP Server Details](MCP_SERVER_DETAILS.md#wiki-mcp-server)

### MCP Tools

```typescript
export interface CreatePageArgs {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  template?: string;
  parentPageId?: string;
}

export interface UpdatePageArgs {
  pageId: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  summary?: string; // Edit summary
}

export interface DeletePageArgs {
  pageId: string;
  reason?: string;
}

export interface SearchContentArgs {
  query: string;
  category?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  authorId?: string;
}

export interface LinkPagesArgs {
  sourcePageId: string;
  targetPageId: string;
  linkType?: 'reference' | 'related' | 'parent_child';
  anchorText?: string;
}

export interface CreateTemplateArgs {
  name: string;
  description?: string;
  content: string;
  variables?: TemplateVariable[];
}

export interface UploadAttachmentArgs {
  pageId: string;
  filename: string;
  contentType: string;
  size: number;
  data: string; // base64 encoded
}
```

### Data Models

```typescript
export interface WikiPage extends BaseEntity {
  title: string;
  content: string;
  slug: string;
  category?: string;
  tags: string[];
  authorId: string;
  author: User;
  version: number;
  status: 'draft' | 'published' | 'archived';
  parentPageId?: string;
  childPages?: WikiPage[];
  backlinks: PageLink[];
  attachments: Attachment[];
  views: number;
  lastViewedAt?: string;
}

export interface PageLink {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  linkType: 'reference' | 'related' | 'parent_child';
  anchorText?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  color?: string;
  pageCount: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  usageCount: number;
  createdBy: string;
  createdAt: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  description?: string;
  defaultValue?: any;
  required: boolean;
  options?: string[]; // For select type
}

export interface Attachment extends BaseEntity {
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  pageId?: string;
  uploadedBy: string;
}

export interface PageRevision {
  id: string;
  pageId: string;
  version: number;
  title: string;
  content: string;
  summary?: string;
  authorId: string;
  createdAt: string;
}
```

### REST API Endpoints

```typescript
// Page Management
GET    /api/wiki/pages                 // List pages
POST   /api/wiki/pages                 // Create page
GET    /api/wiki/pages/{id}            // Get page
PATCH  /api/wiki/pages/{id}            // Update page
DELETE /api/wiki/pages/{id}            // Delete page
GET    /api/wiki/pages/{id}/revisions  // Page history

// Search & Navigation
GET    /api/wiki/search               // Search pages
GET    /api/wiki/categories           // List categories
GET    /api/wiki/pages/{id}/links     // Get page links
POST   /api/wiki/pages/{id}/links     // Create link

// Templates
GET    /api/wiki/templates            // List templates
POST   /api/wiki/templates            // Create template
GET    /api/wiki/templates/{id}       // Get template

// Attachments
POST   /api/wiki/pages/{id}/attachments   // Upload attachment
GET    /api/wiki/attachments/{id}         // Download attachment
DELETE /api/wiki/attachments/{id}         // Delete attachment
```

## Memory Graph MCP Server API

🔗 **Implementation**: [Memory Graph MCP Server Details](MCP_SERVER_DETAILS.md#memory-graph-mcp-server)

### MCP Tools

```typescript
export interface StoreMemoryArgs {
  content: string;
  context: {
    source?: string;
    timestamp?: string;
    location?: string;
    participants?: string[];
    tags?: string[];
    [key: string]: any;
  };
  concepts?: string[];
  importance?: 1 | 2 | 3 | 4 | 5; // 1=low, 5=critical
}

export interface RetrieveMemoryArgs {
  query?: string;
  concepts?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  context?: Record<string, any>;
  limit?: number;
}

export interface CreateConnectionArgs {
  sourceId: string;
  targetId: string;
  relationshipType: 'semantic_similarity' | 'causal' | 'temporal' | 'conceptual' | 'custom';
  strength?: number; // 0.0 to 1.0
  metadata?: Record<string, any>;
  bidirectional?: boolean;
}

export interface SearchMemoriesArgs {
  query: string;
  contextFilters?: Record<string, any>;
  conceptFilters?: string[];
  includeRelated?: boolean;
  maxDepth?: number; // For relationship traversal
}

export interface GetRelatedArgs {
  memoryId: string;
  relationshipTypes?: string[];
  maxDepth?: number;
  minStrength?: number;
}

export interface MergeMemoriesArgs {
  primaryMemoryId: string;
  secondaryMemoryIds: string[];
  strategy: 'combine_content' | 'preserve_primary' | 'create_summary';
}
```

### Data Models

```typescript
export interface MemoryNode extends BaseEntity {
  content: string;
  contentHash: string; // For deduplication
  context: MemoryContext;
  concepts: Concept[];
  importance: 1 | 2 | 3 | 4 | 5;
  status: 'active' | 'archived' | 'merged';
  accessCount: number;
  lastAccessedAt?: string;
  vectorId?: string; // Reference to Qdrant vector
}

export interface MemoryContext {
  source?: string;
  timestamp?: string;
  location?: string;
  participants?: string[];
  tags?: string[];
  sessionId?: string;
  parentMemoryId?: string;
  [key: string]: any;
}

export interface Concept {
  id: string;
  name: string;
  description?: string;
  type: 'entity' | 'topic' | 'skill' | 'project' | 'person' | 'custom';
  confidence: number; // 0.0 to 1.0
  extractedAt: string;
}

export interface Relationship extends BaseEntity {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength: number; // 0.0 to 1.0
  bidirectional: boolean;
  metadata: Record<string, any>;
  lastUpdated: string;
}

export interface MemoryCluster {
  id: string;
  name?: string;
  description?: string;
  memoryIds: string[];
  centroid?: number[]; // Vector centroid
  coherenceScore: number;
  topics: string[];
  createdAt: string;
}

export interface RelatedMemories {
  centerMemory: MemoryNode;
  relatedNodes: Array<{
    memory: MemoryNode;
    relationship: Relationship;
    path?: Relationship[]; // For multi-hop connections
    distance: number;
  }>;
  clusters: MemoryCluster[];
  concepts: Concept[];
}
```

### REST API Endpoints

```typescript
// Memory Management
GET    /api/memory/memories            // List memories
POST   /api/memory/memories            // Store memory
GET    /api/memory/memories/{id}       // Get memory
PATCH  /api/memory/memories/{id}       // Update memory
DELETE /api/memory/memories/{id}       // Archive memory
POST   /api/memory/memories/merge      // Merge memories

// Relationships
GET    /api/memory/memories/{id}/related     // Get related memories
POST   /api/memory/relationships             // Create relationship
GET    /api/memory/relationships/{id}        // Get relationship
PATCH  /api/memory/relationships/{id}        // Update relationship
DELETE /api/memory/relationships/{id}        // Delete relationship

// Concepts & Clusters
GET    /api/memory/concepts            // List concepts
POST   /api/memory/concepts            // Create concept
GET    /api/memory/clusters            // List clusters
GET    /api/memory/clusters/{id}       // Get cluster details

// Graph Analysis
GET    /api/memory/graph/stats         // Graph statistics
GET    /api/memory/graph/paths         // Find paths between memories
POST   /api/memory/graph/analyze       // Analyze graph patterns
```

## Cross-Tool APIs

🔗 **Backend**: [API Gateway Design](BACKEND_INTEGRATION.md#api-gateway-design)

### Universal Search API

```typescript
export interface SearchQuery {
  query: string;
  types?: Array<'task' | 'page' | 'memory'>;
  filters?: {
    dateRange?: { from: string; to: string; };
    authors?: string[];
    tags?: string[];
    priority?: string[];
    status?: string[];
    [key: string]: any;
  };
  limit?: number;
  offset?: number;
  includeRelated?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'task' | 'page' | 'memory';
  title: string;
  content: string;
  snippet: string;
  score: number; // Relevance score 0.0-1.0
  metadata: Record<string, any>;
  source: {
    serverId: string;
    serverType: string;
    url?: string;
  };
  relationships?: Array<{
    id: string;
    type: string;
    title: string;
    relationshipType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Search API Endpoint
POST /api/search
Content-Type: application/json

{
  "query": "project planning techniques",
  "types": ["task", "page", "memory"],
  "filters": {
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-12-31T23:59:59Z"
    },
    "tags": ["planning", "project-management"]
  },
  "limit": 20,
  "includeRelated": true
}
```

### Insights API

```typescript
export interface InsightRequest {
  types?: Array<'productivity' | 'knowledge_gaps' | 'relationships' | 'trends'>;
  timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  userId?: string;
}

export interface Insight {
  id: string;
  type: 'productivity' | 'knowledge_gaps' | 'relationships' | 'trends';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  data: {
    metrics?: Record<string, number>;
    trends?: Array<{
      date: string;
      value: number;
      label?: string;
    }>;
    recommendations?: string[];
    entities?: Array<{
      id: string;
      type: string;
      title: string;
    }>;
  };
  actionable: boolean;
  actions?: Array<{
    type: string;
    label: string;
    endpoint: string;
    method: string;
  }>;
  generatedAt: string;
  expiresAt?: string;
}

// Insights API Endpoints
GET    /api/insights                   // Get current insights
POST   /api/insights/generate          // Generate new insights
GET    /api/insights/{id}              // Get specific insight
POST   /api/insights/{id}/actions      // Execute insight action
```

## WebSocket API

🔗 **Client Integration**: [WebSocket Integration](WEB_CLIENT_ARCHITECTURE.md#websocket-integration)

### Connection & Authentication

```typescript
// WebSocket connection with JWT authentication
const ws = new WebSocket('ws://localhost:3000/ws', ['authorization', jwt_token]);

// Connection message format
interface WSMessage {
  type: string;
  payload: any;
  timestamp: string;
  requestId?: string; // For request/response patterns
}

// Subscribe to updates
{
  "type": "subscribe",
  "payload": {
    "channels": ["board:123", "page:456", "memory:789"],
    "events": ["created", "updated", "deleted"]
  }
}
```

### Real-time Events

```typescript
// Task events
interface TaskEvent {
  type: 'task.created' | 'task.updated' | 'task.deleted' | 'task.moved';
  payload: {
    task: Task;
    boardId: string;
    userId: string;
    previousState?: Partial<Task>; // For updates
  };
  timestamp: string;
}

// Page events  
interface PageEvent {
  type: 'page.created' | 'page.updated' | 'page.deleted';
  payload: {
    page: WikiPage;
    userId: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  };
  timestamp: string;
}

// Memory events
interface MemoryEvent {
  type: 'memory.created' | 'memory.updated' | 'memory.connected';
  payload: {
    memory: MemoryNode;
    userId: string;
    relationships?: Relationship[];
  };
  timestamp: string;
}

// System events
interface SystemEvent {
  type: 'insights.updated' | 'search.indexed' | 'sync.completed';
  payload: Record<string, any>;
  timestamp: string;
}
```

## Error Codes and Handling

```typescript
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Business Logic
  INVALID_OPERATION = 'INVALID_OPERATION',
  DEPENDENCY_NOT_MET = 'DEPENDENCY_NOT_MET',
}

// Standard error response format
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    path: string;
  };
}

// HTTP Status Code Mapping
const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,
  INVALID_INPUT: 400,
  MISSING_REQUIRED_FIELD: 400,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  INVALID_OPERATION: 400,
  DEPENDENCY_NOT_MET: 412,
};
```

This comprehensive API specification provides the foundation for implementing consistent, well-documented interfaces across all MCP servers and the integration layer.

## Next Steps

- 📋 **Server Implementation**: [MCP Server Details](MCP_SERVER_DETAILS.md)
- 🔗 **Backend Integration**: [Backend Integration Layer](BACKEND_INTEGRATION.md)
- 🦀 **Worker Processes**: [Rust Workers](RUST_WORKERS.md)
- ⚛️ **Frontend Usage**: [Web Client Architecture](WEB_CLIENT_ARCHITECTURE.md)
- 📊 **System Flows**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)