/**
 * Comment Tools Unit Tests
 * 
 * Comprehensive test suite for Kanban comment MCP tools
 */

import {
  registerAddCommentTool,
  registerGetCommentsTool,
  registerDeleteCommentTool
} from './comment-tools.js';
import { NotFoundError } from '../../types/index.js';
import type { KanbanDatabase } from '../../database/index.js';
import type { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server/dist/tools.js', () => ({
  createErrorResult: jest.fn((error) => ({ error: error.message })),
  createSuccessResult: jest.fn((message) => ({ success: message })),
}));

describe('Comment Tools', () => {
  let mockDb: jest.Mocked<KanbanDatabase>;
  let mockWsServer: jest.Mocked<KanbanWebSocketServer>;

  beforeEach(() => {
    mockDb = {
      addComment: jest.fn(),
      getCardComments: jest.fn(),
      deleteComment: jest.fn(),
    } as any;

    mockWsServer = {
      broadcastToBoardClients: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerAddCommentTool', () => {
    it('should return tool configuration', () => {
      const tool = registerAddCommentTool(mockDb, mockWsServer);

      expect(tool.name).toBe('add_comment');
      expect(tool.config.title).toBe('Add Comment');
      expect(tool.config.description).toBe('Add a comment to a card');
    });

    it('should add comment with author', async () => {
      const input = {
        card_id: 1,
        content: 'This is a test comment',
        author: 'john.doe'
      };

      const mockComment = {
        id: 1,
        card_id: 1,
        content: 'This is a test comment',
        author: 'john.doe',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCommentSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.addComment.mockResolvedValue(mockComment);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Comment added' });

      const tool = registerAddCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.addComment).toHaveBeenCalledWith({
        card_id: 1,
        content: 'This is a test comment',
        author: 'john.doe'
      });
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully added comment to card 1')
      );
    });

    it('should add comment without author (anonymous)', async () => {
      const input = {
        card_id: 1,
        content: 'Anonymous comment'
      };

      const mockComment = {
        id: 1,
        card_id: 1,
        content: 'Anonymous comment',
        author: null,
        created_at: '2024-01-01T00:00:00.000Z'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCommentSchema: {
          parse: jest.fn(() => input)
        }
      }));

      mockDb.addComment.mockResolvedValue(mockComment);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Comment added' });

      const tool = registerAddCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.addComment).toHaveBeenCalledWith({
        card_id: 1,
        content: 'Anonymous comment',
        author: null
      });
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully added comment to card 1')
      );
    });

    it('should handle schema validation errors', async () => {
      const input = { card_id: '', content: '' }; // Invalid input

      const error = new Error('Validation failed');
      
      jest.doMock('../../types/index.js', () => ({
        CreateCommentSchema: {
          parse: jest.fn(() => { throw error; })
        }
      }));

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Validation failed' });

      const tool = registerAddCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.addComment).not.toHaveBeenCalled();
      expect(createErrorResult).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toEqual({ error: 'Validation failed' });
    });

    it('should handle database errors', async () => {
      const input = {
        card_id: 1,
        content: 'Test comment',
        author: 'user1'
      };

      jest.doMock('../../types/index.js', () => ({
        CreateCommentSchema: {
          parse: jest.fn(() => input)
        }
      }));

      const error = new Error('Database error');
      mockDb.addComment.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerAddCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerGetCommentsTool', () => {
    it('should return tool configuration', () => {
      const tool = registerGetCommentsTool(mockDb, mockWsServer);

      expect(tool.name).toBe('get_comments');
      expect(tool.config.title).toBe('Get Card Comments');
      expect(tool.config.description).toBe('Get all comments for a card');
    });

    it('should get comments with authors', async () => {
      const input = { card_id: 1 };

      const mockComments = [
        {
          id: 1,
          card_id: 1,
          content: 'First comment',
          author: 'john.doe',
          created_at: '2024-01-01T10:00:00.000Z'
        },
        {
          id: 2,
          card_id: 1,
          content: 'Second comment',
          author: 'jane.smith',
          created_at: '2024-01-01T11:00:00.000Z'
        }
      ];

      mockDb.getCardComments.mockResolvedValue(mockComments);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Comments retrieved' });

      const tool = registerGetCommentsTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.getCardComments).toHaveBeenCalledWith(1);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 comments for card 1')
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('john.doe')
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('jane.smith')
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('First comment')
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Second comment')
      );
    });

    it('should get comments with anonymous authors', async () => {
      const input = { card_id: 1 };

      const mockComments = [
        {
          id: 1,
          card_id: 1,
          content: 'Anonymous comment',
          author: null,
          created_at: '2024-01-01T10:00:00.000Z'
        }
      ];

      mockDb.getCardComments.mockResolvedValue(mockComments);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Comments retrieved' });

      const tool = registerGetCommentsTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Anonymous')
      );
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Anonymous comment')
      );
    });

    it('should handle empty comment list', async () => {
      const input = { card_id: 1 };

      mockDb.getCardComments.mockResolvedValue([]);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'No comments' });

      const tool = registerGetCommentsTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Found 0 comments for card 1')
      );
    });

    it('should handle database errors', async () => {
      const input = { card_id: 1 };
      const error = new Error('Database error');

      mockDb.getCardComments.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerGetCommentsTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });

  describe('registerDeleteCommentTool', () => {
    it('should return tool configuration', () => {
      const tool = registerDeleteCommentTool(mockDb, mockWsServer);

      expect(tool.name).toBe('delete_comment');
      expect(tool.config.title).toBe('Delete Comment');
      expect(tool.config.description).toBe('Delete a comment');
    });

    it('should delete comment successfully', async () => {
      const input = { comment_id: 1 };

      mockDb.deleteComment.mockResolvedValue(true);

      const { createSuccessResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createSuccessResult.mockReturnValue({ success: 'Comment deleted' });

      const tool = registerDeleteCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(mockDb.deleteComment).toHaveBeenCalledWith(1);
      expect(createSuccessResult).toHaveBeenCalledWith(
        expect.stringContaining('Successfully deleted comment (ID: 1)')
      );
    });

    it('should handle comment not found', async () => {
      const input = { comment_id: 999 };

      mockDb.deleteComment.mockResolvedValue(false);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Comment not found' });

      const tool = registerDeleteCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle database errors', async () => {
      const input = { comment_id: 1 };
      const error = new Error('Database error');

      mockDb.deleteComment.mockRejectedValue(error);

      const { createErrorResult } = require('@tylercoles/mcp-server/dist/tools.js');
      createErrorResult.mockReturnValue({ error: 'Database error' });

      const tool = registerDeleteCommentTool(mockDb, mockWsServer);
      const result = await tool.handler(input);

      expect(createErrorResult).toHaveBeenCalledWith(error);
    });
  });
});