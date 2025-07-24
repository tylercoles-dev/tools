# REST API Quick Start Guide

This guide helps you quickly get started with the REST API implementation for MCP Tools.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Basic knowledge of Express.js and React Query
- Access to MCP servers (kanban, memory, etc.)

## Step 1: Set Up API Gateway

### Initialize the Express Project

```bash
mkdir api-gateway
cd api-gateway
npm init -y
```

### Install Dependencies

```bash
npm install express cors helmet dotenv express-rate-limit
npm install -D typescript @types/express @types/cors @types/node nodemon ts-node
```

### Create Basic Server

```typescript
// src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Add Scripts

```json
// package.json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

## Step 2: Create First API Route

### Kanban Board Routes Example

```typescript
// src/routes/kanban.routes.ts
import { Router } from 'express'
import { getMCPClient } from '../services/mcp-client'

const router = Router()

// Get all boards
router.get('/boards', async (req, res) => {
  try {
    const client = getMCPClient('kanban')
    const result = await client.callTool('list_boards', {})
    res.json({
      status: 'success',
      data: result.boards
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Create a board
router.post('/boards', async (req, res) => {
  try {
    const { name, description } = req.body
    const client = getMCPClient('kanban')
    const result = await client.callTool('create_board', {
      name,
      description
    })
    res.status(201).json({
      status: 'success',
      data: result.board
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

export default router
```

### Register Routes

```typescript
// src/app.ts (add this)
import kanbanRoutes from './routes/kanban.routes'

app.use('/api/v1', kanbanRoutes)
```

## Step 3: Frontend Setup with React Query

### Install React Query

```bash
cd ../mcp_tools_ux
npm install @tanstack/react-query axios
```

### Set Up Query Client

```typescript
// app/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Create API Client

```typescript
// lib/api-client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
```

### Create First Hook

```typescript
// hooks/use-kanban.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await apiClient.get('/boards')
      return response.data.data
    },
  })
}

export function useCreateBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiClient.post('/boards', data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })
}
```

### Use in Component

```typescript
// components/kanban/board-list.tsx
'use client'

import { useBoards, useCreateBoard } from '@/hooks/use-kanban'

export function BoardList() {
  const { data: boards, isLoading, error } = useBoards()
  const createBoard = useCreateBoard()

  if (isLoading) return <div>Loading boards...</div>
  if (error) return <div>Error loading boards</div>

  return (
    <div>
      <button
        onClick={() => {
          createBoard.mutate({
            name: 'New Board',
            description: 'Created via REST API'
          })
        }}
      >
        Create Board
      </button>
      
      <div className="grid gap-4">
        {boards?.map((board) => (
          <div key={board.id} className="p-4 border rounded">
            <h3>{board.name}</h3>
            <p>{board.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Step 4: Add Real-time Updates

### Server Socket.io Setup

```bash
npm install socket.io
```

```typescript
// src/socket.ts
import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join:board', (boardId) => {
      socket.join(`board:${boardId}`)
      console.log(`Socket ${socket.id} joined board:${boardId}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

// Helper to emit events
export function emitToBoard(io: Server, boardId: string, event: string, data: any) {
  io.to(`board:${boardId}`).emit(event, data)
}
```

### Client Socket Hook

```bash
npm install socket.io-client
```

```typescript
// hooks/use-socket.ts
'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

export function useSocket(boardId?: string) {
  const socket = useRef<Socket>()
  const queryClient = useQueryClient()

  useEffect(() => {
    socket.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')

    if (boardId) {
      socket.current.emit('join:board', boardId)
    }

    // Listen for board updates
    socket.current.on('board:updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['boards', data.boardId] })
    })

    return () => {
      if (boardId) {
        socket.current?.emit('leave:board', boardId)
      }
      socket.current?.disconnect()
    }
  }, [boardId, queryClient])

  return socket.current
}
```

## Next Steps

1. **Expand API Routes**: Add remaining endpoints for all services
2. **Add Validation**: Use Joi or express-validator for request validation
3. **Implement Auth**: Add JWT authentication middleware
4. **Add Tests**: Write unit and integration tests
5. **Documentation**: Set up Swagger/OpenAPI documentation
6. **Error Handling**: Create consistent error response format
7. **Logging**: Add Winston for structured logging
8. **Monitoring**: Set up health checks and metrics

## Common Patterns

### Pagination

```typescript
// API endpoint
router.get('/memories', async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  
  const result = await mcpClient.callTool('list_memories', {
    limit,
    offset
  })
  
  res.json({
    data: result.memories,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit)
    }
  })
})

// React Query hook
export function useMemories(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['memories', { page, limit }],
    queryFn: async () => {
      const response = await apiClient.get('/memories', {
        params: { page, limit }
      })
      return response.data
    },
    keepPreviousData: true, // For smooth pagination
  })
}
```

### Error Handling

```typescript
// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// In React Query
const { data, error } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Something went wrong')
  }
})
```

This guide should get you started quickly. For more detailed information, see the full [REST API Roadmap](./REST_API_ROADMAP.md).