/**
 * Unit Tests for Time Tracking MCP Tools
 * Tests all 9 time tracking tools with comprehensive scenarios
 */

import { KanbanService } from '@mcp-tools/core/kanban';
import { 
  registerCreateTimeEntryTool,
  registerUpdateTimeEntryTool,
  registerDeleteTimeEntryTool,
  registerStartTimeTrackingTool,
  registerStopTimeTrackingTool,
  registerGetTimeEntriesForCardTool,
  registerUpdateCardTimeEstimateTool,
  registerGetActiveTimeEntresTool,
  registerGetTimeReportTool
} from '../../../servers/kanban/src/tools/time-tracking/time-tracking-tools';

describe('Time Tracking MCP Tools', () => {
  let mockKanbanService: jest.Mocked<KanbanService>;
  let mockWsServer: any;
  let mockDb: any;

  beforeEach(() => {
    mockKanbanService = {
      createTimeEntry: jest.fn(),
      updateTimeEntry: jest.fn(),
      deleteTimeEntry: jest.fn(),
      startTimeTracking: jest.fn(),
      stopTimeTracking: jest.fn(),
      getTimeEntriesForCard: jest.fn(),
      updateCardActualHours: jest.fn(),
      getActiveTimeEntry: jest.fn(),
      getActiveTimeEntries: jest.fn(),
      getTimeReport: jest.fn(),
    } as any;

    mockWsServer = {
      broadcast: jest.fn(),
      broadcastToBoard: jest.fn(),
    };

    mockDb = {
      createTimeEntry: jest.fn(),
      updateTimeEntry: jest.fn(),
      deleteTimeEntry: jest.fn(),
      getTimeEntryById: jest.fn(),
      getTimeEntriesByCard: jest.fn(),
      getActiveTimeEntry: jest.fn(),
      getActiveTimeEntries: jest.fn(),
      updateCardActualHours: jest.fn(),
      getTimeReport: jest.fn(),
      getCardById: jest.fn(),
    };
  });

  describe('Create Time Entry Tool', () => {
    it('should create manual time entry successfully', async () => {
      const mockTimeEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        description: 'Implemented user authentication',
        start_time: '2024-06-01T09:00:00Z',
        end_time: '2024-06-01T11:30:00Z',
        duration_minutes: 150,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const card = { id: 1, board_id: 1, title: 'User Management' };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.createTimeEntry.mockResolvedValue(mockTimeEntry);
      const tool = registerCreateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123',
        description: 'Implemented user authentication',
        start_time: '2024-06-01T09:00:00Z',
        end_time: '2024-06-01T11:30:00Z'
      });

      expect(mockDb.createTimeEntry).toHaveBeenCalledWith({
        card_id: 1,
        user_id: 'user123',
        description: 'Implemented user authentication',
        start_time: '2024-06-01T09:00:00Z',
        end_time: '2024-06-01T11:30:00Z',
        duration_minutes: 150,
        is_active: false
      });
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'timeEntryCreated', mockTimeEntry);
      expect(result).toEqual({
        success: true,
        data: mockTimeEntry
      });
    });

    it('should create time entry with duration only', async () => {
      const mockTimeEntry = {
        id: 2,
        card_id: 1,
        user_id: 'user123',
        description: 'Code review',
        duration_minutes: 45,
        is_active: false
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.createTimeEntry.mockResolvedValue(mockTimeEntry);
      const tool = registerCreateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123',
        description: 'Code review',
        duration_minutes: 45
      });

      expect(result.success).toBe(true);
      expect(result.data.duration_minutes).toBe(45);
    });

    it('should validate time entry data', async () => {
      const tool = registerCreateTimeEntryTool(mockDb, mockWsServer);

      // Test negative duration
      await expect(tool.handler({
        card_id: 1,
        user_id: 'user123',
        duration_minutes: -30
      })).rejects.toThrow();

      // Test end time before start time
      await expect(tool.handler({
        card_id: 1,
        user_id: 'user123',
        start_time: '2024-06-01T11:00:00Z',
        end_time: '2024-06-01T10:00:00Z'
      })).rejects.toThrow();
    });

    it('should handle card not found', async () => {
      mockDb.getCardById.mockResolvedValue(null);
      const tool = registerCreateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 999,
        user_id: 'user123',
        duration_minutes: 60
      });

      expect(result).toEqual({
        success: false,
        error: 'Card not found'
      });
    });

    it('should calculate duration from start and end times', async () => {
      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      
      const expectedDuration = 90; // 1.5 hours
      mockDb.createTimeEntry.mockResolvedValue({
        id: 1,
        duration_minutes: expectedDuration
      });
      
      const tool = registerCreateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123',
        start_time: '2024-06-01T09:00:00Z',
        end_time: '2024-06-01T10:30:00Z'
      });

      expect(mockDb.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_minutes: expectedDuration
        })
      );
    });
  });

  describe('Update Time Entry Tool', () => {
    it('should update time entry successfully', async () => {
      const originalEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        description: 'Original description',
        duration_minutes: 60
      };

      const updatedEntry = {
        ...originalEntry,
        description: 'Updated description',
        duration_minutes: 90,
        updated_at: new Date().toISOString()
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getTimeEntryById.mockResolvedValue(originalEntry);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateTimeEntry.mockResolvedValue(updatedEntry);
      const tool = registerUpdateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        entry_id: 1,
        description: 'Updated description',
        duration_minutes: 90
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'timeEntryUpdated', updatedEntry);
    });

    it('should handle time entry not found', async () => {
      mockDb.getTimeEntryById.mockResolvedValue(null);
      const tool = registerUpdateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        entry_id: 999,
        description: 'Non-existent entry'
      });

      expect(result).toEqual({
        success: false,
        error: 'Time entry not found'
      });
    });

    it('should prevent updating active time entries', async () => {
      const activeEntry = {
        id: 1,
        card_id: 1,
        is_active: true
      };

      mockDb.getTimeEntryById.mockResolvedValue(activeEntry);
      const tool = registerUpdateTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({
        entry_id: 1,
        duration_minutes: 120
      });

      expect(result).toEqual({
        success: false,
        error: 'Cannot update active time entry. Stop tracking first.'
      });
    });
  });

  describe('Delete Time Entry Tool', () => {
    it('should delete time entry successfully', async () => {
      const timeEntry = { id: 1, card_id: 1, is_active: false };
      const card = { id: 1, board_id: 1 };

      mockDb.getTimeEntryById.mockResolvedValue(timeEntry);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.deleteTimeEntry.mockResolvedValue(true);
      const tool = registerDeleteTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({ entry_id: 1 });

      expect(mockDb.deleteTimeEntry).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'timeEntryDeleted', { entry_id: 1 });
    });

    it('should prevent deleting active time entries', async () => {
      const activeEntry = { id: 1, card_id: 1, is_active: true };
      mockDb.getTimeEntryById.mockResolvedValue(activeEntry);
      const tool = registerDeleteTimeEntryTool(mockDb, mockWsServer);

      const result = await tool.handler({ entry_id: 1 });

      expect(result).toEqual({
        success: false,
        error: 'Cannot delete active time entry. Stop tracking first.'
      });
    });
  });

  describe('Start Time Tracking Tool', () => {
    it('should start time tracking successfully', async () => {
      const activeEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        description: 'Working on feature',
        start_time: new Date().toISOString(),
        is_active: true
      };

      const card = { id: 1, board_id: 1, title: 'Feature Development' };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.getActiveTimeEntry.mockResolvedValue(null); // No active entry for this user
      mockDb.createTimeEntry.mockResolvedValue(activeEntry);
      const tool = registerStartTimeTrackingTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123',
        description: 'Working on feature'
      });

      expect(mockDb.createTimeEntry).toHaveBeenCalledWith({
        card_id: 1,
        user_id: 'user123',
        description: 'Working on feature',
        start_time: expect.any(String),
        is_active: true
      });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'timeTrackingStarted', activeEntry);
    });

    it('should stop existing active timer before starting new one', async () => {
      const existingEntry = {
        id: 1,
        card_id: 2,
        user_id: 'user123',
        is_active: true,
        start_time: '2024-06-01T09:00:00Z'
      };

      const newEntry = {
        id: 2,
        card_id: 1,
        user_id: 'user123',
        is_active: true
      };

      const card1 = { id: 1, board_id: 1 };
      const card2 = { id: 2, board_id: 1 };

      mockDb.getCardById
        .mockResolvedValueOnce(card1)
        .mockResolvedValueOnce(card2);
      mockDb.getActiveTimeEntry.mockResolvedValue(existingEntry);
      mockDb.updateTimeEntry.mockResolvedValue({ ...existingEntry, is_active: false });
      mockDb.createTimeEntry.mockResolvedValue(newEntry);
      const tool = registerStartTimeTrackingTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123',
        description: 'New task'
      });

      expect(mockDb.updateTimeEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        is_active: false,
        end_time: expect.any(String)
      }));
      expect(result.success).toBe(true);
    });

    it('should handle card not found', async () => {
      mockDb.getCardById.mockResolvedValue(null);
      const tool = registerStartTimeTrackingTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 999,
        user_id: 'user123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Card not found'
      });
    });
  });

  describe('Stop Time Tracking Tool', () => {
    it('should stop active time tracking successfully', async () => {
      const activeEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        start_time: '2024-06-01T09:00:00Z',
        is_active: true
      };

      const stoppedEntry = {
        ...activeEntry,
        end_time: '2024-06-01T11:00:00Z',
        duration_minutes: 120,
        is_active: false
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getActiveTimeEntry.mockResolvedValue(activeEntry);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateTimeEntry.mockResolvedValue(stoppedEntry);
      const tool = registerStopTimeTrackingTool(mockDb, mockWsServer);

      const result = await tool.handler({ user_id: 'user123' });

      expect(mockDb.updateTimeEntry).toHaveBeenCalledWith(1, {
        end_time: expect.any(String),
        duration_minutes: expect.any(Number),
        is_active: false
      });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'timeTrackingStopped', stoppedEntry);
    });

    it('should handle no active time tracking', async () => {
      mockDb.getActiveTimeEntry.mockResolvedValue(null);
      const tool = registerStopTimeTrackingTool(mockDb, mockWsServer);

      const result = await tool.handler({ user_id: 'user123' });

      expect(result).toEqual({
        success: false,
        error: 'No active time tracking found for user'
      });
    });

    it('should calculate duration correctly', async () => {
      const startTime = new Date('2024-06-01T09:00:00Z');
      const endTime = new Date('2024-06-01T10:30:00Z');
      const expectedDuration = 90; // 1.5 hours

      const activeEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        start_time: startTime.toISOString(),
        is_active: true
      };

      const card = { id: 1, board_id: 1 };
      mockDb.getActiveTimeEntry.mockResolvedValue(activeEntry);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateTimeEntry.mockResolvedValue({
        ...activeEntry,
        end_time: endTime.toISOString(),
        duration_minutes: expectedDuration,
        is_active: false
      });

      const tool = registerStopTimeTrackingTool(mockDb, mockWsServer);

      // Mock Date.now() to return our expected end time
      jest.spyOn(Date, 'now').mockReturnValue(endTime.getTime());

      const result = await tool.handler({ user_id: 'user123' });

      expect(mockDb.updateTimeEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        duration_minutes: expectedDuration
      }));

      jest.restoreAllMocks();
    });
  });

  describe('Get Time Entries for Card Tool', () => {
    it('should return all time entries for a card', async () => {
      const mockEntries = [
        {
          id: 1,
          card_id: 1,
          user_id: 'user123',
          description: 'Initial implementation',
          duration_minutes: 120,
          start_time: '2024-06-01T09:00:00Z',
          end_time: '2024-06-01T11:00:00Z',
          is_active: false
        },
        {
          id: 2,
          card_id: 1,
          user_id: 'user456',
          description: 'Code review',
          duration_minutes: 30,
          is_active: false
        }
      ];

      mockDb.getTimeEntriesByCard.mockResolvedValue(mockEntries);
      const tool = registerGetTimeEntriesForCardTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: {
          entries: mockEntries,
          total_time_minutes: 150,
          total_time_hours: 2.5,
          entry_count: 2,
          unique_contributors: 2
        }
      });
    });

    it('should filter entries by user', async () => {
      const userEntries = [
        { id: 1, user_id: 'user123', duration_minutes: 60 }
      ];

      mockDb.getTimeEntriesByCard.mockResolvedValue(userEntries);
      const tool = registerGetTimeEntriesForCardTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        user_id: 'user123'
      });

      expect(mockDb.getTimeEntriesByCard).toHaveBeenCalledWith(1, 'user123');
      expect(result.success).toBe(true);
    });

    it('should filter entries by date range', async () => {
      const dateFilteredEntries = [
        { id: 1, start_time: '2024-06-01T09:00:00Z', duration_minutes: 60 }
      ];

      mockDb.getTimeEntriesByCard.mockResolvedValue(dateFilteredEntries);
      const tool = registerGetTimeEntriesForCardTool(mockDb);

      const result = await tool.handler({
        card_id: 1,
        start_date: '2024-06-01',
        end_date: '2024-06-30'
      });

      expect(result.success).toBe(true);
    });

    it('should return empty result for card with no time entries', async () => {
      mockDb.getTimeEntriesByCard.mockResolvedValue([]);
      const tool = registerGetTimeEntriesForCardTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: {
          entries: [],
          total_time_minutes: 0,
          total_time_hours: 0,
          entry_count: 0,
          unique_contributors: 0
        }
      });
    });
  });

  describe('Update Card Time Estimate Tool', () => {
    it('should update card time estimate successfully', async () => {
      const card = { id: 1, board_id: 1, estimated_hours: 4 };
      const updatedCard = { ...card, estimated_hours: 8 };

      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateCardActualHours.mockResolvedValue(updatedCard);
      const tool = registerUpdateCardTimeEstimateTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        estimated_hours: 8
      });

      expect(mockDb.updateCardActualHours).toHaveBeenCalledWith(1, { estimated_hours: 8 });
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'cardTimeEstimateUpdated', {
        card_id: 1,
        estimated_hours: 8
      });
    });

    it('should handle card not found', async () => {
      mockDb.getCardById.mockResolvedValue(null);
      const tool = registerUpdateCardTimeEstimateTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 999,
        estimated_hours: 5
      });

      expect(result).toEqual({
        success: false,
        error: 'Card not found'
      });
    });

    it('should validate positive time estimate', async () => {
      const tool = registerUpdateCardTimeEstimateTool(mockDb, mockWsServer);

      await expect(tool.handler({
        card_id: 1,
        estimated_hours: -5
      })).rejects.toThrow();
    });
  });

  describe('Get Active Time Entries Tool', () => {
    it('should return all active time entries', async () => {
      const activeEntries = [
        {
          id: 1,
          card_id: 1,
          card_title: 'Feature Development',
          user_id: 'user123',
          description: 'Working on authentication',
          start_time: '2024-06-01T09:00:00Z',
          elapsed_minutes: 45,
          is_active: true
        },
        {
          id: 2,
          card_id: 2,
          card_title: 'Bug Fix',
          user_id: 'user456',
          description: 'Fixing login issue',
          start_time: '2024-06-01T10:00:00Z',
          elapsed_minutes: 15,
          is_active: true
        }
      ];

      mockDb.getActiveTimeEntries.mockResolvedValue(activeEntries);
      const tool = registerGetActiveTimeEntresTool(mockDb);

      const result = await tool.handler({});

      expect(result).toEqual({
        success: true,
        data: {
          active_entries: activeEntries,
          total_active_sessions: 2,
          total_elapsed_minutes: 60
        }
      });
    });

    it('should filter active entries by user', async () => {
      const userEntries = [
        {
          id: 1,
          user_id: 'user123',
          elapsed_minutes: 30,
          is_active: true
        }
      ];

      mockDb.getActiveTimeEntries.mockResolvedValue(userEntries);
      const tool = registerGetActiveTimeEntresTool(mockDb);

      const result = await tool.handler({ user_id: 'user123' });

      expect(mockDb.getActiveTimeEntries).toHaveBeenCalledWith('user123');
      expect(result.success).toBe(true);
    });

    it('should return empty result when no active entries', async () => {
      mockDb.getActiveTimeEntries.mockResolvedValue([]);
      const tool = registerGetActiveTimeEntresTool(mockDb);

      const result = await tool.handler({});

      expect(result).toEqual({
        success: true,
        data: {
          active_entries: [],
          total_active_sessions: 0,
          total_elapsed_minutes: 0
        }
      });
    });
  });

  describe('Get Time Report Tool', () => {
    it('should generate comprehensive time report', async () => {
      const reportData = {
        summary: {
          total_time_minutes: 1200,
          total_time_hours: 20,
          total_entries: 15,
          unique_contributors: 3,
          average_session_minutes: 80,
          most_productive_day: '2024-06-03',
          date_range: {
            start_date: '2024-06-01',
            end_date: '2024-06-07'
          }
        },
        by_card: [
          {
            card_id: 1,
            card_title: 'User Authentication',
            total_minutes: 480,
            total_hours: 8,
            entry_count: 6,
            contributors: ['user123', 'user456']
          }
        ],
        by_user: [
          {
            user_id: 'user123',
            total_minutes: 720,
            total_hours: 12,
            entry_count: 8,
            cards_worked_on: 3
          }
        ],
        by_day: [
          {
            date: '2024-06-01',
            total_minutes: 180,
            entry_count: 3,
            active_users: 2
          }
        ],
        productivity_metrics: {
          estimated_vs_actual: {
            total_estimated_hours: 25,
            total_actual_hours: 20,
            accuracy_percentage: 80
          },
          efficiency_score: 85
        }
      };

      mockDb.getTimeReport.mockResolvedValue(reportData);
      const tool = registerGetTimeReportTool(mockDb);

      const result = await tool.handler({
        start_date: '2024-06-01',
        end_date: '2024-06-07'
      });

      expect(result).toEqual({
        success: true,
        data: reportData
      });
    });

    it('should filter report by board', async () => {
      const boardReportData = {
        summary: { total_time_hours: 10 },
        by_card: [{ card_id: 1, total_hours: 10 }]
      };

      mockDb.getTimeReport.mockResolvedValue(boardReportData);
      const tool = registerGetTimeReportTool(mockDb);

      const result = await tool.handler({
        board_id: 1,
        start_date: '2024-06-01',
        end_date: '2024-06-07'
      });

      expect(mockDb.getTimeReport).toHaveBeenCalledWith({
        board_id: 1,
        start_date: '2024-06-01',
        end_date: '2024-06-07'
      });
      expect(result.success).toBe(true);
    });

    it('should generate report with different group options', async () => {
      const tool = registerGetTimeReportTool(mockDb);

      // Group by user
      mockDb.getTimeReport.mockResolvedValue({ by_user: [] });
      await tool.handler({
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        group_by: 'user'
      });

      expect(mockDb.getTimeReport).toHaveBeenCalledWith(expect.objectContaining({
        group_by: 'user'
      }));

      // Group by card
      mockDb.getTimeReport.mockResolvedValue({ by_card: [] });
      await tool.handler({
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        group_by: 'card'
      });

      expect(mockDb.getTimeReport).toHaveBeenCalledWith(expect.objectContaining({
        group_by: 'card'
      }));
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete time tracking workflow', async () => {
      const card = { id: 1, board_id: 1, title: 'Feature Implementation' };
      
      // Start time tracking
      const startTool = registerStartTimeTrackingTool(mockDb, mockWsServer);
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.getActiveTimeEntry.mockResolvedValue(null);
      const activeEntry = {
        id: 1,
        card_id: 1,
        user_id: 'user123',
        start_time: '2024-06-01T09:00:00Z',
        is_active: true
      };
      mockDb.createTimeEntry.mockResolvedValue(activeEntry);
      
      const startResult = await startTool.handler({
        card_id: 1,
        user_id: 'user123',
        description: 'Working on feature'
      });
      expect(startResult.success).toBe(true);

      // Work for some time, then stop tracking
      const stopTool = registerStopTimeTrackingTool(mockDb, mockWsServer);
      mockDb.getActiveTimeEntry.mockResolvedValue(activeEntry);
      const completedEntry = {
        ...activeEntry,
        end_time: '2024-06-01T11:00:00Z',
        duration_minutes: 120,
        is_active: false
      };
      mockDb.updateTimeEntry.mockResolvedValue(completedEntry);
      
      const stopResult = await stopTool.handler({ user_id: 'user123' });
      expect(stopResult.success).toBe(true);

      // Get time entries for the card
      const getEntriesT
.mockResolvedValue([completedEntry]);
      
      const entriesResult = await getTool.handler({ card_id: 1 });
      expect(entriesResult.success).toBe(true);
      expect(entriesResult.data.total_time_minutes).toBe(120);

      // Generate time report
      const reportTool = registerGetTimeReportTool(mockDb);
      const reportData = {
        summary: { total_time_hours: 2, total_entries: 1 },
        by_card: [{ card_id: 1, total_hours: 2 }]
      };
      mockDb.getTimeReport.mockResolvedValue(reportData);
      
      const reportResult = await reportTool.handler({
        start_date: '2024-06-01',
        end_date: '2024-06-01'
      });
      expect(reportResult.success).toBe(true);
      expect(reportResult.data.summary.total_time_hours).toBe(2);
    });

    it('should handle multiple concurrent time tracking sessions', async () => {
      const getActiveTool = registerGetActiveTimeEntresTool(mockDb);
      
      const multipleActiveEntries = [
        {
          id: 1,
          card_id: 1,
          user_id: 'user123',
          elapsed_minutes: 45,
          is_active: true
        },
        {
          id: 2,
          card_id: 2,
          user_id: 'user456',
          elapsed_minutes: 30,
          is_active: true
        },
        {
          id: 3,
          card_id: 3,
          user_id: 'user789',
          elapsed_minutes: 15,
          is_active: true
        }
      ];

      mockDb.getActiveTimeEntries.mockResolvedValue(multipleActiveEntries);
      
      const result = await getActiveTool.handler({});
      
      expect(result.success).toBe(true);
      expect(result.data.total_active_sessions).toBe(3);
      expect(result.data.total_elapsed_minutes).toBe(90);
    });

    it('should handle time estimate vs actual comparison', async () => {
      // Set time estimate
      const estimateTool = registerUpdateCardTimeEstimateTool(mockDb, mockWsServer);
      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);
      mockDb.updateCardActualHours.mockResolvedValue({ ...card, estimated_hours: 5 });
      
      const estimateResult = await estimateTool.handler({
        card_id: 1,
        estimated_hours: 5
      });
      expect(estimateResult.success).toBe(true);

      // Log actual time entries
      const createTool = registerCreateTimeEntryTool(mockDb, mockWsServer);
      mockDb.createTimeEntry.mockResolvedValue({
        id: 1,
        card_id: 1,
        duration_minutes: 360 // 6 hours actual
      });
      
      const timeResult = await createTool.handler({
        card_id: 1,
        user_id: 'user123',
        duration_minutes: 360
      });
      expect(timeResult.success).toBe(true);

      // Generate report showing variance
      const reportTool = registerGetTimeReportTool(mockDb);
      const reportData = {
        productivity_metrics: {
          estimated_vs_actual: {
            total_estimated_hours: 5,
            total_actual_hours: 6,
            accuracy_percentage: 83,
            variance_hours: 1
          }
        }
      };
      mockDb.getTimeReport.mockResolvedValue(reportData);
      
      const reportResult = await reportTool.handler({
        start_date: '2024-06-01',
        end_date: '2024-06-01'
      });
      
      expect(reportResult.success).toBe(true);
      expect(reportResult.data.productivity_metrics.estimated_vs_actual.variance_hours).toBe(1);
    });

    it('should handle complex time tracking scenarios with breaks', async () => {
      const card = { id: 1, board_id: 1 };
      mockDb.getCardById.mockResolvedValue(card);

      // Create multiple time entries for same card (representing work sessions with breaks)
      const createTool = registerCreateTimeEntryTool(mockDb, mockWsServer);
      
      const sessions = [
        { start: '09:00', end: '10:30', duration: 90 }, // Morning session
        { start: '11:00', end: '12:00', duration: 60 }, // After break
        { start: '13:00', end: '15:30', duration: 150 } // Afternoon session
      ];

      for (const session of sessions) {
        mockDb.createTimeEntry.mockResolvedValue({
          id: Math.random(),
          card_id: 1,
          duration_minutes: session.duration
        });
        
        const result = await createTool.handler({
          card_id: 1,
          user_id: 'user123',
          start_time: `2024-06-01T${session.start}:00Z`,
          end_time: `2024-06-01T${session.end}:00Z`
        });
        
        expect(result.success).toBe(true);
      }

      // Get total time for card
      const getTool = registerGetTimeEntriesForCardTool(mockDb);
      const allEntries = sessions.map((session, index) => ({
        id: index + 1,
        duration_minutes: session.duration
      }));
      mockDb.getTimeEntriesByCard.mockResolvedValue(allEntries);
      
      const totalResult = await getTool.handler({ card_id: 1 });
      
      expect(totalResult.success).toBe(true);
      expect(totalResult.data.total_time_minutes).toBe(300); // 5 hours total
      expect(totalResult.data.entry_count).toBe(3);
    });
  });
});