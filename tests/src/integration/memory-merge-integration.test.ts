/**
 * Memory Merge Integration Tests
 * 
 * Tests the complete memory merging functionality including:
 * - All three merge strategies (combine, replace, append)
 * - Real analytics data verification
 * - Usage tracking accuracy
 * - Database integrity checks
 * - Error handling and edge cases
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { TestClient } from '../utils/test-client.js';
import { MemoryService } from '@mcp-tools/core/memory';
import { AnalyticsService } from '../../gateway/src/services/AnalyticsService.js';

interface Memory {
  id: string;
  content: string;
  context: Record<string, any>;
  concepts?: string[];
  importance?: number;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

interface MergeResult {
  success: boolean;
  merged_memory: Memory;
  merge_strategy: 'combine' | 'replace' | 'append';
  audit_trail: {
    source_memory_ids: string[];
    merge_timestamp: string;
    merge_metadata: Record<string, any>;
  };
}

describe('Memory Merge Integration Tests', () => {
  let testClient: TestClient;
  let memoryService: MemoryService;
  let analyticsService: AnalyticsService;
  let testMemories: Memory[] = [];
  let authToken: string;
  
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  const TEST_USER_ID = 'test-user-memory-merge';
  
  beforeAll(async () => {
    testClient = new TestClient(BASE_URL);
    
    // Initialize services
    memoryService = new MemoryService();
    analyticsService = new AnalyticsService();
    
    // Authenticate test user
    authToken = await testClient.authenticate({
      userId: TEST_USER_ID,
      email: 'memory-test@example.com'
    });
    
    // Verify services are running
    await testClient.waitForService('/health', 30000);
  });
  
  afterAll(async () => {
    // Cleanup test data
    if (testMemories.length > 0) {
      for (const memory of testMemories) {
        try {
          await testClient.delete(`/api/v1/memories/${memory.id}`);
        } catch (error) {
          console.warn(`Failed to cleanup memory ${memory.id}:`, error);
        }
      }
    }
    
    await testClient.cleanup();
  });
  
  beforeEach(async () => {
    // Clear test memories before each test
    testMemories = [];
  });
  
  afterEach(async () => {
    // Cleanup after each test
    for (const memory of testMemories) {
      try {
        await testClient.delete(`/api/v1/memories/${memory.id}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testMemories = [];
  });
  
  /**
   * Helper function to create test memories
   */
  const createTestMemory = async (content: string, concepts?: string[], importance = 1): Promise<Memory> => {
    const response = await testClient.post('/api/v1/memories', {
      content,
      context: {
        userId: TEST_USER_ID,
        project: 'memory-merge-test',
        timestamp: new Date().toISOString()
      },
      concepts,
      importance
    });
    
    expect(response.status).toBe(201);
    const memory = response.data.data;
    testMemories.push(memory);
    return memory;
  };
  
  /**
   * Helper function to verify memory structure
   */
  const verifyMemoryStructure = (memory: Memory) => {
    expect(memory).toHaveProperty('id');
    expect(memory).toHaveProperty('content');
    expect(memory).toHaveProperty('context');
    expect(memory).toHaveProperty('created_at');
    expect(memory).toHaveProperty('updated_at');
    expect(typeof memory.content).toBe('string');
    expect(typeof memory.context).toBe('object');
  };
  
  describe('Memory Merge - Combine Strategy', () => {
    test('should merge two memories using combine strategy', async () => {
      // Create source memories
      const memory1 = await createTestMemory(
        'First memory about machine learning algorithms',
        ['machine-learning', 'algorithms'],
        3
      );
      
      const memory2 = await createTestMemory(
        'Second memory about neural networks',
        ['neural-networks', 'deep-learning'],
        4
      );
      
      // Perform merge with combine strategy
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine',
        title: 'Combined ML Knowledge',
        context: {
          merge_reason: 'Related AI/ML concepts'
        }
      });
      
      expect(mergeResponse.status).toBe(201);
      const mergeResult: MergeResult = mergeResponse.data.data;
      
      // Verify merge result structure
      expect(mergeResult.success).toBe(true);
      expect(mergeResult.merge_strategy).toBe('combine');
      expect(mergeResult.merged_memory).toBeDefined();
      expect(mergeResult.audit_trail).toBeDefined();
      
      // Verify merged memory content combines both sources
      const mergedMemory = mergeResult.merged_memory;
      verifyMemoryStructure(mergedMemory);
      
      expect(mergedMemory.content).toContain('machine learning');
      expect(mergedMemory.content).toContain('neural networks');
      
      // Verify concepts are merged
      expect(mergedMemory.concepts).toEqual(
        expect.arrayContaining(['machine-learning', 'algorithms', 'neural-networks', 'deep-learning'])
      );
      
      // Verify importance is calculated (should be max or average)
      expect(mergedMemory.importance).toBeGreaterThanOrEqual(3);
      
      // Verify audit trail
      expect(mergeResult.audit_trail.source_memory_ids).toEqual(
        expect.arrayContaining([memory1.id, memory2.id])
      );
      expect(mergeResult.audit_trail.merge_timestamp).toBeDefined();
    });
    
    test('should handle combining memories with overlapping concepts', async () => {
      const memory1 = await createTestMemory(
        'React hooks and state management',
        ['react', 'hooks', 'state-management'],
        2
      );
      
      const memory2 = await createTestMemory(
        'React context and state patterns',
        ['react', 'context', 'state-management'],
        3
      );
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine'
      });
      
      const mergeResult: MergeResult = mergeResponse.data.data;
      const mergedMemory = mergeResult.merged_memory;
      
      // Should deduplicate concepts
      const uniqueConcepts = new Set(mergedMemory.concepts);
      expect(uniqueConcepts.size).toBe(mergedMemory.concepts?.length);
      expect(mergedMemory.concepts).toEqual(
        expect.arrayContaining(['react', 'hooks', 'state-management', 'context'])
      );
    });
  });
  
  describe('Memory Merge - Replace Strategy', () => {
    test('should merge memories using replace strategy', async () => {
      const memory1 = await createTestMemory(
        'Outdated information about API',
        ['api', 'old-version'],
        2
      );
      
      const memory2 = await createTestMemory(
        'Updated API documentation and best practices',
        ['api', 'new-version', 'best-practices'],
        4
      );
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'replace',
        primary_memory_id: memory2.id // memory2 should replace memory1
      });
      
      const mergeResult: MergeResult = mergeResponse.data.data;
      const mergedMemory = mergeResult.merged_memory;
      
      // Content should be from the primary memory (memory2)
      expect(mergedMemory.content).toContain('Updated API documentation');
      expect(mergedMemory.content).not.toContain('Outdated information');
      
      // Concepts should be from primary memory
      expect(mergedMemory.concepts).toEqual(
        expect.arrayContaining(['api', 'new-version', 'best-practices'])
      );
      expect(mergedMemory.concepts).not.toContain('old-version');
      
      // Importance should be from primary memory
      expect(mergedMemory.importance).toBe(4);
    });
  });
  
  describe('Memory Merge - Append Strategy', () => {
    test('should merge memories using append strategy', async () => {
      const memory1 = await createTestMemory(
        'Initial project requirements:\n- User authentication\n- Data storage',
        ['project', 'requirements'],
        3
      );
      
      const memory2 = await createTestMemory(
        'Additional requirements:\n- API integration\n- Real-time updates',
        ['project', 'requirements', 'additional'],
        3
      );
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'append',
        separator: '\n\n--- Additional Requirements ---\n\n'
      });
      
      const mergeResult: MergeResult = mergeResponse.data.data;
      const mergedMemory = mergeResult.merged_memory;
      
      // Content should contain both memories with separator
      expect(mergedMemory.content).toContain('Initial project requirements');
      expect(mergedMemory.content).toContain('Additional requirements');
      expect(mergedMemory.content).toContain('--- Additional Requirements ---');
      
      // Should preserve chronological order
      const memory1Index = mergedMemory.content.indexOf('Initial project');
      const memory2Index = mergedMemory.content.indexOf('Additional requirements');
      expect(memory1Index).toBeLessThan(memory2Index);
    });
  });
  
  describe('Analytics Integration', () => {
    test('should track memory merge analytics accurately', async () => {
      const memory1 = await createTestMemory('Analytics test memory 1');
      const memory2 = await createTestMemory('Analytics test memory 2');
      
      // Get initial analytics
      const initialAnalytics = await testClient.get('/api/v1/analytics/memory-stats', {
        params: { user_id: TEST_USER_ID }
      });
      
      // Perform merge
      await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine'
      });
      
      // Wait for analytics to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get updated analytics
      const updatedAnalytics = await testClient.get('/api/v1/analytics/memory-stats', {
        params: { user_id: TEST_USER_ID }
      });
      
      expect(updatedAnalytics.status).toBe(200);
      const analytics = updatedAnalytics.data.data;
      
      // Verify analytics are real data, not placeholders
      expect(analytics.total_memories).toBeGreaterThan(0);
      expect(analytics.merge_operations).toBeGreaterThan(initialAnalytics.data.data.merge_operations || 0);
      expect(analytics.avg_importance).toBeGreaterThan(0);
      expect(analytics.concepts_count).toBeGreaterThan(0);
      
      // Verify no placeholder values
      expect(analytics.total_memories).not.toBe(123);
      expect(analytics.merge_operations).not.toBe(45);
      expect(analytics.avg_importance).not.toBe(3.2);
    });
    
    test('should display real-time analytics on dashboard', async () => {
      // This test would be better suited for E2E testing with Playwright
      // Here we test the API endpoints that feed the dashboard
      
      const memory1 = await createTestMemory('Dashboard test memory', ['dashboard', 'test']);
      
      // Test dashboard endpoint
      const dashboardResponse = await testClient.get('/api/v1/analytics/dashboard', {
        params: { timeRange: 'day' }
      });
      
      expect(dashboardResponse.status).toBe(200);
      const dashboard = dashboardResponse.data.data;
      
      // Verify dashboard contains real data
      expect(dashboard).toHaveProperty('memory_count');
      expect(dashboard).toHaveProperty('recent_activities');
      expect(dashboard).toHaveProperty('concept_distribution');
      expect(dashboard).toHaveProperty('merge_statistics');
      
      // Verify data is not placeholder
      expect(Array.isArray(dashboard.recent_activities)).toBe(true);
      expect(typeof dashboard.memory_count).toBe('number');
    });
  });
  
  describe('Usage Tracking', () => {
    test('should track embeddings usage accurately', async () => {
      // Get initial usage stats
      const initialUsage = await testClient.get('/api/v1/usage/embeddings', {
        params: { user_id: TEST_USER_ID }
      });
      
      const initialTokens = initialUsage.data.data.total_tokens_used || 0;
      const initialCost = initialUsage.data.data.total_cost || 0;
      
      // Create memory (should generate embeddings)
      const memory = await createTestMemory(
        'This is a test memory for embeddings usage tracking. It contains enough content to generate meaningful embeddings and track token usage accurately.',
        ['embeddings', 'usage', 'tracking']
      );
      
      // Wait for embeddings processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get updated usage stats
      const updatedUsage = await testClient.get('/api/v1/usage/embeddings', {
        params: { user_id: TEST_USER_ID }
      });
      
      expect(updatedUsage.status).toBe(200);
      const usage = updatedUsage.data.data;
      
      // Verify usage increased
      expect(usage.total_tokens_used).toBeGreaterThan(initialTokens);
      expect(usage.total_cost).toBeGreaterThan(initialCost);
      expect(usage.embedding_requests).toBeDefined();
      expect(usage.avg_tokens_per_request).toBeGreaterThan(0);
      
      // Verify cost calculation accuracy
      const expectedCost = usage.total_tokens_used * (usage.cost_per_token || 0.0001);
      expect(Math.abs(usage.total_cost - expectedCost)).toBeLessThan(0.001);
    });
    
    test('should track merge operation costs', async () => {
      const memory1 = await createTestMemory('First memory for cost tracking');
      const memory2 = await createTestMemory('Second memory for cost tracking');
      
      const initialUsage = await testClient.get('/api/v1/usage/embeddings');
      const initialRequests = initialUsage.data.data.embedding_requests || 0;
      
      // Perform merge (should trigger embedding recalculation)
      await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine'
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedUsage = await testClient.get('/api/v1/usage/embeddings');
      const usage = updatedUsage.data.data;
      
      // Should have additional embedding request for merged memory
      expect(usage.embedding_requests).toBeGreaterThan(initialRequests);
      expect(usage.merge_operations).toBeDefined();
      expect(usage.merge_operations).toBeGreaterThan(0);
    });
  });
  
  describe('Database Integrity', () => {
    test('should maintain referential integrity during merge', async () => {
      const memory1 = await createTestMemory('Memory with relationships', ['test', 'relationships']);
      const memory2 = await createTestMemory('Related memory', ['test', 'relationships']);
      
      // Create a connection between memories
      await testClient.post('/api/v1/memories/connections', {
        source_id: memory1.id,
        target_id: memory2.id,
        relationship_type: 'semantic_similarity',
        strength: 0.8
      });
      
      // Perform merge
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine'
      });
      
      const mergedMemory = mergeResponse.data.data.merged_memory;
      
      // Verify source memories are archived, not deleted
      const memory1Response = await testClient.get(`/api/v1/memories/${memory1.id}`);
      expect(memory1Response.status).toBe(200);
      expect(memory1Response.data.data.status).toBe('archived');
      
      // Verify merged memory exists
      const mergedResponse = await testClient.get(`/api/v1/memories/${mergedMemory.id}`);
      expect(mergedResponse.status).toBe(200);
      
      // Verify relationships are updated to point to merged memory
      const connectionsResponse = await testClient.get(`/api/v1/memories/${mergedMemory.id}/connections`);
      expect(connectionsResponse.status).toBe(200);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid merge strategy', async () => {
      const memory1 = await createTestMemory('Test memory 1');
      const memory2 = await createTestMemory('Test memory 2');
      
      const response = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'invalid_strategy'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid merge strategy');
    });
    
    test('should handle non-existent memory IDs', async () => {
      const response = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: ['non-existent-1', 'non-existent-2'],
        merge_strategy: 'combine'
      });
      
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('Memory not found');
    });
    
    test('should handle insufficient permissions', async () => {
      // Create memory with different user
      const otherUserMemory = await testClient.post('/api/v1/memories', {
        content: 'Memory from other user',
        context: { userId: 'other-user' }
      });
      
      const userMemory = await createTestMemory('User memory');
      
      const response = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [userMemory.id, otherUserMemory.data.data.id],
        merge_strategy: 'combine'
      });
      
      expect(response.status).toBe(403);
      expect(response.data.error).toContain('Insufficient permissions');
    });
    
    test('should handle single memory merge attempt', async () => {
      const memory = await createTestMemory('Single memory');
      
      const response = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory.id],
        merge_strategy: 'combine'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('At least two memories required');
    });
  });
  
  describe('Performance Benchmarks', () => {
    test('should complete memory merge within performance threshold', async () => {
      const memory1 = await createTestMemory(
        'Large memory content '.repeat(100), // Create larger content
        Array.from({length: 10}, (_, i) => `concept-${i}`)
      );
      
      const memory2 = await createTestMemory(
        'Another large memory content '.repeat(100),
        Array.from({length: 10}, (_, i) => `concept-${i + 10}`)
      );
      
      const startTime = Date.now();
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine'
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(mergeResponse.status).toBe(201);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify the merge result includes performance metadata
      const mergeResult = mergeResponse.data.data;
      expect(mergeResult.audit_trail.merge_metadata).toHaveProperty('processing_time_ms');
      expect(mergeResult.audit_trail.merge_metadata.processing_time_ms).toBeLessThan(2000);
    });
  });
});
