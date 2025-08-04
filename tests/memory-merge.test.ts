/**
 * Tests for memory merging functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryService } from '../core/src/services/memory/service.js';
import { MemoryDatabaseManager } from '../core/src/services/memory/database.js';
import { VectorEngine } from '../core/src/services/memory/vectorEngine.js';
import { MemoryError } from '../core/src/services/memory/types.js';
import fs from 'fs';
import path from 'path';

describe('Memory Merging', () => {
  let memoryService: MemoryService;
  let database: MemoryDatabaseManager;
  let vectorEngine: VectorEngine;

  beforeEach(async () => {
    // Initialize test database and services
    database = new MemoryDatabaseManager({
      type: 'postgres',
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mcp_tools_test'
    });
    
    await database.initialize();

    // Mock vector engine for testing
    vectorEngine = {
      indexMemory: async () => 'vector-id-' + Math.random(),
      updateMemory: async () => {},
      findSimilar: async () => [],
      deleteMemory: async () => {}
    } as any;

    memoryService = new MemoryService(database, vectorEngine);
  });

  afterEach(async () => {
    await database.close();
  });

  describe('Merge Strategies', () => {
    it('should merge memories using combine strategy', async () => {
      // Create test memories
      const memory1 = await memoryService.storeMemory({
        content: 'First memory content',
        context: { userId: 'user1', source: 'test' },
        concepts: ['concept1', 'concept2'],
        importance: 3
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Second memory content',
        context: { userId: 'user1', source: 'test' },
        concepts: ['concept2', 'concept3'],
        importance: 4
      });

      const memory3 = await memoryService.storeMemory({
        content: 'Third memory content',
        context: { userId: 'user1', source: 'test' },
        concepts: ['concept1', 'concept4'],
        importance: 2
      });

      // Merge memories using combine strategy
      const mergedMemory = await memoryService.mergeMemories(
        memory1.id,
        [memory2.id, memory3.id],
        'combine'
      );

      // Verify merged content
      expect(mergedMemory.content).toContain('First memory content');
      expect(mergedMemory.content).toContain('Second memory content');
      expect(mergedMemory.content).toContain('Third memory content');
      expect(mergedMemory.content).toContain('---'); // Separator

      // Verify importance is maximum
      expect(mergedMemory.importance).toBe(4);

      // Verify concepts are merged and deduplicated
      const conceptNames = mergedMemory.concepts.map(c => c.name);
      expect(conceptNames).toContain('concept1');
      expect(conceptNames).toContain('concept2');
      expect(conceptNames).toContain('concept3');
      expect(conceptNames).toContain('concept4');

      // Verify secondary memories are marked as merged
      const secondaryMemory = await database.getMemory(memory2.id);
      expect(secondaryMemory?.status).toBe('merged');
      
      const metadata = JSON.parse(secondaryMemory?.metadata || '{}');
      expect(metadata.merged_into).toBe(memory1.id);
      expect(metadata.merge_strategy).toBe('combine');
    });

    it('should merge memories using replace strategy', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Primary content',
        context: { userId: 'user1', source: 'test' },
        importance: 2
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Secondary content',
        context: { userId: 'user1', source: 'test' },
        importance: 5
      });

      const mergedMemory = await memoryService.mergeMemories(
        memory1.id,
        [memory2.id],
        'replace'
      );

      // Content should remain as primary
      expect(mergedMemory.content).toBe('Primary content');
      
      // Importance should be maximum
      expect(mergedMemory.importance).toBe(5);
    });

    it('should merge memories using append strategy', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Start content',
        context: { userId: 'user1', source: 'test' },
        importance: 1
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Middle content',
        context: { userId: 'user1', source: 'test' },
        importance: 3
      });

      const memory3 = await memoryService.storeMemory({
        content: 'End content',
        context: { userId: 'user1', source: 'test' },
        importance: 2
      });

      const mergedMemory = await memoryService.mergeMemories(
        memory1.id,
        [memory2.id, memory3.id],
        'append'
      );

      // Content should be appended in order
      expect(mergedMemory.content).toBe('Start content\n\nMiddle content\n\nEnd content');
      expect(mergedMemory.importance).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent primary memory', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Test memory',
        context: { userId: 'user1', source: 'test' }
      });

      await expect(
        memoryService.mergeMemories('non-existent-id', [memory1.id], 'combine')
      ).rejects.toThrow('Memory with id non-existent-id not found');
    });

    it('should throw error for non-existent secondary memories', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Test memory',
        context: { userId: 'user1', source: 'test' }
      });

      await expect(
        memoryService.mergeMemories(memory1.id, ['non-existent-1', 'non-existent-2'], 'combine')
      ).rejects.toThrow('Secondary memories not found: non-existent-1, non-existent-2');
    });

    it('should throw error for unknown merge strategy', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Test memory',
        context: { userId: 'user1', source: 'test' }
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Test memory 2',
        context: { userId: 'user1', source: 'test' }
      });

      await expect(
        memoryService.mergeMemories(memory1.id, [memory2.id], 'unknown' as any)
      ).rejects.toThrow('Unknown merge strategy: unknown');
    });
  });

  describe('Concept Merging', () => {
    it('should merge concepts and keep highest confidence', async () => {
      // Create concepts with different confidence levels
      const concept1 = await database.createConcept({
        name: 'shared-concept',
        description: 'Low confidence version',
        type: 'topic',
        confidence: 0.6,
        extracted_at: new Date().toISOString()
      });

      const concept2 = await database.createConcept({
        name: 'shared-concept',
        description: 'High confidence version',
        type: 'topic',
        confidence: 0.9,
        extracted_at: new Date().toISOString()
      });

      const memory1 = await memoryService.storeMemory({
        content: 'Memory with low confidence concept',
        context: { userId: 'user1', source: 'test' }
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Memory with high confidence concept',
        context: { userId: 'user1', source: 'test' }
      });

      // Manually link concepts to memories
      await database.linkMemoryConcept(memory1.id, concept1.id);
      await database.linkMemoryConcept(memory2.id, concept2.id);

      const mergedMemory = await memoryService.mergeMemories(
        memory1.id,
        [memory2.id],
        'combine'
      );

      // Should keep the higher confidence concept
      const sharedConcept = mergedMemory.concepts.find(c => c.name === 'shared-concept');
      expect(sharedConcept?.confidence).toBe(0.9);
      expect(sharedConcept?.description).toBe('High confidence version');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit trail for merge operations', async () => {
      const memory1 = await memoryService.storeMemory({
        content: 'Primary memory',
        context: { userId: 'user1', source: 'test' }
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Secondary memory',
        context: { userId: 'user1', source: 'test' }
      });

      await memoryService.mergeMemories(memory1.id, [memory2.id], 'combine');

      // Check that audit trail was created
      const auditRecords = await database.kysely
        .selectFrom('memory_merges')
        .selectAll()
        .where('primary_memory_id', '=', memory1.id)
        .execute();

      expect(auditRecords).toHaveLength(1);
      expect(auditRecords[0].strategy).toBe('combine');
      expect(JSON.parse(auditRecords[0].merged_memory_ids)).toEqual([memory2.id]);
    });
  });
});