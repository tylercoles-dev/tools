/**
 * Unit Tests for Milestones MCP Tools
 * Tests all 8 milestone tools with comprehensive scenarios
 */

import { KanbanService } from '@mcp-tools/core/kanban';
import { 
  registerCreateMilestoneTool,
  registerUpdateMilestoneTool,
  registerCompleteMilestoneTool,
  registerDeleteMilestoneTool,
  registerGetMilestonesTool,
  registerAssignCardToMilestoneTool,
  registerUnassignCardFromMilestoneTool,
  registerGetMilestoneProgressTool
} from '../../../servers/kanban/src/tools/milestone/milestone-tools';

describe('Milestones MCP Tools', () => {
  let mockKanbanService: jest.Mocked<KanbanService>;
  let mockWsServer: any;
  let mockDb: any;

  beforeEach(() => {
    mockKanbanService = {
      createMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
      getMilestones: jest.fn(),
      assignCardToMilestone: jest.fn(),
      unassignCardFromMilestone: jest.fn(),
      getMilestoneProgress: jest.fn(),
    } as any;

    mockWsServer = {
      broadcast: jest.fn(),
      broadcastToBoard: jest.fn(),
    };

    mockDb = {
      createMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
      getMilestoneById: jest.fn(),
      getMilestonesByBoard: jest.fn(),
      assignCardToMilestone: jest.fn(),
      unassignCardFromMilestone: jest.fn(),
      getMilestoneProgress: jest.fn(),
      getCardById: jest.fn(),
    };
  });

  describe('Create Milestone Tool', () => {
    it('should create milestone successfully', async () => {
      const mockMilestone = {
        id: 1,
        board_id: 1,
        title: 'Version 1.0 Release',
        description: 'Initial product release',
        due_date: '2024-12-31',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.createMilestone.mockResolvedValue(mockMilestone);
      const tool = registerCreateMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        title: 'Version 1.0 Release',
        description: 'Initial product release',
        due_date: '2024-12-31'
      });

      expect(mockDb.createMilestone).toHaveBeenCalledWith({
        board_id: 1,
        title: 'Version 1.0 Release',
        description: 'Initial product release',
        due_date: '2024-12-31',
        status: 'active'
      });
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'milestoneCreated', mockMilestone);
      expect(result).toEqual({
        success: true,
        data: mockMilestone
      });
    });

    it('should create milestone without due date', async () => {
      const mockMilestone = {
        id: 2,
        board_id: 1,
        title: 'Beta Testing',
        description: null,
        due_date: null,
        status: 'active'
      };

      mockDb.createMilestone.mockResolvedValue(mockMilestone);
      const tool = registerCreateMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        title: 'Beta Testing'
      });

      expect(result.success).toBe(true);
      expect(mockDb.createMilestone).toHaveBeenCalledWith({
        board_id: 1,
        title: 'Beta Testing',
        description: null,
        due_date: null,
        status: 'active'
      });
    });

    it('should handle validation errors', async () => {
      const tool = registerCreateMilestoneTool(mockDb, mockWsServer);

      await expect(tool.handler({
        board_id: 1,
        title: '' // Empty title should fail validation
      })).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockDb.createMilestone.mockRejectedValue(new Error('Database constraint violation'));
      const tool = registerCreateMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        title: 'Test Milestone'
      });

      expect(result).toEqual({
        success: false,
        error: 'Database constraint violation'
      });
    });
  });

  describe('Update Milestone Tool', () => {
    it('should update milestone successfully', async () => {
      const originalMilestone = {
        id: 1,
        board_id: 1,
        title: 'Version 1.0',
        status: 'active'
      };

      const updatedMilestone = {
        ...originalMilestone,
        title: 'Version 1.0 Release',
        description: 'Updated description',
        due_date: '2024-12-31',
        updated_at: new Date().toISOString()
      };

      mockDb.getMilestoneById.mockResolvedValue(originalMilestone);
      mockDb.updateMilestone.mockResolvedValue(updatedMilestone);
      const tool = registerUpdateMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        milestone_id: 1,
        title: 'Version 1.0 Release',
        description: 'Updated description',
        due_date: '2024-12-31'
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'milestoneUpdated', updatedMilestone);
    });

    it('should handle milestone not found', async () => {
      mockDb.getMilestoneById.mockResolvedValue(null);
      const tool = registerUpdateMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        milestone_id: 999,
        title: 'Non-existent Milestone'
      });

      expect(result).toEqual({
        success: false,
        error: 'Milestone not found'
      });
    });
  });

  describe('Complete Milestone Tool', () => {
    it('should complete milestone successfully', async () => {
      const milestone = {
        id: 1,
        board_id: 1,
        title: 'Version 1.0',
        status: 'active'
      };

      const completedMilestone = {
        ...milestone,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.updateMilestone.mockResolvedValue(completedMilestone);
      const tool = registerCompleteMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({ milestone_id: 1 });

      expect(mockDb.updateMilestone).toHaveBeenCalledWith(1, {
        status: 'completed',
        completed_at: expect.any(String)
      });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'milestoneCompleted', completedMilestone);
    });

    it('should handle already completed milestone', async () => {
      const milestone = {
        id: 1,
        board_id: 1,
        status: 'completed'
      };

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      const tool = registerCompleteMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({ milestone_id: 1 });

      expect(result).toEqual({
        success: false,
        error: 'Milestone is already completed'
      });
    });
  });

  describe('Delete Milestone Tool', () => {
    it('should delete milestone and unassign cards', async () => {
      const milestone = { id: 1, board_id: 1 };
      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.deleteMilestone.mockResolvedValue(true);
      const tool = registerDeleteMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({ milestone_id: 1 });

      expect(mockDb.deleteMilestone).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'milestoneDeleted', { milestone_id: 1 });
    });
  });

  describe('Get Milestones Tool', () => {
    it('should return all milestones for a board', async () => {
      const mockMilestones = [
        {
          id: 1,
          title: 'Version 1.0',
          status: 'active',
          due_date: '2024-12-31',
          card_count: 5,
          completed_cards: 2
        },
        {
          id: 2,
          title: 'Version 2.0',
          status: 'planning',
          due_date: null,
          card_count: 0,
          completed_cards: 0
        }
      ];

      mockDb.getMilestonesByBoard.mockResolvedValue(mockMilestones);
      const tool = registerGetMilestonesTool(mockDb);

      const result = await tool.handler({ board_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockMilestones
      });
    });

    it('should filter milestones by status', async () => {
      const activeMilestones = [
        { id: 1, title: 'Version 1.0', status: 'active' }
      ];

      mockDb.getMilestonesByBoard.mockResolvedValue(activeMilestones);
      const tool = registerGetMilestonesTool(mockDb);

      const result = await tool.handler({
        board_id: 1,
        status: 'active'
      });

      expect(mockDb.getMilestonesByBoard).toHaveBeenCalledWith(1, 'active');
      expect(result.success).toBe(true);
    });
  });

  describe('Assign Card to Milestone Tool', () => {
    it('should assign card to milestone successfully', async () => {
      const milestone = { id: 1, board_id: 1, status: 'active' };
      const card = { id: 1, board_id: 1, title: 'Test Card' };

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.assignCardToMilestone.mockResolvedValue(true);
      const tool = registerAssignCardToMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        milestone_id: 1
      });

      expect(mockDb.assignCardToMilestone).toHaveBeenCalledWith(1, 1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardAssignedToMilestone', {
        card_id: 1,
        milestone_id: 1
      });
    });

    it('should handle milestone not found', async () => {
      mockDb.getMilestoneById.mockResolvedValue(null);
      const tool = registerAssignCardToMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        milestone_id: 999
      });

      expect(result).toEqual({
        success: false,
        error: 'Milestone not found'
      });
    });

    it('should handle card not found', async () => {
      const milestone = { id: 1, board_id: 1 };
      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getCardById.mockResolvedValue(null);
      const tool = registerAssignCardToMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 999,
        milestone_id: 1
      });

      expect(result).toEqual({
        success: false,
        error: 'Card not found'
      });
    });

    it('should handle board mismatch', async () => {
      const milestone = { id: 1, board_id: 1 };
      const card = { id: 1, board_id: 2 }; // Different board

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getCardById.mockResolvedValue(card);
      const tool = registerAssignCardToMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        milestone_id: 1
      });

      expect(result).toEqual({
        success: false,
        error: 'Card and milestone must be on the same board'
      });
    });
  });

  describe('Unassign Card from Milestone Tool', () => {
    it('should unassign card from milestone successfully', async () => {
      const card = { id: 1, board_id: 1, milestone_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.unassignCardFromMilestone.mockResolvedValue(true);
      const tool = registerUnassignCardFromMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({ card_id: 1 });

      expect(mockDb.unassignCardFromMilestone).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardUnassignedFromMilestone', {
        card_id: 1,
        milestone_id: 1
      });
    });

    it('should handle card not assigned to milestone', async () => {
      const card = { id: 1, board_id: 1, milestone_id: null };
      mockDb.getCardById.mockResolvedValue(card);
      const tool = registerUnassignCardFromMilestoneTool(mockDb, mockWsServer);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: false,
        error: 'Card is not assigned to any milestone'
      });
    });
  });

  describe('Get Milestone Progress Tool', () => {
    it('should return milestone progress with statistics', async () => {
      const milestone = {
        id: 1,
        board_id: 1,
        title: 'Version 1.0',
        status: 'active',
        due_date: '2024-12-31'
      };

      const progressData = {
        milestone,
        total_cards: 10,
        completed_cards: 7,
        in_progress_cards: 2,
        todo_cards: 1,
        completion_percentage: 70,
        estimated_hours: 100,
        actual_hours: 65,
        remaining_days: 45,
        cards_by_column: [
          { column_name: 'To Do', count: 1 },
          { column_name: 'In Progress', count: 2 },
          { column_name: 'Done', count: 7 }
        ]
      };

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getMilestoneProgress.mockResolvedValue(progressData);
      const tool = registerGetMilestoneProgressTool(mockDb);

      const result = await tool.handler({ milestone_id: 1 });

      expect(result).toEqual({
        success: true,
        data: progressData
      });
    });

    it('should handle milestone with no cards', async () => {
      const milestone = { id: 1, title: 'Empty Milestone' };
      const progressData = {
        milestone,
        total_cards: 0,
        completed_cards: 0,
        completion_percentage: 0,
        cards_by_column: []
      };

      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getMilestoneProgress.mockResolvedValue(progressData);
      const tool = registerGetMilestoneProgressTool(mockDb);

      const result = await tool.handler({ milestone_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.completion_percentage).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete milestone workflow', async () => {
      // Create milestone
      const createTool = registerCreateMilestoneTool(mockDb, mockWsServer);
      const milestone = {
        id: 1,
        board_id: 1,
        title: 'Sprint 1',
        due_date: '2024-06-30',
        status: 'active'
      };
      mockDb.createMilestone.mockResolvedValue(milestone);
      
      const createResult = await createTool.handler({
        board_id: 1,
        title: 'Sprint 1',
        due_date: '2024-06-30'
      });
      expect(createResult.success).toBe(true);

      // Assign cards
      const assignTool = registerAssignCardToMilestoneTool(mockDb, mockWsServer);
      mockDb.getMilestoneById.mockResolvedValue(milestone);
      mockDb.getCardById.mockResolvedValue({ id: 1, board_id: 1 });
      mockDb.assignCardToMilestone.mockResolvedValue(true);
      
      const assignResult = await assignTool.handler({
        card_id: 1,
        milestone_id: 1
      });
      expect(assignResult.success).toBe(true);

      // Check progress
      const progressTool = registerGetMilestoneProgressTool(mockDb);
      mockDb.getMilestoneProgress.mockResolvedValue({
        milestone,
        total_cards: 1,
        completed_cards: 0,
        completion_percentage: 0
      });
      
      const progressResult = await progressTool.handler({ milestone_id: 1 });
      expect(progressResult.success).toBe(true);
      expect(progressResult.data.total_cards).toBe(1);

      // Complete milestone
      const completeTool = registerCompleteMilestoneTool(mockDb, mockWsServer);
      const completedMilestone = { ...milestone, status: 'completed' };
      mockDb.updateMilestone.mockResolvedValue(completedMilestone);
      
      const completeResult = await completeTool.handler({ milestone_id: 1 });
      expect(completeResult.success).toBe(true);
    });

    it('should handle milestone with overdue tasks', async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 10);
      
      const overdueMilestone = {
        id: 1,
        title: 'Overdue Milestone',
        due_date: pastDueDate.toISOString().split('T')[0],
        status: 'active'
      };

      const progressData = {
        milestone: overdueMilestone,
        total_cards: 5,
        completed_cards: 2,
        completion_percentage: 40,
        is_overdue: true,
        days_overdue: 10
      };

      mockDb.getMilestoneById.mockResolvedValue(overdueMilestone);
      mockDb.getMilestoneProgress.mockResolvedValue(progressData);
      const tool = registerGetMilestoneProgressTool(mockDb);

      const result = await tool.handler({ milestone_id: 1 });

      expect(result.success).toBe(true);
      expect(result.data.is_overdue).toBe(true);
      expect(result.data.days_overdue).toBe(10);
    });
  });
});