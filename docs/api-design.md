# MCP Tools REST API Design

## Overview

This document defines the RESTful API endpoints for the MCP Tools ecosystem, providing a unified HTTP interface to all MCP servers (Kanban, Memory, Wiki, Calendar, Monitoring).

## API Principles

- RESTful design following HTTP semantics
- JSON request/response bodies
- Consistent error handling
- Pagination for list endpoints
- Filtering and sorting support
- Standard HTTP status codes

## Base URL

```
https://api.mcp-tools.dev/v1
```

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

## Common Response Patterns

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-07-23T12:00:00Z",
    "requestId": "req_123"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameters are invalid",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-07-23T12:00:00Z",
    "requestId": "req_123"
  }
}
```

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Kanban API

### Boards

#### `GET /api/kanban/boards`
List all boards for the authenticated user.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `sort` (string, default: "created_at") - Sort field (name, created_at, updated_at)
- `order` (string, default: "desc") - Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "board_123",
      "name": "Project Alpha",
      "description": "Main project board",
      "color": "#6366f1",
      "created_at": "2025-07-23T12:00:00Z",
      "updated_at": "2025-07-23T12:00:00Z",
      "columns_count": 4,
      "cards_count": 12
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/kanban/boards`
Create a new board.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "color": "#6366f1"
}
```

**Response:** Board object (201 Created)

#### `GET /api/kanban/boards/:id`
Get a specific board with columns and cards.

**Query Parameters:**
- `include_archived` (boolean, default: false) - Include archived cards

**Response:**
```json
{
  "data": {
    "id": "board_123",
    "name": "Project Alpha",
    "description": "Main project board",
    "color": "#6366f1",
    "created_at": "2025-07-23T12:00:00Z",
    "updated_at": "2025-07-23T12:00:00Z",
    "columns": [
      {
        "id": "col_123",
        "name": "To Do",
        "color": "#64748b",
        "position": 0,
        "cards": [
          {
            "id": "card_123",
            "title": "Implement feature X",
            "description": "Detailed description",
            "priority": "high",
            "assigned_to": "user_123",
            "tags": ["frontend", "urgent"],
            "due_date": "2025-08-01T00:00:00Z",
            "created_at": "2025-07-23T12:00:00Z",
            "updated_at": "2025-07-23T12:00:00Z",
            "position": 0
          }
        ]
      }
    ]
  }
}
```

#### `PUT /api/kanban/boards/:id`
Update a board.

#### `DELETE /api/kanban/boards/:id`
Delete a board and all its columns/cards.

### Cards

#### `POST /api/kanban/cards`
Create a new card.

**Request Body:**
```json
{
  "board_id": "board_123",
  "column_id": "col_123",
  "title": "New task",
  "description": "Task description",
  "priority": "medium",
  "assigned_to": "user_123",
  "tags": ["backend"],
  "due_date": "2025-08-01T00:00:00Z",
  "position": 0
}
```

#### `PUT /api/kanban/cards/:id`
Update a card.

#### `PUT /api/kanban/cards/:id/move`
Move a card to a different column/position.

**Request Body:**
```json
{
  "column_id": "col_456",
  "position": 2
}
```

#### `DELETE /api/kanban/cards/:id`
Delete a card.

## Memory API

### Memories

#### `GET /api/memory/memories`
List memories with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `user_id` (string) - Filter by user
- `project_name` (string) - Filter by project
- `concepts` (string[]) - Filter by concepts
- `importance` (number) - Filter by importance level
- `created_after` (ISO date) - Filter by creation date
- `created_before` (ISO date) - Filter by creation date

**Response:**
```json
{
  "data": [
    {
      "id": "mem_123",
      "content": "Memory content",
      "content_hash": "sha256_hash",
      "context": {
        "source": "meeting",
        "timestamp": "2025-07-23T12:00:00Z",
        "participants": ["user_123", "user_456"],
        "tags": ["project-alpha", "planning"]
      },
      "concepts": [
        {
          "id": "concept_123",
          "name": "machine learning",
          "type": "topic",
          "confidence": 0.95
        }
      ],
      "importance": 4,
      "status": "active",
      "access_count": 5,
      "last_accessed_at": "2025-07-23T11:00:00Z",
      "created_at": "2025-07-23T10:00:00Z",
      "updated_at": "2025-07-23T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/memory/memories`
Store a new memory.

**Request Body:**
```json
{
  "content": "Meeting notes about the new feature implementation",
  "context": {
    "source": "meeting",
    "timestamp": "2025-07-23T12:00:00Z",
    "participants": ["user_123", "user_456"],
    "tags": ["project-alpha", "planning"],
    "userId": "user_123",
    "projectName": "Project Alpha"
  },
  "concepts": ["machine learning", "feature development"],
  "importance": 4
}
```

#### `GET /api/memory/memories/search`
Semantic search across memories.

**Query Parameters:**
- `q` (string, required) - Search query
- `limit` (number, default: 10, max: 50)
- `similarity_threshold` (number, default: 0.7) - Minimum similarity score
- `include_related` (boolean, default: false) - Include related memories
- `max_depth` (number, default: 2) - Maximum relationship depth
- `user_id` (string) - Filter by user
- `project_name` (string) - Filter by project

**Response:**
```json
{
  "data": {
    "memories": [...], // Array of memory objects
    "total": 25,
    "processing_time_ms": 150,
    "related_concepts": [
      {
        "name": "machine learning",
        "relevance": 0.95
      }
    ]
  }
}
```

#### `GET /api/memory/memories/:id/related`
Get memories related to a specific memory.

**Query Parameters:**
- `max_depth` (number, default: 2)
- `min_strength` (number, default: 0.5)
- `relationship_types` (string[]) - Filter by relationship types

#### `GET /api/memory/graph`
Get memory graph data for visualization.

**Query Parameters:**
- `user_id` (string) - Filter by user
- `project_name` (string) - Filter by project
- `concept` (string) - Focus on specific concept
- `depth` (number, default: 3) - Maximum graph depth

#### `POST /api/memory/connections`
Create an explicit connection between memories.

**Request Body:**
```json
{
  "source_id": "mem_123",
  "target_id": "mem_456",
  "relationship_type": "causal",
  "strength": 0.8,
  "metadata": {
    "description": "Feature A led to the need for Feature B"
  },
  "bidirectional": false
}
```

#### `GET /api/memory/stats`
Get memory statistics and insights.

**Query Parameters:**
- `user_id` (string) - Filter by user
- `project_name` (string) - Filter by project
- `date_range` (string) - Date range (7d, 30d, 90d, 1y)

## Wiki API

### Pages

#### `GET /api/wiki/pages`
List wiki pages.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `category_id` (string) - Filter by category
- `tags` (string[]) - Filter by tags
- `search` (string) - Full-text search
- `sort` (string, default: "updated_at") - Sort field

**Response:**
```json
{
  "data": [
    {
      "id": "page_123",
      "title": "API Documentation",
      "slug": "api-documentation",
      "summary": "Comprehensive API documentation for developers",
      "category": {
        "id": "cat_123",
        "name": "Documentation",
        "slug": "documentation"
      },
      "tags": [
        {
          "id": "tag_123",
          "name": "API",
          "color": "#3b82f6"
        }
      ],
      "author_id": "user_123",
      "published": true,
      "created_at": "2025-07-23T12:00:00Z",
      "updated_at": "2025-07-23T12:30:00Z",
      "version": 3
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/wiki/pages`
Create a new wiki page.

**Request Body:**
```json
{
  "title": "New Page",
  "content": "# New Page\n\nContent here...",
  "category_id": "cat_123",
  "tags": ["documentation", "guide"],
  "published": true
}
```

#### `GET /api/wiki/pages/:id`
Get a specific wiki page with full content.

#### `PUT /api/wiki/pages/:id`
Update a wiki page.

#### `DELETE /api/wiki/pages/:id`
Delete a wiki page.

#### `GET /api/wiki/pages/:id/history`
Get page version history.

## Calendar API

### Events

#### `GET /api/calendar/events`
List calendar events.

**Query Parameters:**
- `start` (ISO date, required) - Start date range
- `end` (ISO date, required) - End date range
- `type` (string) - Event type filter
- `status` (string) - Event status filter

#### `POST /api/calendar/events`
Create a calendar event.

#### `PUT /api/calendar/events/:id`
Update an event.

#### `DELETE /api/calendar/events/:id`
Delete an event.

#### `POST /api/calendar/time-blocks`
Create a time block for focused work.

**Request Body:**
```json
{
  "title": "Deep work - Feature implementation",
  "start_time": "2025-07-24T09:00:00Z",
  "end_time": "2025-07-24T12:00:00Z",
  "type": "focus_time",
  "related_card_id": "card_123"
}
```

## Monitoring API

### Monitors

#### `GET /api/monitoring/monitors`
List all monitors.

#### `POST /api/monitoring/monitors`
Create a new monitor.

**Request Body:**
```json
{
  "name": "Website Health Check",
  "url": "https://example.com",
  "type": "http",
  "interval": 300,
  "timeout": 30,
  "checks": {
    "status_code": 200,
    "response_time_max": 5000,
    "content_contains": "Welcome"
  },
  "notifications": {
    "email": ["admin@example.com"],
    "slack_webhook": "https://hooks.slack.com/..."
  }
}
```

#### `GET /api/monitoring/monitors/:id/changes`
Get change history for a monitor.

#### `GET /api/monitoring/monitors/:id/metrics`
Get performance metrics for a monitor.

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

- 1000 requests per hour per user for general endpoints
- 100 requests per hour for search endpoints
- 10 requests per minute for resource creation

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```