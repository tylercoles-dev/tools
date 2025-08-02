/**
 * Memory Service Unit Tests
 * 
 * Comprehensive test suite for MemoryService business logic
 */

import { MemoryService } from './service.js';
import { MemoryError, MemoryNotFoundError } from './types.js';
import { 
  createMockMemoryDatabase, 
  createMockVectorEngine,
  mockMemoryData,
  setupMemoryDatabaseMocks,
  setupVectorEngineMocks
} from '../../__tests__/utils/mock-memory.js';
import type { MemoryDatabaseManager } from './database.js';
import type { VectorEngine } from './vectorEngine.js';

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-123')
  }))
}));

// Mock validation utility
jest.mock('../../utils/validation.js', () => ({
  validateInput: jest.fn((schema, input) => input)
}));

describe('MemoryService', () => {
  let service: MemoryService;
  let mockDb: jest.Mocked<MemoryDatabaseManager>;
  let mockVectorEngine: jest.Mocked<VectorEngine>;

  beforeEach(() => {
    mockDb = createMockMemoryDatabase();
    mockVectorEngine = createMockVectorEngine();
    setupMemoryDatabaseMocks(mockDb);
    setupVectorEngineMocks(mockVectorEngine);
    service = new MemoryService(mockDb, mockVectorEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeMemory', () => {
    const validInput = {
      content: 'Test memory content',
      context: { userId: 'user1', source: 'test' },
      concepts: ['concept1', 'concept2'],
      importance: 3
    };

    it('should store new memory successfully', async () => {
      // Mock no existing memory with same hash
      mockDb.searchMemories.mockResolvedValueOnce([]);
      
      const result = await service.storeMemory(validInput);

      expect(mockDb.createMemory).toHaveBeenCalledWith({
        content: validInput.content,
        content_hash: 'mocked-hash-123',
        context: JSON.stringify(validInput.context),
        importance: validInput.importance,
        status: 'active',
        access_count: 0,
        last_accessed_at: null,
        vector_id: null,
        created_by: 'user1',
        metadata: JSON.stringify({})
      });

      expect(mockVectorEngine.indexMemory).toHaveBeenCalledWith(
        mockMemoryData.memory.id,
        validInput.content,
        validInput.context
      );

      expect(result).toEqual({
        id: mockMemoryData.memory.id,
        content: mockMemoryData.memory.content,
        contentHash: mockMemoryData.memory.content_hash,
        context: JSON.parse(mockMemoryData.memory.context),
        concepts: expect.any(Array),
        importance: mockMemoryData.memory.importance,
        status: mockMemoryData.memory.status,
        accessCount: mockMemoryData.memory.access_count,
        lastAccessedAt: mockMemoryData.memory.last_accessed_at,
        vectorId: mockMemoryData.memory.vector_id,
        createdAt: mockMemoryData.memory.created_at,
        updatedAt: mockMemoryData.memory.updated_at,
        createdBy: mockMemoryData.memory.created_by,
        metadata: JSON.parse(mockMemoryData.memory.metadata)
      });
    });

    it('should return existing memory when duplicate content detected', async () => {
      // Mock existing memory with same hash
      mockDb.searchMemories.mockResolvedValueOnce([mockMemoryData.memory]);

      const result = await service.storeMemory(validInput);

      expect(mockDb.createMemory).not.toHaveBeenCalled();
      expect(result.id).toBe(mockMemoryData.memory.id);
    });

    it('should create concepts when they do not exist', async () => {
      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockDb.findConceptByName.mockResolvedValue(null);

      await service.storeMemory(validInput);

      expect(mockDb.createConcept).toHaveBeenCalledTimes(2);
      expect(mockDb.createConcept).toHaveBeenCalledWith({
        name: 'concept1',
        description: null,
        type: 'topic',
        confidence: 0.8,
        extracted_at: expect.any(String)
      });
    });

    it('should reuse existing concepts', async () => {
      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockDb.findConceptByName.mockResolvedValue(mockMemoryData.concept);

      await service.storeMemory(validInput);

      expect(mockDb.createConcept).not.toHaveBeenCalled();
      expect(mockDb.linkMemoryConcept).toHaveBeenCalledTimes(2);
    });

    it('should extract concepts automatically when not provided', async () => {
      const inputWithoutConcepts = {
        content: 'Test memory with important technical concepts',
        context: { userId: 'user1' }
      };

      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockDb.findConceptByName.mockResolvedValue(null);

      await service.storeMemory(inputWithoutConcepts);

      // Should have extracted concepts from content
      expect(mockDb.createConcept).toHaveBeenCalled();
    });

    it('should update memory with vector ID after indexing', async () => {
      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockVectorEngine.indexMemory.mockResolvedValue('new-vector-id');

      await service.storeMemory(validInput);

      expect(mockDb.updateMemory).toHaveBeenCalledWith(
        mockMemoryData.memory.id,
        { vector_id: 'new-vector-id' }
      );
    });

    it('should create automatic relationships with similar memories', async () => {
      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockVectorEngine.findSimilar.mockResolvedValue([
        { memoryId: 'similar-memory-1', similarity: 0.85, content: 'Similar content' }
      ]);

      await service.storeMemory(validInput);

      expect(mockDb.createRelationship).toHaveBeenCalledWith({
        source_id: mockMemoryData.memory.id,
        target_id: 'similar-memory-1',
        relationship_type: 'semantic_similarity',
        strength: 0.85,
        bidirectional: true,
        metadata: JSON.stringify({ auto_generated: true }),
        last_updated: expect.any(String)
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock no existing memory first, then error on create
      mockDb.searchMemories.mockResolvedValueOnce([]);
      mockDb.createMemory.mockRejectedValue(new Error('Database error'));

      await expect(service.storeMemory(validInput))
        .rejects.toThrow('Database error');
    });
  });

  describe('retrieveMemories', () => {
    it('should retrieve memories with vector search', async () => {
      const input = {
        query: 'test query',
        limit: 5,
        similarityThreshold: 0.8
      };

      mockVectorEngine.findSimilar.mockResolvedValue([
        { memoryId: 'memory-1', similarity: 0.9, content: 'Test content' }
      ]);

      const result = await service.retrieveMemories(input);

      expect(mockVectorEngine.findSimilar).toHaveBeenCalledWith(
        input.query,
        input.similarityThreshold,
        input.limit
      );

      expect(mockDb.searchMemories).toHaveBeenCalledWith({
        status: 'active',
        limit: input.limit
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockMemoryData.memory.id);
    });

    it('should retrieve memories without vector search when no query', async () => {
      const input = { limit: 10 };

      const result = await service.retrieveMemories(input);

      expect(mockVectorEngine.findSimilar).not.toHaveBeenCalled();
      expect(mockDb.searchMemories).toHaveBeenCalledWith({
        status: 'active',
        limit: input.limit
      });

      expect(result).toHaveLength(1);
    });

    it('should filter by userId when provided', async () => {
      const input = { userId: 'user1', limit: 10 };

      await service.retrieveMemories(input);

      expect(mockDb.searchMemories).toHaveBeenCalledWith({
        status: 'active',
        limit: input.limit,
        createdBy: 'user1'
      });
    });

    it('should include concepts for each memory', async () => {
      const result = await service.retrieveMemories({ limit: 5 });

      expect(mockDb.getMemoryConcepts).toHaveBeenCalledWith(mockMemoryData.memory.id);
      expect(result[0].concepts).toEqual([{
        id: mockMemoryData.concept.id,
        name: mockMemoryData.concept.name,
        description: mockMemoryData.concept.description,
        type: mockMemoryData.concept.type,
        confidence: mockMemoryData.concept.confidence,
        extractedAt: mockMemoryData.concept.extracted_at
      }]);
    });

    it('should handle errors gracefully', async () => {
      mockDb.searchMemories.mockRejectedValue(new Error('Database error'));

      await expect(service.retrieveMemories({ limit: 5 }))
        .rejects.toThrow('Database error');
    });
  });

  describe('searchMemories', () => {
    it('should perform vector search and return results with timing', async () => {
      const input = {
        query: 'search query',
        limit: 10,
        similarityThreshold: 0.7
      };

      mockVectorEngine.findSimilar.mockResolvedValue([
        { memoryId: 'memory-1', similarity: 0.9, content: 'Test content' }
      ]);

      const result = await service.searchMemories(input);

      expect(mockVectorEngine.findSimilar).toHaveBeenCalledWith(
        input.query,
        input.similarityThreshold,
        input.limit
      );

      expect(result).toEqual({
        memories: expect.any(Array),
        total: 1,
        processingTimeMs: expect.any(Number)
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should filter out inactive memories', async () => {
      const inactiveMemory = { ...mockMemoryData.memory, status: 'archived' as const };
      mockDb.getMemory.mockResolvedValue(inactiveMemory);

      const result = await service.searchMemories({ query: 'test' });

      expect(result.memories).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle memories that no longer exist', async () => {
      mockVectorEngine.findSimilar.mockResolvedValue([
        { memoryId: 'nonexistent', similarity: 0.9, content: 'Test' }
      ]);
      mockDb.getMemory.mockResolvedValue(null);

      const result = await service.searchMemories({ query: 'test' });

      expect(result.memories).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockVectorEngine.findSimilar.mockRejectedValue(new Error('Vector search error'));

      await expect(service.searchMemories({ query: 'test' }))
        .rejects.toThrow('Vector search error');
    });
  });

  describe('createConnection', () => {
    const validInput = {
      sourceId: 'memory-1',
      targetId: 'memory-2',
      relationshipType: 'semantic_similarity' as const,
      strength: 0.8,
      bidirectional: true,
      metadata: { note: 'test relationship' }
    };

    it('should create connection between existing memories', async () => {
      const targetMemory = { ...mockMemoryData.memory, id: 'memory-2' };
      mockDb.getMemory
        .mockResolvedValueOnce(mockMemoryData.memory)
        .mockResolvedValueOnce(targetMemory);

      await service.createConnection(validInput);

      expect(mockDb.createRelationship).toHaveBeenCalledWith({
        source_id: validInput.sourceId,
        target_id: validInput.targetId,
        relationship_type: validInput.relationshipType,
        strength: validInput.strength,
        bidirectional: validInput.bidirectional,
        metadata: JSON.stringify(validInput.metadata),
        last_updated: expect.any(String)
      });
    });

    it('should use default values for optional fields', async () => {
      const minimalInput = {
        sourceId: 'memory-1',
        targetId: 'memory-2',
        relationshipType: 'semantic_similarity' as const
      };

      mockDb.getMemory.mockResolvedValue(mockMemoryData.memory);

      await service.createConnection(minimalInput);

      expect(mockDb.createRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          strength: 1.0,
          bidirectional: false,
          metadata: JSON.stringify({})
        })
      );
    });

    it('should throw MemoryError when source memory does not exist', async () => {
      mockDb.getMemory
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockMemoryData.memory);

      await expect(service.createConnection(validInput))
        .rejects.toThrow(MemoryError);
    });

    it('should throw MemoryError when target memory does not exist', async () => {
      mockDb.getMemory
        .mockResolvedValueOnce(mockMemoryData.memory)
        .mockResolvedValueOnce(null);

      await expect(service.createConnection(validInput))
        .rejects.toThrow(MemoryError);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.getMemory.mockResolvedValue(mockMemoryData.memory);
      mockDb.createRelationship.mockRejectedValue(new Error('Database error'));

      await expect(service.createConnection(validInput))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRelatedMemories', () => {
    it('should return center memory with related memories', async () => {
      const relatedMemory = { ...mockMemoryData.memory, id: 'memory-2' };
      
      mockDb.getMemory
        .mockResolvedValueOnce(mockMemoryData.memory)
        .mockResolvedValueOnce(relatedMemory);
      
      mockDb.getRelationships.mockResolvedValue([mockMemoryData.relationship]);

      const result = await service.getRelatedMemories('memory-1');

      expect(result.centerMemory.id).toBe('memory-1');
      expect(result.relatedNodes).toHaveLength(1);
      expect(result.relatedNodes[0].memory.id).toBe('memory-2');
      expect(result.relatedNodes[0].relationship).toEqual({
        id: mockMemoryData.relationship.id,
        sourceId: mockMemoryData.relationship.source_id,
        targetId: mockMemoryData.relationship.target_id,
        relationshipType: mockMemoryData.relationship.relationship_type,
        strength: mockMemoryData.relationship.strength,
        bidirectional: mockMemoryData.relationship.bidirectional,
        metadata: JSON.parse(mockMemoryData.relationship.metadata),
        lastUpdated: mockMemoryData.relationship.last_updated,
        createdAt: mockMemoryData.relationship.created_at,
        updatedAt: mockMemoryData.relationship.updated_at
      });
      expect(result.relatedNodes[0].distance).toBe(1);
    });

    it('should throw MemoryNotFoundError when center memory does not exist', async () => {
      mockDb.getMemory.mockResolvedValue(null);

      await expect(service.getRelatedMemories('nonexistent'))
        .rejects.toThrow(MemoryNotFoundError);
    });

    it('should handle inactive related memories', async () => {
      const inactiveMemory = { ...mockMemoryData.memory, id: 'memory-2', status: 'archived' as const };
      
      mockDb.getMemory
        .mockResolvedValueOnce(mockMemoryData.memory)
        .mockResolvedValueOnce(inactiveMemory);
      
      mockDb.getRelationships.mockResolvedValue([mockMemoryData.relationship]);

      const result = await service.getRelatedMemories('memory-1');

      expect(result.relatedNodes).toHaveLength(0);
    });

    it('should include concepts for center memory', async () => {
      mockDb.getRelationships.mockResolvedValue([]);

      const result = await service.getRelatedMemories('memory-1');

      expect(result.concepts).toEqual([{
        id: mockMemoryData.concept.id,
        name: mockMemoryData.concept.name,
        description: mockMemoryData.concept.description,
        type: mockMemoryData.concept.type,
        confidence: mockMemoryData.concept.confidence,
        extractedAt: mockMemoryData.concept.extracted_at
      }]);
    });

    it('should handle errors gracefully', async () => {
      mockDb.getMemory.mockRejectedValue(new Error('Database error'));

      await expect(service.getRelatedMemories('memory-1'))
        .rejects.toThrow('Database error');
    });
  });

  describe('getStats', () => {
    it('should return memory statistics', async () => {
      const result = await service.getStats();

      expect(mockDb.getMemoryStats).toHaveBeenCalled();
      expect(result).toEqual({
        totalMemories: mockMemoryData.memoryStats.totalMemories,
        totalRelationships: mockMemoryData.memoryStats.totalRelationships,
        totalConcepts: mockMemoryData.memoryStats.totalConcepts,
        averageImportance: 2.5, // TODO: Implement
        mostActiveUsers: [], // TODO: Implement
        topProjects: [], // TODO: Implement
        conceptDistribution: {} // TODO: Implement
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.getMemoryStats.mockRejectedValue(new Error('Database error'));

      await expect(service.getStats())
        .rejects.toThrow('Database error');
    });
  });

  describe('mergeMemories', () => {
    it('should throw not implemented error', async () => {
      await expect(service.mergeMemories('primary', ['secondary1'], 'strategy'))
        .rejects.toThrow(MemoryError);
    });
  });

  describe('Helper Methods', () => {
    describe('convertToMemoryNode', () => {
      it('should convert memory record to memory node', async () => {
        // Access private method through any
        const serviceAny = service as any;
        const result = serviceAny.convertToMemoryNode(mockMemoryData.memory, []);

        expect(result).toEqual({
          id: mockMemoryData.memory.id,
          content: mockMemoryData.memory.content,
          contentHash: mockMemoryData.memory.content_hash,
          context: JSON.parse(mockMemoryData.memory.context),
          concepts: [],
          importance: mockMemoryData.memory.importance,
          status: mockMemoryData.memory.status,
          accessCount: mockMemoryData.memory.access_count,
          lastAccessedAt: mockMemoryData.memory.last_accessed_at,
          vectorId: mockMemoryData.memory.vector_id,
          createdAt: mockMemoryData.memory.created_at,
          updatedAt: mockMemoryData.memory.updated_at,
          createdBy: mockMemoryData.memory.created_by,
          metadata: JSON.parse(mockMemoryData.memory.metadata)
        });
      });

      it('should handle null/undefined fields gracefully', async () => {
        const memoryWithNulls = {
          ...mockMemoryData.memory,
          last_accessed_at: null,
          vector_id: null,
          created_by: null,
          metadata: null
        };

        const serviceAny = service as any;
        const result = serviceAny.convertToMemoryNode(memoryWithNulls, []);

        expect(result.lastAccessedAt).toBeUndefined();
        expect(result.vectorId).toBeUndefined();
        expect(result.createdBy).toBeUndefined();
        expect(result.metadata).toEqual({});
      });
    });

    describe('extractConcepts', () => {
      it('should extract unique concepts from content', async () => {
        const serviceAny = service as any;
        const result = serviceAny.extractConcepts('This is a test with important technical concepts');

        expect(result).toEqual(expect.arrayContaining(['this', 'test', 'with', 'important', 'technical']));
        expect(result.length).toBeLessThanOrEqual(5);
      });

      it('should filter out short words', async () => {
        const serviceAny = service as any;
        const result = serviceAny.extractConcepts('a is on it the');

        expect(result).toEqual([]);
      });

      it('should remove duplicates', async () => {
        const serviceAny = service as any;
        const result = serviceAny.extractConcepts('important important concepts concepts');

        expect(result).toEqual(['important', 'concepts']);
      });
    });

    describe('createAutomaticRelationships', () => {
      it('should create relationships with similar memories', async () => {
        mockVectorEngine.findSimilar.mockResolvedValue([
          { memoryId: 'similar-1', similarity: 0.85, content: 'Similar content' },
          { memoryId: 'memory-1', similarity: 0.95, content: 'Same memory' } // Should be filtered out
        ]);

        const serviceAny = service as any;
        await serviceAny.createAutomaticRelationships('memory-1', 'test content');

        expect(mockDb.createRelationship).toHaveBeenCalledTimes(1);
        expect(mockDb.createRelationship).toHaveBeenCalledWith({
          source_id: 'memory-1',
          target_id: 'similar-1',
          relationship_type: 'semantic_similarity',
          strength: 0.85,
          bidirectional: true,
          metadata: JSON.stringify({ auto_generated: true }),
          last_updated: expect.any(String)
        });
      });

      it('should handle errors gracefully without throwing', async () => {
        mockVectorEngine.findSimilar.mockRejectedValue(new Error('Vector error'));

        const serviceAny = service as any;
        
        // Should not throw
        await expect(serviceAny.createAutomaticRelationships('memory-1', 'test'))
          .resolves.not.toThrow();
      });
    });
  });
});