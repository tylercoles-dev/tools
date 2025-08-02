/**
 * Integration Tests for Milestones Workflow
 * Tests complete milestone management from creation to completion tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../utils/test-client';
import { TestEnvironment } from '../setup/test-environment';

describe('Milestones Workflow Integration', () => {
  let apiClient: ApiClient;
  let testEnv: TestEnvironment;
  let boardId: number;
  let columnId: number;
  let cardIds: number[] = [];

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    apiClient = testEnv.getApiClient();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    // Create fresh board and cards for each test
    const board = await apiClient.post('/api/kanban/boards', {
      title: 'Milestones Test Board',
      description: 'Testing milestone functionality'
    });
    boardId = board.data.id;

    // Create columns
    const todoColumn = await apiClient.post('/api/kanban/columns', {
      board_id: boardId,
      title: 'To Do',
      order_index: 0
    });
    columnId = todoColumn.data.id;

    const inProgressColumn = await apiClient.post('/api/kanban/columns', {
      board_id: boardId,
      title: 'In Progress',
      order_index: 1
    });

    const doneColumn = await apiClient.post('/api/kanban/columns', {
      board_id: boardId,
      title: 'Done',
      order_index: 2
    });

    // Create test cards
    const cardTitles = [
      'User Authentication',
      'API Integration',
      'Database Setup',
      'Frontend Components',
      'Testing Suite'
    ];

    cardIds = [];
    for (const title of cardTitles) {
      const cardResponse = await apiClient.post('/api/kanban/cards', {
        board_id: boardId,
        column_id: columnId,
        title,
        description: `Description for ${title}`
      });
      cardIds.push(cardResponse.data.id);
    }
  });

  describe('Basic Milestone Lifecycle', () => {
    it('should create, update, and complete milestone successfully', async () => {
      // Step 1: Create milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Version 1.0 Release',
        description: 'Initial product release with core features',
        due_date: '2024-12-31',
        status: 'active'
      });

      expect(milestoneResponse.status).toBe(201);
      expect(milestoneResponse.data).toMatchObject({
        board_id: boardId,
        title: 'Version 1.0 Release',
        description: 'Initial product release with core features',
        due_date: '2024-12-31',
        status: 'active'
      });

      const milestoneId = milestoneResponse.data.id;

      // Step 2: Update milestone
      const updateResponse = await apiClient.put(`/api/kanban/milestones/${milestoneId}`, {
        title: 'Version 1.0 - MVP Release',
        description: 'Minimum viable product release',
        due_date: '2024-11-30'
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.title).toBe('Version 1.0 - MVP Release');
      expect(updateResponse.data.due_date).toBe('2024-11-30');

      // Step 3: Get milestone details
      const getResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.title).toBe('Version 1.0 - MVP Release');

      // Step 4: Complete milestone
      const completeResponse = await apiClient.post(`/api/kanban/milestones/${milestoneId}/complete`);
      expect(completeResponse.status).toBe(200);
      expect(completeResponse.data.status).toBe('completed');
      expect(completeResponse.data.completed_at).toBeDefined();

      // Step 5: Verify completion
      const completedMilestone = await apiClient.get(`/api/kanban/milestones/${milestoneId}`);
      expect(completedMilestone.data.status).toBe('completed');
    });

    it('should prevent completing already completed milestone', async () => {
      // Create and complete milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Test Milestone',
        status: 'active'
      });

      const milestoneId = milestoneResponse.data.id;

      await apiClient.post(`/api/kanban/milestones/${milestoneId}/complete`);

      // Try to complete again
      const secondCompleteResponse = await apiClient.post(`/api/kanban/milestones/${milestoneId}/complete`);
      expect(secondCompleteResponse.status).toBe(400);
      expect(secondCompleteResponse.data.error).toContain('already completed');
    });
  });

  describe('Card Assignment Workflow', () => {
    it('should assign and unassign cards to milestones', async () => {
      // Create milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Sprint 1',
        description: 'First development sprint',
        due_date: '2024-07-31'
      });

      const milestoneId = milestoneResponse.data.id;

      // Assign cards to milestone
      const assignmentResults = [];
      for (let i = 0; i < 3; i++) {
        const assignResponse = await apiClient.post('/api/kanban/milestones/assign-card', {
          card_id: cardIds[i],
          milestone_id: milestoneId
        });
        expect(assignResponse.status).toBe(200);
        assignmentResults.push(assignResponse.data);
      }

      // Verify assignments
      const milestoneProgress = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(milestoneProgress.status).toBe(200);
      expect(milestoneProgress.data.total_cards).toBe(3);

      // Get cards assigned to milestone
      const assignedCardsResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/cards`);
      expect(assignedCardsResponse.status).toBe(200);
      expect(assignedCardsResponse.data).toHaveLength(3);

      // Verify card details include milestone information
      for (const card of assignedCardsResponse.data) {
        expect(card.milestone_id).toBe(milestoneId);
        expect(card.milestone_title).toBe('Sprint 1');
      }

      // Unassign one card
      const unassignResponse = await apiClient.post('/api/kanban/milestones/unassign-card', {
        card_id: cardIds[0]
      });
      expect(unassignResponse.status).toBe(200);

      // Verify unassignment
      const updatedProgress = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(updatedProgress.data.total_cards).toBe(2);

      // Verify card no longer has milestone
      const cardResponse = await apiClient.get(`/api/kanban/cards/${cardIds[0]}`);
      expect(cardResponse.data.milestone_id).toBeNull();
    });

    it('should prevent assigning cards from different boards', async () => {
      // Create another board
      const otherBoardResponse = await apiClient.post('/api/kanban/boards', {
        title: 'Other Board'
      });
      const otherBoardId = otherBoardResponse.data.id;

      // Create milestone on first board
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Cross Board Test'
      });

      // Create card on other board
      const otherColumnResponse = await apiClient.post('/api/kanban/columns', {
        board_id: otherBoardId,
        title: 'Other Column',
        order_index: 0
      });

      const otherCardResponse = await apiClient.post('/api/kanban/cards', {
        board_id: otherBoardId,
        column_id: otherColumnResponse.data.id,
        title: 'Other Card'
      });

      // Try to assign card from other board
      const assignResponse = await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: otherCardResponse.data.id,
        milestone_id: milestoneResponse.data.id
      });

      expect(assignResponse.status).toBe(400);
      expect(assignResponse.data.error).toContain('same board');
    });
  });

  describe('Progress Tracking Workflow', () => {
    it('should track milestone progress accurately', async () => {
      // Create milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Development Milestone',
        due_date: '2024-08-15'
      });

      const milestoneId = milestoneResponse.data.id;

      // Assign all cards to milestone
      for (const cardId of cardIds) {
        await apiClient.post('/api/kanban/milestones/assign-card', {
          card_id: cardId,
          milestone_id: milestoneId
        });
      }

      // Initial progress check
      let progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(progressResponse.status).toBe(200);
      expect(progressResponse.data).toMatchObject({
        milestone_id: milestoneId,
        total_cards: 5,
        completed_cards: 0,
        in_progress_cards: 0,
        todo_cards: 5,
        completion_percentage: 0
      });

      // Move some cards to in progress
      const inProgressColumnResponse = await apiClient.get(`/api/kanban/boards/${boardId}/columns`);
      const inProgressColumn = inProgressColumnResponse.data.find(col => col.title === 'In Progress');

      await apiClient.put(`/api/kanban/cards/${cardIds[0]}`, {
        column_id: inProgressColumn.id
      });
      await apiClient.put(`/api/kanban/cards/${cardIds[1]}`, {
        column_id: inProgressColumn.id
      });

      // Check updated progress
      progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(progressResponse.data).toMatchObject({
        total_cards: 5,
        completed_cards: 0,
        in_progress_cards: 2,
        todo_cards: 3,
        completion_percentage: 0
      });

      // Complete some cards
      const doneColumnResponse = await apiClient.get(`/api/kanban/boards/${boardId}/columns`);
      const doneColumn = doneColumnResponse.data.find(col => col.title === 'Done');

      await apiClient.put(`/api/kanban/cards/${cardIds[2]}`, {
        column_id: doneColumn.id
      });
      await apiClient.put(`/api/kanban/cards/${cardIds[3]}`, {
        column_id: doneColumn.id
      });

      // Final progress check
      progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(progressResponse.data).toMatchObject({
        total_cards: 5,
        completed_cards: 2,
        in_progress_cards: 2,
        todo_cards: 1,
        completion_percentage: 40
      });

      // Verify cards by column breakdown
      expect(progressResponse.data.cards_by_column).toContainEqual(
        expect.objectContaining({ column_name: 'To Do', count: 1 })
      );
      expect(progressResponse.data.cards_by_column).toContainEqual(
        expect.objectContaining({ column_name: 'In Progress', count: 2 })
      );
      expect(progressResponse.data.cards_by_column).toContainEqual(
        expect.objectContaining({ column_name: 'Done', count: 2 })
      );
    });

    it('should calculate time-based progress metrics', async () => {
      // Create milestone with specific dates
      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Time-based Milestone',
        due_date: dueDate.toISOString().split('T')[0],
        start_date: startDate.toISOString().split('T')[0]
      });

      const milestoneId = milestoneResponse.data.id;

      // Add time estimates to cards
      for (let i = 0; i < cardIds.length; i++) {
        await apiClient.put(`/api/kanban/cards/${cardIds[i]}`, {
          estimated_hours: (i + 1) * 4 // 4, 8, 12, 16, 20 hours
        });
        
        await apiClient.post('/api/kanban/milestones/assign-card', {
          card_id: cardIds[i],
          milestone_id: milestoneId
        });
      }

      const progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      
      expect(progressResponse.data).toMatchObject({
        total_cards: 5,
        estimated_hours: 60, // 4+8+12+16+20
        actual_hours: 0,
        remaining_days: expect.any(Number)
      });

      // Log some time on cards
      await apiClient.post('/api/kanban/time-entries', {
        card_id: cardIds[0],
        user_id: 'test-user',
        duration_minutes: 120 // 2 hours
      });

      await apiClient.post('/api/kanban/time-entries', {
        card_id: cardIds[1],
        user_id: 'test-user',
        duration_minutes: 240 // 4 hours
      });

      const updatedProgressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(updatedProgressResponse.data.actual_hours).toBe(6);
      expect(updatedProgressResponse.data.hours_completion_percentage).toBe(10); // 6/60 * 100
    });
  });

  describe('Multiple Milestones Workflow', () => {
    it('should handle multiple active milestones', async () => {
      // Create multiple milestones
      const milestone1Response = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Phase 1: Core Features',
        due_date: '2024-07-31'
      });

      const milestone2Response = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Phase 2: Advanced Features',
        due_date: '2024-09-30'
      });

      const milestone3Response = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Phase 3: Polish & Launch',
        due_date: '2024-11-30'
      });

      const milestoneIds = [
        milestone1Response.data.id,
        milestone2Response.data.id,
        milestone3Response.data.id
      ];

      // Distribute cards across milestones
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: cardIds[0],
        milestone_id: milestoneIds[0]
      });
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: cardIds[1],
        milestone_id: milestoneIds[0]
      });
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: cardIds[2],
        milestone_id: milestoneIds[1]
      });
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: cardIds[3],
        milestone_id: milestoneIds[1]
      });
      await apiClient.post('/api/kanban/milestones/assign-card', {
        card_id: cardIds[4],
        milestone_id: milestoneIds[2]
      });

      // Get all milestones for board
      const allMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones`);
      expect(allMilestonesResponse.status).toBe(200);
      expect(allMilestonesResponse.data).toHaveLength(3);

      // Verify each milestone has correct card count
      const milestonesWithProgress = allMilestonesResponse.data;
      expect(milestonesWithProgress.find(m => m.id === milestoneIds[0]).card_count).toBe(2);
      expect(milestonesWithProgress.find(m => m.id === milestoneIds[1]).card_count).toBe(2);
      expect(milestonesWithProgress.find(m => m.id === milestoneIds[2]).card_count).toBe(1);

      // Filter milestones by status
      const activeMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?status=active`);
      expect(activeMilestonesResponse.data).toHaveLength(3);

      // Complete first milestone
      await apiClient.post(`/api/kanban/milestones/${milestoneIds[0]}/complete`);

      const activeMilestonesAfterCompletion = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?status=active`);
      expect(activeMilestonesAfterCompletion.data).toHaveLength(2);

      const completedMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?status=completed`);
      expect(completedMilestonesResponse.data).toHaveLength(1);
    });

    it('should handle milestone dependencies and ordering', async () => {
      // Create milestones with dependencies
      const foundationMilestone = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Foundation',
        description: 'Core infrastructure must be completed first',
        due_date: '2024-06-30',
        priority: 1
      });

      const featureMilestone = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Feature Development',
        description: 'Depends on foundation',
        due_date: '2024-08-31',
        priority: 2,
        depends_on: [foundationMilestone.data.id]
      });

      const launchMilestone = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Launch Preparation',
        description: 'Final launch preparations',
        due_date: '2024-10-31',
        priority: 3,
        depends_on: [featureMilestone.data.id]
      });

      // Get milestones ordered by priority
      const orderedMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?order_by=priority`);
      
      const orderedMilestones = orderedMilestonesResponse.data;
      expect(orderedMilestones[0].title).toBe('Foundation');
      expect(orderedMilestones[1].title).toBe('Feature Development');
      expect(orderedMilestones[2].title).toBe('Launch Preparation');

      // Verify dependency information
      expect(orderedMilestones[1].depends_on).toContain(foundationMilestone.data.id);
      expect(orderedMilestones[2].depends_on).toContain(featureMilestone.data.id);

      // Try to complete dependent milestone before dependency
      const earlyCompleteResponse = await apiClient.post(`/api/kanban/milestones/${featureMilestone.data.id}/complete`);
      expect(earlyCompleteResponse.status).toBe(400);
      expect(earlyCompleteResponse.data.error).toContain('dependencies');

      // Complete in correct order
      await apiClient.post(`/api/kanban/milestones/${foundationMilestone.data.id}/complete`);
      
      const completeFeatureResponse = await apiClient.post(`/api/kanban/milestones/${featureMilestone.data.id}/complete`);
      expect(completeFeatureResponse.status).toBe(200);
    });
  });

  describe('Milestone Filtering and Search', () => {
    it('should filter and search milestones effectively', async () => {
      // Create milestones with different characteristics
      const milestones = [
        {
          title: 'Bug Fixes Sprint',
          description: 'Critical bug fixes',
          due_date: '2024-06-15',
          status: 'active',
          priority: 'high'
        },
        {
          title: 'Feature Development',
          description: 'New feature implementation',
          due_date: '2024-07-31',
          status: 'active',
          priority: 'medium'
        },
        {
          title: 'Performance Optimization',
          description: 'System performance improvements',
          due_date: '2024-05-30',
          status: 'completed',
          priority: 'low'
        },
        {
          title: 'Security Audit',
          description: 'Security review and fixes',
          due_date: '2024-08-15',
          status: 'planning',
          priority: 'high'
        }
      ];

      const createdMilestones = [];
      for (const milestone of milestones) {
        const response = await apiClient.post('/api/kanban/milestones', {
          board_id: boardId,
          ...milestone
        });
        createdMilestones.push(response.data);
      }

      // If completed milestone exists, complete it
      const completedMilestone = createdMilestones.find(m => m.title === 'Performance Optimization');
      if (completedMilestone) {
        // Update status to active first, then complete
        await apiClient.put(`/api/kanban/milestones/${completedMilestone.id}`, {
          status: 'active'
        });
        await apiClient.post(`/api/kanban/milestones/${completedMilestone.id}/complete`);
      }

      // Filter by status
      const activeMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?status=active`);
      const activeMilestones = activeMilestonesResponse.data;
      expect(activeMilestones).toHaveLength(2);
      expect(activeMilestones.every(m => m.status === 'active')).toBe(true);

      // Filter by priority
      const highPriorityResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?priority=high`);
      const highPriorityMilestones = highPriorityResponse.data;
      expect(highPriorityMilestones).toHaveLength(2);
      expect(highPriorityMilestones.every(m => m.priority === 'high')).toBe(true);

      // Search by title
      const searchResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?search=Bug`);
      const searchResults = searchResponse.data;
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Bug Fixes Sprint');

      // Filter by due date range
      const dateRangeResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?due_after=2024-07-01&due_before=2024-08-31`);
      const dateRangeResults = dateRangeResponse.data;
      expect(dateRangeResults).toHaveLength(2); // Feature Development and Security Audit

      // Combined filters
      const combinedResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones?status=active&priority=high`);
      const combinedResults = combinedResponse.data;
      expect(combinedResults).toHaveLength(1);
      expect(combinedResults[0].title).toBe('Bug Fixes Sprint');
    });
  });

  describe('Milestone Analytics and Reporting', () => {
    it('should provide comprehensive milestone analytics', async () => {
      // Create milestone with cards and time tracking
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Analytics Test Milestone',
        due_date: '2024-08-31',
        start_date: '2024-06-01'
      });

      const milestoneId = milestoneResponse.data.id;

      // Assign cards and set estimates
      for (let i = 0; i < cardIds.length; i++) {
        await apiClient.post('/api/kanban/milestones/assign-card', {
          card_id: cardIds[i],
          milestone_id: milestoneId
        });

        await apiClient.put(`/api/kanban/cards/${cardIds[i]}`, {
          estimated_hours: (i + 1) * 8
        });
      }

      // Log time entries
      await apiClient.post('/api/kanban/time-entries', {
        card_id: cardIds[0],
        user_id: 'user1',
        duration_minutes: 480 // 8 hours
      });

      await apiClient.post('/api/kanban/time-entries', {
        card_id: cardIds[1],
        user_id: 'user2',
        duration_minutes: 240 // 4 hours
      });

      // Complete some cards
      const doneColumnResponse = await apiClient.get(`/api/kanban/boards/${boardId}/columns`);
      const doneColumn = doneColumnResponse.data.find(col => col.title === 'Done');

      await apiClient.put(`/api/kanban/cards/${cardIds[0]}`, {
        column_id: doneColumn.id
      });

      // Get comprehensive analytics
      const analyticsResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/analytics`);
      
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.data).toMatchObject({
        milestone_id: milestoneId,
        summary: {
          total_cards: 5,
          completed_cards: 1,
          completion_percentage: 20,
          total_estimated_hours: 120, // 8+16+24+32+40
          total_actual_hours: 12,
          efficiency_ratio: expect.any(Number)
        },
        timeline: {
          start_date: '2024-06-01',
          due_date: '2024-08-31',
          days_elapsed: expect.any(Number),
          days_remaining: expect.any(Number),
          on_track: expect.any(Boolean)
        },
        team_performance: {
          contributors: expect.arrayContaining(['user1', 'user2']),
          hours_by_user: expect.any(Object),
          average_velocity: expect.any(Number)
        },
        risk_assessment: {
          risk_level: expect.any(String),
          risk_factors: expect.any(Array),
          recommendations: expect.any(Array)
        }
      });

      // Verify burndown chart data
      const burndownResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/burndown`);
      expect(burndownResponse.status).toBe(200);
      expect(burndownResponse.data).toHaveProperty('ideal_line');
      expect(burndownResponse.data).toHaveProperty('actual_line');
      expect(burndownResponse.data).toHaveProperty('data_points');
    });
  });

  describe('Milestone Deletion and Cleanup', () => {
    it('should handle milestone deletion and card cleanup', async () => {
      // Create milestone and assign cards
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Deletion Test Milestone'
      });

      const milestoneId = milestoneResponse.data.id;

      // Assign cards
      for (const cardId of cardIds.slice(0, 3)) {
        await apiClient.post('/api/kanban/milestones/assign-card', {
          card_id: cardId,
          milestone_id: milestoneId
        });
      }

      // Verify cards are assigned
      const progressResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}/progress`);
      expect(progressResponse.data.total_cards).toBe(3);

      // Delete milestone
      const deleteResponse = await apiClient.delete(`/api/kanban/milestones/${milestoneId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify milestone is deleted
      const getDeletedResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}`);
      expect(getDeletedResponse.status).toBe(404);

      // Verify cards are unassigned
      for (const cardId of cardIds.slice(0, 3)) {
        const cardResponse = await apiClient.get(`/api/kanban/cards/${cardId}`);
        expect(cardResponse.data.milestone_id).toBeNull();
      }

      // Verify milestone not in board's milestone list
      const boardMilestonesResponse = await apiClient.get(`/api/kanban/boards/${boardId}/milestones`);
      expect(boardMilestonesResponse.data.find(m => m.id === milestoneId)).toBeUndefined();
    });

    it('should prevent deletion of completed milestones with option to force', async () => {
      // Create and complete milestone
      const milestoneResponse = await apiClient.post('/api/kanban/milestones', {
        board_id: boardId,
        title: 'Completed Milestone'
      });

      const milestoneId = milestoneResponse.data.id;
      await apiClient.post(`/api/kanban/milestones/${milestoneId}/complete`);

      // Try to delete completed milestone
      const deleteResponse = await apiClient.delete(`/api/kanban/milestones/${milestoneId}`);
      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.data.error).toContain('completed');

      // Force delete completed milestone
      const forceDeleteResponse = await apiClient.delete(`/api/kanban/milestones/${milestoneId}?force=true`);
      expect(forceDeleteResponse.status).toBe(200);

      // Verify deletion
      const verifyResponse = await apiClient.get(`/api/kanban/milestones/${milestoneId}`);
      expect(verifyResponse.status).toBe(404);
    });
  });
});