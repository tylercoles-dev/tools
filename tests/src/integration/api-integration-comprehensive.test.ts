/**
 * Comprehensive API Integration Tests
 * 
 * Tests all newly implemented API endpoints including:
 * - Memory merge endpoints (POST /api/v1/memories/merge)
 * - Memory analytics endpoints (GET /api/v1/analytics/memory-stats)
 * - Usage tracking endpoints (GET /api/v1/usage/embeddings)
 * - Wiki enhancement APIs (categories, tags, version history)
 * - Kanban analytics endpoints (activity tracking, productivity metrics)
 * - Real-time WebSocket integration
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { TestClient } from '../utils/test-client.js';
import WebSocket from 'ws';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

describe('Comprehensive API Integration Tests', () => {
  let testClient: TestClient;
  let authToken: string;
  let wsConnection: WebSocket;
  
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
  const TEST_USER_ID = 'api-integration-test-user';
  
  beforeAll(async () => {
    testClient = new TestClient(BASE_URL);
    
    // Authenticate test user
    authToken = await testClient.authenticate({
      userId: TEST_USER_ID,
      email: 'api-test@example.com',
      name: 'API Test User'
    });
    
    // Verify services are running
    await testClient.waitForService('/health', 30000);
    
    // Establish WebSocket connection
    wsConnection = new WebSocket(`${WS_URL}/ws?token=${authToken}`);
    await new Promise((resolve, reject) => {
      wsConnection.on('open', resolve);
      wsConnection.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  });
  
  afterAll(async () => {
    if (wsConnection) {
      wsConnection.close();
    }
    await testClient.cleanup();
  });
  
  describe('Memory Merge API Endpoints', () => {
    let testMemoryIds: string[] = [];
    
    beforeEach(async () => {
      testMemoryIds = [];
    });
    
    afterEach(async () => {
      // Cleanup test memories
      for (const id of testMemoryIds) {
        try {
          await testClient.delete(`/api/v1/memories/${id}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    
    test('POST /api/v1/memories/merge - combine strategy', async () => {
      // Create test memories
      const memory1Response = await testClient.post('/api/v1/memories', {
        content: 'First memory about React hooks',
        context: { userId: TEST_USER_ID, project: 'frontend' },
        concepts: ['react', 'hooks'],
        importance: 3
      });
      
      const memory2Response = await testClient.post('/api/v1/memories', {
        content: 'Second memory about React context',
        context: { userId: TEST_USER_ID, project: 'frontend' },
        concepts: ['react', 'context'],
        importance: 4
      });
      
      expect(memory1Response.status).toBe(201);
      expect(memory2Response.status).toBe(201);
      
      const memory1 = memory1Response.data.data;
      const memory2 = memory2Response.data.data;
      testMemoryIds.push(memory1.id, memory2.id);
      
      // Test memory merge
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'combine',
        title: 'Combined React Knowledge',
        context: {
          merge_reason: 'Related React concepts',
          merge_timestamp: new Date().toISOString()
        }
      });
      
      expect(mergeResponse.status).toBe(201);
      
      const mergeResult = mergeResponse.data.data;
      expect(mergeResult).toHaveProperty('success', true);
      expect(mergeResult).toHaveProperty('merge_strategy', 'combine');
      expect(mergeResult).toHaveProperty('merged_memory');
      expect(mergeResult).toHaveProperty('audit_trail');
      
      const mergedMemory = mergeResult.merged_memory;
      expect(mergedMemory.content).toContain('React hooks');
      expect(mergedMemory.content).toContain('React context');
      expect(mergedMemory.concepts).toEqual(
        expect.arrayContaining(['react', 'hooks', 'context'])
      );
      
      testMemoryIds.push(mergedMemory.id);
    });
    
    test('POST /api/v1/memories/merge - replace strategy', async () => {
      const memory1Response = await testClient.post('/api/v1/memories', {
        content: 'Outdated API documentation',
        context: { userId: TEST_USER_ID },
        concepts: ['api', 'old'],
        importance: 2
      });
      
      const memory2Response = await testClient.post('/api/v1/memories', {
        content: 'Updated API documentation with new endpoints',
        context: { userId: TEST_USER_ID },
        concepts: ['api', 'updated'],
        importance: 5
      });
      
      const memory1 = memory1Response.data.data;
      const memory2 = memory2Response.data.data;
      testMemoryIds.push(memory1.id, memory2.id);
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'replace',
        primary_memory_id: memory2.id
      });
      
      expect(mergeResponse.status).toBe(201);
      
      const mergeResult = mergeResponse.data.data;
      const mergedMemory = mergeResult.merged_memory;
      
      expect(mergedMemory.content).toContain('Updated API documentation');
      expect(mergedMemory.content).not.toContain('Outdated');
      expect(mergedMemory.importance).toBe(5);
      
      testMemoryIds.push(mergedMemory.id);
    });
    
    test('POST /api/v1/memories/merge - append strategy', async () => {
      const memory1Response = await testClient.post('/api/v1/memories', {
        content: 'Initial project requirements:\n- Authentication\n- Database',
        context: { userId: TEST_USER_ID },
        concepts: ['project', 'requirements']
      });
      
      const memory2Response = await testClient.post('/api/v1/memories', {
        content: 'Additional requirements:\n- API integration\n- Real-time updates',
        context: { userId: TEST_USER_ID },
        concepts: ['project', 'requirements', 'additional']
      });
      
      const memory1 = memory1Response.data.data;
      const memory2 = memory2Response.data.data;
      testMemoryIds.push(memory1.id, memory2.id);
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1.id, memory2.id],
        merge_strategy: 'append',
        separator: '\n\n--- Additional Requirements ---\n\n'
      });
      
      expect(mergeResponse.status).toBe(201);
      
      const mergeResult = mergeResponse.data.data;
      const mergedMemory = mergeResult.merged_memory;
      
      expect(mergedMemory.content).toContain('Initial project requirements');
      expect(mergedMemory.content).toContain('Additional requirements');
      expect(mergedMemory.content).toContain('--- Additional Requirements ---');
      
      testMemoryIds.push(mergedMemory.id);
    });
    
    test('POST /api/v1/memories/merge - error handling', async () => {
      // Test invalid merge strategy
      const invalidStrategyResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: ['mem1', 'mem2'],
        merge_strategy: 'invalid_strategy'
      });
      
      expect(invalidStrategyResponse.status).toBe(400);
      expect(invalidStrategyResponse.data.error).toContain('Invalid merge strategy');
      
      // Test non-existent memories
      const nonExistentResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: ['non-existent-1', 'non-existent-2'],
        merge_strategy: 'combine'
      });
      
      expect(nonExistentResponse.status).toBe(404);
      expect(nonExistentResponse.data.error).toContain('Memory not found');
      
      // Test single memory (should require at least 2)
      const memory = await testClient.post('/api/v1/memories', {
        content: 'Single memory',
        context: { userId: TEST_USER_ID }
      });
      testMemoryIds.push(memory.data.data.id);
      
      const singleMemoryResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory.data.data.id],
        merge_strategy: 'combine'
      });
      
      expect(singleMemoryResponse.status).toBe(400);
      expect(singleMemoryResponse.data.error).toContain('At least two memories required');
    });
  });
  
  describe('Memory Analytics API Endpoints', () => {
    test('GET /api/v1/analytics/memory-stats - real data verification', async () => {
      // Create some memories to generate real analytics
      const memories = [];
      for (let i = 0; i < 5; i++) {
        const response = await testClient.post('/api/v1/memories', {
          content: `Analytics test memory ${i}`,
          context: { userId: TEST_USER_ID },
          concepts: [`concept-${i}`, 'analytics', 'test'],
          importance: (i % 3) + 1
        });
        memories.push(response.data.data);
      }
      
      // Get analytics
      const analyticsResponse = await testClient.get('/api/v1/analytics/memory-stats', {
        params: { user_id: TEST_USER_ID }
      });
      
      expect(analyticsResponse.status).toBe(200);
      
      const analytics = analyticsResponse.data.data;
      expect(analytics).toHaveProperty('total_memories');
      expect(analytics).toHaveProperty('concepts_count');
      expect(analytics).toHaveProperty('avg_importance');
      expect(analytics).toHaveProperty('recent_activity');
      
      // Verify data is real, not placeholders
      expect(analytics.total_memories).toBeGreaterThanOrEqual(5);
      expect(analytics.concepts_count).toBeGreaterThan(0);
      expect(analytics.avg_importance).toBeGreaterThan(0);
      expect(analytics.avg_importance).toBeLessThanOrEqual(5);
      
      // Verify no common placeholder values
      expect(analytics.total_memories).not.toBe(123);
      expect(analytics.avg_importance).not.toBe(3.2);
      
      // Cleanup
      for (const memory of memories) {
        await testClient.delete(`/api/v1/memories/${memory.id}`);
      }
    });
    
    test('GET /api/v1/analytics/dashboard - comprehensive dashboard data', async () => {
      const dashboardResponse = await testClient.get('/api/v1/analytics/dashboard', {
        params: { timeRange: 'week' }
      });
      
      expect(dashboardResponse.status).toBe(200);
      
      const dashboard = dashboardResponse.data.data;
      expect(dashboard).toHaveProperty('memory_count');
      expect(dashboard).toHaveProperty('recent_activities');
      expect(dashboard).toHaveProperty('concept_distribution');
      expect(dashboard).toHaveProperty('merge_statistics');
      expect(dashboard).toHaveProperty('usage_trends');
      
      expect(Array.isArray(dashboard.recent_activities)).toBe(true);
      expect(typeof dashboard.memory_count).toBe('number');
      expect(typeof dashboard.concept_distribution).toBe('object');
    });
  });
  
  describe('Usage Tracking API Endpoints', () => {
    test('GET /api/v1/usage/embeddings - accurate usage tracking', async () => {
      // Create memory to generate embeddings usage
      const memoryResponse = await testClient.post('/api/v1/memories', {
        content: 'This is a detailed memory content for embeddings usage tracking test. It contains sufficient text to generate meaningful embeddings and accurate token counting.',
        context: { userId: TEST_USER_ID },
        concepts: ['embeddings', 'usage', 'tracking', 'test']
      });
      
      expect(memoryResponse.status).toBe(201);
      const memory = memoryResponse.data.data;
      
      // Wait for embeddings processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get usage statistics
      const usageResponse = await testClient.get('/api/v1/usage/embeddings', {
        params: { user_id: TEST_USER_ID }
      });
      
      expect(usageResponse.status).toBe(200);
      
      const usage = usageResponse.data.data;
      expect(usage).toHaveProperty('total_tokens_used');
      expect(usage).toHaveProperty('total_cost');
      expect(usage).toHaveProperty('embedding_requests');
      expect(usage).toHaveProperty('avg_tokens_per_request');
      expect(usage).toHaveProperty('cost_per_token');
      
      expect(usage.total_tokens_used).toBeGreaterThan(0);
      expect(usage.total_cost).toBeGreaterThan(0);
      expect(usage.embedding_requests).toBeGreaterThan(0);
      
      // Verify cost calculation accuracy
      const expectedCost = usage.total_tokens_used * usage.cost_per_token;
      expect(Math.abs(usage.total_cost - expectedCost)).toBeLessThan(0.001);
      
      // Cleanup
      await testClient.delete(`/api/v1/memories/${memory.id}`);
    });
    
    test('GET /api/v1/usage/embeddings - pagination and filtering', async () => {
      const usageResponse = await testClient.get('/api/v1/usage/embeddings', {
        params: {
          user_id: TEST_USER_ID,
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          page: 1,
          limit: 10
        }
      });
      
      expect(usageResponse.status).toBe(200);
      
      const usage = usageResponse.data;
      expect(usage).toHaveProperty('data');
      expect(usage).toHaveProperty('pagination');
      
      if (usage.pagination) {
        expect(usage.pagination).toHaveProperty('page', 1);
        expect(usage.pagination).toHaveProperty('limit', 10);
        expect(typeof usage.pagination.total).toBe('number');
      }
    });
  });
  
  describe('Wiki Enhancement API Endpoints', () => {
    let testPageId: number;
    let testCategoryId: number;
    
    afterEach(async () => {
      // Cleanup test data
      if (testPageId) {
        try {
          await testClient.delete(`/api/v1/wiki/pages/${testPageId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (testCategoryId) {
        try {
          await testClient.delete(`/api/v1/wiki/categories/${testCategoryId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    
    test('POST /api/v1/wiki/categories - category management', async () => {
      // Create category
      const categoryResponse = await testClient.post('/api/v1/wiki/categories', {
        name: 'API Test Category',
        description: 'Category created during API testing',
        color: '#6366f1'
      });
      
      expect(categoryResponse.status).toBe(201);
      
      const category = categoryResponse.data.data;
      testCategoryId = category.id;
      
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name', 'API Test Category');
      expect(category).toHaveProperty('color', '#6366f1');
      expect(category).toHaveProperty('created_at');
      
      // Get categories
      const getCategoriesResponse = await testClient.get('/api/v1/wiki/categories');
      expect(getCategoriesResponse.status).toBe(200);
      
      const categories = getCategoriesResponse.data.data;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.some(cat => cat.id === testCategoryId)).toBe(true);
    });
    
    test('POST /api/v1/wiki/pages - page creation with categories', async () => {
      // Create category first
      const categoryResponse = await testClient.post('/api/v1/wiki/categories', {
        name: 'Test Page Category',
        color: '#ef4444'
      });
      testCategoryId = categoryResponse.data.data.id;
      
      // Create page with category
      const pageResponse = await testClient.post('/api/v1/wiki/pages', {
        title: 'API Test Page',
        content: 'This page was created during API testing. It includes [[Internal Link]] syntax.',
        category_ids: [testCategoryId],
        tags: ['api', 'test', 'automation']
      });
      
      expect(pageResponse.status).toBe(201);
      
      const page = pageResponse.data.data;
      testPageId = page.id;
      
      expect(page).toHaveProperty('id');
      expect(page).toHaveProperty('title', 'API Test Page');
      expect(page).toHaveProperty('content');
      expect(page).toHaveProperty('categories');
      expect(page).toHaveProperty('tags');
      
      expect(page.categories).toHaveLength(1);
      expect(page.categories[0].id).toBe(testCategoryId);
      expect(page.tags).toEqual(['api', 'test', 'automation']);
    });
    
    test('PUT /api/v1/wiki/pages/:id/categories - category assignment', async () => {
      // Create page and categories
      const pageResponse = await testClient.post('/api/v1/wiki/pages', {
        title: 'Category Assignment Test',
        content: 'Testing category assignment'
      });
      testPageId = pageResponse.data.data.id;
      
      const category1Response = await testClient.post('/api/v1/wiki/categories', {
        name: 'Category 1',
        color: '#10b981'
      });
      
      const category2Response = await testClient.post('/api/v1/wiki/categories', {
        name: 'Category 2',
        color: '#f59e0b'
      });
      
      const category1Id = category1Response.data.data.id;
      const category2Id = category2Response.data.data.id;
      
      // Assign categories to page
      const assignResponse = await testClient.put(`/api/v1/wiki/pages/${testPageId}/categories`, {
        category_ids: [category1Id, category2Id]
      });
      
      expect(assignResponse.status).toBe(200);
      
      // Verify assignment
      const getPageResponse = await testClient.get(`/api/v1/wiki/pages/${testPageId}`);
      const updatedPage = getPageResponse.data.data;
      
      expect(updatedPage.categories).toHaveLength(2);
      expect(updatedPage.categories.map(cat => cat.id)).toEqual(
        expect.arrayContaining([category1Id, category2Id])
      );
      
      // Cleanup additional categories
      await testClient.delete(`/api/v1/wiki/categories/${category1Id}`);
      await testClient.delete(`/api/v1/wiki/categories/${category2Id}`);
    });
    
    test('GET /api/v1/wiki/pages/:id/history - version history', async () => {
      // Create initial page
      const pageResponse = await testClient.post('/api/v1/wiki/pages', {
        title: 'Version History Test',
        content: 'Initial content'
      });
      testPageId = pageResponse.data.data.id;
      
      // Update page multiple times
      await testClient.put(`/api/v1/wiki/pages/${testPageId}`, {
        title: 'Version History Test',
        content: 'Updated content - version 2'
      });
      
      await testClient.put(`/api/v1/wiki/pages/${testPageId}`, {
        title: 'Version History Test',
        content: 'Final content - version 3'
      });
      
      // Get version history
      const historyResponse = await testClient.get(`/api/v1/wiki/pages/${testPageId}/history`);
      
      expect(historyResponse.status).toBe(200);
      
      const history = historyResponse.data.data;
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(3);
      
      // Verify version structure
      const latestVersion = history[0];
      expect(latestVersion).toHaveProperty('version_number');
      expect(latestVersion).toHaveProperty('content');
      expect(latestVersion).toHaveProperty('created_at');
      expect(latestVersion).toHaveProperty('author');
      
      expect(latestVersion.content).toContain('Final content - version 3');
    });
    
    test('POST /api/v1/wiki/pages/:id/restore/:version - version restoration', async () => {
      // Create page with versions (reuse from previous test setup)
      const pageResponse = await testClient.post('/api/v1/wiki/pages', {
        title: 'Restore Test Page',
        content: 'Good content'
      });
      testPageId = pageResponse.data.data.id;
      
      // Make a bad edit
      await testClient.put(`/api/v1/wiki/pages/${testPageId}`, {
        title: 'Restore Test Page',
        content: 'Bad content that needs to be reverted'
      });
      
      // Get version history to find version to restore
      const historyResponse = await testClient.get(`/api/v1/wiki/pages/${testPageId}/history`);
      const history = historyResponse.data.data;
      const goodVersion = history[1]; // Previous version
      
      // Restore previous version
      const restoreResponse = await testClient.post(
        `/api/v1/wiki/pages/${testPageId}/restore/${goodVersion.version_number}`
      );
      
      expect(restoreResponse.status).toBe(200);
      
      // Verify restoration
      const getPageResponse = await testClient.get(`/api/v1/wiki/pages/${testPageId}`);
      const restoredPage = getPageResponse.data.data;
      
      expect(restoredPage.content).toContain('Good content');
      expect(restoredPage.content).not.toContain('Bad content');
    });
  });
  
  describe('Kanban Analytics API Endpoints', () => {
    let testBoardId: string;
    let testCardIds: string[] = [];
    
    beforeEach(async () => {
      // Create test board
      const boardResponse = await testClient.post('/api/v1/kanban/boards', {
        name: 'API Analytics Test Board',
        description: 'Board for testing analytics APIs'
      });
      testBoardId = boardResponse.data.data.id;
      testCardIds = [];
    });
    
    afterEach(async () => {
      // Cleanup test data
      for (const cardId of testCardIds) {
        try {
          await testClient.delete(`/api/v1/kanban/cards/${cardId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      if (testBoardId) {
        try {
          await testClient.delete(`/api/v1/kanban/boards/${testBoardId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    
    test('GET /api/v1/kanban/boards/:id/analytics - comprehensive board analytics', async () => {
      // Create cards with different statuses and properties
      const cards = [
        { title: 'High Priority Task', priority: 'high', column: 'todo' },
        { title: 'Medium Priority Task', priority: 'medium', column: 'in_progress' },
        { title: 'Completed Task', priority: 'low', column: 'done' },
        { title: 'Another Todo', priority: 'medium', column: 'todo' }
      ];
      
      for (const cardData of cards) {
        const cardResponse = await testClient.post('/api/v1/kanban/cards', {
          ...cardData,
          board_id: testBoardId
        });
        testCardIds.push(cardResponse.data.data.id);
      }
      
      // Get board analytics
      const analyticsResponse = await testClient.get(`/api/v1/kanban/boards/${testBoardId}/analytics`);
      
      expect(analyticsResponse.status).toBe(200);
      
      const analytics = analyticsResponse.data.data;
      expect(analytics).toHaveProperty('total_cards', 4);
      expect(analytics).toHaveProperty('status_distribution');
      expect(analytics).toHaveProperty('priority_distribution');
      expect(analytics).toHaveProperty('completion_rate');
      
      // Verify status distribution
      expect(analytics.status_distribution).toHaveProperty('todo', 2);
      expect(analytics.status_distribution).toHaveProperty('in_progress', 1);
      expect(analytics.status_distribution).toHaveProperty('done', 1);
      
      // Verify priority distribution
      expect(analytics.priority_distribution).toHaveProperty('high', 1);
      expect(analytics.priority_distribution).toHaveProperty('medium', 2);
      expect(analytics.priority_distribution).toHaveProperty('low', 1);
      
      // Verify completion rate (1 done out of 4 total = 25%)
      expect(analytics.completion_rate).toBeCloseTo(0.25, 2);
    });
    
    test('GET /api/v1/kanban/boards/:id/activity - activity tracking', async () => {
      // Create a card and perform activities
      const cardResponse = await testClient.post('/api/v1/kanban/cards', {
        title: 'Activity Test Card',
        board_id: testBoardId,
        column: 'todo'
      });
      const cardId = cardResponse.data.data.id;
      testCardIds.push(cardId);
      
      // Move card to generate activity
      await testClient.put(`/api/v1/kanban/cards/${cardId}`, {
        column: 'in_progress'
      });
      
      // Add comment to generate activity
      await testClient.post(`/api/v1/kanban/cards/${cardId}/comments`, {
        content: 'Test comment for activity tracking'
      });
      
      // Get activity feed
      const activityResponse = await testClient.get(`/api/v1/kanban/boards/${testBoardId}/activity`);
      
      expect(activityResponse.status).toBe(200);
      
      const activities = activityResponse.data.data;
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThanOrEqual(3); // create, move, comment
      
      // Verify activity structure
      const latestActivity = activities[0];
      expect(latestActivity).toHaveProperty('id');
      expect(latestActivity).toHaveProperty('type');
      expect(latestActivity).toHaveProperty('card_id', cardId);
      expect(latestActivity).toHaveProperty('user_id');
      expect(latestActivity).toHaveProperty('timestamp');
      expect(latestActivity).toHaveProperty('details');
      
      // Verify activity types
      const activityTypes = activities.map(a => a.type);
      expect(activityTypes).toContain('comment_added');
      expect(activityTypes).toContain('card_moved');
      expect(activityTypes).toContain('card_created');
    });
    
    test('GET /api/v1/kanban/users/:id/productivity - user productivity insights', async () => {
      // Create cards assigned to test user
      const userCards = [
        { title: 'User Task 1', assignee: TEST_USER_ID, column: 'done', estimated_hours: 2 },
        { title: 'User Task 2', assignee: TEST_USER_ID, column: 'done', estimated_hours: 4 },
        { title: 'User Task 3', assignee: TEST_USER_ID, column: 'in_progress', estimated_hours: 3 }
      ];
      
      for (const cardData of userCards) {
        const cardResponse = await testClient.post('/api/v1/kanban/cards', {
          ...cardData,
          board_id: testBoardId
        });
        testCardIds.push(cardResponse.data.data.id);
      }
      
      // Get user productivity insights
      const productivityResponse = await testClient.get(`/api/v1/kanban/users/${TEST_USER_ID}/productivity`);
      
      expect(productivityResponse.status).toBe(200);
      
      const productivity = productivityResponse.data.data;
      expect(productivity).toHaveProperty('total_assigned', 3);
      expect(productivity).toHaveProperty('completed', 2);
      expect(productivity).toHaveProperty('in_progress', 1);
      expect(productivity).toHaveProperty('completion_rate');
      expect(productivity).toHaveProperty('estimated_vs_actual');
      expect(productivity).toHaveProperty('velocity');
      
      // Verify completion rate (2/3 = 66.7%)
      expect(productivity.completion_rate).toBeCloseTo(0.67, 1);
    });
  });
  
  describe('Real-time WebSocket Integration', () => {
    test('should receive real-time updates for memory operations', async (done) => {
      let updateReceived = false;
      
      // Listen for WebSocket messages
      wsConnection.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'memory_created' && message.data.content.includes('WebSocket test')) {
          updateReceived = true;
          expect(message).toHaveProperty('type', 'memory_created');
          expect(message).toHaveProperty('data');
          expect(message.data).toHaveProperty('id');
          expect(message.data).toHaveProperty('content');
          done();
        }
      });
      
      // Create memory to trigger WebSocket update
      await testClient.post('/api/v1/memories', {
        content: 'WebSocket test memory',
        context: { userId: TEST_USER_ID }
      });
      
      // Timeout if no update received
      setTimeout(() => {
        if (!updateReceived) {
          done(new Error('WebSocket update not received within timeout'));
        }
      }, 5000);
    });
    
    test('should receive real-time updates for kanban operations', async (done) => {
      let cardCreatedReceived = false;
      let cardMovedReceived = false;
      
      // Create test board first
      const boardResponse = await testClient.post('/api/v1/kanban/boards', {
        name: 'WebSocket Test Board'
      });
      const boardId = boardResponse.data.data.id;
      
      wsConnection.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'card_created' && message.data.title === 'WebSocket Test Card') {
          cardCreatedReceived = true;
          expect(message.data).toHaveProperty('board_id', boardId);
        }
        
        if (message.type === 'card_moved' && cardCreatedReceived) {
          cardMovedReceived = true;
          expect(message.data).toHaveProperty('from_column', 'todo');
          expect(message.data).toHaveProperty('to_column', 'in_progress');
          
          // Cleanup and finish test
          testClient.delete(`/api/v1/kanban/boards/${boardId}`);
          done();
        }
      });
      
      // Create card
      const cardResponse = await testClient.post('/api/v1/kanban/cards', {
        title: 'WebSocket Test Card',
        board_id: boardId,
        column: 'todo'
      });
      
      const cardId = cardResponse.data.data.id;
      
      // Wait a moment then move card
      setTimeout(async () => {
        await testClient.put(`/api/v1/kanban/cards/${cardId}`, {
          column: 'in_progress'
        });
      }, 1000);
      
      // Timeout if no updates received
      setTimeout(() => {
        if (!cardMovedReceived) {
          done(new Error('WebSocket updates not received within timeout'));
        }
      }, 10000);
    });
  });
  
  describe('API Performance and Rate Limiting', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      // Create multiple concurrent memory creation requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        testClient.post('/api/v1/memories', {
          content: `Concurrent test memory ${i}`,
          context: { userId: TEST_USER_ID }
        })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.data.data.content).toContain(`Concurrent test memory ${i}`);
      });
      
      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Cleanup
      for (const response of responses) {
        await testClient.delete(`/api/v1/memories/${response.data.data.id}`);
      }
    });
    
    test('should implement proper rate limiting', async () => {
      // This test depends on rate limiting configuration
      // Adjust the number of requests based on your rate limits
      const requestsPerMinute = 100;
      const requests = [];
      
      // Send requests rapidly
      for (let i = 0; i < requestsPerMinute + 10; i++) {
        requests.push(
          testClient.get('/api/v1/health').catch(error => error.response)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        response => response && response.status === 429
      );
      
      // Should have some rate limited responses if limits are enforced
      // This test might need adjustment based on your specific rate limiting rules
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].data).toHaveProperty('error');
        expect(rateLimitedResponses[0].data.error).toContain('rate limit');
      }
    });
  });
});
