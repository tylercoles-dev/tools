/**
 * Column Tools Unit Tests
 * 
 * Comprehensive test suite for Kanban column MCP tools
 */

import {
  registerCreateColumnTool,
  registerUpdateColumnTool,
  registerDeleteColumnTool
} from './column-tools.js';
import { NotFoundError } from '../../types/index.js';
import type { KanbanDatabase } from '../../database/index.js';
import type { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server/dist/tools.js', () => ({
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
}));

describe('Column Tools', () => {
  let mockDb: jest.Mocked<KanbanDatabase>;
  let mockWsServer: jest.Mocked<KanbanWebSocketServer>;

  beforeEach(() => {
    mockDb = {
      createColumn: jest.fn(),
      updateColumn: jest.fn(),
      getColumn: jest.fn(),
      deleteColumn: jest.fn(),
    } as any;

    mockWsServer = {
      broadcastToBoardClients: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCreateColumnTool', () => {
    it('should return tool configuration', () => {
      const tool = registerCreateColumnTool(mockDb, mockWsServer);

      expect(tool.name).toBe('create_column');
      expect(tool.config.title).toBe('Create Column');
      expect(tool.config.description).toBe('Create a new column in a kanban board');
    });

    it('should create column successfully', async () => {
      const input = {
        board_id: 1,
        name: 'New Column',
        position: 2,
        color: '#6366f1'
      };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'New Column',
        position: 2,
        color: '#6366f1'
      };

      // Mock successful validation
      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateColumnSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      mockDb.createColumn.mockResolvedValue(mockColumn);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column created' });

      const tool = registerCreateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createColumn).toHaveBeenCalledWith(input);
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'column_created', mockColumn
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully created column "New Column"')
      );
    });

    it('should handle validation errors', async () => {
      const input = { board_id: '', name: '' }; // Invalid input

      const mockParseResult = {
        success: false,
        error: {
          errors: [
            { path: ['board_id'], message: 'Expected number, received string' },
            { path: ['name'], message: 'String must contain at least 1 character(s)' }
          ]
        }
      };

      jest.doMock('../../types/index.js', () => ({
        CreateColumnSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Validation failed' });

      const tool = registerCreateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createColumn).not.toHaveBeenCalled();
      expect(mockWsServer.broadcastToBoardClients).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle database errors', async () => {
      const input = {
        board_id: 1,
        name: 'New Column',
        position: 2
      };

      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateColumnSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const error = new Error('Database error');
      mockDb.createColumn.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerCreateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });

    it('should work without WebSocket server', async () => {
      const input = {
        board_id: 1,
        name: 'New Column',
        position: 2
      };

      const mockParseResult = {
        success: true,
        data: input
      };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'New Column',
        position: 2
      };

      jest.doMock('../../types/index.js', () => ({
        CreateColumnSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      mockDb.createColumn.mockResolvedValue(mockColumn);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column created' });

      const tool = registerCreateColumnTool(mockDb, null as any);
      const result = await tool.handler(input);

      expect(mockDb.createColumn).toHaveBeenCalled();
      expect(createSuccessResult).toHaveBeenCalled();
      // Should not throw when wsServer is null
    });
  });

  describe('registerUpdateColumnTool', () => {
    it('should return tool configuration', () => {
      const tool = registerUpdateColumnTool(mockDb, mockWsServer);

      expect(tool.name).toBe('update_column');
      expect(tool.config.title).toBe('Update Column');
      expect(tool.config.description).toBe('Update an existing column');
    });

    it('should update column successfully', async () => {
      const input = {
        column_id: 1,
        name: 'Updated Column',
        position: 3,
        color: '#ef4444'
      };

      const updates = {
        name: 'Updated Column',
        position: 3,
        color: '#ef4444'
      };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'Updated Column',
        position: 3,
        color: '#ef4444'
      };

      jest.doMock('../../types/index.js', () => ({
        UpdateColumnSchema: {
          parse: jest.fn(() => updates)
        }
      }));

      mockDb.updateColumn.mockResolvedValue(mockColumn);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column updated' });

      const tool = registerUpdateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.updateColumn).toHaveBeenCalledWith(1, updates);
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'column_updated', mockColumn
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated column "Updated Column"')
      );
    });

    it('should handle column not found', async () => {
      const input = {
        column_id: 999,
        name: 'Updated Column'
      };

      const updates = { name: 'Updated Column' };

      jest.doMock('../../types/index.js', () => ({
        UpdateColumnSchema: {
          parse: jest.fn(() => updates)
        },
        NotFoundError: class NotFoundError extends Error {
          constructor(resource: string, id: any) {
            super(`${resource} with id ${id} not found`);
          }
        }
      }));

      mockDb.updateColumn.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Column not found' });

      const tool = registerUpdateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = {
        column_id: 1,
        name: 'Updated Column'
      };

      const updates = { name: 'Updated Column' };

      jest.doMock('../../types/index.js', () => ({
        UpdateColumnSchema: {
          parse: jest.fn(() => updates)
        }
      }));

      const error = new Error('Database error');
      mockDb.updateColumn.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerUpdateColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });

    it('should work without WebSocket server', async () => {
      const input = {
        column_id: 1,
        name: 'Updated Column'
      };

      const updates = { name: 'Updated Column' };
      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'Updated Column'
      };

      jest.doMock('../../types/index.js', () => ({
        UpdateColumnSchema: {
          parse: jest.fn(() => updates)
        }
      }));

      mockDb.updateColumn.mockResolvedValue(mockColumn);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column updated' });

      const tool = registerUpdateColumnTool(mockDb, null as any);
      const result = await tool.handler(input);

      expect(createSuccessResult).toHaveBeenCalled();
      // Should not throw when wsServer is null
    });
  });

  describe('registerDeleteColumnTool', () => {
    it('should return tool configuration', () => {
      const tool = registerDeleteColumnTool(mockDb, mockWsServer);

      expect(tool.name).toBe('delete_column');
      expect(tool.config.title).toBe('Delete Column');
      expect(tool.config.description).toBe('Delete a column and all its cards');
    });

    it('should delete column successfully', async () => {
      const input = { column_id: 1 };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'Test Column'
      };

      mockDb.getColumn.mockResolvedValue(mockColumn);
      mockDb.deleteColumn.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column deleted' });

      const tool = registerDeleteColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.getColumn).toHaveBeenCalledWith(1);
      expect(mockDb.deleteColumn).toHaveBeenCalledWith(1);
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'column_deleted', { column_id: 1 }
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully deleted column (ID: 1)')
      );
    });

    it('should handle column not found (before deletion)', async () => {
      const input = { column_id: 999 };

      mockDb.getColumn.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Column not found' });

      const tool = registerDeleteColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.deleteColumn).not.toHaveBeenCalled();
      expect(mockWsServer.broadcastToBoardClients).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle column not found (deletion failed)', async () => {
      const input = { column_id: 1 };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'Test Column'
      };

      mockDb.getColumn.mockResolvedValue(mockColumn);
      mockDb.deleteColumn.mockResolvedValue(false); // Deletion failed

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Column not found' });

      const tool = registerDeleteColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.deleteColumn).toHaveBeenCalledWith(1);
      expect(mockWsServer.broadcastToBoardClients).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = { column_id: 1 };
      const error = new Error('Database error');

      mockDb.getColumn.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerDeleteColumnTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });

    it('should work without WebSocket server', async () => {
      const input = { column_id: 1 };

      const mockColumn = {
        id: 1,
        board_id: 1,
        name: 'Test Column'
      };

      mockDb.getColumn.mockResolvedValue(mockColumn);
      mockDb.deleteColumn.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Column deleted' });

      const tool = registerDeleteColumnTool(mockDb, null as any);
      const result = await tool.handler(input);

      expect(createSuccessResult).toHaveBeenCalled();
      // Should not throw when wsServer is null
    });
  });
});