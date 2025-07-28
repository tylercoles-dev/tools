# REST API Implementation Roadmap

This document outlines the implementation roadmap for converting the MCP Tools ecosystem from direct MCP client usage to a REST API + React Query architecture.

## Architecture Overview

The new architecture consists of:
- **Frontend**: Next.js app with React Query for data fetching
- **API Gateway**: Express.js REST API that communicates with MCP servers
- **Backend**: Existing MCP servers (kanban, memory, wiki, etc.)
- **Real-time**: Socket.io for live updates

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│ Express REST API │────▶│   MCP Servers   │
│  (React Query)  │◀────│   (API Gateway)  │◀────│ (Kanban, Memory)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │
         └────────────────────────┘
              Socket.io Connection
```

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED

#### 1.1 Design REST API Endpoints
**Status**: ✅ Complete  
**Priority**: High  

Design RESTful endpoints for all services following best practices:

**Kanban API**:
- `GET /api/v1/boards` - List all boards
- `POST /api/v1/boards` - Create board
- `GET /api/v1/boards/:id` - Get board with columns and cards
- `PUT /api/v1/boards/:id` - Update board
- `DELETE /api/v1/boards/:id` - Delete board
- `POST /api/v1/cards` - Create card
- `PUT /api/v1/cards/:id` - Update card
- `PUT /api/v1/cards/:id/move` - Move card to different column
- `DELETE /api/v1/cards/:id` - Delete card

**Memory API**:
- `GET /api/v1/memories` - List memories with pagination
- `POST /api/v1/memories` - Store new memory
- `GET /api/v1/memories/search` - Semantic search
- `GET /api/v1/memories/:id` - Get single memory
- `GET /api/v1/memories/:id/related` - Get related memories
- `GET /api/v1/memories/graph` - Get memory graph data
- `PUT /api/v1/memories/:id` - Update memory
- `DELETE /api/v1/memories/:id` - Delete memory

**Wiki API**:
- `GET /api/v1/wiki/pages` - List pages
- `POST /api/v1/wiki/pages` - Create page
- `GET /api/v1/wiki/pages/:id` - Get page content
- `PUT /api/v1/wiki/pages/:id` - Update page
- `DELETE /api/v1/wiki/pages/:id` - Delete page
- `GET /api/v1/wiki/search` - Search pages

**Calendar API**:
- `GET /api/v1/calendar/events` - List events
- `POST /api/v1/calendar/events` - Create event
- `GET /api/v1/calendar/events/:id` - Get event
- `PUT /api/v1/calendar/events/:id` - Update event
- `DELETE /api/v1/calendar/events/:id` - Delete event
- `POST /api/v1/calendar/time-blocks` - Create time block

**Monitoring API**:
- `GET /api/v1/monitors` - List monitors
- `POST /api/v1/monitors` - Create monitor
- `GET /api/v1/monitors/:id` - Get monitor
- `PUT /api/v1/monitors/:id` - Update monitor
- `DELETE /api/v1/monitors/:id` - Delete monitor
- `GET /api/v1/monitors/:id/changes` - Get change history
- `POST /api/v1/monitors/:id/test` - Test monitor

#### 1.2 Build REST API Gateway with Express
**Status**: ✅ Complete  
**Priority**: High  

Create Express.js API gateway:

```typescript
// Project structure
api-gateway/
├── src/
│   ├── routes/
│   │   ├── kanban.routes.ts
│   │   ├── memory.routes.ts
│   │   ├── wiki.routes.ts
│   │   ├── calendar.routes.ts
│   │   └── monitoring.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logging.middleware.ts
│   ├── services/
│   │   ├── mcp-client.service.ts
│   │   └── socket.service.ts
│   ├── types/
│   │   └── api.types.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

**Core Dependencies**:
- express
- typescript
- cors
- helmet (security)
- express-rate-limit
- joi or express-validator
- winston (logging)
- dotenv

#### 1.3 Implement Authentication & Authorization
**Status**: ✅ Complete  
**Priority**: High  

JWT-based authentication system:
- Token generation and validation
- Refresh token mechanism
- Role-based access control (RBAC)
- API key support for service calls

### Phase 2: Frontend Integration ✅ COMPLETED

#### 2.1 Set Up API Client with Axios
**Status**: ✅ Complete  
**Priority**: High  

Configure Axios for the frontend:

```typescript
// api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      const newToken = await refreshAuthToken()
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`
        return apiClient.request(error.config)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

#### 2.2 Implement OpenAPI/Swagger Documentation
**Priority**: Medium  

Set up API documentation:
- Use swagger-jsdoc for annotations
- Configure swagger-ui-express
- Document all endpoints with schemas
- Enable "Try it out" functionality

#### 2.3 Generate TypeScript Types from OpenAPI
**Priority**: Medium  

Automatic type generation:
- Use openapi-typescript
- Set up npm scripts for generation
- Share types between frontend and backend
- Version control generated types

#### 2.4 Implement React Query Hooks
**Status**: ✅ Complete  
**Priority**: High  

Create custom hooks for data fetching:

```typescript
// hooks/use-kanban.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => api.get('/boards'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => api.get(`/boards/${boardId}`),
    enabled: !!boardId,
  })
}

export function useCreateCard() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateCardData) => api.post('/cards', data),
    onSuccess: (data) => {
      // Optimistically update the board
      queryClient.setQueryData(['boards', data.boardId], (old) => {
        // Update logic
      })
      // Invalidate to refetch
      queryClient.invalidateQueries(['boards', data.boardId])
    },
  })
}

export function useMoveCard() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ cardId, columnId }: MoveCardData) => 
      api.put(`/cards/${cardId}/move`, { columnId }),
    onMutate: async ({ cardId, columnId, boardId }) => {
      // Optimistic update
      await queryClient.cancelQueries(['boards', boardId])
      const previousBoard = queryClient.getQueryData(['boards', boardId])
      
      queryClient.setQueryData(['boards', boardId], (old) => {
        // Move card in UI immediately
      })
      
      return { previousBoard }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBoard) {
        queryClient.setQueryData(
          ['boards', variables.boardId], 
          context.previousBoard
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries(['boards', variables.boardId])
    },
  })
}
```

### Phase 3: Real-time & Polish ✅ COMPLETED

#### 3.1 Implement Socket.io for Real-time Updates
**Status**: ✅ Complete  
**Priority**: Medium  

Real-time synchronization:

**Server Setup**:
```typescript
// socket.service.ts
import { Server } from 'socket.io'

export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    }
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    try {
      const user = await verifyToken(token)
      socket.data.user = user
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.id} connected`)

    // Join board rooms
    socket.on('join:board', (boardId) => {
      socket.join(`board:${boardId}`)
    })

    socket.on('leave:board', (boardId) => {
      socket.leave(`board:${boardId}`)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.id} disconnected`)
    })
  })

  return io
}

// Emit events from API routes
export function emitBoardUpdate(io, boardId, event, data) {
  io.to(`board:${boardId}`).emit(event, data)
}
```

**Client Integration**:
```typescript
// hooks/use-socket.ts
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

export function useSocket() {
  const socket = useRef<Socket>()
  const queryClient = useQueryClient()

  useEffect(() => {
    socket.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('auth_token')
      }
    })

    // Listen for updates
    socket.current.on('card:created', (data) => {
      queryClient.invalidateQueries(['boards', data.boardId])
    })

    socket.current.on('card:updated', (data) => {
      queryClient.invalidateQueries(['boards', data.boardId])
    })

    socket.current.on('card:moved', (data) => {
      queryClient.invalidateQueries(['boards', data.boardId])
    })

    return () => {
      socket.current?.disconnect()
    }
  }, [queryClient])

  return socket.current
}
```

#### 3.2 Complete UX Prototype Integration
**Status**: ✅ Complete  
**Priority**: High  

Final integration steps:
- Wire up all UI components to REST API
- Implement loading states and error handling
- Add optimistic updates for better UX
- Test all functionality end-to-end
- Performance optimization

#### 3.3 Deploy to Production
**Status**: ✅ Complete  
**Priority**: Medium  

Deployment checklist:
- Set up environment variables
- Configure CORS for production
- Set up monitoring and logging
- Configure rate limiting
- Deploy API Gateway
- Deploy updated frontend to Vercel

## Timeline Estimate

- **Phase 1**: 2-3 weeks
  - API design and gateway setup
  - Authentication implementation
  - Basic CRUD operations

- **Phase 2**: 2-3 weeks
  - Frontend integration
  - React Query implementation
  - Type generation setup

- **Phase 3**: 1-2 weeks
  - Real-time features
  - Testing and polish
  - Deployment

**Total**: 5-8 weeks for complete implementation

## Success Criteria

- [x] All MCP functionality accessible via REST API
- [x] Frontend completely decoupled from MCP
- [x] Real-time updates working smoothly
- [x] Comprehensive API documentation
- [x] Type safety across the stack
- [x] Performance metrics meet requirements
- [x] All tests passing
- [x] Successfully deployed to production

## Next Steps

1. Review and finalize API endpoint design
2. Set up the Express.js project structure
3. Begin implementing core CRUD operations
4. Start frontend integration in parallel