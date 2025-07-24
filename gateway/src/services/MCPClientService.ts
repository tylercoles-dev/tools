/**
 * MCP Client Service
 * 
 * Manages connections to MCP servers and provides a unified interface
 * for making MCP tool calls from the REST API.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

interface MCPResourceRequest {
  uri: string;
}

interface MCPResourceResult {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

class MCPConnection extends EventEmitter {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  
  constructor(
    private name: string,
    private config: MCPServerConfig
  ) {
    super();
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to MCP server: ${this.name}`);
      
      this.process = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env }
      });
      
      if (!this.process || !this.process.stdout || !this.process.stdin) {
        reject(new Error(`Failed to spawn MCP server: ${this.name}`));
        return;
      }
      
      let buffer = '';
      
      this.process.stdout.on('data', (data) => {
        buffer += data.toString();
        
        // Process complete JSON messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              this.handleMessage(message);
            } catch (error) {
              console.error(`Invalid JSON from ${this.name}:`, line);
            }
          }
        }
      });
      
      this.process.stderr.on('data', (data) => {
        console.error(`${this.name} stderr:`, data.toString());
      });
      
      this.process.on('error', (error) => {
        console.error(`${this.name} process error:`, error);
        this.emit('error', error);
        reject(error);
      });
      
      this.process.on('exit', (code) => {
        console.log(`${this.name} process exited with code:`, code);
        this.emit('disconnect');
      });
      
      // Send initialize request
      this.sendMessage({
        jsonrpc: '2.0',
        id: this.nextMessageId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          clientInfo: {
            name: 'mcp-tools-gateway',
            version: '1.0.0'
          }
        }
      }).then(() => {
        console.log(`✅ Connected to MCP server: ${this.name}`);
        resolve();
      }).catch(reject);
    });
  }
  
  private handleMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        request.reject(new Error(message.error.message || 'MCP error'));
      } else {
        request.resolve(message.result);
      }
    }
  }
  
  private nextMessageId(): number {
    return ++this.messageId;
  }
  
  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error(`MCP server ${this.name} not connected`));
        return;
      }
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Timeout waiting for response from ${this.name}`));
      }, 30000); // 30 second timeout
      
      this.pendingRequests.set(message.id, { resolve, reject, timeout });
      
      try {
        this.process.stdin.write(JSON.stringify(message) + '\n');
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);
        reject(error);
      }
    });
  }
  
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const message = {
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'tools/call',
      params: toolCall
    };
    
    return await this.sendMessage(message);
  }
  
  async getResource(resourceRequest: MCPResourceRequest): Promise<MCPResourceResult> {
    const message = {
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'resources/read',
      params: resourceRequest
    };
    
    return await this.sendMessage(message);
  }
  
  async listTools(): Promise<any[]> {
    const message = {
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'tools/list',
      params: {}
    };
    
    const result = await this.sendMessage(message);
    return result.tools || [];
  }
  
  async listResources(): Promise<any[]> {
    const message = {
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'resources/templates/list',
      params: {}
    };
    
    const result = await this.sendMessage(message);
    return result.resourceTemplates || [];
  }
  
  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error(`Connection to ${this.name} closed`));
    }
    this.pendingRequests.clear();
  }
}

export class MCPClientService {
  private connections = new Map<string, MCPConnection>();
  
  constructor(private serverConfigs: Record<string, MCPServerConfig>) {}
  
  async initialize(): Promise<void> {
    console.log('Initializing MCP Client Service...');
    
    const connectionPromises = Object.entries(this.serverConfigs).map(
      async ([name, config]) => {
        try {
          const connection = new MCPConnection(name, config);
          await connection.connect();
          this.connections.set(name, connection);
        } catch (error) {
          console.error(`Failed to connect to ${name}:`, error);
          // Continue with other connections even if one fails
        }
      }
    );
    
    await Promise.allSettled(connectionPromises);
    
    const connectedServers = Array.from(this.connections.keys());
    console.log(`✅ MCP Client Service initialized with servers: ${connectedServers.join(', ')}`);
  }
  
  async callTool(serverName: string, toolCall: MCPToolCall): Promise<MCPToolResult> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not available`);
    }
    
    return await connection.callTool(toolCall);
  }
  
  async getResource(serverName: string, resourceRequest: MCPResourceRequest): Promise<MCPResourceResult> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not available`);
    }
    
    return await connection.getResource(resourceRequest);
  }
  
  async listTools(serverName: string): Promise<any[]> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not available`);
    }
    
    return await connection.listTools();
  }
  
  async listResources(serverName: string): Promise<any[]> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not available`);
    }
    
    return await connection.listResources();
  }
  
  getAvailableServers(): string[] {
    return Array.from(this.connections.keys());
  }
  
  isServerAvailable(serverName: string): boolean {
    return this.connections.has(serverName);
  }
  
  async getServerStatus(): Promise<Record<string, { connected: boolean; tools: number; resources: number }>> {
    const status: Record<string, { connected: boolean; tools: number; resources: number }> = {};
    
    for (const [name, connection] of this.connections) {
      try {
        const [tools, resources] = await Promise.all([
          connection.listTools(),
          connection.listResources()
        ]);
        
        status[name] = {
          connected: true,
          tools: tools.length,
          resources: resources.length
        };
      } catch (error) {
        status[name] = {
          connected: false,
          tools: 0,
          resources: 0
        };
      }
    }
    
    return status;
  }
  
  shutdown(): void {
    console.log('Shutting down MCP Client Service...');
    
    for (const [name, connection] of this.connections) {
      console.log(`Disconnecting from ${name}...`);
      connection.disconnect();
    }
    
    this.connections.clear();
    console.log('✅ MCP Client Service shutdown complete');
  }
}