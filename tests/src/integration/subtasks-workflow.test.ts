/**
 * Integration Tests for Subtasks Workflow
 * Tests complete subtask/todo list functionality from creation to hierarchical management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../utils/test-client';
import { TestEnvironment } from '../setup/test-environment';

describe('Subtasks Workflow Integration', () => {
  let apiClient: ApiClient;
  let testEnv: TestEnvironment;
  let boardId: number;
  let columnId: number;
  let parentCardId: number;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    apiClient = testEnv.getApiClient();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    // Create fresh board and parent card for each test
    const board = await apiClient.post('/api/kanban/boards', {
      title: 'Subtasks Test Board',
      description: 'Testing subtasks functionality'
    });
    boardId = board.data.id;

    const column = await apiClient.post('/api/kanban/columns', {
      board_id: boardId,
      title: 'In Progress',
      order_index: 0
    });
    columnId = column.data.id;

    const parentCard = await apiClient.post('/api/kanban/cards', {
      board_id: boardId,
      column_id: columnId,
      title: 'User Authentication System',
      description: 'Implement complete user authentication with subtasks'
    });
    parentCardId = parentCard.data.id;
  });

  describe('Basic Subtask Operations', () => {
    it('should create, update, and complete subtasks successfully', async () => {
      // Step 1: Create root-level subtask
      const subtaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Setup Authentication Infrastructure',
        description: 'Configure JWT, middleware, and database schema',
        priority: 'high',
        status: 'todo'
      });

      expect(subtaskResponse.status).toBe(201);
      expect(subtaskResponse.data).toMatchObject({
        card_id: parentCardId,
        parent_id: null,
        title: 'Setup Authentication Infrastructure',
        description: 'Configure JWT, middleware, and database schema',
        priority: 'high',
        status: 'todo',
        order_index: 0
      });

      const subtaskId = subtaskResponse.data.id;

      // Step 2: Update subtask
      const updateResponse = await apiClient.put(`/api/kanban/subtasks/${subtaskId}`, {
        title: 'Setup Auth Infrastructure & Security',
        description: 'Updated: Configure JWT, middleware, database schema, and security policies',
        priority: 'critical',
        status: 'in_progress'
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.title).toBe('Setup Auth Infrastructure & Security');
      expect(updateResponse.data.priority).toBe('critical');
      expect(updateResponse.data.status).toBe('in_progress');

      // Step 3: Complete subtask
      const completeResponse = await apiClient.post(`/api/kanban/subtasks/${subtaskId}/complete`);
      expect(completeResponse.status).toBe(200);
      expect(completeResponse.data.status).toBe('completed');
      expect(completeResponse.data.completed_at).toBeDefined();

      // Step 4: Verify completion
      const getResponse = await apiClient.get(`/api/kanban/subtasks/${subtaskId}`);
      expect(getResponse.data.status).toBe('completed');
    });

    it('should prevent completing already completed subtask', async () => {
      // Create and complete subtask
      const subtaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Test Subtask'
      });

      const subtaskId = subtaskResponse.data.id;
      await apiClient.post(`/api/kanban/subtasks/${subtaskId}/complete`);

      // Try to complete again
      const secondCompleteResponse = await apiClient.post(`/api/kanban/subtasks/${subtaskId}/complete`);
      expect(secondCompleteResponse.status).toBe(400);
      expect(secondCompleteResponse.data.error).toContain('already completed');
    });
  });

  describe('Hierarchical Subtask Structure', () => {
    it('should create and manage nested subtask hierarchy', async () => {
      // Create parent subtask
      const parentSubtaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Frontend Authentication Components',
        description: 'All frontend components for authentication',
        priority: 'high'
      });

      const parentSubtaskId = parentSubtaskResponse.data.id;

      // Create child subtasks
      const childSubtasks = [
        {
          title: 'Login Form Component',
          description: 'Email/password login form with validation',
          priority: 'high'
        },
        {
          title: 'Registration Form Component',
          description: 'User registration form with validation',
          priority: 'medium'
        },
        {
          title: 'Password Reset Component',
          description: 'Forgot password and reset functionality',
          priority: 'low'
        }
      ];

      const createdChildSubtasks = [];
      for (let i = 0; i < childSubtasks.length; i++) {
        const childResponse = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          parent_id: parentSubtaskId,
          ...childSubtasks[i]
        });
        expect(childResponse.status).toBe(201);
        expect(childResponse.data.parent_id).toBe(parentSubtaskId);
        expect(childResponse.data.order_index).toBe(i);
        createdChildSubtasks.push(childResponse.data);
      }

      // Create grandchild subtasks under first child
      const grandchildResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: createdChildSubtasks[0].id,
        title: 'Form Validation Logic',
        description: 'Client-side and server-side validation',
        priority: 'medium'
      });

      expect(grandchildResponse.status).toBe(201);
      expect(grandchildResponse.data.parent_id).toBe(createdChildSubtasks[0].id);

      // Get hierarchical structure
      const hierarchyResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      
      expect(hierarchyResponse.status).toBe(200);
      expect(hierarchyResponse.data).toHaveLength(1); // One root subtask

      const rootSubtask = hierarchyResponse.data[0];
      expect(rootSubtask.id).toBe(parentSubtaskId);
      expect(rootSubtask.children).toHaveLength(3);
      expect(rootSubtask.children[0].children).toHaveLength(1); // First child has one grandchild
      expect(rootSubtask.children[0].children[0].title).toBe('Form Validation Logic');
    });

    it('should handle deep nesting and complex hierarchies', async () => {
      // Create a 4-level hierarchy
      let currentParentId = null;
      const levels = [
        'Level 1: Authentication Module',
        'Level 2: Frontend Components',
        'Level 3: Form Components',
        'Level 4: Validation Components'
      ];

      const createdSubtasks = [];
      for (const levelTitle of levels) {
        const response = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          parent_id: currentParentId,
          title: levelTitle,
          priority: 'medium'
        });
        expect(response.status).toBe(201);
        createdSubtasks.push(response.data);
        currentParentId = response.data.id;
      }

      // Verify hierarchy depth
      const hierarchyResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      
      let currentLevel = hierarchyResponse.data[0];
      let depth = 1;
      
      while (currentLevel.children && currentLevel.children.length > 0) {
        currentLevel = currentLevel.children[0];
        depth++;
      }
      
      expect(depth).toBe(4);
      expect(currentLevel.title).toBe('Level 4: Validation Components');
    });

    it('should prevent circular references in hierarchy', async () => {
      // Create parent and child
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Parent Task'
      });

      const childResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentResponse.data.id,
        title: 'Child Task'
      });

      // Try to make parent a child of its own child (circular reference)
      const circularResponse = await apiClient.put(`/api/kanban/subtasks/${parentResponse.data.id}`, {
        parent_id: childResponse.data.id
      });

      expect(circularResponse.status).toBe(400);
      expect(circularResponse.data.error).toContain('circular');
    });
  });

  describe('Subtask Ordering and Movement', () => {
    it('should handle subtask reordering within same parent', async () => {
      // Create multiple sibling subtasks
      const subtasks = [];
      for (let i = 0; i < 5; i++) {
        const response = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          title: `Subtask ${i + 1}`,
          priority: 'medium'
        });
        subtasks.push(response.data);
      }

      // Verify initial order
      let listResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      expect(listResponse.data.map(s => s.title)).toEqual([
        'Subtask 1', 'Subtask 2', 'Subtask 3', 'Subtask 4', 'Subtask 5'
      ]);

      // Move first subtask to position 3 (0-indexed)
      const moveResponse = await apiClient.post(`/api/kanban/subtasks/${subtasks[0].id}/move`, {
        new_order_index: 2
      });

      expect(moveResponse.status).toBe(200);

      // Verify new order
      listResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      expect(listResponse.data.map(s => s.title)).toEqual([
        'Subtask 2', 'Subtask 3', 'Subtask 1', 'Subtask 4', 'Subtask 5'
      ]);

      // Move last subtask to first position
      await apiClient.post(`/api/kanban/subtasks/${subtasks[4].id}/move`, {
        new_order_index: 0
      });

      listResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      expect(listResponse.data.map(s => s.title)).toEqual([
        'Subtask 5', 'Subtask 2', 'Subtask 3', 'Subtask 1', 'Subtask 4'
      ]);
    });

    it('should handle moving subtasks between different parents', async () => {
      // Create two parent subtasks
      const parent1Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Frontend Tasks'
      });

      const parent2Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Backend Tasks'
      });

      // Create child subtasks under first parent
      const child1Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parent1Response.data.id,
        title: 'Login Component'
      });

      const child2Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parent1Response.data.id,
        title: 'Registration Component'
      });

      // Verify initial structure
      let hierarchyResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      const frontend = hierarchyResponse.data.find(s => s.title === 'Frontend Tasks');
      const backend = hierarchyResponse.data.find(s => s.title === 'Backend Tasks');
      
      expect(frontend.children).toHaveLength(2);
      expect(backend.children).toHaveLength(0);

      // Move child from frontend to backend
      const moveResponse = await apiClient.post(`/api/kanban/subtasks/${child1Response.data.id}/move`, {
        new_parent_id: parent2Response.data.id,
        new_order_index: 0
      });

      expect(moveResponse.status).toBe(200);

      // Verify new structure
      hierarchyResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      const updatedFrontend = hierarchyResponse.data.find(s => s.title === 'Frontend Tasks');
      const updatedBackend = hierarchyResponse.data.find(s => s.title === 'Backend Tasks');
      
      expect(updatedFrontend.children).toHaveLength(1);
      expect(updatedBackend.children).toHaveLength(1);
      expect(updatedBackend.children[0].title).toBe('Login Component');
    });

    it('should handle promoting subtask to root level', async () => {
      // Create parent with child
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Parent Task'
      });

      const childResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentResponse.data.id,
        title: 'Child Task'
      });

      // Promote child to root level
      const promoteResponse = await apiClient.post(`/api/kanban/subtasks/${childResponse.data.id}/move`, {
        new_parent_id: null,
        new_order_index: 0
      });

      expect(promoteResponse.status).toBe(200);

      // Verify structure
      const listResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      const rootTasks = listResponse.data.filter(s => s.parent_id === null);
      expect(rootTasks).toHaveLength(2);
      expect(rootTasks.map(s => s.title)).toContain('Child Task');
    });
  });

  describe('Subtask Progress Tracking', () => {
    it('should track progress accurately across hierarchy', async () => {
      // Create subtask hierarchy with different statuses
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Authentication Module',
        status: 'in_progress'
      });

      const parentId = parentResponse.data.id;

      // Create child subtasks with different statuses
      const childSubtasks = [
        { title: 'Login Logic', status: 'completed' },
        { title: 'Registration Logic', status: 'completed' },
        { title: 'Password Reset', status: 'in_progress' },
        { title: 'Email Verification', status: 'todo' },
        { title: 'Social Login', status: 'todo' }
      ];

      for (const child of childSubtasks) {
        const response = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          parent_id: parentId,
          ...child
        });
        
        // Complete the ones marked as completed
        if (child.status === 'completed') {
          await apiClient.post(`/api/kanban/subtasks/${response.data.id}/complete`);
        } else if (child.status === 'in_progress') {
          await apiClient.put(`/api/kanban/subtasks/${response.data.id}`, {
            status: 'in_progress'
          });
        }
      }

      // Get progress for the card
      const progressResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks/progress`);
      
      expect(progressResponse.status).toBe(200);
      expect(progressResponse.data).toMatchObject({
        card_id: parentCardId,
        total_subtasks: 6, // 1 parent + 5 children
        completed_subtasks: 2,
        in_progress_subtasks: 2, // parent + 1 child
        todo_subtasks: 2,
        completion_percentage: expect.closeTo(33.33, 1) // 2/6 * 100
      });

      // Verify subtasks by priority breakdown
      expect(progressResponse.data.subtasks_by_priority).toBeDefined();
      
      // Complete another subtask and verify progress update
      const inProgressChild = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      const inProgressSubtask = inProgressChild.data.find(s => s.title === 'Password Reset');
      
      await apiClient.post(`/api/kanban/subtasks/${inProgressSubtask.id}/complete`);

      const updatedProgressResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks/progress`);
      expect(updatedProgressResponse.data.completed_subtasks).toBe(3);
      expect(updatedProgressResponse.data.completion_percentage).toBeCloseTo(50, 1); // 3/6 * 100
    });

    it('should handle automatic parent completion when all children complete', async () => {
      // Create parent with children
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Feature Implementation',
        status: 'in_progress'
      });

      const parentId = parentResponse.data.id;

      // Create two child subtasks
      const child1Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentId,
        title: 'Child 1',
        status: 'todo'
      });

      const child2Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentId,
        title: 'Child 2',
        status: 'todo'
      });

      // Complete first child
      await apiClient.post(`/api/kanban/subtasks/${child1Response.data.id}/complete`);

      // Parent should still be in progress
      let parentStatus = await apiClient.get(`/api/kanban/subtasks/${parentId}`);
      expect(parentStatus.data.status).toBe('in_progress');

      // Complete second child
      await apiClient.post(`/api/kanban/subtasks/${child2Response.data.id}/complete`);

      // Parent should now be automatically completed
      parentStatus = await apiClient.get(`/api/kanban/subtasks/${parentId}`);
      expect(parentStatus.data.status).toBe('completed');
      expect(parentStatus.data.completed_at).toBeDefined();
    });

    it('should provide detailed progress analytics', async () => {
      // Create complex subtask structure with time estimates
      const mainTaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Complete User Management',
        estimated_hours: 40
      });

      const categories = [
        { name: 'Authentication', tasks: ['Login', 'Register', 'Logout'], hours: [4, 6, 2] },
        { name: 'User Profile', tasks: ['View Profile', 'Edit Profile', 'Avatar Upload'], hours: [2, 8, 4] },
        { name: 'Permissions', tasks: ['Role Management', 'Access Control'], hours: [8, 6] }
      ];

      for (const category of categories) {
        const categoryResponse = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          parent_id: mainTaskResponse.data.id,
          title: category.name
        });

        for (let i = 0; i < category.tasks.length; i++) {
          await apiClient.post('/api/kanban/subtasks', {
            card_id: parentCardId,
            parent_id: categoryResponse.data.id,
            title: category.tasks[i],
            estimated_hours: category.hours[i]
          });
        }
      }

      // Complete some tasks and log time
      const allSubtasks = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      const authCategory = allSubtasks.data[0].children.find(c => c.title === 'Authentication');
      const loginTask = authCategory.children.find(t => t.title === 'Login');
      
      await apiClient.post(`/api/kanban/subtasks/${loginTask.id}/complete`);
      
      // Log actual time
      await apiClient.post('/api/kanban/time-entries', {
        card_id: parentCardId,
        subtask_id: loginTask.id,
        user_id: 'test-user',
        duration_minutes: 300 // 5 hours (over estimate)
      });

      // Get detailed analytics
      const analyticsResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks/analytics`);
      
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.data).toMatchObject({
        total_estimated_hours: 40,
        total_actual_hours: 5,
        completion_percentage: expect.any(Number),
        efficiency_metrics: {
          tasks_on_time: expect.any(Number),
          tasks_over_estimate: 1,
          average_estimation_accuracy: expect.any(Number)
        },
        category_breakdown: expect.arrayContaining([
          expect.objectContaining({
            category: 'Authentication',
            progress_percentage: expect.any(Number),
            estimated_hours: 12,
            actual_hours: 5
          })
        ])
      });
    });
  });

  describe('Subtask Filtering and Search', () => {
    it('should filter subtasks by various criteria', async () => {
      // Create diverse subtasks
      const subtasks = [
        { title: 'High Priority Bug Fix', priority: 'critical', status: 'todo', assignee: 'dev1' },
        { title: 'Medium Feature Implementation', priority: 'medium', status: 'in_progress', assignee: 'dev2' },
        { title: 'Low Priority Enhancement', priority: 'low', status: 'completed', assignee: 'dev1' },
        { title: 'Critical Security Update', priority: 'critical', status: 'in_progress', assignee: 'dev3' },
        { title: 'Documentation Update', priority: 'low', status: 'todo', assignee: 'dev2' }
      ];

      const createdSubtasks = [];
      for (const subtask of subtasks) {
        const response = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          ...subtask
        });
        createdSubtasks.push(response.data);
        
        if (subtask.status === 'completed') {
          await apiClient.post(`/api/kanban/subtasks/${response.data.id}/complete`);
        } else if (subtask.status === 'in_progress') {
          await apiClient.put(`/api/kanban/subtasks/${response.data.id}`, {
            status: 'in_progress'
          });
        }
      }

      // Filter by status
      const todoResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?status=todo`);
      expect(todoResponse.data).toHaveLength(2);
      expect(todoResponse.data.every(s => s.status === 'todo')).toBe(true);

      // Filter by priority
      const criticalResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?priority=critical`);
      expect(criticalResponse.data).toHaveLength(2);
      expect(criticalResponse.data.every(s => s.priority === 'critical')).toBe(true);

      // Filter by assignee
      const dev1Response = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?assignee=dev1`);
      expect(dev1Response.data).toHaveLength(2);
      expect(dev1Response.data.every(s => s.assignee === 'dev1')).toBe(true);

      // Search by title
      const searchResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?search=Bug`);
      expect(searchResponse.data).toHaveLength(1);
      expect(searchResponse.data[0].title).toBe('High Priority Bug Fix');

      // Combined filters
      const combinedResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?status=in_progress&priority=critical`);
      expect(combinedResponse.data).toHaveLength(1);
      expect(combinedResponse.data[0].title).toBe('Critical Security Update');
    });

    it('should sort subtasks by different criteria', async () => {
      // Create subtasks with different attributes
      const subtasks = [
        { title: 'Task A', priority: 'low', created_at: '2024-06-01', estimated_hours: 8 },
        { title: 'Task B', priority: 'critical', created_at: '2024-06-03', estimated_hours: 4 },
        { title: 'Task C', priority: 'medium', created_at: '2024-06-02', estimated_hours: 12 },
        { title: 'Task D', priority: 'high', created_at: '2024-06-04', estimated_hours: 2 }
      ];

      for (const subtask of subtasks) {
        await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          ...subtask
        });
      }

      // Sort by priority (critical, high, medium, low)
      const priorityResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?sort_by=priority&sort_order=desc`);
      const priorityOrder = priorityResponse.data.map(s => s.priority);
      expect(priorityOrder).toEqual(['critical', 'high', 'medium', 'low']);

      // Sort by estimated hours
      const hoursResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?sort_by=estimated_hours&sort_order=asc`);
      const hoursOrder = hoursResponse.data.map(s => s.estimated_hours);
      expect(hoursOrder).toEqual([2, 4, 8, 12]);

      // Sort by creation date
      const dateResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?sort_by=created_at&sort_order=desc`);
      const dateOrder = dateResponse.data.map(s => s.title);
      expect(dateOrder[0]).toBe('Task D'); // Most recent
    });
  });

  describe('Subtask Deletion and Cleanup', () => {
    it('should delete subtask and all children', async () => {
      // Create parent with children
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Parent Task'
      });

      const child1Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentResponse.data.id,
        title: 'Child 1'
      });

      const child2Response = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: parentResponse.data.id,
        title: 'Child 2'
      });

      // Create grandchild
      const grandchildResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        parent_id: child1Response.data.id,
        title: 'Grandchild'
      });

      // Delete parent (should delete all children and grandchildren)
      const deleteResponse = await apiClient.delete(`/api/kanban/subtasks/${parentResponse.data.id}`);
      expect(deleteResponse.status).toBe(200);

      // Verify all are deleted
      const remainingResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks`);
      expect(remainingResponse.data).toHaveLength(0);

      // Verify individual subtasks are not found
      const parentCheck = await apiClient.get(`/api/kanban/subtasks/${parentResponse.data.id}`);
      expect(parentCheck.status).toBe(404);

      const childCheck = await apiClient.get(`/api/kanban/subtasks/${child1Response.data.id}`);
      expect(childCheck.status).toBe(404);

      const grandchildCheck = await apiClient.get(`/api/kanban/subtasks/${grandchildResponse.data.id}`);
      expect(grandchildCheck.status).toBe(404);
    });

    it('should handle selective deletion of child subtasks', async () => {
      // Create parent with multiple children
      const parentResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Parent Task'
      });

      const children = [];
      for (let i = 1; i <= 3; i++) {
        const childResponse = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          parent_id: parentResponse.data.id,
          title: `Child ${i}`
        });
        children.push(childResponse.data);
      }

      // Delete middle child
      const deleteResponse = await apiClient.delete(`/api/kanban/subtasks/${children[1].id}`);
      expect(deleteResponse.status).toBe(200);

      // Verify parent and other children still exist
      const remainingResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/subtasks?include_hierarchy=true`);
      expect(remainingResponse.data).toHaveLength(1); // Parent still exists
      expect(remainingResponse.data[0].children).toHaveLength(2); // Two children remain
      
      const remainingTitles = remainingResponse.data[0].children.map(c => c.title);
      expect(remainingTitles).toEqual(['Child 1', 'Child 3']);
    });

    it('should cleanup related data when deleting subtasks', async () => {
      // Create subtask with time entries and comments
      const subtaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Task with Data'
      });

      const subtaskId = subtaskResponse.data.id;

      // Add time entry
      await apiClient.post('/api/kanban/time-entries', {
        card_id: parentCardId,
        subtask_id: subtaskId,
        user_id: 'test-user',
        duration_minutes: 120
      });

      // Add comment
      await apiClient.post('/api/kanban/comments', {
        card_id: parentCardId,
        subtask_id: subtaskId,
        user_id: 'test-user',
        content: 'Progress update on subtask'
      });

      // Delete subtask
      const deleteResponse = await apiClient.delete(`/api/kanban/subtasks/${subtaskId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify related data is cleaned up
      const timeEntriesResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/time-entries`);
      expect(timeEntriesResponse.data.entries.filter(e => e.subtask_id === subtaskId)).toHaveLength(0);

      const commentsResponse = await apiClient.get(`/api/kanban/cards/${parentCardId}/comments`);
      expect(commentsResponse.data.filter(c => c.subtask_id === subtaskId)).toHaveLength(0);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should integrate subtasks with milestones and custom fields', async () => {
      // Create milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Sprint 1',
        due_date: '2024-07-31'
      });

      // Create custom field for subtasks
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Complexity',
        type: 'dropdown',
        options: ['Simple', 'Medium', 'Complex'],
        applies_to: 'subtasks'
      });

      // Assign card to milestone
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: parentCardId,
        milestone_id: milestoneResponse.data.id
      });

      // Create subtasks with custom field values
      const subtasks = [
        { title: 'Simple Task', complexity: 'Simple' },
        { title: 'Complex Task', complexity: 'Complex' }
      ];

      for (const subtask of subtasks) {
        const subtaskResponse = await apiClient.post('/api/kanban/subtasks', {
          card_id: parentCardId,
          title: subtask.title
        });

        // Set custom field value
        await apiClient.post('/api/kanban/custom-field-values', {
          subtask_id: subtaskResponse.data.id,
          field_id: fieldResponse.data.id,
          value: subtask.complexity
        });
      }

      // Get milestone progress including subtask details
      const progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneResponse.data.id}/progress?include_subtasks=true`);
      
      expect(progressResponse.data.subtask_breakdown).toBeDefined();
      expect(progressResponse.data.subtask_breakdown.total_subtasks).toBe(2);
      expect(progressResponse.data.subtask_breakdown.by_complexity).toEqual({
        'Simple': 1,
        'Complex': 1
      });
    });

    it('should handle subtasks with time tracking integration', async () => {
      // Create subtasks with time estimates
      const subtaskResponse = await apiClient.post('/api/kanban/subtasks', {
        card_id: parentCardId,
        title: 'Time Tracked Task',
        estimated_hours: 8
      });

      const subtaskId = subtaskResponse.data.id;

      // Start time tracking on subtask
      const startResponse = await apiClient.post('/api/kanban/time-tracking/start', {
        card_id: parentCardId,
        subtask_id: subtaskId,
        user_id: 'test-user',
        description: 'Working on subtask implementation'
      });

      expect(startResponse.status).toBe(200);

      // Stop time tracking after some work
      const stopResponse = await apiClient.post('/api/kanban/time-tracking/stop', {
        user_id: 'test-user'
      });

      expect(stopResponse.status).toBe(200);

      // Get time report for subtask
      const timeReportResponse = await apiClient.get(`/api/kanban/subtasks/${subtaskId}/time-report`);
      
      expect(timeReportResponse.status).toBe(200);
      expect(timeReportResponse.data).toMatchObject({
        subtask_id: subtaskId,
        estimated_hours: 8,
        actual_hours: expect.any(Number),
        efficiency_ratio: expect.any(Number),
        time_entries: expect.any(Array)
      });

      // Complete subtask and verify time totals
      await apiClient.post(`/api/kanban/subtasks/${subtaskId}/complete`);

      const completedSubtask = await apiClient.get(`/api/kanban/subtasks/${subtaskId}`);
      expect(completedSubtask.data.status).toBe('completed');
      expect(completedSubtask.data.actual_hours).toBeGreaterThan(0);
    });
  });
});