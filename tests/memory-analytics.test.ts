/**
 * Tests for memory analytics functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryService } from '../core/src/services/memory/service.js';
import { MemoryDatabaseManager } from '../core/src/services/memory/database.js';
import { VectorEngine } from '../core/src/services/memory/vectorEngine.js';
import fs from 'fs';
import path from 'path';

describe('Memory Analytics', () => {
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

  describe('Average Importance Calculation', () => {
    it('should calculate correct average importance', async () => {
      // Create memories with different importance levels
      await memoryService.storeMemory({
        content: 'Low importance memory',
        context: { userId: 'user1', source: 'test' },
        importance: 1
      });

      await memoryService.storeMemory({
        content: 'Medium importance memory',
        context: { userId: 'user1', source: 'test' },
        importance: 3
      });

      await memoryService.storeMemory({
        content: 'High importance memory',
        context: { userId: 'user1', source: 'test' },
        importance: 5
      });

      const stats = await memoryService.getStats();
      
      // Average should be (1 + 3 + 5) / 3 = 3
      expect(stats.averageImportance).toBe(3);
      expect(stats.totalMemories).toBe(3);
    });

    it('should handle empty database gracefully', async () => {
      const stats = await memoryService.getStats();
      
      expect(stats.averageImportance).toBe(1); // Default fallback
      expect(stats.totalMemories).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalConcepts).toBe(0);
    });
  });

  describe('Most Active Users', () => {
    it('should identify most active users correctly', async () => {
      // Create memories for different users
      await memoryService.storeMemory({
        content: 'User1 memory 1',
        context: { userId: 'user1', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'User1 memory 2',
        context: { userId: 'user1', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'User1 memory 3',
        context: { userId: 'user1', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'User2 memory 1',
        context: { userId: 'user2', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'User2 memory 2',
        context: { userId: 'user2', source: 'test' }
      });

      const stats = await memoryService.getStats();
      
      expect(stats.mostActiveUsers).toHaveLength(2);
      expect(stats.mostActiveUsers[0].userId).toBe('user1');
      expect(stats.mostActiveUsers[0].count).toBe(3);
      expect(stats.mostActiveUsers[1].userId).toBe('user2');
      expect(stats.mostActiveUsers[1].count).toBe(2);
    });

    it('should exclude memories without userId', async () => {
      await memoryService.storeMemory({
        content: 'Anonymous memory',
        context: { source: 'test' } // No userId
      });

      await memoryService.storeMemory({
        content: 'User memory',
        context: { userId: 'user1', source: 'test' }
      });

      const stats = await memoryService.getStats();
      
      expect(stats.mostActiveUsers).toHaveLength(1);
      expect(stats.mostActiveUsers[0].userId).toBe('user1');
      expect(stats.mostActiveUsers[0].count).toBe(1);
    });
  });

  describe('Top Projects', () => {
    it('should identify top projects correctly', async () => {
      // Create memories for different projects
      await memoryService.storeMemory({
        content: 'Project A memory 1',
        context: { userId: 'user1', projectName: 'ProjectA', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'Project A memory 2',
        context: { userId: 'user1', projectName: 'ProjectA', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'Project A memory 3',
        context: { userId: 'user1', projectName: 'ProjectA', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'Project B memory 1',
        context: { userId: 'user1', projectName: 'ProjectB', source: 'test' }
      });

      const stats = await memoryService.getStats();
      
      expect(stats.topProjects).toHaveLength(2);
      expect(stats.topProjects[0].projectName).toBe('ProjectA');
      expect(stats.topProjects[0].count).toBe(3);
      expect(stats.topProjects[1].projectName).toBe('ProjectB');
      expect(stats.topProjects[1].count).toBe(1);
    });
  });

  describe('Concept Distribution', () => {
    it('should calculate concept type distribution', async () => {
      // Create concepts of different types
      await database.createConcept({
        name: 'person1',
        description: 'A person',
        type: 'person',
        confidence: 0.9,
        extracted_at: new Date().toISOString()
      });

      await database.createConcept({
        name: 'person2',
        description: 'Another person',
        type: 'person',
        confidence: 0.8,
        extracted_at: new Date().toISOString()
      });

      await database.createConcept({
        name: 'topic1',
        description: 'A topic',
        type: 'topic',
        confidence: 0.7,
        extracted_at: new Date().toISOString()
      });

      await database.createConcept({
        name: 'project1',
        description: 'A project',
        type: 'project',
        confidence: 0.6,
        extracted_at: new Date().toISOString()
      });

      const stats = await memoryService.getStats();
      
      expect(stats.conceptDistribution.person).toBe(2);
      expect(stats.conceptDistribution.topic).toBe(1);
      expect(stats.conceptDistribution.project).toBe(1);
      expect(stats.totalConcepts).toBe(4);
    });
  });

  describe('Relationship Analytics', () => {
    it('should count relationships correctly', async () => {
      // Create memories
      const memory1 = await memoryService.storeMemory({
        content: 'First memory',
        context: { userId: 'user1', source: 'test' }
      });

      const memory2 = await memoryService.storeMemory({
        content: 'Second memory',
        context: { userId: 'user1', source: 'test' }
      });

      const memory3 = await memoryService.storeMemory({
        content: 'Third memory',
        context: { userId: 'user1', source: 'test' }
      });

      // Create relationships
      await memoryService.createConnection({
        sourceId: memory1.id,
        targetId: memory2.id,
        relationshipType: 'causal',
        strength: 0.8
      });

      await memoryService.createConnection({
        sourceId: memory2.id,
        targetId: memory3.id,
        relationshipType: 'temporal',
        strength: 0.9
      });

      const stats = await memoryService.getStats();
      
      expect(stats.totalRelationships).toBe(2);
      expect(stats.totalMemories).toBe(3);
    });
  });

  describe('Stats Filtering', () => {
    it('should filter stats by user', async () => {
      // Create memories for different users
      await memoryService.storeMemory({
        content: 'User1 memory',
        context: { userId: 'user1', source: 'test' }
      });

      await memoryService.storeMemory({
        content: 'User2 memory',
        context: { userId: 'user2', source: 'test' }
      });

      // Get stats for specific user
      const stats = await database.getMemoryStats({ userId: 'user1' });
      
      expect(stats.totalMemories).toBe(1);
    });
  });
});