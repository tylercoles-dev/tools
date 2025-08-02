/**
 * Tag Tools Unit Tests
 * 
 * Comprehensive test suite for Kanban tag MCP tools
 */

import {
  registerGetTagsTool,
  registerCreateTagTool,
  registerAddCardTagTool,
  registerRemoveCardTagTool
} from './tag-tools.js';
import { ValidationError } from '../../types/index.js';
import type { KanbanDatabase } from '../../database/index.js';
import type { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server', () => ({
  EmptySchema: {},
}));

jest.mock('@tylercoles/mcp-server/dist/tools.js', () => ({
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
}));

describe('Tag Tools', () => {
  let mockDb: jest.Mocked<KanbanDatabase>;
  let mockWsServer: jest.Mocked<KanbanWebSocketServer>;

  beforeEach(() => {
    mockDb = {
      getTags: jest.fn(),
      createTag: jest.fn(),
      addCardTag: jest.fn(),
      removeCardTag: jest.fn(),
    } as any;

    mockWsServer = {
      broadcastToBoardClients: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerGetTagsTool', () => {
    it('should return tool configuration', () => {
      const tool = registerGetTagsTool(mockDb, mockWsServer);

      expect(tool.name).toBe('get_tags');
      expect(tool.config.title).toBe('Get All Tags');
      expect(tool.config.description).toBe('Retrieve all available tags');
    });

    it('should get all tags successfully', async () => {
      const mockTags = [
        {
          id: 1,
          name: 'urgent',
          color: '#ef4444'
        },
        {
          id: 2,
          name: 'enhancement',
          color: '#10b981'
        },
        {
          id: 3,
          name: 'bug',
          color: '#f59e0b'
        }
      ];

      mockDb.getTags.mockResolvedValue(mockTags);

      const tool = registerGetTagsTool(mockDb, mockWsServer);
      const result = await tool.handler();

      expect(mockDb.getTags).toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Found 3 tags:')
          }
        ]
      });
      expect(result.content[0].text).toContain('urgent');
      expect(result.content[0].text).toContain('enhancement');
      expect(result.content[0].text).toContain('bug');
      expect(result.content[0].text).toContain('#ef4444');
      expect(result.content[0].text).toContain('#10b981');
      expect(result.content[0].text).toContain('#f59e0b');
    });

    it('should handle empty tag list', async () => {
      mockDb.getTags.mockResolvedValue([]);

      const tool = registerGetTagsTool(mockDb, mockWsServer);
      const result = await tool.handler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Found 0 tags:\n\n'
          }
        ]
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.getTags.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerGetTagsTool(mockDb, mockWsServer);
      const result = await tool.handler();

      expect(createErrorResult).toHaveBeenCalledWith(error);
      expect(result).toEqual({ error: 'Database error' });
    });
  });

  describe('registerCreateTagTool', () => {
    it('should return tool configuration', () => {
      const tool = registerCreateTagTool(mockDb, mockWsServer);

      expect(tool.name).toBe('create_tag');
      expect(tool.config.title).toBe('Create Tag');
      expect(tool.config.description).toBe('Create a new tag');
    });

    it('should create tag successfully', async () => {
      const input = {
        name: 'feature',
        color: '#6366f1'
      };

      const mockTag = {
        id: 1,
        name: 'feature',
        color: '#6366f1'
      };

      // Mock successful validation
      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateTagSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      mockDb.createTag.mockResolvedValue(mockTag);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Tag created' });

      const tool = registerCreateTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createTag).toHaveBeenCalledWith(input);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully created tag "feature"')
      );
    });

    it('should handle validation errors', async () => {
      const input = { name: '', color: 'invalid-color' }; // Invalid input

      const mockParseResult = {
        success: false,
        error: {
          errors: [
            { path: ['name'], message: 'String must contain at least 1 character(s)' },
            { path: ['color'], message: 'Invalid color format' }
          ]
        }
      };

      jest.doMock('../../types/index.js', () => ({
        CreateTagSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Validation failed' });

      const tool = registerCreateTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.createTag).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle database errors', async () => {
      const input = {
        name: 'feature',
        color: '#6366f1'
      };

      const mockParseResult = {
        success: true,
        data: input
      };

      jest.doMock('../../types/index.js', () => ({
        CreateTagSchema: {
          safeParse: jest.fn(() => mockParseResult)
        }
      }));

      const error = new Error('Database error');
      mockDb.createTag.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerCreateTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerAddCardTagTool', () => {
    it('should return tool configuration', () => {
      const tool = registerAddCardTagTool(mockDb, mockWsServer);

      expect(tool.name).toBe('add_card_tag');
      expect(tool.config.title).toBe('Add Tag to Card');
      expect(tool.config.description).toBe('Add a tag to a card');
    });

    it('should add tag to card successfully', async () => {
      const input = {
        card_id: 1,
        tag_id: 2
      };

      mockDb.addCardTag.mockResolvedValue(undefined);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Tag added' });

      const tool = registerAddCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.addCardTag).toHaveBeenCalledWith(1, 2);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully added tag 2 to card 1')
      );
    });

    it('should handle database errors', async () => {
      const input = {
        card_id: 1,
        tag_id: 2
      };

      const error = new Error('Foreign key constraint failed');
      mockDb.addCardTag.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Foreign key constraint failed' });

      const tool = registerAddCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });

    it('should handle duplicate tag assignment', async () => {
      const input = {
        card_id: 1,
        tag_id: 2
      };

      const error = new Error('UNIQUE constraint failed');
      mockDb.addCardTag.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'UNIQUE constraint failed' });

      const tool = registerAddCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerRemoveCardTagTool', () => {
    it('should return tool configuration', () => {
      const tool = registerRemoveCardTagTool(mockDb, mockWsServer);

      expect(tool.name).toBe('remove_card_tag');
      expect(tool.config.title).toBe('Remove Tag from Card');
      expect(tool.config.description).toBe('Remove a tag from a card');
    });

    it('should remove tag from card successfully', async () => {
      const input = {
        card_id: 1,
        tag_id: 2
      };

      mockDb.removeCardTag.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Tag removed' });

      const tool = registerRemoveCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.removeCardTag).toHaveBeenCalledWith(1, 2);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully removed tag 2 from card 1')
      );
    });

    it('should handle tag not found on card', async () => {
      const input = {
        card_id: 1,
        tag_id: 999
      };

      mockDb.removeCardTag.mockResolvedValue(false);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Tag not found on card' });

      const tool = registerRemoveCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should handle database errors', async () => {
      const input = {
        card_id: 1,
        tag_id: 2
      };

      const error = new Error('Database error');
      mockDb.removeCardTag.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerRemoveCardTagTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });
});