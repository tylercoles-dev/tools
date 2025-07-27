/**
 * End-to-End Full Workflow Tests
 * 
 * Tests complete user workflows across multiple services
 */

import { TestAPIClient, TestWebSocketClient, TestDataGenerator } from '../utils/test-client.js';

describe('End-to-End Workflows', () => {
  let apiClient: TestAPIClient;
  let wsClient: TestWebSocketClient;

  beforeAll(async () => {
    apiClient = new TestAPIClient();
    wsClient = new TestWebSocketClient();
    await wsClient.connect();
  });

  afterAll(() => {
    wsClient.disconnect();
  });

  describe('Project Management Workflow', () => {
    it('should complete full project lifecycle', async () => {
      // 1. Create a new project board
      const boardData = TestDataGenerator.randomKanbanBoard();
      const boardResponse = await apiClient.createKanbanBoard(boardData);
      expect(boardResponse.status).toBe(201);
      
      const board = boardResponse.data.data;
      const todoColumn = board.columns.find((c: any) => c.name === 'To Do');
      
      // 2. Create project documentation in memory
      const projectMemory = {
        content: `Project: ${board.name}\n\nGoals:\n- Complete integration testing\n- Implement new features\n- Deploy to production`,
        type: 'project_documentation',
        tags: ['project', board.name.toLowerCase().replace(/\s+/g, '-')],
        metadata: {
          projectId: board.id,
          boardId: board.id,
          type: 'project_overview'
        }
      };
      
      const memoryResponse = await apiClient.createMemory(projectMemory);
      expect(memoryResponse.status).toBe(201);
      
      // 3. Create tasks in the kanban board
      const tasks = [
        { title: 'Setup development environment', priority: 1 },
        { title: 'Implement core features', priority: 2 },
        { title: 'Write tests', priority: 3 },
        { title: 'Deploy to staging', priority: 4 },
        { title: 'Production deployment', priority: 5 }
      ];
      
      const createdTasks = [];
      for (const task of tasks) {
        const cardData = {
          ...TestDataGenerator.randomKanbanCard(board.id, todoColumn.id),
          title: task.title,
          priority: task.priority
        };
        
        const cardResponse = await apiClient.client.post('/api/kanban/cards', cardData);
        expect(cardResponse.status).toBe(201);
        createdTasks.push(cardResponse.data.data);
      }
      
      // 4. Move first task to in progress
      const firstTask = createdTasks[0];
      const updateResponse = await apiClient.client.patch(`/api/kanban/cards/${firstTask.id}`, {
        status: 'in_progress'
      });
      expect(updateResponse.status).toBe(200);
      
      // 5. Add project notes
      const progressMemory = {
        content: `Progress update on ${board.name}: Started working on "${firstTask.title}"`,
        type: 'progress_note',
        tags: ['progress', 'project-update'],
        metadata: {
          projectId: board.id,
          taskId: firstTask.id,
          timestamp: new Date().toISOString()
        }
      };
      
      const progressResponse = await apiClient.createMemory(progressMemory);
      expect(progressResponse.status).toBe(201);
      
      // 6. Verify project analytics
      const analyticsResponse = await apiClient.client.get(`/api/kanban/boards/${board.id}/analytics`);
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.data.data.totalCards).toBe(5);
      expect(analyticsResponse.data.data.cardsInProgress).toBe(1);
      
      // 7. Search for project-related memories
      const searchResponse = await apiClient.client.get(`/api/memory/search?query=${board.name}`);
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Knowledge Management Workflow', () => {
    it('should create and link knowledge across services', async () => {
      // 1. Create a wiki page
      const wikiPage = {
        title: 'Integration Testing Best Practices',
        content: `# Integration Testing Best Practices

## Overview
This document outlines best practices for integration testing in the MCP Tools ecosystem.

## Key Principles
1. Test realistic user workflows
2. Verify cross-service communication
3. Validate data consistency
4. Test error handling scenarios

## Implementation
- Use proper test isolation
- Mock external services when needed
- Verify API contracts
- Test performance under load`,
        category: 'testing',
        tags: ['testing', 'best-practices', 'integration']
      };
      
      const wikiResponse = await apiClient.client.post('/api/wiki/pages', wikiPage);
      expect(wikiResponse.status).toBe(201);
      
      const createdPage = wikiResponse.data.data;
      
      // 2. Create related memories
      const relatedMemories = [
        {
          content: 'Remember to update the integration testing documentation after adding new test cases',
          type: 'reminder',
          tags: ['documentation', 'testing'],
          metadata: {
            relatedWikiPage: createdPage.id,
            priority: 'medium'
          }
        },
        {
          content: 'Integration test failures in CI/CD pipeline - need to investigate timeout issues',
          type: 'issue',
          tags: ['testing', 'ci-cd', 'troubleshooting'],
          metadata: {
            status: 'open',
            relatedDocumentation: createdPage.id
          }
        }
      ];
      
      for (const memory of relatedMemories) {
        const memoryResponse = await apiClient.createMemory(memory);
        expect(memoryResponse.status).toBe(201);
      }
      
      // 3. Search across services
      const searchResults = await apiClient.client.get('/api/memory/search?query=integration testing');
      expect(searchResults.status).toBe(200);
      expect(searchResults.data.data.length).toBeGreaterThan(0);
      
      // 4. Verify wiki page retrieval
      const pageResponse = await apiClient.client.get(`/api/wiki/pages/${createdPage.id}`);
      expect(pageResponse.status).toBe(200);
      expect(pageResponse.data.data.title).toBe(wikiPage.title);
    });
  });

  describe('Real-time Collaboration', () => {
    it('should handle real-time updates via WebSocket', async () => {
      const updates: any[] = [];
      
      // Listen for real-time updates
      wsClient.onMessage('kanban_update', (data) => {
        updates.push(data);
      });
      
      wsClient.onMessage('memory_update', (data) => {
        updates.push(data);
      });
      
      // Create a board to trigger updates
      const boardData = TestDataGenerator.randomKanbanBoard();
      const boardResponse = await apiClient.createKanbanBoard(boardData);
      expect(boardResponse.status).toBe(201);
      
      // Create a memory to trigger updates
      const memoryData = TestDataGenerator.randomMemory();
      const memoryResponse = await apiClient.createMemory(memoryData);
      expect(memoryResponse.status).toBe(201);
      
      // Wait for WebSocket updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should have received real-time updates
      expect(updates.length).toBeGreaterThan(0);
      
      // Verify update structure
      updates.forEach(update => {
        expect(update).toHaveProperty('type');
        expect(update).toHaveProperty('data');
        expect(update).toHaveProperty('timestamp');
      });
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle service failures gracefully', async () => {
      // 1. Create initial data
      const memoryData = TestDataGenerator.randomMemory();
      const response = await apiClient.createMemory(memoryData);
      expect(response.status).toBe(201);
      
      // 2. Test service degradation scenarios
      // Try to access a service that might be temporarily unavailable
      const healthResponse = await apiClient.getDetailedHealth();
      
      if (healthResponse.data.data.status === 'degraded') {
        // Verify that core functionality still works
        const basicHealthResponse = await apiClient.getHealth();
        expect(basicHealthResponse.status).toBe(200);
        
        // Basic operations should still function
        const memoriesResponse = await apiClient.getMemories();
        expect(memoriesResponse.status).toBeLessThan(500); // Should not be server error
      }
      
      // 3. Verify data consistency after recovery
      const verifyResponse = await apiClient.getMemory(response.data.data.id);
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.data.content).toBe(memoryData.content);
    });
  });
});