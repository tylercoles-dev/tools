# React/Next.js Web Client Architecture

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [API Specifications](API_SPECIFICATIONS.md) | [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)

## Overview

The web client provides a unified interface for managing all MCP tools (Kanban, Wiki, Memory Graph) with real-time updates, cross-tool search, and intelligent insights. Built with Next.js 14 using the App Router, TypeScript, and modern React patterns.

## Project Structure

```
web-client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── kanban/        # Kanban pages
│   │   │   ├── wiki/          # Wiki pages  
│   │   │   ├── memory/        # Memory graph pages
│   │   │   └── insights/      # Cross-tool insights
│   │   ├── api/               # API routes
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── kanban/           # Kanban-specific components
│   │   ├── wiki/             # Wiki-specific components
│   │   ├── memory/           # Memory-specific components
│   │   └── shared/           # Cross-tool components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   ├── store/                # State management (Zustand)
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Helper functions
├── public/                   # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Core Architecture

### Application Layout

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { WebSocketProvider } from '@/components/providers/websocket-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { Navigation } from '@/components/layout/navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <WebSocketProvider>
              <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto py-6">
                  {children}
                </main>
              </div>
              <Toaster />
            </WebSocketProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### State Management with Zustand

🔗 **Backend APIs**: [API Specifications](API_SPECIFICATIONS.md#kanban-mcp-server-api)

```tsx
// src/store/kanban-store.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

interface KanbanState {
  boards: Board[];
  currentBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;
  addBoard: (board: Board) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  deleteBoard: (boardId: string) => void;
  
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  deleteTask: (taskId: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useKanbanStore = create<KanbanState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        boards: [],
        currentBoard: null,
        isLoading: false,
        error: null,
        
        setBoards: (boards) => set({ boards }),
        
        setCurrentBoard: (board) => set({ currentBoard: board }),
        
        addBoard: (board) => set((state) => {
          state.boards.push(board);
        }),
        
        updateBoard: (boardId, updates) => set((state) => {
          const boardIndex = state.boards.findIndex(b => b.id === boardId);
          if (boardIndex >= 0) {
            Object.assign(state.boards[boardIndex], updates);
          }
          if (state.currentBoard?.id === boardId) {
            Object.assign(state.currentBoard, updates);
          }
        }),
        
        deleteBoard: (boardId) => set((state) => {
          state.boards = state.boards.filter(b => b.id !== boardId);
          if (state.currentBoard?.id === boardId) {
            state.currentBoard = null;
          }
        }),
        
        addTask: (task) => set((state) => {
          const board = state.boards.find(b => b.id === task.boardId);
          if (board) {
            board.tasks.push(task);
          }
          if (state.currentBoard?.id === task.boardId) {
            state.currentBoard.tasks.push(task);
          }
        }),
        
        updateTask: (taskId, updates) => set((state) => {
          for (const board of state.boards) {
            const task = board.tasks.find(t => t.id === taskId);
            if (task) {
              Object.assign(task, updates);
              break;
            }
          }
          if (state.currentBoard) {
            const task = state.currentBoard.tasks.find(t => t.id === taskId);
            if (task) {
              Object.assign(task, updates);
            }
          }
        }),
        
        moveTask: (taskId, newStatus) => set((state) => {
          get().updateTask(taskId, { status: newStatus });
        }),
        
        deleteTask: (taskId) => set((state) => {
          for (const board of state.boards) {
            board.tasks = board.tasks.filter(t => t.id !== taskId);
          }
          if (state.currentBoard) {
            state.currentBoard.tasks = state.currentBoard.tasks.filter(t => t.id !== taskId);
          }
        }),
        
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
      }))
    ),
    { name: 'kanban-store' }
  )
);
```

### API Client Layer

🔌 **Full API Reference**: [API Specifications](API_SPECIFICATIONS.md)

```tsx
// src/lib/api-client.ts
import { toast } from 'sonner';

export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  // Kanban API methods
  async getBoards(): Promise<Board[]> {
    return this.request<Board[]>('/kanban/boards');
  }
  
  async getBoard(id: string): Promise<Board> {
    return this.request<Board>(`/kanban/boards/${id}`);
  }
  
  async createBoard(board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board> {
    return this.request<Board>('/kanban/boards', {
      method: 'POST',
      body: board,
    });
  }
  
  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    return this.request<Board>(`/kanban/boards/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  }
  
  async deleteBoard(id: string): Promise<void> {
    return this.request<void>(`/kanban/boards/${id}`, {
      method: 'DELETE',
    });
  }
  
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return this.request<Task>('/kanban/tasks', {
      method: 'POST',
      body: task,
    });
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/kanban/tasks/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  }
  
  // Wiki API methods
  async getPages(): Promise<WikiPage[]> {
    return this.request<WikiPage[]>('/wiki/pages');
  }
  
  async getPage(id: string): Promise<WikiPage> {
    return this.request<WikiPage>(`/wiki/pages/${id}`);
  }
  
  async createPage(page: Omit<WikiPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<WikiPage> {
    return this.request<WikiPage>('/wiki/pages', {
      method: 'POST',
      body: page,
    });
  }
  
  // Cross-tool search
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    
    return this.request<SearchResult[]>(`/search?${params.toString()}`);
  }
  
  // Insights
  async getInsights(): Promise<Insight[]> {
    return this.request<Insight[]>('/insights');
  }
}

export const apiClient = new ApiClient();
```

### Custom Hooks

```tsx
// src/hooks/use-kanban.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useKanbanStore } from '@/store/kanban-store';
import { toast } from 'sonner';

export const useBoards = () => {
  const setBoards = useKanbanStore(state => state.setBoards);
  const setLoading = useKanbanStore(state => state.setLoading);
  const setError = useKanbanStore(state => state.setError);
  
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      setLoading(true);
      try {
        const boards = await apiClient.getBoards();
        setBoards(boards);
        setError(null);
        return boards;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch boards';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useBoard = (id: string | null) => {
  const setCurrentBoard = useKanbanStore(state => state.setCurrentBoard);
  
  return useQuery({
    queryKey: ['boards', id],
    queryFn: async () => {
      if (!id) return null;
      const board = await apiClient.getBoard(id);
      setCurrentBoard(board);
      return board;
    },
    enabled: !!id,
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  const addBoard = useKanbanStore(state => state.addBoard);
  
  return useMutation({
    mutationFn: apiClient.createBoard,
    onSuccess: (board) => {
      addBoard(board);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create board');
      console.error('Create board error:', error);
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const addTask = useKanbanStore(state => state.addTask);
  
  return useMutation({
    mutationFn: apiClient.createTask,
    onSuccess: (task) => {
      addTask(task);
      queryClient.invalidateQueries({ queryKey: ['boards', task.boardId] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task');
      console.error('Create task error:', error);
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const updateTask = useKanbanStore(state => state.updateTask);
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      apiClient.updateTask(id, updates),
    onSuccess: (task) => {
      updateTask(task.id, task);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      toast.error('Failed to update task');
      console.error('Update task error:', error);
    },
  });
};
```

### WebSocket Integration

📊 **Real-time Flows**: [Real-Time Collaboration Flow](DATA_FLOW_DIAGRAMS.md#5-real-time-collaboration-flow)

```tsx
// src/hooks/use-websocket.ts
import { useEffect, useRef } from 'react';
import { useKanbanStore } from '@/store/kanban-store';
import { useWikiStore } from '@/store/wiki-store';
import { useMemoryStore } from '@/store/memory-store';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export const useWebSocket = (url: string = 'ws://localhost:3000/ws') => {
  const wsRef = useRef<WebSocket | null>(null);
  
  const updateTask = useKanbanStore(state => state.updateTask);
  const addTask = useKanbanStore(state => state.addTask);
  const deleteTask = useKanbanStore(state => state.deleteTask);
  
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    const handleMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'task.created':
          addTask(message.data);
          break;
        case 'task.updated':
          updateTask(message.data.id, message.data);
          break;
        case 'task.deleted':
          deleteTask(message.data.id);
          break;
        // Handle other message types...
        default:
          console.log('Unhandled message type:', message.type);
      }
    };
    
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, updateTask, addTask, deleteTask]);
  
  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }));
    }
  };
  
  return { sendMessage };
};
```

### Component Examples

#### Kanban Board Component

```tsx
// src/components/kanban/board-view.tsx
'use client';

import { useBoard } from '@/hooks/use-kanban';
import { TaskColumn } from './task-column';
import { BoardHeader } from './board-header';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useUpdateTask } from '@/hooks/use-kanban';

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { data: board, isLoading } = useBoard(boardId);
  const updateTask = useUpdateTask();
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading board...</div>;
  }
  
  if (!board) {
    return <div className="flex justify-center p-8">Board not found</div>;
  }
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as Task['status'];
    
    updateTask.mutate({
      id: taskId,
      updates: { status: newStatus },
    });
  };
  
  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' as const },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' as const },
    { id: 'done', title: 'Done', status: 'done' as const },
  ];
  
  return (
    <div className="h-full">
      <BoardHeader board={board} />
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={board.tasks.filter(task => task.status === column.status)}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
```

#### Cross-Tool Search Component

🔍 **Search API**: [Universal Search API](API_SPECIFICATIONS.md#universal-search-api)

```tsx
// src/components/shared/global-search.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, FileText, CheckSquare, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/api-client';

interface SearchResult {
  id: string;
  type: 'task' | 'page' | 'memory';
  title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);
  
  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const searchResults = await apiClient.search(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      case 'page':
        return <FileText className="w-4 h-4" />;
      case 'memory':
        return <Brain className="w-4 h-4" />;
    }
  };
  
  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-100 text-blue-800';
      case 'page':
        return 'bg-green-100 text-green-800';
      case 'memory':
        return 'bg-purple-100 text-purple-800';
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        className="relative w-64 justify-start"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4 mr-2" />
        Search everything...
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded">
          ⌘K
        </kbd>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          
          <Input
            placeholder="Search tasks, pages, memories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-4"
            autoFocus
          />
          
          {isLoading && (
            <div className="text-center py-4">Searching...</div>
          )}
          
          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => {
                    // Navigate to result
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(result.type)}
                    <span className="font-medium">{result.title}</span>
                    <Badge className={getTypeColor(result.type)}>
                      {result.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {query.length > 2 && results.length === 0 && !isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              No results found
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

This React/Next.js architecture provides a scalable, modern web client with proper state management, real-time updates, and excellent user experience for managing all MCP tools in one unified interface.

## Next Steps

- 🔌 **API Integration**: [API Specifications](API_SPECIFICATIONS.md)
- 📊 **Data Flow Understanding**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)
- 📋 **Backend Services**: [MCP Server Details](MCP_SERVER_DETAILS.md)
- 🦀 **Background Processing**: [Rust Workers](RUST_WORKERS.md)