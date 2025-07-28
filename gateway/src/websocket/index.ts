/**
 * WebSocket Setup
 * 
 * Configures Socket.io for real-time updates across the application.
 */

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { KanbanService } from '@mcp-tools/core/kanban';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { setupAnalyticsWebSocket } from './analytics.websocket.js';

interface AuthenticatedSocket {
  id: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  disconnect: () => void;
}

export function setupWebSocket(io: SocketIOServer, kanbanService: KanbanService, analyticsService?: AnalyticsService): void {
  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        // Allow anonymous connections in development
        if (process.env.NODE_ENV === 'development') {
          socket.user = {
            id: 'dev-user-123',
            email: 'developer@mcp-tools.dev',
            name: 'Development User'
          };
          return next();
        }
        
        return next(new Error('Authentication required'));
      }
      
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      socket.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        name: decoded.name
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.id || 'anonymous'} (${socket.id})`);
    
    // Join user-specific room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }
    
    // Board-related events
    socket.on('join:board', (boardId: string) => {
      console.log(`User ${socket.user?.id} joined board: ${boardId}`);
      socket.join(`board:${boardId}`);
      
      // Emit to other users in the board
      socket.to(`board:${boardId}`).emit('user:joined', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        boardId
      });
    });
    
    socket.on('leave:board', (boardId: string) => {
      console.log(`User ${socket.user?.id} left board: ${boardId}`);
      socket.leave(`board:${boardId}`);
      
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        boardId
      });
    });
    
    // Card movement events
    socket.on('card:move', (data: {
      cardId: string;
      boardId: string;
      fromColumnId: string;
      toColumnId: string;
      position: number;
    }) => {
      console.log(`Card moved by ${socket.user?.id}:`, data);
      
      // Broadcast to all users in the board except sender
      socket.to(`board:${data.boardId}`).emit('card:moved', {
        ...data,
        movedBy: {
          id: socket.user?.id,
          name: socket.user?.name
        },
        timestamp: new Date().toISOString()
      });
    });
    
    // Card update events
    socket.on('card:update', (data: {
      cardId: string;
      boardId: string;
      changes: any;
    }) => {
      console.log(`Card updated by ${socket.user?.id}:`, data);
      
      socket.to(`board:${data.boardId}`).emit('card:updated', {
        ...data,
        updatedBy: {
          id: socket.user?.id,
          name: socket.user?.name
        },
        timestamp: new Date().toISOString()
      });
    });
    
    // Memory-related events
    socket.on('join:memory', () => {
      socket.join('memory:global');
      console.log(`User ${socket.user?.id} joined memory updates`);
    });
    
    socket.on('leave:memory', () => {
      socket.leave('memory:global');
      console.log(`User ${socket.user?.id} left memory updates`);
    });
    
    // Wiki-related events
    socket.on('join:wiki', () => {
      socket.join('wiki:global');
      console.log(`User ${socket.user?.id} joined wiki updates`);
    });
    
    socket.on('wiki:editing', (data: { pageId: string; section?: string }) => {
      socket.to('wiki:global').emit('wiki:user_editing', {
        pageId: data.pageId,
        section: data.section,
        user: {
          id: socket.user?.id,
          name: socket.user?.name
        },
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('wiki:stop_editing', (data: { pageId: string }) => {
      socket.to('wiki:global').emit('wiki:user_stopped_editing', {
        pageId: data.pageId,
        user: {
          id: socket.user?.id,
          name: socket.user?.name
        },
        timestamp: new Date().toISOString()
      });
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.id || 'anonymous'} (${socket.id})`);
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user?.id}:`, error);
    });
  });
  
  // Broadcast system-wide updates
  const broadcastUpdate = (event: string, data: any, room?: string) => {
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  };
  
  // Set up analytics WebSocket if service is provided
  if (analyticsService) {
    setupAnalyticsWebSocket(io, analyticsService);
  }
  
  // Example: Memory updates could be broadcast here
  // This would be called from the API routes when memories are created/updated
  
  console.log('✅ WebSocket server configured');
}

// Helper function to broadcast events from API routes
export function broadcastToRoom(io: SocketIOServer, room: string, event: string, data: any): void {
  io.to(room).emit(event, data);
}

export function broadcastToUser(io: SocketIOServer, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}