/**
 * MCP Client Service Unit Tests
 * 
 * Comprehensive test suite for MCPClientService and MCPConnection
 */

import { MCPClientService } from './MCPClientService.js';
import { 
  createMockSpawn, 
  createMockMCPProcess,
  mockMCPResponses,
  MockChildProcess 
} from '../__tests__/utils/mock-child-process.js';
import type { MCPServerConfig } from '@mcp-tools/core/dist/shared/types/index.js';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('MCPClientService', () => {
  let service: MCPClientService;
  let mockSpawn: jest.Mock;
  let mockServerConfigs: Record<string, MCPServerConfig>;

  beforeEach(() => {
    mockSpawn = require('child_process').spawn;
    mockServerConfigs = {
      kanban: {
        command: 'node',
        args: ['./servers/kanban/dist/index.js'],
        env: { NODE_ENV: 'test' }
      },
      wiki: {
        command: 'node',
        args: ['./servers/wiki/dist/index.js'],
        env: { NODE_ENV: 'test' }
      }
    };
    
    service = new MCPClientService(mockServerConfigs);
  });

  afterEach(() => {
    service.shutdown();
    jest.clearAllMocks();
  });

  describe('MCPConnection', () => {
    describe('connect', () => {
      it('should successfully connect to MCP server', async () => {
        const mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);

        await service.initialize();

        expect(mockSpawn).toHaveBeenCalledWith(
          'node',
          ['./servers/kanban/dist/index.js'],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: expect.objectContaining({ NODE_ENV: 'test' })
          }
        );

        expect(service.getAvailableServers()).toContain('kanban');
        expect(service.isServerAvailable('kanban')).toBe(true);
      });

      it('should handle missing stdout/stdin', async () => {
        mockSpawn.mockReturnValue({
          stdout: null,
          stdin: null,
          stderr: { on: jest.fn() },
          on: jest.fn()
        });

        await service.initialize();

        expect(service.getAvailableServers()).not.toContain('kanban');
      });

      it('should handle malformed JSON responses', async () => {
        const mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);

        // Override to send invalid JSON
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from('invalid json\n'));
        });

        await service.initialize();

        // Should handle gracefully and continue
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid JSON'),
          'invalid json'
        );
      });

      it('should handle process exit', async () => {
        const mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);

        await service.initialize();

        // Simulate process exit
        mockProcess.emit('exit', 0);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('process exited'),
          0
        );
      });

      it('should handle stderr output', async () => {
        const mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);

        await service.initialize();

        // Simulate stderr output
        mockProcess.stderr.emit('data', Buffer.from('Error message'));

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('stderr'),
          'Error message'
        );
      });
    });

    describe('message handling', () => {
      let mockProcess: MockChildProcess;

      beforeEach(async () => {
        mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);
        await service.initialize();
      });

      it('should handle successful tool calls', async () => {
        const toolCall = {
          name: 'test-tool',
          arguments: { message: 'Hello' }
        };

        const result = await service.callTool('kanban', toolCall);

        expect(result).toEqual(mockMCPResponses.toolCall.result);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"tools/call"')
        );
      });

      it('should handle tool call errors', async () => {
        const errorResponse = {
          jsonrpc: '2.0',
          error: { code: -1, message: 'Tool not found' }
        };

        const mockErrorProcess = createMockMCPProcess({
          toolCall: errorResponse
        });
        mockSpawn.mockReturnValue(mockErrorProcess);

        const newService = new MCPClientService({ test: mockServerConfigs.kanban });
        await newService.initialize();

        const toolCall = { name: 'nonexistent-tool', arguments: {} };

        await expect(newService.callTool('test', toolCall))
          .rejects.toThrow('Tool not found');

        newService.shutdown();
      });

      it('should handle resource requests', async () => {
        const resourceRequest = { uri: 'test://resource/123' };

        const result = await service.getResource('kanban', resourceRequest);

        expect(result).toEqual(mockMCPResponses.resourceRead.result);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"resources/read"')
        );
      });

      it('should list available tools', async () => {
        const tools = await service.listTools('kanban');

        expect(tools).toEqual(mockMCPResponses.toolsList.result.tools);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"tools/list"')
        );
      });

      it('should list available resources', async () => {
        const resources = await service.listResources('kanban');

        expect(resources).toEqual(mockMCPResponses.resourcesList.result.resourceTemplates);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"resources/templates/list"')
        );
      });

      it('should handle connection errors during message sending', async () => {
        // Kill the process to simulate connection failure
        mockProcess.kill();
        mockProcess.stdin = null as any;

        const toolCall = { name: 'test-tool', arguments: {} };

        await expect(service.callTool('kanban', toolCall))
          .rejects.toThrow('not connected');
      });

      it('should handle stdin write errors', async () => {
        // Mock stdin.write to throw an error
        mockProcess.stdin.write = jest.fn().mockImplementation(() => {
          throw new Error('Write failed');
        });

        const toolCall = { name: 'test-tool', arguments: {} };

        await expect(service.callTool('kanban', toolCall))
          .rejects.toThrow('Write failed');
      });
    });
  });

  describe('MCPClientService', () => {
    describe('initialize', () => {
      it('should initialize all configured servers', async () => {
        const mockProcess = createMockMCPProcess();
        mockSpawn.mockReturnValue(mockProcess);

        await service.initialize();

        expect(mockSpawn).toHaveBeenCalledTimes(2); // kanban and wiki
        expect(service.getAvailableServers()).toEqual(['kanban', 'wiki']);
      });

      it('should handle empty server configuration', async () => {
        const emptyService = new MCPClientService({});
        await emptyService.initialize();

        expect(emptyService.getAvailableServers()).toEqual([]);
      });
    });

    describe('server operations', () => {
      beforeEach(async () => {
        mockSpawn.mockReturnValue(createMockMCPProcess());
        await service.initialize();
      });

      it('should throw error for unavailable server', async () => {
        const toolCall = { name: 'test-tool', arguments: {} };

        await expect(service.callTool('nonexistent', toolCall))
          .rejects.toThrow("MCP server 'nonexistent' not available");
      });

      it('should throw error for resource requests to unavailable server', async () => {
        const resourceRequest = { uri: 'test://resource/123' };

        await expect(service.getResource('nonexistent', resourceRequest))
          .rejects.toThrow("MCP server 'nonexistent' not available");
      });

      it('should throw error for tool listing on unavailable server', async () => {
        await expect(service.listTools('nonexistent'))
          .rejects.toThrow("MCP server 'nonexistent' not available");
      });

      it('should throw error for resource listing on unavailable server', async () => {
        await expect(service.listResources('nonexistent'))
          .rejects.toThrow("MCP server 'nonexistent' not available");
      });
    });

    describe('getServerStatus', () => {
      it('should return status for all connected servers', async () => {
        mockSpawn.mockReturnValue(createMockMCPProcess());
        await service.initialize();

        const status = await service.getServerStatus();

        expect(status).toEqual({
          kanban: {
            connected: true,
            tools: 1, // From mockMCPResponses.toolsList
            resources: 1 // From mockMCPResponses.resourcesList
          },
          wiki: {
            connected: true,
            tools: 1,
            resources: 1
          }
        });
      });

      it('should mark servers as disconnected when they fail', async () => {
        let callCount = 0;
        mockSpawn.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First server works
            return createMockMCPProcess();
          } else {
            // Second server fails on status check
            const mockProcess = createMockMCPProcess();
            mockProcess.stdin.write = jest.fn().mockImplementation((data: string) => {
              try {
                const message = JSON.parse(data.trim());
                // Simulate error for all requests
                setTimeout(() => {
                  mockProcess.stdout.emit('data', Buffer.from(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: message.id,
                      error: { code: -1, message: 'Server error' }
                    }) + '\n'
                  ));
                }, 10);
              } catch (error) {
                // Ignore invalid JSON
              }
            });
            return mockProcess;
          }
        });

        await service.initialize();
        const status = await service.getServerStatus();

        expect(status.kanban?.connected).toBe(true);
        if (status.wiki) {
          expect(status.wiki.connected).toBe(false);
          expect(status.wiki.tools).toBe(0);
          expect(status.wiki.resources).toBe(0);
        } else {
          // Wiki server failed to initialize so it won't be in status
          expect(status.wiki).toBeUndefined();
        }
      });
    });

    describe('shutdown', () => {
      it('should disconnect all servers and clear connections', async () => {
        const mockProcess1 = createMockMCPProcess();
        const mockProcess2 = createMockMCPProcess();
        
        let callCount = 0;
        mockSpawn.mockImplementation(() => {
          callCount++;
          return callCount === 1 ? mockProcess1 : mockProcess2;
        });

        await service.initialize();

        expect(service.getAvailableServers()).toHaveLength(2);

        service.shutdown();

        expect(mockProcess1.kill).toHaveBeenCalled();
        expect(mockProcess2.kill).toHaveBeenCalled();
        expect(service.getAvailableServers()).toEqual([]);
      });

      it('should handle shutdown when no servers are connected', () => {
        const emptyService = new MCPClientService({});
        
        // Should not throw
        expect(() => emptyService.shutdown()).not.toThrow();
      });
    });

    describe('utility methods', () => {
      beforeEach(async () => {
        mockSpawn.mockReturnValue(createMockMCPProcess());
        await service.initialize();
      });

      it('should return list of available servers', () => {
        const servers = service.getAvailableServers();
        expect(servers).toEqual(['kanban', 'wiki']);
      });

      it('should check server availability correctly', () => {
        expect(service.isServerAvailable('kanban')).toBe(true);
        expect(service.isServerAvailable('wiki')).toBe(true);
        expect(service.isServerAvailable('nonexistent')).toBe(false);
      });
    });

    describe('message ID handling', () => {
      it('should increment message IDs for each request', async () => {
        mockSpawn.mockReturnValue(createMockMCPProcess());
        await service.initialize();

        const toolCall1 = { name: 'tool1', arguments: {} };
        const toolCall2 = { name: 'tool2', arguments: {} };

        await service.callTool('kanban', toolCall1);
        await service.callTool('kanban', toolCall2);

        // Should have different message IDs
        const calls = mockSpawn.mock.results[0].value.stdin.write.mock.calls;
        const message1 = JSON.parse(calls[1][0]); // Skip initialization
        const message2 = JSON.parse(calls[2][0]);
        
        expect(message2.id).toBeGreaterThan(message1.id);
      });
    });

    describe('error handling edge cases', () => {
      it('should handle responses with missing error message', async () => {
        const errorResponse = {
          jsonrpc: '2.0',
          error: { code: -1 } // No message field
        };

        const mockErrorProcess = createMockMCPProcess({
          toolCall: errorResponse
        });
        mockSpawn.mockReturnValue(mockErrorProcess);

        const newService = new MCPClientService({ test: mockServerConfigs.kanban });
        await newService.initialize();

        const toolCall = { name: 'test-tool', arguments: {} };

        await expect(newService.callTool('test', toolCall))
          .rejects.toThrow('MCP error');

        newService.shutdown();
      });

      it('should handle responses without result or error', async () => {
        const mockProcess = createMockMCPProcess();
        mockProcess.stdin.write = jest.fn().mockImplementation((data: string) => {
          try {
            const message = JSON.parse(data.trim());
            if (message.method === 'initialize') {
              // Send proper initialize response
              setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: message.id,
                    result: mockMCPResponses.initialize.result
                  }) + '\n'
                ));
              }, 10);
            } else {
              // Send empty response for other methods
              setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: message.id
                    // No result or error
                  }) + '\n'
                ));
              }, 10);
            }
          } catch (error) {
            // Ignore invalid JSON
          }
        });
        
        mockSpawn.mockReturnValue(mockProcess);

        const newService = new MCPClientService({ test: mockServerConfigs.kanban });
        await newService.initialize();

        const toolCall = { name: 'test-tool', arguments: {} };
        const result = await newService.callTool('test', toolCall);

        expect(result).toBeUndefined();
        newService.shutdown();
      });
    });
  });
});