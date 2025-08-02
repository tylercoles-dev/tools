/**
 * Board Tools Unit Tests
 * 
 * Comprehensive test suite for Kanban board MCP tools
 */

import {
  registerGetBoardsTool,
  registerGetBoardTool,
  registerCreateBoardTool,
  registerUpdateBoardTool,
  registerDeleteBoardTool
} from './board-tools.js';
import { NotFoundError, ValidationError } from '../../types/index.js';
import type { KanbanDatabase } from '../../database/index.js';
import type { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server', () => ({
  EmptySchema: {},
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
  createSuccessObjectResult: jest.fn((data, text) => ({ data, text })),
}));

describe('Board Tools', () => {
  let mockDb: jest.Mocked<KanbanDatabase>;
  let mockWsServer: jest.Mocked<KanbanWebSocketServer>;

  beforeEach(() => {
    mockDb = {
      getBoards: jest.fn(),
      getBoardById: jest.fn(),
      createBoard: jest.fn(),
      updateBoard: jest.fn(),
      deleteBoard: jest.fn(),
      getColumnsByBoard: jest.fn(),
      getCardsByColumn: jest.fn(),
      getCardTags: jest.fn(),
    } as any;

    mockWsServer = {
      broadcastToAll: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerGetBoardsTool', () => {
    it('should return tool configuration', () => {
      const tool = registerGetBoardsTool(mockDb);

      expect(tool.name).toBe('get_boards');
      expect(tool.config.title).toBe('Get All Boards');
      expect(tool.config.description).toBe('Retrieve all kanban boards');
    });

    it('should handle successful board retrieval', async () => {
      const mockBoards = [
        {
          id: 1,
          name: 'Test Board 1',
          description: 'Test description',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          name: 'Test Board 2',
          description: null,
          created_at: '2024-01-02T00:00:00.000Z'
        }
      ];

      mockDb.getBoards.mockResolvedValue(mockBoards);

      const tool = registerGetBoardsTool(mockDb);
      const result = await tool.handler({});

      expect(mockDb.getBoards).toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Found 2 boards:')
          }
        ],
        structuredContent: { boards: mockBoards }
      });
    });

    it('should handle empty board list', async () => {
      mockDb.getBoards.mockResolvedValue([]);

      const tool = registerGetBoardsTool(mockDb);
      const result = await tool.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Found 0 boards:\n\n'
          }
        ],
        structuredContent: { boards: [] }
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.getBoards.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Database connection failed' });

      const tool = registerGetBoardsTool(mockDb);
      const result = await tool.handler({});

      expect(createErrorResult).toHaveBeenCalledWith(error);
      expect(result).toEqual({ error: 'Database connection failed' });
    });
  });

  describe('registerGetBoardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerGetBoardTool(mockDb);

      expect(tool.name).toBe('get_board');
      expect(tool.config.title).toBe('Get Board Details');
      expect(tool.config.description).toContain('Retrieve detailed information');
    });

    it('should handle successful board retrieval with columns and cards', async () => {
      const mockBoard = {
        id: 1,
        name: 'Test Board',
        description: 'Test description'
      };

      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 },
        { id: 2, name: 'Done', position: 1 }
      ];

      const mockCards = [
        { id: 1, title: 'Test Card', priority: 'high' }
      ];

      const mockTags = [
        { id: 1, name: 'urgent', color: '#red' }
      ];

      mockDb.getBoardById.mockResolvedValue(mockBoard);
      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.getCardsByColumn.mockResolvedValue(mockCards);
      mockDb.getCardTags.mockResolvedValue(mockTags);

      const { createSuccessObjectResult } = require('@tylercoles/mcp-server');
      createSuccessObjectResult.mockReturnValue({ 
        data: expect.any(Object), 
        text: expect.any(String) 
      });

      const tool = registerGetBoardTool(mockDb);
      const result = await tool.handler({ board_id: 1 });

      expect(mockDb.getBoardById).toHaveBeenCalledWith(1);
      expect(mockDb.getColumnsByBoard).toHaveBeenCalledWith(1);
      expect(mockDb.getCardsByColumn).toHaveBeenCalledWith(1);
      expect(mockDb.getCardsByColumn).toHaveBeenCalledWith(2);
      expect(mockDb.getCardTags).toHaveBeenCalledWith(1);
      expect(createSuccessObjectResult).toHaveBeenCalled();
    });

    it('should handle board not found', async () => {
      mockDb.getBoardById.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Board with id 999 not found' });

      const tool = registerGetBoardTool(mockDb);
      const result = await tool.handler({ board_id: 999 });

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
      expect(result).toEqual({ error: 'Board with id 999 not found' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.getBoardById.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerGetBoardTool(mockDb);
      const result = await tool.handler({ board_id: 1 });

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerCreateBoardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerCreateBoardTool(mockDb, mockWsServer);

      expect(tool.name).toBe('create_board');
      expect(tool.config.title).toBe('Create New Board');
      expect(tool.config.description).toBe('Create a new kanban board');
    });

    it('should handle successful board creation', async () => {
      const input = {
        name: 'New Board',
        description: 'Board description',
        color: '#6366f1'
      };

      const mockBoard = {
        id: 1,
        name: 'New Board',
        description: 'Board description',
        color: '#6366f1'
      };

      // Mock Zod validation success
      const mockParseResult = {
        success: true,
        data: input
      };

      // Mock the CreateBoardSchema
      jest.doMock('../../types/index.js', () => ({
        CreateBoardSchema: {
          safeParse: jest.fn(() => mockParseResult)
        },
        NotFoundError: class NotFoundError extends Error {
          constructor(resource: string, id: any) {
            super(`${resource} with id ${id} not found`);
          }
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.createBoard.mockResolvedValue(mockBoard);

      const { createSuccessResult } = require('@tylercoles/mcp-server');
      createSuccessResult.mockReturnValue({ success: 'Board created' });

      const tool = registerCreateBoardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createBoard).toHaveBeenCalledWith({
        name: input.name,
        description: input.description,
        color: input.color
      });

      expect(mockWsServer.broadcastToAll).toHaveBeenCalledWith('board_created', mockBoard);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully created board "New Board"')
      );
    });

    it('should handle validation errors', async () => {
      const input = { name: '' }; // Invalid input

      const mockParseResult = {
        success: false,
        error: {
          errors: [
            { path: ['name'], message: 'String must contain at least 1 character(s)' }
          ]
        }
      };

      // Mock the CreateBoardSchema
      jest.doMock('../../types/index.js', () => ({
        CreateBoardSchema: {
          safeParse: jest.fn(() => mockParseResult)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Validation failed' });

      const tool = registerCreateBoardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createBoard).not.toHaveBeenCalled();
      expect(mockWsServer.broadcastToAll).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should handle database errors', async () => {
      const input = { name: 'Test Board' };

      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateBoardSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const error = new Error('Database error');
      mockDb.createBoard.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerCreateBoardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });

    it('should work without WebSocket server', async () => {
      const input = { name: 'Test Board' };

      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateBoardSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const mockBoard = { id: 1, name: 'Test Board' };
      mockDb.createBoard.mockResolvedValue(mockBoard);

      const { createSuccessResult } = require('@tylercoles/mcp-server');
      createSuccessResult.mockReturnValue({ success: 'Board created' });

      const tool = registerCreateBoardTool(mockDb, null as any);
      const result = await tool.handler(input);

      expect(mockDb.createBoard).toHaveBeenCalled();
      expect(createSuccessResult).toHaveBeenCalled();
      // Should not throw when wsServer is null
    });
  });

  describe('registerUpdateBoardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerUpdateBoardTool(mockDb);

      expect(tool.name).toBe('update_board');
      expect(tool.config.title).toBe('Update Board');
      expect(tool.config.description).toBe('Update an existing kanban board');
    });

    it('should handle successful board update', async () => {
      const input = {
        board_id: 1,
        name: 'Updated Board',
        description: 'Updated description'
      };

      const mockBoard = {
        id: 1,
        name: 'Updated Board',
        description: 'Updated description'
      };

      // Mock the UpdateBoardSchema
      jest.doMock('../../types/index.js', () => ({
        UpdateBoardSchema: {
          parse: jest.fn((data) => data)
        }
      }));

      mockDb.updateBoard.mockResolvedValue(mockBoard);

      const { createSuccessResult } = require('@tylercoles/mcp-server');
      createSuccessResult.mockReturnValue({ success: 'Board updated' });

      const tool = registerUpdateBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(mockDb.updateBoard).toHaveBeenCalledWith(1, {
        name: 'Updated Board',
        description: 'Updated description'
      });

      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated board "Updated Board"')
      );
    });

    it('should handle board not found', async () => {
      const input = { board_id: 999, name: 'Updated Board' };

      jest.doMock('../../types/index.js', () => ({
        UpdateBoardSchema: {
          parse: jest.fn((data) => data)
        },
        NotFoundError: class NotFoundError extends Error {
          constructor(resource: string, id: any) {
            super(`${resource} with id ${id} not found`);
          }
        }
      }));

      mockDb.updateBoard.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Board not found' });

      const tool = registerUpdateBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = { board_id: 1, name: 'Updated Board' };

      jest.doMock('../../types/index.js', () => ({
        UpdateBoardSchema: {
          parse: jest.fn((data) => data)
        }
      }));

      const error = new Error('Database error');
      mockDb.updateBoard.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerUpdateBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerDeleteBoardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerDeleteBoardTool(mockDb);

      expect(tool.name).toBe('delete_board');
      expect(tool.config.title).toBe('Delete Board');
      expect(tool.config.description).toContain('Delete a kanban board');
    });

    it('should handle successful board deletion', async () => {
      const input = { board_id: 1 };

      mockDb.deleteBoard.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server');
      createSuccessResult.mockReturnValue({ success: 'Board deleted' });

      const tool = registerDeleteBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(mockDb.deleteBoard).toHaveBeenCalledWith(1);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully deleted board (ID: 1)')
      );
    });

    it('should handle board not found', async () => {
      const input = { board_id: 999 };

      mockDb.deleteBoard.mockResolvedValue(false);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Board not found' });

      const tool = registerDeleteBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = { board_id: 1 };

      const error = new Error('Database error');
      mockDb.deleteBoard.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerDeleteBoardTool(mockDb);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });
});