/**
 * Kanban WebSocket Server
 * 
 * Provides real-time updates for kanban board changes
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: 'board_updated' | 'card_moved' | 'card_created' | 'card_updated' | 'card_deleted' | 
        'column_created' | 'column_updated' | 'column_deleted' | 'comment_added' | 'tag_added';
  boardId: number;
  data: any;
  timestamp: string;
}

export class KanbanWebSocketServer extends EventEmitter {
  private server: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number, kanbanService?: any) {
    super();
    this.port = port;
    
    // Initialize WebSocket server
    this.server = new WebSocketServer({ 
      port: this.port,
      host: '0.0.0.0' // Allow external connections in Docker
    });
    
    this.setupServer();
    console.log(`📡 WebSocket server listening on port ${this.port}`);
  }

  private setupServer(): void {
    this.server.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Kanban WebSocket server',
        timestamp: new Date().toISOString()
      }));

      // Handle client disconnection
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket client error:', error);
        this.clients.delete(ws);
      });

      // Handle incoming messages (for future features)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received WebSocket message:', message);
          // Handle ping/pong or other client messages
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });
    });

    this.server.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    
    // Remove any closed connections
    const closedClients: WebSocket[] = [];
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          console.error('❌ Error sending WebSocket message:', error);
          closedClients.push(client);
        }
      } else {
        closedClients.push(client);
      }
    });

    // Clean up closed connections
    closedClients.forEach(client => this.clients.delete(client));
    
    if (this.clients.size > 0) {
      console.log(`📡 Broadcasted message to ${this.clients.size} clients:`, message.type);
    }
  }

  /**
   * Broadcast board update
   */
  broadcastBoardUpdate(boardId: number, data: any): void {
    this.broadcast({
      type: 'board_updated',
      boardId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast card moved event
   */
  broadcastCardMoved(boardId: number, cardData: any): void {
    this.broadcast({
      type: 'card_moved',
      boardId,
      data: cardData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast card created event
   */
  broadcastCardCreated(boardId: number, cardData: any): void {
    this.broadcast({
      type: 'card_created',
      boardId,
      data: cardData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast card updated event
   */
  broadcastCardUpdated(boardId: number, cardData: any): void {
    this.broadcast({
      type: 'card_updated',
      boardId,
      data: cardData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast card deleted event
   */
  broadcastCardDeleted(boardId: number, cardId: number): void {
    this.broadcast({
      type: 'card_deleted',
      boardId,
      data: { cardId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast comment added event
   */
  broadcastCommentAdded(boardId: number, commentData: any): void {
    this.broadcast({
      type: 'comment_added',
      boardId,
      data: commentData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Close all client connections
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });
    
    this.clients.clear();
    
    // Close the server
    this.server.close(() => {
      console.log('✅ WebSocket server closed');
    });
  }
}