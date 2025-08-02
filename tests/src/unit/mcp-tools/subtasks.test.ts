/**
 * Unit Tests for Subtasks MCP Tools
 * Tests all 7 subtask tools with comprehensive scenarios
 */

import { KanbanService } from '@mcp-tools/core/kanban';
import { 
  registerCreateSubtaskTool,
  registerUpdateSubtaskTool,
  registerCompleteSubtaskTool,
  registerDeleteSubtaskTool,
  registerGetSubtasksTool,
  registerMoveSubtaskTool,
  registerGetSubtaskProgressTool
} from '../../../servers/kanban/src/tools/subtask/subtask-tools';

describe('Subtasks MCP Tools', () => {
  let mockKanbanService: jest.Mocked<KanbanService>;
  let mockWsServer: any;
  let mockDb: any;

  beforeEach(() => {
    mockKanbanService = {
      createSubtask: jest.fn(),
      updateSubtask: jest.fn(),
      deleteSubtask: jest.fn(),
      getSubtasks: jest.fn(),
      moveSubtask: jest.fn(),
      getSubtaskProgress: jest.fn(),
    } as any;

    mockWsServer = {
      broadcast: jest.fn(),
      broadcastToBoard: jest.fn(),
    };

    mockDb = {
      createSubtask: jest.fn(),
      updateSubtask: jest.fn(),
      deleteSubtask: jest.fn(),
      getSubtaskById: jest.fn(),
      getSubtasksByCard: jest.fn(),
      getSubtaskProgress: jest.fn(),
      getCardById: jest.fn(),
    };
  });

  describe('Create Subtask Tool', () => {
    it('should create subtask successfully', async () => {
      const mockSubtask = {
        id: 1,
        card_id: 1,
        parent_id: null,
        title: 'Implement user authentication',
        description: 'Add login and signup functionality',
        status: 'todo',
        priority: 'medium',
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const card = { id: 1, board_id: 1, title: 'User Management' };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.createSubtask.mockResolvedValue(mockSubtask);
      const tool = registerCreateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        title: 'Implement user authentication',
        description: 'Add login and signup functionality',
        priority: 'medium'
      });

      expect(mockDb.createSubtask).toHaveBeenCalledWith({
        card_id: 1,
        parent_id: null,
        title: 'Implement user authentication',
        description: 'Add login and signup functionality',
        status: 'todo',
        priority: 'medium',
        order_index: 0
      });
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'subtaskCreated', mockSubtask);
      expect(result).toEqual({
        success: true,
        data: mockSubtask
      });
    });

    it('should create nested subtask', async () => {
      const parentSubtask = {
        id: 1,
        card_id: 1,
        title: 'Authentication System'
      };

      const childSubtask = {
        id: 2,
        card_id: 1,
        parent_id: 1,
        title: 'Password validation',
        status: 'todo',
        order_index: 0
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.getSubtaskById.mockResolvedValue(parentSubtask);
      mockDb.createSubtask.mockResolvedValue(childSubtask);
      const tool = registerCreateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        parent_id: 1,
        title: 'Password validation'
      });

      expect(result.success).toBe(true);
      expect(result.data.parent_id).toBe(1);
    });

    it('should handle card not found', async () => {
      mockDb.getCardById.mockResolvedValue(null);
      const tool = registerCreateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 999,
        title: 'Test Subtask'
      });

      expect(result).toEqual({
        success: false,
        error: 'Card not found'
      });
    });

    it('should handle invalid parent subtask', async () => {
      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.getSubtaskById.mockResolvedValue(null);
      const tool = registerCreateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        parent_id: 999,
        title: 'Test Subtask'
      });

      expect(result).toEqual({
        success: false,
        error: 'Parent subtask not found'
      });
    });

    it('should validate required fields', async () => {
      const tool = registerCreateSubtaskTool(mockDb, mockWsServer);

      await expect(tool.handler({
        card_id: 1,
        title: '' // Empty title should fail
      })).rejects.toThrow();
    });
  });

  describe('Update Subtask Tool', () => {
    it('should update subtask successfully', async () => {
      const originalSubtask = {
        id: 1,
        card_id: 1,
        title: 'Original Title',
        status: 'todo',
        priority: 'low'
      };

      const updatedSubtask = {
        ...originalSubtask,
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'high',
        updated_at: new Date().toISOString()
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getSubtaskById.mockResolvedValue(originalSubtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue(updatedSubtask);
      const tool = registerUpdateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 1,
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'high'
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'subtaskUpdated', updatedSubtask);
    });

    it('should handle status transitions', async () => {
      const subtask = { id: 1, card_id: 1, status: 'todo' };
      const card = { id: 1, board_id: 1 };
      
      mockDb.getSubtaskById.mockResolvedValue(subtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue({ ...subtask, status: 'in_progress' });
      const tool = registerUpdateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 1,
        status: 'in_progress'
      });

      expect(result.success).toBe(true);
    });

    it('should handle subtask not found', async () => {
      mockDb.getSubtaskById.mockResolvedValue(null);
      const tool = registerUpdateSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 999,
        title: 'Non-existent Subtask'
      });

      expect(result).toEqual({
        success: false,
        error: 'Subtask not found'
      });
    });
  });

  describe('Complete Subtask Tool', () => {
    it('should complete subtask successfully', async () => {
      const subtask = {
        id: 1,
        card_id: 1,
        title: 'Test Task',
        status: 'in_progress'
      };

      const completedSubtask = {
        ...subtask,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getSubtaskById.mockResolvedValue(subtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue(completedSubtask);
      const tool = registerCompleteSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({ subtask_id: 1 });

      expect(mockDb.updateSubtask).toHaveBeenCalledWith(1, {
        status: 'completed',
        completed_at: expect.any(String)
      });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'subtaskCompleted', completedSubtask);
    });

    it('should handle already completed subtask', async () => {
      const subtask = {
        id: 1,
        card_id: 1,
        status: 'completed'
      };

      mockDb.getSubtaskById.mockResolvedValue(subtask);
      const tool = registerCompleteSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({ subtask_id: 1 });

      expect(result).toEqual({
        success: false,
        error: 'Subtask is already completed'
      });
    });

    it('should auto-complete parent when all children completed', async () => {
      const parentSubtask = {
        id: 1,
        card_id: 1,
        status: 'in_progress',
        has_children: true
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getSubtaskById.mockResolvedValue(parentSubtask);
      mockDb.getCardById.mockResolvedValue(card);
      
      // Mock that all children are now completed
      mockDb.getSubtasksByCard.mockResolvedValue([
        { id: 2, parent_id: 1, status: 'completed' },
        { id: 3, parent_id: 1, status: 'completed' }
      ]);

      const completedParent = { ...parentSubtask, status: 'completed' };
      mockDb.updateSubtask.mockResolvedValue(completedParent);
      const tool = registerCompleteSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({ subtask_id: 2 });

      expect(result.success).toBe(true);
      // Should have been called twice - once for child, once for auto-completed parent
      expect(mockDb.updateSubtask).toHaveBeenCalledTimes(2);
    });
  });

  describe('Delete Subtask Tool', () => {
    it('should delete subtask and children', async () => {
      const subtask = { id: 1, card_id: 1 };
      const card = { id: 1, board_id: 1 };
      
      mockDb.getSubtaskById.mockResolvedValue(subtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.deleteSubtask.mockResolvedValue(true);
      const tool = registerDeleteSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({ subtask_id: 1 });

      expect(mockDb.deleteSubtask).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'subtaskDeleted', { subtask_id: 1 });
    });
  });

  describe('Get Subtasks Tool', () => {
    it('should return hierarchical subtask structure', async () => {
      const mockSubtasks = [
        {
          id: 1,
          card_id: 1,
          parent_id: null,
          title: 'Authentication System',
          status: 'in_progress',
          order_index: 0,
          children: [
            {
              id: 2,
              parent_id: 1,
              title: 'Login Form',
              status: 'completed',
              order_index: 0
            },
            {
              id: 3,
              parent_id: 1,
              title: 'Password Reset',
              status: 'todo',
              order_index: 1
            }
          ]
        },
        {
          id: 4,
          card_id: 1,
          parent_id: null,
          title: 'Database Schema',
          status: 'todo',
          order_index: 1,
          children: []
        }
      ];

      mockDb.getSubtasksByCard.mockResolvedValue(mockSubtasks);
      const tool = registerGetSubtasksTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockSubtasks
      });
    });

    it('should filter subtasks by status', async () => {
      const todoSubtasks = [
        { id: 1, title: 'Todo Task', status: 'todo' }
      ];

      mockDb.getSubtasksByCard.mockResolvedValue(todoSubtasks);
      const tool = registerGetSubtasksTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        status: 'todo'
      });

      expect(mockDb.getSubtasksByCard).toHaveBeenCalledWith(1, 'todo');
      expect(result.success).toBe(true);
    });

    it('should return empty array for card with no subtasks', async () => {
      mockDb.getSubtasksByCard.mockResolvedValue([]);
      const tool = registerGetSubtasksTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: []
      });
    });
  });

  describe('Move Subtask Tool', () => {
    it('should reorder subtasks successfully', async () => {
      const subtask = { id: 1, card_id: 1, order_index: 0 };
      const card = { id: 1, board_id: 1 };
      const reorderedSubtask = { ...subtask, order_index: 2 };

      mockDb.getSubtaskById.mockResolvedValue(subtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue(reorderedSubtask);
      const tool = registerMoveSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 1,
        new_order_index: 2
      });

      expect(mockDb.updateSubtask).toHaveBeenCalledWith(1, { order_index: 2 });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'subtaskMoved', {
        subtask_id: 1,
        old_order_index: 0,
        new_order_index: 2
      });
    });

    it('should handle moving subtask to different parent', async () => {
      const subtask = { id: 1, card_id: 1, parent_id: null };
      const newParent = { id: 2, card_id: 1 };
      const card = { id: 1, board_id: 1 };
      
      mockDb.getSubtaskById
        .mockResolvedValueOnce(subtask)
        .mockResolvedValueOnce(newParent);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue({ ...subtask, parent_id: 2 });
      const tool = registerMoveSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 1,
        new_parent_id: 2,
        new_order_index: 0
      });

      expect(result.success).toBe(true);
    });

    it('should prevent circular parent relationships', async () => {
      const parentSubtask = { id: 1, card_id: 1, parent_id: null };
      const childSubtask = { id: 2, card_id: 1, parent_id: 1 };

      mockDb.getSubtaskById
        .mockResolvedValueOnce(parentSubtask) // For parent
        .mockResolvedValueOnce(childSubtask); // For new parent (child)
      
      const tool = registerMoveSubtaskTool(mockDb, mockWsServer);

      const result = await tool.handler({
        subtask_id: 1, // Moving parent
        new_parent_id: 2 // To its own child
      });

      expect(result).toEqual({
        success: false,
        error: 'Cannot create circular parent relationship'
      });
    });
  });

  describe('Get Subtask Progress Tool', () => {
    it('should return comprehensive progress statistics', async () => {
      const progressData = {
        card_id: 1,
        total_subtasks: 10,
        completed_subtasks: 6,
        in_progress_subtasks: 2,
        todo_subtasks: 2,
        completion_percentage: 60,
        subtasks_by_priority: [
          { priority: 'high', count: 3, completed: 2 },
          { priority: 'medium', count: 4, completed: 3 },
          { priority: 'low', count: 3, completed: 1 }
        ],
        recent_activity: [
          {
            subtask_id: 1,
            action: 'completed',
            timestamp: new Date().toISOString()
          }
        ]
      };

      mockDb.getSubtaskProgress.mockResolvedValue(progressData);
      const tool = registerGetSubtaskProgressTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: progressData
      });
    });

    it('should handle card with no subtasks', async () => {
      const emptyProgress = {
        card_id: 1,
        total_subtasks: 0,
        completed_subtasks: 0,
        completion_percentage: 0,
        subtasks_by_priority: [],
        recent_activity: []
      };

      mockDb.getSubtaskProgress.mockResolvedValue(emptyProgress);
      const tool = registerGetSubtaskProgressTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.completion_percentage).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex subtask hierarchy workflow', async () => {
      const card = { id: 1, board_id: 1 };
      
      // Create parent subtask
      const createTool = registerCreateSubtaskTool(mockDb, mockWsServer);
      const parentSubtask = {
        id: 1,
        card_id: 1,
        title: 'User Management',
        status: 'todo'
      };
      
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.createSubtask.mockResolvedValue(parentSubtask);
      
      const createResult = await createTool.handler({
        card_id: 1,
        title: 'User Management'
      });
      expect(createResult.success).toBe(true);

      // Create child subtasks
      const child1 = { id: 2, card_id: 1, parent_id: 1, title: 'Login' };
      const child2 = { id: 3, card_id: 1, parent_id: 1, title: 'Signup' };
      
      mockDb.getSubtaskById.mockResolvedValue(parentSubtask);
      mockDb.createSubtask
        .mockResolvedValueOnce(child1)
        .mockResolvedValueOnce(child2);

      const child1Result = await createTool.handler({
        card_id: 1,
        parent_id: 1,
        title: 'Login'
      });
      expect(child1Result.success).toBe(true);

      // Complete child subtasks
      const completeTool = registerCompleteSubtaskTool(mockDb, mockWsServer);
      mockDb.getSubtaskById.mockResolvedValue(child1);
      mockDb.updateSubtask.mockResolvedValue({ ...child1, status: 'completed' });
      
      const completeResult = await completeTool.handler({ subtask_id: 2 });
      expect(completeResult.success).toBe(true);

      // Check progress
      const progressTool = registerGetSubtaskProgressTool(mockDb);
      mockDb.getSubtaskProgress.mockResolvedValue({
        card_id: 1,
        total_subtasks: 3,
        completed_subtasks: 1,
        completion_percentage: 33
      });
      
      const progressResult = await progressTool.handler({ card_id: 1 });
      expect(progressResult.success).toBe(true);
      expect(progressResult.data.completion_percentage).toBe(33);
    });

    it('should handle subtask priority management', async () => {
      const updateTool = registerUpdateSubtaskTool(mockDb, mockWsServer);
      const subtask = { id: 1, card_id: 1, priority: 'low' };
      const card = { id: 1, board_id: 1 };
      
      mockDb.getSubtaskById.mockResolvedValue(subtask);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateSubtask.mockResolvedValue({ ...subtask, priority: 'critical' });

      const result = await updateTool.handler({
        subtask_id: 1,
        priority: 'critical'
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(
        1,
        'subtaskUpdated',
        expect.objectContaining({ priority: 'critical' })
      );
    });

    it('should handle bulk subtask operations', async () => {
      const createTool = registerCreateSubtaskTool(mockDb, mockWsServer);
      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);

      const subtaskTitles = [
        'Setup development environment',
        'Write unit tests',
        'Implement feature',
        'Code review',
        'Deploy to staging'
      ];

      for (let i = 0; i < subtaskTitles.length; i++) {
        const subtask = {
          id: i + 1,
          card_id: 1,
          title: subtaskTitles[i],
          order_index: i
        };
        
        mockDb.createSubtask.mockResolvedValueOnce(subtask);
        
        const result = await createTool.handler({
          card_id: 1,
          title: subtaskTitles[i]
        });
        
        expect(result.success).toBe(true);
      }

      // Verify all subtasks were created
      expect(mockDb.createSubtask).toHaveBeenCalledTimes(5);
    });
  });
});