/**
 * Test client utilities for interacting with MCP Tools services
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { WebSocket } from 'ws';
import { MCPToolCall, MCPResourceRequest } from '@mcp-tools/core/shared';

export class TestAPIClient {
  public client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: `${baseURL}/api`,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on HTTP errors
    });
  }

  // Health checks
  async getHealth(): Promise<AxiosResponse> {
    return this.client.get('/health');
  }

  async getDetailedHealth(): Promise<AxiosResponse> {
    return this.client.get('/health/detailed');
  }

  // Kanban API
  async getKanbanBoards(): Promise<AxiosResponse> {
    return this.client.get('/kanban/boards');
  }

  async createKanbanBoard(board: any): Promise<AxiosResponse> {
    return this.client.post('/kanban/boards', board);
  }

  async getKanbanBoard(id: string): Promise<AxiosResponse> {
    return this.client.get(`/kanban/boards/${id}`);
  }

  // Memory API
  async getMemories(): Promise<AxiosResponse> {
    return this.client.get('/memory/memories');
  }

  async createMemory(memory: any): Promise<AxiosResponse> {
    return this.client.post('/memory/memories', memory);
  }

  async getMemory(id: string): Promise<AxiosResponse> {
    return this.client.get(`/memory/memories/${id}`);
  }

  // MCP Tool calls
  async callMCPTool(server: string, tool: MCPToolCall): Promise<AxiosResponse> {
    return this.client.post(`/mcp/${server}/tools/call`, tool);
  }

  async getMCPResource(server: string, resource: MCPResourceRequest): Promise<AxiosResponse> {
    return this.client.post(`/mcp/${server}/resources/read`, resource);
  }

  async listMCPTools(server: string): Promise<AxiosResponse> {
    return this.client.get(`/mcp/${server}/tools`);
  }
}

export class TestWebSocketClient {
  private ws: WebSocket | null = null;
  private baseURL: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(baseURL = 'ws://localhost:3001') {
    this.baseURL = baseURL;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseURL);
      
      this.ws.on('open', () => {
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
    });
  }

  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export class TestDataGenerator {
  static randomString(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`;
  }

  static randomKanbanBoard() {
    return {
      name: `Test Board ${this.randomString(6)}`,
      description: `Test board for integration testing - ${new Date().toISOString()}`,
      columns: [
        { name: 'To Do', position: 0 },
        { name: 'In Progress', position: 1 },
        { name: 'Done', position: 2 }
      ]
    };
  }

  static randomKanbanCard(boardId: string, columnId: string) {
    return {
      title: `Test Card ${this.randomString(6)}`,
      description: `Test card for integration testing - ${new Date().toISOString()}`,
      boardId,
      columnId,
      assignee: this.randomEmail(),
      priority: Math.floor(Math.random() * 5) + 1,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  static randomMemory() {
    return {
      content: `Test memory content - ${this.randomString(20)}`,
      type: 'note',
      tags: ['test', 'integration', this.randomString(5)],
      metadata: {
        source: 'integration-test',
        created: new Date().toISOString()
      }
    };
  }
}

export function createTestTimeout(description: string, timeoutMs: number = 10000) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Test timeout: ${description} took longer than ${timeoutMs}ms`));
    }, timeoutMs);
  });
}