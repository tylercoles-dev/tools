/**
 * WebSocket testing utilities and mocks for real-time collaboration tests
 */

import { Page, BrowserContext } from '@playwright/test';

export interface MockWebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id: string;
  userId?: string;
  boardId?: string;
  pageId?: string;
}

export interface MockWebSocketOptions {
  url?: string;
  delayMs?: number;
  failureRate?: number;
  messageHistory?: boolean;
  maxHistorySize?: number;
}

export class MockWebSocketServer {
  private connections: Map<string, MockWebSocketConnection> = new Map();
  private messageHistory: MockWebSocketMessage[] = [];
  private options: Required<MockWebSocketOptions>;
  private isStarted = false;

  constructor(options: MockWebSocketOptions = {}) {
    this.options = {
      url: options.url || 'ws://localhost:3001/ws',
      delayMs: options.delayMs || 100,
      failureRate: options.failureRate || 0,
      messageHistory: options.messageHistory || true,
      maxHistorySize: options.maxHistorySize || 1000,
    };
  }

  async start() {
    if (this.isStarted) return;
    this.isStarted = true;
    console.log(`Mock WebSocket server started on ${this.options.url}`);
  }

  async stop() {
    if (!this.isStarted) return;
    
    // Close all connections
    for (const connection of this.connections.values()) {
      await connection.close();
    }
    
    this.connections.clear();
    this.messageHistory = [];
    this.isStarted = false;
    console.log('Mock WebSocket server stopped');
  }

  async addConnection(connectionId: string, page: Page): Promise<MockWebSocketConnection> {
    if (!this.isStarted) {
      throw new Error('Mock WebSocket server is not started');
    }

    const connection = new MockWebSocketConnection(connectionId, page, this.options);
    this.connections.set(connectionId, connection);
    
    // Set up message forwarding
    connection.onMessage((message) => {
      this.addToHistory(message);
      this.broadcastMessage(message, connectionId);
    });

    await connection.initialize();
    return connection;
  }

  private addToHistory(message: MockWebSocketMessage) {
    if (!this.options.messageHistory) return;
    
    this.messageHistory.push(message);
    
    // Trim history if it exceeds max size
    if (this.messageHistory.length > this.options.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.options.maxHistorySize);
    }
  }

  private async broadcastMessage(message: MockWebSocketMessage, excludeConnectionId?: string) {
    // Simulate network delay
    if (this.options.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
    }

    // Simulate message failure
    if (this.options.failureRate > 0 && Math.random() < this.options.failureRate) {
      console.log('Simulated message failure:', message.id);
      return;
    }

    const promises = Array.from(this.connections.entries())
      .filter(([id]) => id !== excludeConnectionId)
      .map(async ([_, connection]) => {
        try {
          await connection.receiveMessage(message);
        } catch (error) {
          console.error(`Failed to deliver message to connection ${connection.id}:`, error);
        }
      });

    await Promise.all(promises);
  }

  async sendMessageToConnection(connectionId: string, message: MockWebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      await connection.receiveMessage(message);
    }
  }

  async sendMessageToAll(message: MockWebSocketMessage) {
    await this.broadcastMessage(message);
  }

  getMessageHistory(): MockWebSocketMessage[] {
    return [...this.messageHistory];
  }

  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

export class MockWebSocketConnection {
  private messageHandlers: ((message: MockWebSocketMessage) => void)[] = [];
  private isConnected = false;

  constructor(
    public readonly id: string,
    private page: Page,
    private options: Required<MockWebSocketOptions>
  ) {}

  async initialize() {
    // Inject WebSocket mock into the page
    await this.page.addInitScript(() => {
      // Store original WebSocket
      const OriginalWebSocket = window.WebSocket;
      
      // Create mock WebSocket class
      class MockWebSocket extends EventTarget {
        public readyState: number = WebSocket.CONNECTING;
        public url: string;
        public protocol: string = '';
        public extensions: string = '';
        public binaryType: BinaryType = 'blob';
        public bufferedAmount: number = 0;
        
        public onopen: ((event: Event) => void) | null = null;
        public onclose: ((event: CloseEvent) => void) | null = null;
        public onerror: ((event: Event) => void) | null = null;
        public onmessage: ((event: MessageEvent) => void) | null = null;

        private mockId = Math.random().toString(36).substring(2, 9);

        constructor(url: string, protocols?: string | string[]) {
          super();
          this.url = url;
          
          // Simulate connection establishment
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            const openEvent = new Event('open');
            this.dispatchEvent(openEvent);
            this.onopen?.(openEvent);
            
            // Store this connection globally for test access
            (window as any).mockWebSocketConnection = this;
          }, 100);
        }

        send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
          if (this.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open');
          }

          try {
            const message = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Emit message to test framework
            const customEvent = new CustomEvent('mock-websocket-send', {
              detail: { message, connectionId: this.mockId }
            });
            window.dispatchEvent(customEvent);
          } catch (error) {
            console.error('Failed to send WebSocket message:', error);
          }
        }

        close(code?: number, reason?: string) {
          if (this.readyState === WebSocket.CLOSED) return;
          
          this.readyState = WebSocket.CLOSED;
          const closeEvent = new CloseEvent('close', { 
            code: code || 1000, 
            reason: reason || '',
            wasClean: true 
          });
          
          this.dispatchEvent(closeEvent);
          this.onclose?.(closeEvent);
        }

        // Method to receive messages from mock server
        mockReceiveMessage(data: any) {
          if (this.readyState !== WebSocket.OPEN) return;
          
          const messageEvent = new MessageEvent('message', { data: JSON.stringify(data) });
          this.dispatchEvent(messageEvent);
          this.onmessage?.(messageEvent);
        }
      }

      // Replace WebSocket with mock
      (window as any).WebSocket = MockWebSocket;
      (MockWebSocket as any).CONNECTING = 0;
      (MockWebSocket as any).OPEN = 1;
      (MockWebSocket as any).CLOSING = 2;
      (MockWebSocket as any).CLOSED = 3;
    });

    // Set up message handling
    await this.page.evaluateOnNewDocument(() => {
      window.addEventListener('mock-websocket-send', (event: any) => {
        const { message, connectionId } = event.detail;
        
        // Store for test access
        if (!(window as any).mockWebSocketMessages) {
          (window as any).mockWebSocketMessages = [];
        }
        (window as any).mockWebSocketMessages.push({
          ...message,
          connectionId,
          timestamp: new Date().toISOString()
        });
      });
    });

    this.isConnected = true;
  }

  onMessage(handler: (message: MockWebSocketMessage) => void) {
    this.messageHandlers.push(handler);
  }

  async sendMessage(message: MockWebSocketMessage) {
    if (!this.isConnected) {
      throw new Error('WebSocket connection is not initialized');
    }

    // Trigger message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  async receiveMessage(message: MockWebSocketMessage) {
    if (!this.isConnected) return;

    // Inject message into the page's WebSocket
    await this.page.evaluate((msg) => {
      const wsConnection = (window as any).mockWebSocketConnection;
      if (wsConnection && wsConnection.mockReceiveMessage) {
        wsConnection.mockReceiveMessage(msg);
      }
    }, message);
  }

  async getMessageHistory(): Promise<MockWebSocketMessage[]> {
    return await this.page.evaluate(() => {
      return (window as any).mockWebSocketMessages || [];
    });
  }

  async close() {
    if (!this.isConnected) return;

    await this.page.evaluate(() => {
      const wsConnection = (window as any).mockWebSocketConnection;
      if (wsConnection && wsConnection.close) {
        wsConnection.close();
      }
    });

    this.isConnected = false;
    this.messageHandlers = [];
  }
}

export class MultiUserSimulator {
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private websocketServer: MockWebSocketServer;
  private connections: MockWebSocketConnection[] = [];

  constructor(private userCount: number = 2, private serverOptions?: MockWebSocketOptions) {
    this.websocketServer = new MockWebSocketServer(serverOptions);
  }

  async initialize(baseContext: BrowserContext) {
    await this.websocketServer.start();

    // Create browser contexts for each simulated user
    for (let i = 0; i < this.userCount; i++) {
      const context = await baseContext.browser()?.newContext({
        // Each user gets a unique viewport to simulate different devices
        viewport: {
          width: 1280 + (i * 100), 
          height: 720 + (i * 50)
        }
      });
      
      if (context) {
        this.contexts.push(context);
        
        const page = await context.newPage();
        this.pages.push(page);

        // Set up authentication for each user
        await context.storageState({ path: 'tests/fixtures/auth.json' });
        
        // Create WebSocket connection for this user
        const connection = await this.websocketServer.addConnection(`user-${i}`, page);
        this.connections.push(connection);
      }
    }
  }

  async navigateAllUsers(url: string) {
    const promises = this.pages.map(page => page.goto(url));
    await Promise.all(promises);
    
    // Wait for all pages to load
    const loadPromises = this.pages.map(page => page.waitForLoadState('networkidle'));
    await Promise.all(loadPromises);
  }

  async performConcurrentActions(actions: ((page: Page, userIndex: number) => Promise<void>)[]) {
    if (actions.length !== this.pages.length) {
      throw new Error(`Expected ${this.pages.length} actions for ${this.pages.length} users`);
    }

    const promises = actions.map((action, index) => action(this.pages[index], index));
    await Promise.all(promises);
  }

  async sendMessage(fromUserIndex: number, message: MockWebSocketMessage) {
    if (fromUserIndex >= this.connections.length) {
      throw new Error(`User index ${fromUserIndex} is out of range`);
    }

    await this.connections[fromUserIndex].sendMessage(message);
  }

  async broadcastMessage(message: MockWebSocketMessage) {
    await this.websocketServer.sendMessageToAll(message);
  }

  getPage(userIndex: number): Page {
    if (userIndex >= this.pages.length) {
      throw new Error(`User index ${userIndex} is out of range`);
    }
    return this.pages[userIndex];
  }

  getAllPages(): Page[] {
    return [...this.pages];
  }

  getWebSocketServer(): MockWebSocketServer {
    return this.websocketServer;
  }

  async cleanup() {
    // Close all connections
    await Promise.all(this.connections.map(conn => conn.close()));
    
    // Close all contexts
    await Promise.all(this.contexts.map(context => context.close()));
    
    // Stop WebSocket server
    await this.websocketServer.stop();

    this.contexts = [];
    this.pages = [];
    this.connections = [];
  }
}

export interface NetworkCondition {
  latency: number; // in milliseconds
  downloadThroughput: number; // in bytes per second
  uploadThroughput: number; // in bytes per second
  packetLoss?: number; // percentage (0-100)
}

export const NetworkConditions = {
  FAST_3G: { latency: 562, downloadThroughput: 1600000, uploadThroughput: 750000 },
  SLOW_3G: { latency: 2000, downloadThroughput: 500000, uploadThroughput: 500000 },
  SLOW_WIFI: { latency: 100, downloadThroughput: 1000000, uploadThroughput: 1000000 },
  FAST_WIFI: { latency: 20, downloadThroughput: 10000000, uploadThroughput: 10000000 },
  OFFLINE: { latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
};

export class NetworkSimulator {
  constructor(private page: Page) {}

  async setNetworkCondition(condition: NetworkCondition) {
    const cdpSession = await this.page.context().newCDPSession(this.page);
    
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: condition.downloadThroughput === 0,
      latency: condition.latency,
      downloadThroughput: condition.downloadThroughput,
      uploadThroughput: condition.uploadThroughput,
    });
  }

  async goOffline() {
    await this.page.context().setOffline(true);
  }

  async goOnline() {
    await this.page.context().setOffline(false);
  }

  async simulateIntermittentConnection(
    onlineMs: number = 5000, 
    offlineMs: number = 2000, 
    cycles: number = 3
  ) {
    for (let i = 0; i < cycles; i++) {
      await this.goOnline();
      await this.page.waitForTimeout(onlineMs);
      
      await this.goOffline();
      await this.page.waitForTimeout(offlineMs);
    }
    
    // End in online state
    await this.goOnline();
  }
}

export interface RealtimeTestMetrics {
  connectionTime: number;
  messageLatency: number[];
  reconnectionTime: number;
  messageSuccessRate: number;
  concurrentUserCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export class RealtimeMetricsCollector {
  private metrics: RealtimeTestMetrics = {
    connectionTime: 0,
    messageLatency: [],
    reconnectionTime: 0,
    messageSuccessRate: 0,
    concurrentUserCount: 0,
  };

  private connectionStartTime: number = 0;
  private messagesSent: number = 0;
  private messagesReceived: number = 0;

  startConnectionTimer() {
    this.connectionStartTime = Date.now();
  }

  recordConnectionEstablished() {
    if (this.connectionStartTime > 0) {
      this.metrics.connectionTime = Date.now() - this.connectionStartTime;
    }
  }

  recordMessageSent() {
    this.messagesSent++;
  }

  recordMessageReceived(latency: number) {
    this.messagesReceived++;
    this.metrics.messageLatency.push(latency);
  }

  recordReconnectionTime(time: number) {
    this.metrics.reconnectionTime = time;
  }

  setConcurrentUserCount(count: number) {
    this.metrics.concurrentUserCount = count;
  }

  calculateMetrics(): RealtimeTestMetrics {
    this.metrics.messageSuccessRate = this.messagesSent > 0 
      ? (this.messagesReceived / this.messagesSent) * 100 
      : 0;

    return { ...this.metrics };
  }

  getAverageLatency(): number {
    return this.metrics.messageLatency.length > 0
      ? this.metrics.messageLatency.reduce((a, b) => a + b, 0) / this.metrics.messageLatency.length
      : 0;
  }

  getMaxLatency(): number {
    return this.metrics.messageLatency.length > 0
      ? Math.max(...this.metrics.messageLatency)
      : 0;
  }

  reset() {
    this.metrics = {
      connectionTime: 0,
      messageLatency: [],
      reconnectionTime: 0,
      messageSuccessRate: 0,
      concurrentUserCount: 0,
    };
    this.connectionStartTime = 0;
    this.messagesSent = 0;
    this.messagesReceived = 0;
  }
}