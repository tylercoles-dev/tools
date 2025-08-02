/**
 * Kanban Analytics Features E2E Tests
 * 
 * Tests all the newly implemented kanban analytics features:
 * - Activity tracking with real-time feeds
 * - Analytics dashboard with performance metrics
 * - User productivity insights
 * - Status distribution visualizations
 * - KanbanActivityFeed and KanbanAnalyticsDashboard components
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';
import { RealtimeTestHelpers } from '../utils/realtime-test-helpers';
import { KanbanTestData } from '../fixtures/kanban-test-data';

test.describe('Kanban Analytics Features E2E Tests', () => {
  let kanbanHelpers: KanbanTestHelpers;
  let realtimeHelpers: RealtimeTestHelpers;
  let testBoardId: string;
  
  test.beforeEach(async ({ page, context }) => {
    kanbanHelpers = new KanbanTestHelpers(page);
    realtimeHelpers = new RealtimeTestHelpers(page, context);
    
    // Navigate to kanban section and ensure authentication
    await kanbanHelpers.navigateToKanban();
    await kanbanHelpers.ensureAuthenticated();
    
    // Create a test board for analytics
    testBoardId = await kanbanHelpers.createTestBoard('Analytics Test Board');
  });
  
  test.afterEach(async ({ page }) => {
    // Cleanup test board
    if (testBoardId) {
      await kanbanHelpers.deleteBoard(testBoardId);
    }
  });
  
  test.describe('Activity Tracking & Feed', () => {
    test('should track and display card activities in real-time', async ({ page }) => {
      await test.step('Generate card activities', async () => {
        // Create a card
        const cardId = await kanbanHelpers.createCard(testBoardId, {
          title: 'Analytics Test Card',
          description: 'Testing activity tracking',
          column: 'To Do'
        });
        
        // Perform various activities
        await kanbanHelpers.moveCard(cardId, 'To Do', 'In Progress');
        await kanbanHelpers.updateCard(cardId, {
          title: 'Updated Analytics Test Card',
          priority: 'high'
        });
        await kanbanHelpers.addComment(cardId, 'Test comment for activity tracking');
        await kanbanHelpers.moveCard(cardId, 'In Progress', 'Done');
      });
      
      await test.step('View activity feed', async () => {
        // Navigate to board analytics
        await page.getByTestId('board-analytics-button').click();
        
        // Verify KanbanActivityFeed component is visible
        await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
        
        // Verify activities are tracked with timestamps
        const activities = page.getByTestId('activity-item');
        await expect(activities).toHaveCount(5); // Create, move, update, comment, move
        
        // Verify activity details
        await expect(activities.first()).toContainText('moved');
        await expect(activities.first()).toContainText('Done');
        await expect(activities.first()).toContainText(/\d+ (seconds?|minutes?) ago/);
        
        // Verify activity types are properly categorized
        await expect(page.getByTestId('activity-card-created')).toBeVisible();
        await expect(page.getByTestId('activity-card-moved')).toBeVisible();
        await expect(page.getByTestId('activity-card-updated')).toBeVisible();
        await expect(page.getByTestId('activity-comment-added')).toBeVisible();
      });
    });
    
    test('should filter activities by type and user', async ({ page }) => {
      // Generate diverse activities
      await kanbanHelpers.generateTestActivities(testBoardId, {
        cardActions: 5,
        comments: 3,
        moves: 4
      });
      
      await test.step('Filter by activity type', async () => {
        await page.getByTestId('board-analytics-button').click();
        await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
        
        // Filter by card moves only
        await page.getByTestId('activity-filter-dropdown').click();
        await page.getByTestId('filter-card-moves').click();
        
        // Verify only move activities are shown
        const filteredActivities = page.getByTestId('activity-item');
        await expect(filteredActivities).toHaveCount(4);
        
        // All visible activities should be moves
        for (let i = 0; i < 4; i++) {
          await expect(filteredActivities.nth(i)).toContainText('moved');
        }
      });
      
      await test.step('Filter by date range', async () => {
        // Reset filters
        await page.getByTestId('reset-filters-button').click();
        
        // Filter by today only
        await page.getByTestId('date-range-filter').click();
        await page.getByTestId('filter-today').click();
        
        // Should show activities from today
        await expect(page.getByTestId('activity-item')).toHaveCountGreaterThan(0);
        
        // All activities should be from today
        const activities = page.getByTestId('activity-item');
        const count = await activities.count();
        for (let i = 0; i < count; i++) {
          await expect(activities.nth(i)).toContainText(/(seconds?|minutes?|hours?) ago/);
        }
      });
    });
    
    test('should show real-time activity updates', async ({ context, page }) => {
      // Create second user context for real-time testing
      const secondContext = await context.browser()!.newContext();
      const secondPage = await secondContext.newPage();
      const secondUserHelpers = new KanbanTestHelpers(secondPage);
      
      await test.step('Setup real-time activity monitoring', async () => {
        // First user views activity feed
        await page.getByTestId('board-analytics-button').click();
        await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
        
        // Second user navigates to same board
        await secondUserHelpers.navigateToKanban();
        await secondUserHelpers.ensureAuthenticated('second-user@example.com');
        await secondUserHelpers.navigateToBoard(testBoardId);
      });
      
      await test.step('Real-time activity updates', async () => {
        // Get initial activity count
        const initialCount = await page.getByTestId('activity-item').count();
        
        // Second user creates a card
        const cardId = await secondUserHelpers.createCard(testBoardId, {
          title: 'Real-time Test Card',
          description: 'Testing real-time updates'
        });
        
        // First user should see the new activity in real-time
        await expect(page.getByTestId('activity-item')).toHaveCount(initialCount + 1);
        await expect(page.getByTestId('activity-item').first()).toContainText('Real-time Test Card');
        await expect(page.getByTestId('activity-item').first()).toContainText('created');
        
        // Second user moves the card
        await secondUserHelpers.moveCard(cardId, 'To Do', 'In Progress');
        
        // First user should see the move activity
        await expect(page.getByTestId('activity-item')).toHaveCount(initialCount + 2);
        await expect(page.getByTestId('activity-item').first()).toContainText('moved');
        await expect(page.getByTestId('activity-item').first()).toContainText('In Progress');
      });
      
      await secondContext.close();
    });
  });
  
  test.describe('Analytics Dashboard', () => {
    test('should display comprehensive board analytics', async ({ page }) => {
      await test.step('Generate analytics data', async () => {
        // Create cards in different columns with various properties
        await kanbanHelpers.createCard(testBoardId, {
          title: 'High Priority Task',
          priority: 'high',
          column: 'To Do',
          assignee: 'user1@example.com'
        });
        
        await kanbanHelpers.createCard(testBoardId, {
          title: 'Medium Priority Task',
          priority: 'medium',
          column: 'In Progress',
          assignee: 'user1@example.com'
        });
        
        await kanbanHelpers.createCard(testBoardId, {
          title: 'Completed Task',
          priority: 'low',
          column: 'Done',
          assignee: 'user2@example.com'
        });
        
        // Add some time tracking data
        await kanbanHelpers.addTimeEntry(testBoardId, {
          cardTitle: 'Medium Priority Task',
          duration: 120, // 2 hours
          date: new Date().toISOString()
        });
      });
      
      await test.step('View analytics dashboard', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        
        // Verify KanbanAnalyticsDashboard component is visible
        await expect(page.getByTestId('kanban-analytics-dashboard')).toBeVisible();
        
        // Verify key metrics cards
        await expect(page.getByTestId('total-cards-metric')).toBeVisible();
        await expect(page.getByTestId('total-cards-metric')).toContainText('3');
        
        await expect(page.getByTestId('completed-cards-metric')).toBeVisible();
        await expect(page.getByTestId('completed-cards-metric')).toContainText('1');
        
        await expect(page.getByTestId('in-progress-cards-metric')).toBeVisible();
        await expect(page.getByTestId('in-progress-cards-metric')).toContainText('1');
        
        await expect(page.getByTestId('avg-completion-time-metric')).toBeVisible();
      });
    });
    
    test('should show status distribution visualizations', async ({ page }) => {
      // Create cards in different statuses for visualization
      await kanbanHelpers.createMultipleCards(testBoardId, [
        { title: 'Todo 1', column: 'To Do' },
        { title: 'Todo 2', column: 'To Do' },
        { title: 'Progress 1', column: 'In Progress' },
        { title: 'Progress 2', column: 'In Progress' },
        { title: 'Progress 3', column: 'In Progress' },
        { title: 'Done 1', column: 'Done' },
        { title: 'Done 2', column: 'Done' }
      ]);
      
      await test.step('View status distribution charts', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        
        // Verify status distribution chart
        await expect(page.getByTestId('status-distribution-chart')).toBeVisible();
        
        // Verify chart displays correct data
        await expect(page.getByTestId('chart-segment-todo')).toBeVisible();
        await expect(page.getByTestId('chart-segment-in-progress')).toBeVisible();
        await expect(page.getByTestId('chart-segment-done')).toBeVisible();
        
        // Verify legend shows correct counts
        await expect(page.getByTestId('legend-todo-count')).toContainText('2');
        await expect(page.getByTestId('legend-in-progress-count')).toContainText('3');
        await expect(page.getByTestId('legend-done-count')).toContainText('2');
        
        // Verify percentages are calculated correctly
        await expect(page.getByTestId('legend-todo-percentage')).toContainText('28.6%');
        await expect(page.getByTestId('legend-in-progress-percentage')).toContainText('42.9%');
        await expect(page.getByTestId('legend-done-percentage')).toContainText('28.6%');
      });
    });
    
    test('should display priority distribution analytics', async ({ page }) => {
      // Create cards with different priorities
      await kanbanHelpers.createMultipleCards(testBoardId, [
        { title: 'High 1', priority: 'high' },
        { title: 'High 2', priority: 'high' },
        { title: 'High 3', priority: 'high' },
        { title: 'Medium 1', priority: 'medium' },
        { title: 'Medium 2', priority: 'medium' },
        { title: 'Low 1', priority: 'low' }
      ]);
      
      await test.step('View priority analytics', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        
        // Verify priority distribution chart
        await expect(page.getByTestId('priority-distribution-chart')).toBeVisible();
        
        // Verify priority breakdown
        await expect(page.getByTestId('high-priority-count')).toContainText('3');
        await expect(page.getByTestId('medium-priority-count')).toContainText('2');
        await expect(page.getByTestId('low-priority-count')).toContainText('1');
        
        // Verify priority percentages
        await expect(page.getByTestId('high-priority-percentage')).toContainText('50%');
        await expect(page.getByTestId('medium-priority-percentage')).toContainText('33.3%');
        await expect(page.getByTestId('low-priority-percentage')).toContainText('16.7%');
      });
    });
    
    test('should show team productivity metrics', async ({ page }) => {
      // Create cards assigned to different users
      await kanbanHelpers.createMultipleCards(testBoardId, [
        { title: 'User1 Task 1', assignee: 'user1@example.com', column: 'Done' },
        { title: 'User1 Task 2', assignee: 'user1@example.com', column: 'Done' },
        { title: 'User1 Task 3', assignee: 'user1@example.com', column: 'In Progress' },
        { title: 'User2 Task 1', assignee: 'user2@example.com', column: 'Done' },
        { title: 'User2 Task 2', assignee: 'user2@example.com', column: 'To Do' }
      ]);
      
      await test.step('View team productivity dashboard', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        await page.getByTestId('team-productivity-tab').click();
        
        // Verify team member statistics
        await expect(page.getByTestId('team-member-user1')).toBeVisible();
        await expect(page.getByTestId('team-member-user2')).toBeVisible();
        
        // Verify completion rates
        await expect(page.getByTestId('user1-completion-rate')).toContainText('66.7%'); // 2/3 completed
        await expect(page.getByTestId('user2-completion-rate')).toContainText('50%'); // 1/2 completed
        
        // Verify task counts
        await expect(page.getByTestId('user1-total-tasks')).toContainText('3');
        await expect(page.getByTestId('user1-completed-tasks')).toContainText('2');
        
        await expect(page.getByTestId('user2-total-tasks')).toContainText('2');
        await expect(page.getByTestId('user2-completed-tasks')).toContainText('1');
      });
    });
  });
  
  test.describe('User Productivity Insights', () => {
    test('should generate and display productivity insights', async ({ page }) => {
      await test.step('Generate productivity data', async () => {
        // Create a variety of tasks with different completion times
        const cards = await kanbanHelpers.createMultipleCards(testBoardId, [
          { title: 'Quick Task 1', estimatedHours: 1 },
          { title: 'Quick Task 2', estimatedHours: 1 },
          { title: 'Medium Task 1', estimatedHours: 4 },
          { title: 'Long Task 1', estimatedHours: 8 }
        ]);
        
        // Simulate task completion with time tracking
        for (const card of cards) {
          await kanbanHelpers.moveCard(card.id, 'To Do', 'In Progress');
          await kanbanHelpers.addTimeEntry(card.id, {
            duration: card.estimatedHours * 60, // Convert to minutes
            date: new Date().toISOString()
          });
          await kanbanHelpers.moveCard(card.id, 'In Progress', 'Done');
        }
      });
      
      await test.step('View productivity insights', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        await page.getByTestId('productivity-insights-tab').click();
        
        // Verify insights section is visible
        await expect(page.getByTestId('productivity-insights')).toBeVisible();
        
        // Verify key productivity metrics
        await expect(page.getByTestId('avg-task-completion-time')).toBeVisible();
        await expect(page.getByTestId('tasks-completed-today')).toContainText('4');
        await expect(page.getByTestId('estimated-vs-actual-accuracy')).toBeVisible();
        
        // Verify productivity trends chart
        await expect(page.getByTestId('productivity-trend-chart')).toBeVisible();
        
        // Verify insights recommendations
        await expect(page.getByTestId('productivity-recommendations')).toBeVisible();
        const recommendations = page.getByTestId('recommendation-item');
        await expect(recommendations).toHaveCountGreaterThan(0);
      });
    });
    
    test('should show time estimation accuracy', async ({ page }) => {
      // Create tasks with estimates vs actual time
      await kanbanHelpers.createCard(testBoardId, {
        title: 'Underestimated Task',
        estimatedHours: 2,
        column: 'To Do'
      });
      
      await kanbanHelpers.createCard(testBoardId, {
        title: 'Overestimated Task',
        estimatedHours: 8,
        column: 'To Do'
      });
      
      // Simulate actual work time
      await kanbanHelpers.addTimeEntry(testBoardId, {
        cardTitle: 'Underestimated Task',
        duration: 300, // 5 hours actual vs 2 estimated
        date: new Date().toISOString()
      });
      
      await kanbanHelpers.addTimeEntry(testBoardId, {
        cardTitle: 'Overestimated Task',
        duration: 180, // 3 hours actual vs 8 estimated
        date: new Date().toISOString()
      });
      
      await test.step('View estimation accuracy insights', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        await page.getByTestId('productivity-insights-tab').click();
        
        // Verify estimation accuracy metrics
        await expect(page.getByTestId('estimation-accuracy-chart')).toBeVisible();
        
        // Verify accuracy percentage
        await expect(page.getByTestId('overall-estimation-accuracy')).toBeVisible();
        
        // Verify individual task accuracy
        await expect(page.getByTestId('underestimated-tasks-count')).toContainText('1');
        await expect(page.getByTestId('overestimated-tasks-count')).toContainText('1');
        
        // Verify accuracy recommendations
        await expect(page.getByTestId('estimation-improvement-tips')).toBeVisible();
      });
    });
    
    test('should display velocity tracking', async ({ page }) => {
      // Create tasks over multiple days to track velocity
      const dates = [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        new Date() // today
      ];
      
      for (let i = 0; i < dates.length; i++) {
        await kanbanHelpers.createCompletedCard(testBoardId, {
          title: `Day ${i + 1} Task 1`,
          completedDate: dates[i].toISOString(),
          storyPoints: 3
        });
        
        await kanbanHelpers.createCompletedCard(testBoardId, {
          title: `Day ${i + 1} Task 2`,
          completedDate: dates[i].toISOString(),
          storyPoints: 5
        });
      }
      
      await test.step('View velocity metrics', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        await page.getByTestId('velocity-tracking-tab').click();
        
        // Verify velocity chart
        await expect(page.getByTestId('velocity-chart')).toBeVisible();
        
        // Verify average velocity
        await expect(page.getByTestId('average-velocity')).toContainText('8'); // 8 story points per day
        
        // Verify velocity trend
        await expect(page.getByTestId('velocity-trend')).toBeVisible();
        
        // Verify story points completed per day
        await expect(page.getByTestId('daily-story-points')).toBeVisible();
      });
    });
  });
  
  test.describe('Real-time Analytics Updates', () => {
    test('should update analytics in real-time as board changes', async ({ page }) => {
      await test.step('Initial analytics state', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        
        // Check initial state
        await expect(page.getByTestId('total-cards-metric')).toContainText('0');
        await expect(page.getByTestId('completed-cards-metric')).toContainText('0');
      });
      
      await test.step('Real-time updates as cards are created', async () => {
        // Open new tab to create cards while keeping analytics open
        const newTab = await page.context().newPage();
        const newTabHelpers = new KanbanTestHelpers(newTab);
        
        await newTabHelpers.navigateToKanban();
        await newTabHelpers.ensureAuthenticated();
        await newTabHelpers.navigateToBoard(testBoardId);
        
        // Create a card in the new tab
        await newTabHelpers.createCard(testBoardId, {
          title: 'Real-time Analytics Test',
          column: 'To Do'
        });
        
        // Original page should show updated metrics
        await expect(page.getByTestId('total-cards-metric')).toContainText('1');
        
        // Move card to completed
        await newTabHelpers.moveCard('Real-time Analytics Test', 'To Do', 'Done');
        
        // Analytics should update
        await expect(page.getByTestId('completed-cards-metric')).toContainText('1');
        
        // Activity feed should show new activity
        await page.getByTestId('activity-feed-tab').click();
        await expect(page.getByTestId('activity-item').first()).toContainText('Real-time Analytics Test');
        
        await newTab.close();
      });
    });
    
    test('should handle multiple users updating analytics simultaneously', async ({ context, page }) => {
      // Create multiple user contexts
      const users = [];
      for (let i = 0; i < 3; i++) {
        const userContext = await context.browser()!.newContext();
        const userPage = await userContext.newPage();
        const userHelpers = new KanbanTestHelpers(userPage);
        
        await userHelpers.navigateToKanban();
        await userHelpers.ensureAuthenticated(`user${i}@example.com`);
        await userHelpers.navigateToBoard(testBoardId);
        
        users.push({ context: userContext, page: userPage, helpers: userHelpers });
      }
      
      await test.step('Simultaneous updates from multiple users', async () => {
        // First user watches analytics
        await page.getByTestId('kanban-analytics-button').click();
        
        // All users create cards simultaneously
        await Promise.all(users.map((user, index) =>
          user.helpers.createCard(testBoardId, {
            title: `User ${index} Card`,
            column: 'To Do'
          })
        ));
        
        // Analytics should reflect all changes
        await expect(page.getByTestId('total-cards-metric')).toContainText('3');
        
        // All users move their cards to completed
        await Promise.all(users.map((user, index) =>
          user.helpers.moveCard(`User ${index} Card`, 'To Do', 'Done')
        ));
        
        // Completed count should update
        await expect(page.getByTestId('completed-cards-metric')).toContainText('3');
        
        // Activity feed should show all activities
        await page.getByTestId('activity-feed-tab').click();
        await expect(page.getByTestId('activity-item')).toHaveCount(6); // 3 creates + 3 moves
      });
      
      // Cleanup user contexts
      for (const user of users) {
        await user.context.close();
      }
    });
  });
  
  test.describe('Performance and UX', () => {
    test('should load analytics dashboard quickly', async ({ page }) => {
      // Create substantial data for performance testing
      await kanbanHelpers.createMultipleCards(testBoardId, 
        Array.from({ length: 50 }, (_, i) => ({
          title: `Performance Test Card ${i}`,
          column: i % 3 === 0 ? 'Done' : i % 2 === 0 ? 'In Progress' : 'To Do',
          priority: ['low', 'medium', 'high'][i % 3],
          assignee: `user${i % 3}@example.com`
        }))
      );
      
      await test.step('Measure analytics loading performance', async () => {
        const startTime = Date.now();
        
        await page.getByTestId('kanban-analytics-button').click();
        await page.waitForLoadState('networkidle');
        
        // Wait for all analytics components to load
        await expect(page.getByTestId('kanban-analytics-dashboard')).toBeVisible();
        await expect(page.getByTestId('status-distribution-chart')).toBeVisible();
        await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      });
      
      await test.step('Measure chart rendering performance', async () => {
        // Switch between different chart views
        const chartSwitchStart = Date.now();
        
        await page.getByTestId('priority-distribution-tab').click();
        await expect(page.getByTestId('priority-distribution-chart')).toBeVisible();
        
        await page.getByTestId('team-productivity-tab').click();
        await expect(page.getByTestId('team-productivity-chart')).toBeVisible();
        
        const chartSwitchTime = Date.now() - chartSwitchStart;
        expect(chartSwitchTime).toBeLessThan(1000); // Chart switching should be fast
      });
    });
    
    test('should remain responsive during real-time updates', async ({ page }) => {
      await test.step('Heavy real-time update scenario', async () => {
        await page.getByTestId('kanban-analytics-button').click();
        
        // Create many rapid updates to test responsiveness
        const updatePromises = [];
        for (let i = 0; i < 20; i++) {
          updatePromises.push(
            kanbanHelpers.createCard(testBoardId, {
              title: `Rapid Update ${i}`,
              column: 'To Do'
            })
          );
        }
        
        // UI should remain responsive during updates
        await Promise.all(updatePromises);
        
        // Verify UI is still responsive
        await page.getByTestId('activity-feed-tab').click();
        await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
        
        // Metrics should eventually reflect all updates
        await expect(page.getByTestId('total-cards-metric')).toContainText('20');
      });
    });
  });
});
