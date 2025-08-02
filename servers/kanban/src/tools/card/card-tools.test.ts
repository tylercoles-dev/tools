/**
 * Card Tools Unit Tests
 * 
 * Comprehensive test suite for Kanban card MCP tools
 */

import {
  registerCreateCardTool,
  registerUpdateCardTool,
  registerMoveCardTool,
  registerDeleteCardTool
} from './card-tools.js';
import { NotFoundError, ValidationError } from '../../types/index.js';
import type { KanbanDatabase } from '../../database/index.js';
import type { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server', () => ({
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
}));

// Mock the tools import
jest.mock('@tylercoles/mcp-server/dist/tools.js', () => ({
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
}));

describe('Card Tools', () => {
  let mockDb: jest.Mocked<KanbanDatabase>;
  let mockWsServer: jest.Mocked<KanbanWebSocketServer>;

  beforeEach(() => {
    mockDb = {
      getColumnsByBoard: jest.fn(),
      createCard: jest.fn(),
      updateCard: jest.fn(),
      getCardById: jest.fn(),
      moveCard: jest.fn(),
      deleteCard: jest.fn(),
    } as any;

    mockWsServer = {
      broadcastToBoardClients: jest.fn(),
    } as any;

    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCreateCardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerCreateCardTool(mockDb, mockWsServer);

      expect(tool.name).toBe('create_card');
      expect(tool.config.title).toBe('Create Card');
      expect(tool.config.description).toContain('Create a new card in a column');
    });

    it('should create card with column name', async () => {
      const input = {
        board_id: 1,
        column_name: 'To Do',
        title: 'Test Card',
        description: 'Test description',
        priority: 'high',
        assigned_to: 'user1',
        due_date: '2024-12-31',
        position: 0
      };

      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 },
        { id: 2, name: 'Done', position: 1 }
      ];

      const mockCard = {
        id: 1,
        board_id: 1,
        column_id: 1,
        title: 'Test Card',
        description: 'Test description',
        priority: 'high',
        assigned_to: 'user1',
        due_date: '2024-12-31',
        position: 0
      };

      // Mock schema validation
      const mockParseResult = { success: true, data: input };
      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.createCard.mockResolvedValue(mockCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card created' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.getColumnsByBoard).toHaveBeenCalledWith(1);
      expect(mockDb.createCard).toHaveBeenCalledWith({
        board_id: 1,
        column_id: 1,
        title: 'Test Card',
        description: 'Test description',
        position: 0,
        priority: 'high',
        assigned_to: 'user1',
        due_date: '2024-12-31'
      });

      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'card_created', mockCard
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully created card "Test Card"')
      );
    });

    it('should create card with column position', async () => {
      const input = {
        board_id: 1,
        column_position: 1,
        title: 'Test Card',    
        priority: 'medium',
        position: 0
      };

      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 },
        { id: 2, name: 'Done', position: 1 }
      ];

      const mockCard = {
        id: 1,
        board_id: 1,
        column_id: 2,
        title: 'Test Card',
        priority: 'medium'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.createCard.mockResolvedValue(mockCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card created' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createCard).toHaveBeenCalledWith({
        board_id: 1,
        column_id: 2,
        title: 'Test Card',
        description: null,
        position: 0,
        priority: 'medium',
        assigned_to: null,
        due_date: null
      });
    });

    it('should handle validation error for missing column specifiers', async () => {
      const input = {
        board_id: 1,
        title: 'Test Card',
        priority: 'medium'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Validation error' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
      expect(mockDb.createCard).not.toHaveBeenCalled();
    });

    it('should handle column not found error', async () => {
      const input = {
        board_id: 1,
        column_name: 'Non-existent',
        title: 'Test Card',
        priority: 'medium'
      };

      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 }
      ];

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Column not found' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should handle column position out of range', async () => {
      const input = {
        board_id: 1,
        column_position: 5,
        title: 'Test Card',
        priority: 'medium'
      };

      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 }
      ];

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Position out of range' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should handle board with no columns', async () => {
      const input = {
        board_id: 1,
        column_name: 'To Do',
        title: 'Test Card',
        priority: 'medium'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue([]);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Board has no columns' });

      const tool = registerCreateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should work without WebSocket server', async () => {
      const input = {
        board_id: 1,
        column_name: 'To Do',
        title: 'Test Card',
        priority: 'medium'
      };

      const mockColumns = [{ id: 1, name: 'To Do', position: 0 }];
      const mockCard = { id: 1, title: 'Test Card' };

      jest.doMock('../../types/index.js', () => ({
        CreateCardSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.createCard.mockResolvedValue(mockCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card created' });

      const tool = registerCreateCardTool(mockDb, null as any);
      const result = await tool.handler(input);

      expect(createSuccessResult).toHaveBeenCalled();
      // Should not throw when wsServer is null
    });
  });

  describe('registerUpdateCardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerUpdateCardTool(mockDb, mockWsServer);

      expect(tool.name).toBe('update_card');
      expect(tool.config.title).toBe('Update Card');
      expect(tool.config.description).toBe('Update an existing card');
    });

    it('should update card successfully', async () => {
      const input = {
        card_id: 1,
        title: 'Updated Card',
        description: 'Updated description',
        priority: 'low'
      };

      const updates = {
        title: 'Updated Card',
        description: 'Updated description',
        priority: 'low'
      };

      const mockCard = {
        id: 1,
        board_id: 1,
        title: 'Updated Card',
        description: 'Updated description',
        priority: 'low'
      };

      jest.doMock('../../types/index.js', () => ({
        UpdateCardSchema: {
          parse: jest.fn(() => updates)
        }
      }));

      mockDb.updateCard.mockResolvedValue(mockCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card updated' });

      const tool = registerUpdateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.updateCard).toHaveBeenCalledWith(1, updates);
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'card_updated', mockCard
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated card "Updated Card"')
      );
    });

    it('should handle card not found', async () => {
      const input = { card_id: 999, title: 'Updated' };
      const updates = { title: 'Updated' };

      jest.doMock('../../types/index.js', () => ({
        UpdateCardSchema: {
          parse: jest.fn(() => updates)
        },
        NotFoundError: class NotFoundError extends Error {
          constructor(resource: string, id: any) {
            super(`${resource} with id ${id} not found`);
          }
        }
      }));

      mockDb.updateCard.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Card not found' });

      const tool = registerUpdateCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });
  });

  describe('registerMoveCardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerMoveCardTool(mockDb, mockWsServer);

      expect(tool.name).toBe('move_card');
      expect(tool.config.title).toBe('Move Card');
      expect(tool.config.description).toContain('Move a card to a different column');
    });

    it('should move card by column name', async () => {
      const input = {
        card_id: 1,
        column_name: 'Done',
        position: 0
      };

      const mockCard = { id: 1, board_id: 1, title: 'Test Card' };
      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 },
        { id: 2, name: 'Done', position: 1 }
      ];
      const mockMovedCard = { 
        id: 1, 
        board_id: 1, 
        column_id: 2, 
        title: 'Test Card' 
      };

      jest.doMock('../../types/index.js', () => ({
        MoveCardSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.getCardById.mockResolvedValue(mockCard);
      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.moveCard.mockResolvedValue(mockMovedCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card moved' });

      const tool = registerMoveCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.getCardById).toHaveBeenCalledWith(1);
      expect(mockDb.getColumnsByBoard).toHaveBeenCalledWith(1);
      expect(mockDb.moveCard).toHaveBeenCalledWith(1, 2, 0);
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(
        1, 'card_moved', mockMovedCard
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully moved card "Test Card" to column "Done"')
      );
    });

    it('should move card by column position', async () => {
      const input = {
        card_id: 1,
        column_position: 1,
        position: 0
      };

      const mockCard = { id: 1, board_id: 1, title: 'Test Card' };
      const mockColumns = [
        { id: 1, name: 'To Do', position: 0 },
        { id: 2, name: 'Done', position: 1 }
      ];
      const mockMovedCard = { 
        id: 1, 
        board_id: 1, 
        column_id: 2, 
        title: 'Test Card' 
      };

      jest.doMock('../../types/index.js', () => ({
        MoveCardSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.getCardById.mockResolvedValue(mockCard);
      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);
      mockDb.moveCard.mockResolvedValue(mockMovedCard);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card moved' });

      const tool = registerMoveCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.moveCard).toHaveBeenCalledWith(1, 2, 0);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully moved card "Test Card" to column "Done"')
      );
    });

    it('should handle card not found', async () => {
      const input = { card_id: 999, column_name: 'Done', position: 0 };

      jest.doMock('../../types/index.js', () => ({
        MoveCardSchema: {
          parse: jest.fn(() => input)
        },
        NotFoundError: class NotFoundError extends Error {
          constructor(resource: string, id: any) {
            super(`${resource} with id ${id} not found`);
          }
        }
      }));

      mockDb.getCardById.mockResolvedValue(null);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Card not found' });

      const tool = registerMoveCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle missing column specifiers', async () => {
      const input = { card_id: 1, position: 0 };

      jest.doMock('../../types/index.js', () => ({
        MoveCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Validation error' });

      const tool = registerMoveCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should handle column not found', async () => {
      const input = { card_id: 1, column_name: 'Non-existent', position: 0 };
      const mockCard = { id: 1, board_id: 1, title: 'Test Card' };
      const mockColumns = [{ id: 1, name: 'To Do', position: 0 }];

      jest.doMock('../../types/index.js', () => ({
        MoveCardSchema: {
          parse: jest.fn(() => input)
        },
        ValidationError: class ValidationError extends Error {
          constructor(message: string) {
            super(message);
          }
        }
      }));

      mockDb.getCardById.mockResolvedValue(mockCard);
      mockDb.getColumnsByBoard.mockResolvedValue(mockColumns);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Column not found' });

      const tool = registerMoveCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });
  });

  describe('registerDeleteCardTool', () => {
    it('should return tool configuration', () => {
      const tool = registerDeleteCardTool(mockDb, mockWsServer);

      expect(tool.name).toBe('delete_card');
      expect(tool.config.title).toBe('Delete Card');
      expect(tool.config.description).toBe('Delete a card');
    });

    it('should delete card successfully', async () => {
      const input = { card_id: 1 };

      mockDb.deleteCard.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Card deleted' });

      const tool = registerDeleteCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.deleteCard).toHaveBeenCalledWith(1);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully deleted card (ID: 1)')
      );
    });

    it('should handle card not found', async () => {
      const input = { card_id: 999 };

      mockDb.deleteCard.mockResolvedValue(false);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');  
      createErrorResult.mockReturnValue({ error: 'Card not found' });

      const tool = registerDeleteCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = { card_id: 1 };
      const error = new Error('Database error');

      mockDb.deleteCard.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerDeleteCardTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });
});