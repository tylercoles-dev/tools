/**
 * Memory Tools Unit Tests
 * 
 * Comprehensive test suite for Memory Graph MCP tools
 */

import {
  storeMemoryTool,
  retrieveMemoryTool,
  searchMemoriesTool,
  createConnectionTool,
  getRelatedTool,
  mergeMemoriesTool,
  getMemoryStatsTool,
  createConceptTool
} from './index.js';
import type { MemoryService } from '../services/MemoryService.js';

// Mock the MemoryService
const mockMemoryService = {
  storeMemory: jest.fn(),
  retrieveMemory: jest.fn(),
  searchMemories: jest.fn(),
  createConnection: jest.fn(),
  getRelated: jest.fn(),
  mergeMemories: jest.fn(),
  getMemoryStats: jest.fn(),
} as jest.Mocked<MemoryService>;

describe('Memory Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeMemoryTool', () => {
    it('should store memory successfully', async () => {
      const args = {
        content: 'This is a test memory about artificial intelligence',
        concepts: ['ai', 'machine learning'],
        importance: 4,
        source: 'user_input',
        context: { sessionId: 'test-session' }
      };

      const mockMemory = {
        id: 'mem-123',
        content: args.content,
        concepts: [
          { id: 'concept-1', name: 'ai' },
          { id: 'concept-2', name: 'machine learning' }
        ],
        importance: 4,
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockMemoryService.storeMemory.mockResolvedValue(mockMemory);

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(mockMemoryService.storeMemory).toHaveBeenCalledWith(args);
      expect(result.content[0].text).toContain('Memory stored successfully!');
      expect(result.content[0].text).toContain('ID: mem-123');
      expect(result.content[0].text).toContain('Concepts: ai, machine learning');
      expect(result.content[0].text).toContain('Importance: 4/5');
      expect(result.isError).toBeUndefined();
    });

    it('should handle service errors', async () => {
      const args = {
        content: 'Test memory',
        concepts: ['test'],
        importance: 3
      };

      mockMemoryService.storeMemory.mockRejectedValue(new Error('Database connection failed'));

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to store memory: Database connection failed');
    });

    it('should handle unknown errors', async () => {
      const args = {
        content: 'Test memory',
        concepts: ['test'],
        importance: 3
      };

      mockMemoryService.storeMemory.mockRejectedValue('Unknown error');

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to store memory: Unknown error');
    });

    it('should truncate long content in output', async () => {
      const longContent = 'A'.repeat(200);
      const args = {
        content: longContent,
        concepts: ['test'],
        importance: 3
      };

      const mockMemory = {
        id: 'mem-123',
        content: longContent,
        concepts: [{ id: 'concept-1', name: 'test' }],
        importance: 3,
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockMemoryService.storeMemory.mockResolvedValue(mockMemory);

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Content: ' + 'A'.repeat(100) + '...');
    });
  });

  describe('retrieveMemoryTool', () => {
    it('should retrieve memories successfully', async () => {
      const args = {
        concepts: ['ai', 'technology'],
        limit: 5,
        minImportance: 3
      };

      const mockMemories = [
        {
          id: 'mem-1',
          content: 'First memory about AI technology',
          concepts: [{ id: 'c1', name: 'ai' }, { id: 'c2', name: 'technology' }],
          importance: 4,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'mem-2',
          content: 'Second memory about machine learning',
          concepts: [{ id: 'c1', name: 'ai' }, { id: 'c3', name: 'ml' }],
          importance: 5,
          createdAt: '2024-01-02T00:00:00.000Z'
        }
      ];

      mockMemoryService.retrieveMemory.mockResolvedValue(mockMemories);

      const result = await retrieveMemoryTool(mockMemoryService, args);

      expect(mockMemoryService.retrieveMemory).toHaveBeenCalledWith(args);
      expect(result.content[0].text).toContain('Found 2 memories:');
      expect(result.content[0].text).toContain('ID: mem-1');
      expect(result.content[0].text).toContain('ID: mem-2');
      expect(result.content[0].text).toContain('First memory about AI technology');
      expect(result.content[0].text).toContain('Second memory about machine learning');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty results', async () => {
      const args = { concepts: ['nonexistent'] };

      mockMemoryService.retrieveMemory.mockResolvedValue([]);

      const result = await retrieveMemoryTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Found 0 memories:');
    });

    it('should handle service errors', async () => {
      const args = { concepts: ['test'] };

      mockMemoryService.retrieveMemory.mockRejectedValue(new Error('Query failed'));

      const result = await retrieveMemoryTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to retrieve memories: Query failed');
    });
  });

  describe('searchMemoriesTool', () => {
    it('should search memories successfully', async () => {
      const args = {
        query: 'artificial intelligence',
        limit: 10,
        threshold: 0.7
      };

      const mockResult = {
        memories: [
          {
            id: 'mem-1',
            content: 'Memory about artificial intelligence and its applications',
            concepts: [{ id: 'c1', name: 'ai' }],
            importance: 4,
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        total: 1,
        processingTimeMs: 45
      };

      mockMemoryService.searchMemories.mockResolvedValue(mockResult);

      const result = await searchMemoriesTool(mockMemoryService, args);

      expect(mockMemoryService.searchMemories).toHaveBeenCalledWith(args);
      expect(result.content[0].text).toContain('Search Results (1 found, 45ms):');
      expect(result.content[0].text).toContain('ID: mem-1');
      expect(result.content[0].text).toContain('artificial intelligence and its applications');
      expect(result.isError).toBeUndefined();
    });

    it('should handle no search results', async () => {
      const args = { query: 'nonexistent topic' };

      const mockResult = {
        memories: [],
        total: 0,
        processingTimeMs: 12
      };

      mockMemoryService.searchMemories.mockResolvedValue(mockResult);

      const result = await searchMemoriesTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Search Results (0 found, 12ms):');
    });

    it('should handle service errors', async () => {
      const args = { query: 'test' };

      mockMemoryService.searchMemories.mockRejectedValue(new Error('Search index unavailable'));

      const result = await searchMemoriesTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to search memories: Search index unavailable');
    });
  });

  describe('createConnectionTool', () => {
    it('should create connection successfully', async () => {
      const args = {
        sourceId: 'mem-1',
        targetId: 'mem-2',
        relationshipType: 'relates_to',
        strength: 0.8,
        context: 'Both memories discuss AI applications'
      };

      mockMemoryService.createConnection.mockResolvedValue(undefined);

      const result = await createConnectionTool(mockMemoryService, args);

      expect(mockMemoryService.createConnection).toHaveBeenCalledWith(args);
      expect(result.content[0].text).toContain('Connection created successfully between mem-1 and mem-2 (relates_to)');
      expect(result.isError).toBeUndefined();
    });

    it('should handle service errors', async () => {
      const args = {
        sourceId: 'mem-1',
        targetId: 'nonexistent',
        relationshipType: 'relates_to'
      };

      mockMemoryService.createConnection.mockRejectedValue(new Error('Target memory not found'));

      const result = await createConnectionTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to create connection: Target memory not found');
    });
  });

  describe('getRelatedTool', () => {
    it('should get related memories successfully', async () => {
      const args = {
        memoryId: 'mem-1',
        maxDepth: 2,
        minStrength: 0.5
      };

      const mockResult = {
        centerMemory: {
          id: 'mem-1',
          content: 'Central memory about artificial intelligence research',
          concepts: [{ id: 'c1', name: 'ai' }],
          importance: 5,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        relatedNodes: [
          {
            memory: {
              id: 'mem-2',
              content: 'Related memory about machine learning algorithms',
              concepts: [{ id: 'c2', name: 'ml' }],
              importance: 4,
              createdAt: '2024-01-02T00:00:00.000Z'
            },
            relationship: {
              relationshipType: 'builds_upon',
              strength: 0.9,
              context: 'ML is a subset of AI'
            }
          }
        ]
      };

      mockMemoryService.getRelated.mockResolvedValue(mockResult);

      const result = await getRelatedTool(mockMemoryService, args);

      expect(mockMemoryService.getRelated).toHaveBeenCalledWith('mem-1', 2, 0.5);
      expect(result.content[0].text).toContain('Related memories for mem-1:');
      expect(result.content[0].text).toContain('Center Memory: Central memory about artificial intelligence research');
      expect(result.content[0].text).toContain('Related (1):');
      expect(result.content[0].text).toContain('ID: mem-2');
      expect(result.content[0].text).toContain('Relationship: builds_upon (strength: 0.9)');
      expect(result.isError).toBeUndefined();
    });

    it('should handle no related memories', async () => {
      const args = { memoryId: 'mem-isolated' };

      const mockResult = {
        centerMemory: {
          id: 'mem-isolated',
          content: 'Isolated memory with no connections',
          concepts: [],
          importance: 3,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        relatedNodes: []
      };

      mockMemoryService.getRelated.mockResolvedValue(mockResult);

      const result = await getRelatedTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Related (0):');
    });

    it('should handle service errors', async () => {
      const args = { memoryId: 'nonexistent' };

      mockMemoryService.getRelated.mockRejectedValue(new Error('Memory not found'));

      const result = await getRelatedTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get related memories: Memory not found');
    });
  });

  describe('mergeMemoriesTool', () => {
    it('should merge memories successfully', async () => {
      const args = {
        primaryMemoryId: 'mem-1',
        secondaryMemoryIds: ['mem-2', 'mem-3'],
        strategy: 'combine_content'
      };

      const mockMergedMemory = {
        id: 'mem-merged',
        content: 'Combined content from multiple memories',
        concepts: [{ id: 'c1', name: 'combined' }],
        importance: 5,
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockMemoryService.mergeMemories.mockResolvedValue(mockMergedMemory);

      const result = await mergeMemoriesTool(mockMemoryService, args);

      expect(mockMemoryService.mergeMemories).toHaveBeenCalledWith('mem-1', ['mem-2', 'mem-3'], 'combine_content');
      expect(result.content[0].text).toContain('Memories merged successfully into mem-merged');
      expect(result.isError).toBeUndefined();
    });

    it('should handle service errors', async () => {
      const args = {
        primaryMemoryId: 'mem-1',
        secondaryMemoryIds: ['nonexistent'],
        strategy: 'combine_content'
      };

      mockMemoryService.mergeMemories.mockRejectedValue(new Error('Secondary memory not found'));

      const result = await mergeMemoriesTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to merge memories: Secondary memory not found');
    });
  });

  describe('getMemoryStatsTool', () => {
    it('should get memory statistics successfully', async () => {
      const args = {};

      const mockStats = {
        totalMemories: 1250,
        totalRelationships: 890,
        totalConcepts: 340,
        averageImportance: 3.7
      };

      mockMemoryService.getMemoryStats.mockResolvedValue(mockStats);

      const result = await getMemoryStatsTool(mockMemoryService, args);

      expect(mockMemoryService.getMemoryStats).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Memory Statistics:');
      expect(result.content[0].text).toContain('Total Memories: 1250');
      expect(result.content[0].text).toContain('Total Relationships: 890');
      expect(result.content[0].text).toContain('Total Concepts: 340');
      expect(result.content[0].text).toContain('Average Importance: 3.7/5');
      expect(result.isError).toBeUndefined();
    });

    it('should handle service errors', async () => {
      const args = {};

      mockMemoryService.getMemoryStats.mockRejectedValue(new Error('Stats calculation failed'));

      const result = await getMemoryStatsTool(mockMemoryService, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get memory statistics: Stats calculation failed');
    });
  });

  describe('createConceptTool', () => {
    it('should return not implemented message', async () => {
      const args = { name: 'test-concept' };

      const result = await createConceptTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Create concept tool not yet implemented');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Error objects properly', async () => {
      const args = { content: 'test', concepts: ['test'], importance: 3 };
      const error = new Error('Specific error message');

      mockMemoryService.storeMemory.mockRejectedValue(error);

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Failed to store memory: Specific error message');
    });

    it('should handle non-Error objects', async () => {
      const args = { content: 'test', concepts: ['test'], importance: 3 };
      const error = { message: 'Custom error object' };

      mockMemoryService.storeMemory.mockRejectedValue(error);

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Failed to store memory: Unknown error');
    });

    it('should handle null/undefined errors', async () => {
      const args = { content: 'test', concepts: ['test'], importance: 3 };

      mockMemoryService.storeMemory.mockRejectedValue(null);

      const result = await storeMemoryTool(mockMemoryService, args);

      expect(result.content[0].text).toContain('Failed to store memory: Unknown error');
    });
  });

  describe('Content Truncation', () => {
    it('should truncate long content consistently across tools', async () => {
      const longContent = 'A'.repeat(200);

      // Test storeMemoryTool
      const mockMemory = {
        id: 'mem-1',
        content: longContent,
        concepts: [{ id: 'c1', name: 'test' }],
        importance: 3,
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockMemoryService.storeMemory.mockResolvedValue(mockMemory);

      const storeResult = await storeMemoryTool(mockMemoryService, {
        content: longContent,
        concepts: ['test'],
        importance: 3
      });

      expect(storeResult.content[0].text).toContain('A'.repeat(100) + '...');

      // Test retrieveMemoryTool
      mockMemoryService.retrieveMemory.mockResolvedValue([mockMemory]);

      const retrieveResult = await retrieveMemoryTool(mockMemoryService, { concepts: ['test'] });

      expect(retrieveResult.content[0].text).toContain('A'.repeat(100) + '...');

      // Test searchMemoriesTool
      mockMemoryService.searchMemories.mockResolvedValue({
        memories: [mockMemory],
        total: 1,
        processingTimeMs: 10
      });

      const searchResult = await searchMemoriesTool(mockMemoryService, { query: 'test' });

      expect(searchResult.content[0].text).toContain('A'.repeat(100) + '...');
    });
  });
});