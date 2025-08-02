/**
 * Child Process Mocking Utilities
 * 
 * Provides comprehensive mocking for Node.js child_process module
 */

import { EventEmitter } from 'events';

export interface MockChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    write: jest.Mock;
  };
  kill: jest.Mock;
  pid?: number;
}

export interface MockChildProcessOptions {
  simulateError?: boolean;
  exitCode?: number;
  simulateInitSuccess?: boolean;
  simulateStdoutData?: string[];
  simulateStderrData?: string[];
  simulateTimeout?: boolean;
}

/**
 * Creates a mock child process with configurable behavior
 */
export function createMockChildProcess(options: MockChildProcessOptions = {}): MockChildProcess {
  const {
    simulateError = false,
    exitCode = 0,
    simulateInitSuccess = true,
    simulateStdoutData = [],
    simulateStderrData = [],
    simulateTimeout = false
  } = options;

  const mockProcess = new EventEmitter() as MockChildProcess;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.stdin = {
    write: jest.fn()
  };
  mockProcess.kill = jest.fn();
  mockProcess.pid = 12345;

  // Simulate process behavior after a short delay
  process.nextTick(() => {
    if (simulateError) {
      mockProcess.emit('error', new Error('Process spawn error'));
      return;
    }

    // Simulate stdout data
    for (const data of simulateStdoutData) {
      mockProcess.stdout.emit('data', Buffer.from(data));
    }

    // Simulate stderr data
    for (const data of simulateStderrData) {
      mockProcess.stderr.emit('data', Buffer.from(data));
    }

    // Simulate initialization success
    if (simulateInitSuccess && !simulateTimeout) {
      const initResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'test-server',
            version: '1.0.0'
          }
        }
      };
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(initResponse) + '\n'));
      }, 10);
    }

    // Simulate process exit
    if (exitCode !== null) {
      setTimeout(() => {
        mockProcess.emit('exit', exitCode);
      }, 100);
    }
  });

  return mockProcess;
}

/**
 * Creates a mock spawn function that returns mock child processes
 */
export function createMockSpawn(processOptions: MockChildProcessOptions = {}) {
  return jest.fn().mockImplementation(() => createMockChildProcess(processOptions));
}

/**
 * Sample MCP message responses for testing
 */
export const mockMCPResponses = {
  initialize: {
    jsonrpc: '2.0',
    id: 1,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: 'test-server',
        version: '1.0.0'
      }
    }
  },

  toolsList: {
    jsonrpc: '2.0',
    id: 2,
    result: {
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      ]
    }
  },

  toolCall: {
    jsonrpc: '2.0',
    id: 3,
    result: {
      content: [
        {
          type: 'text',
          text: 'Tool execution result'
        }
      ]
    }
  },

  resourcesList: {
    jsonrpc: '2.0',
    id: 4,
    result: {
      resourceTemplates: [
        {
          uriTemplate: 'test://resource/{id}',
          name: 'Test Resource',
          description: 'A test resource'
        }
      ]
    }
  },

  resourceRead: {
    jsonrpc: '2.0',
    id: 5,
    result: {
      contents: [
        {
          uri: 'test://resource/123',
          mimeType: 'text/plain',
          text: 'Resource content'
        }
      ]
    }
  },

  error: {
    jsonrpc: '2.0',
    id: 6,
    error: {
      code: -1,
      message: 'Test error message'
    }
  }
};

/**
 * Helper to create a mock child process that responds to specific MCP messages
 */
export function createMockMCPProcess(responses: Record<string, any> = {}): MockChildProcess {
  const allResponses = { ...mockMCPResponses, ...responses };
  const mockProcess = createMockChildProcess({ simulateInitSuccess: false });

  // Override write method to simulate responses
  mockProcess.stdin.write = jest.fn().mockImplementation((data: string) => {
    try {
      const message = JSON.parse(data.trim());
      let response: any = null;

      // Route messages to appropriate responses
      switch (message.method) {
        case 'initialize':
          response = { ...allResponses.initialize, id: message.id };
          break;
        case 'tools/list':
          response = { ...allResponses.toolsList, id: message.id };
          break;
        case 'tools/call':
          response = { ...allResponses.toolCall, id: message.id };
          break;
        case 'resources/templates/list':
          response = { ...allResponses.resourcesList, id: message.id };
          break;
        case 'resources/read':
          response = { ...allResponses.resourceRead, id: message.id };
          break;
        default:
          response = { ...allResponses.error, id: message.id };
      }

      // Send response after a short delay
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      }, 10);
    } catch (error) {
      // Invalid JSON - do nothing
    }
  });

  return mockProcess;
}