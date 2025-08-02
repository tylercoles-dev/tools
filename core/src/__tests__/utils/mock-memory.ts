/**
 * Memory Service Mocking Utilities
 * 
 * Provides comprehensive mocking for Memory service dependencies
 */

import type { MemoryDatabaseManager } from '../../services/memory/database.js';
import type { VectorEngine } from '../../services/memory/vectorEngine.js';
import type { Memory, Concept, Relationship } from '../../services/memory/types.js';

/**
 * Creates a mock MemoryDatabaseManager with all necessary methods
 */
export function createMockMemoryDatabase(): jest.Mocked<MemoryDatabaseManager> {
  return {
    createMemory: jest.fn(),
    getMemory: jest.fn(),
    updateMemory: jest.fn(),
    searchMemories: jest.fn(),
    createConcept: jest.fn(),
    findConceptByName: jest.fn(),
    getMemoryConcepts: jest.fn(),
    linkMemoryConcept: jest.fn(),
    createRelationship: jest.fn(),
    getRelationships: jest.fn(),
    getMemoryStats: jest.fn(),
    close: jest.fn(),
  } as jest.Mocked<MemoryDatabaseManager>;
}

/**
 * Creates a mock VectorEngine with all necessary methods
 */
export function createMockVectorEngine(): jest.Mocked<VectorEngine> {
  return {
    indexMemory: jest.fn(),
    findSimilar: jest.fn(),
    deleteMemory: jest.fn(),
    updateMemory: jest.fn(),
    close: jest.fn(),
  } as jest.Mocked<VectorEngine>;
}

/**
 * Sample test data for Memory entities
 */
export const mockMemoryData = {
  memory: {
    id: 'memory-1',
    content: 'Test memory content',
    content_hash: 'abc123hash',
    context: '{"userId": "user1", "source": "test"}',
    importance: 3,
    status: 'active' as const,
    access_count: 5,
    last_accessed_at: '2024-01-01T00:00:00.000Z',
    vector_id: 'vector-1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    created_by: 'user1',
    metadata: '{"tags": ["test"]}'
  } as Memory,

  concept: {
    id: 'concept-1',
    name: 'test-concept',
    description: 'A test concept',
    type: 'topic' as const,
    confidence: 0.8,
    extracted_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  } as Concept,

  relationship: {
    id: 'rel-1',
    source_id: 'memory-1',
    target_id: 'memory-2',
    relationship_type: 'semantic_similarity',
    strength: 0.85,
    bidirectional: true,
    metadata: '{"auto_generated": true}',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_updated: '2024-01-01T00:00:00.000Z'
  } as Relationship,

  memoryStats: {
    totalMemories: 100,
    totalRelationships: 50,
    totalConcepts: 25
  },

  vectorSearchResult: {
    memoryId: 'memory-1',
    similarity: 0.85,
    content: 'Similar memory content'
  }
};

/**
 * Helper to setup common memory database mock expectations
 */
export function setupMemoryDatabaseMocks(mockDb: jest.Mocked<MemoryDatabaseManager>) {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default returns
  mockDb.createMemory.mockResolvedValue(mockMemoryData.memory);
  mockDb.getMemory.mockResolvedValue(mockMemoryData.memory);
  mockDb.updateMemory.mockResolvedValue(mockMemoryData.memory);
  mockDb.searchMemories.mockResolvedValue([mockMemoryData.memory]);
  mockDb.createConcept.mockResolvedValue(mockMemoryData.concept);
  mockDb.findConceptByName.mockResolvedValue(mockMemoryData.concept);
  mockDb.getMemoryConcepts.mockResolvedValue([mockMemoryData.concept]);
  mockDb.linkMemoryConcept.mockResolvedValue(undefined);
  mockDb.createRelationship.mockResolvedValue(mockMemoryData.relationship);
  mockDb.getRelationships.mockResolvedValue([mockMemoryData.relationship]);
  mockDb.getMemoryStats.mockResolvedValue(mockMemoryData.memoryStats);
  
  return mockDb;
}

/**
 * Helper to setup common vector engine mock expectations
 */
export function setupVectorEngineMocks(mockVectorEngine: jest.Mocked<VectorEngine>) {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default returns
  mockVectorEngine.indexMemory.mockResolvedValue('vector-1');
  mockVectorEngine.findSimilar.mockResolvedValue([mockMemoryData.vectorSearchResult]);
  mockVectorEngine.deleteMemory.mockResolvedValue(undefined);
  mockVectorEngine.updateMemory.mockResolvedValue(undefined);
  
  return mockVectorEngine;
}