/**
 * End-to-End Tests for Enhanced Kanban Features
 * Tests complete workflows using the new card detail modal and enhanced features
 */

import { test, expect, Page } from '@playwright/test';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';

test.describe('Enhanced Kanban Features E2E', () => {
  let kanbanHelpers: KanbanTestHelpers;
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    kanbanHelpers = new KanbanTestHelpers(page);
    
    // Navigate to authenticated kanban board
    await page.goto('/kanban');
    await kanbanHelpers.createTestBoard('Enhanced Features Test Board');
    await kanbanHelpers.createTestCards(['User Authentication', 'API Integration', 'Dashboard']);
  });

  test.describe('Enhanced Card Detail Modal', () => {
    test('should open and navigate between all tabs', async () => {
      // Open first card
      await kanbanHelpers.openCardDetail('User Authentication');

      // Verify modal is open with 6 tabs
      await expect(page.locator('[data-testid="card-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="modal-tab"]')).toHaveCount(6);

      // Verify all tab labels
      const expectedTabs = ['Overview', 'Custom Fields', 'Subtasks', 'Time Tracking', 'Links', 'Activity'];
      for (const tabName of expectedTabs) {
        await expect(page.locator(`[data-testid="tab-${tabName.toLowerCase().replace(' ', '-')}"]`)).toBeVisible();
      }

      // Navigate through each tab
      for (const tabName of expectedTabs) {
        await page.click(`[data-testid="tab-${tabName.toLowerCase().replace(' ', '-')}"]`);
        await expect(page.locator(`[data-testid="tab-content-${tabName.toLowerCase().replace(' ', '-')}"]`)).toBeVisible();
      }
    });

    test('should maintain tab state when switching between cards', async () => {
      // Open first card and switch to subtasks tab
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-subtasks"]');
      await expect(page.locator('[data-testid="tab-content-subtasks"]')).toBeVisible();

      // Switch to different card
      await page.click('[data-testid="card-switcher"]');
      await page.click('[data-testid="card-option-api-integration"]');

      // Verify we're still on subtasks tab
      await expect(page.locator('[data-testid="tab-content-subtasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-subtasks"]')).toHaveClass(/active/);
    });

    test('should handle keyboard navigation between tabs', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');

      // Focus on first tab and use arrow keys
      await page.focus('[data-testid="tab-overview"]');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-custom-fields"]')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-subtasks"]')).toBeFocused();

      // Test wraparound
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-testid="tab-custom-fields"]')).toBeFocused();

      // Test Enter to activate tab
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="tab-content-custom-fields"]')).toBeVisible();
    });
  });

  test.describe('Custom Fields Integration', () => {
    test('should create and use custom fields end-to-end', async () => {
      // Create custom fields through board settings
      await page.click('[data-testid="board-settings-btn"]');
      await page.click('[data-testid="custom-fields-tab"]');

      // Create dropdown field
      await page.click('[data-testid="add-custom-field"]');
      await page.fill('[data-testid="field-name-input"]', 'Priority');
      await page.selectOption('[data-testid="field-type-select"]', 'dropdown');
      await page.fill('[data-testid="field-options-input"]', 'Low,Medium,High,Critical');
      await page.click('[data-testid="field-required-checkbox"]');
      await page.click('[data-testid="save-field-btn"]');

      // Create number field
      await page.click('[data-testid="add-custom-field"]');
      await page.fill('[data-testid="field-name-input"]', 'Story Points');
      await page.selectOption('[data-testid="field-type-select"]', 'number');
      await page.fill('[data-testid="field-min-input"]', '1');
      await page.fill('[data-testid="field-max-input"]', '100');
      await page.click('[data-testid="save-field-btn"]');

      // Close settings
      await page.click('[data-testid="close-settings-btn"]');

      // Open card and set custom field values
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-custom-fields"]');

      // Set priority field
      await expect(page.locator('[data-testid="custom-field-priority"]')).toBeVisible();
      await page.selectOption('[data-testid="custom-field-priority-select"]', 'High');

      // Set story points
      await page.fill('[data-testid="custom-field-story-points-input"]', '8');

      // Save changes
      await page.click('[data-testid="save-custom-fields-btn"]');
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();

      // Verify values are displayed on card
      await page.click('[data-testid="close-modal-btn"]');
      const cardElement = page.locator('[data-testid="card-user-authentication"]');
      await expect(cardElement.locator('[data-testid="field-priority-indicator"]')).toHaveText('High');
      await expect(cardElement.locator('[data-testid="field-story-points-indicator"]')).toHaveText('8');
    });

    test('should validate required custom fields', async () => {
      // Create required field
      await kanbanHelpers.createCustomField({
        name: 'Assignee',
        type: 'text',
        required: true
      });

      // Try to create new card without required field
      await page.click('[data-testid="add-card-btn"]');
      await page.fill('[data-testid="new-card-title"]', 'New Test Card');
      await page.click('[data-testid="create-card-btn"]');

      // Should show validation error
      await expect(page.locator('[data-testid="required-field-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="required-field-error"]')).toContainText('Assignee is required');

      // Fill required field and create card
      await page.fill('[data-testid="custom-field-assignee-input"]', 'John Doe');
      await page.click('[data-testid="create-card-btn"]');

      // Card should be created successfully
      await expect(page.locator('[data-testid="card-new-test-card"]')).toBeVisible();
    });

    test('should filter cards by custom field values', async () => {
      // Set up cards with different priorities
      await kanbanHelpers.createCustomField({
        name: 'Priority',
        type: 'dropdown',
        options: ['Low', 'Medium', 'High']
      });

      const cardData = [
        { title: 'User Authentication', priority: 'High' },
        { title: 'API Integration', priority: 'Medium' },
        { title: 'Dashboard', priority: 'Low' }
      ];

      for (const card of cardData) {
        await kanbanHelpers.setCustomFieldValue(card.title, 'Priority', card.priority);
      }

      // Open filters
      await page.click('[data-testid="filter-btn"]');
      await page.click('[data-testid="custom-fields-filter-tab"]');

      // Filter by High priority
      await page.selectOption('[data-testid="priority-filter-select"]', 'High');
      await page.click('[data-testid="apply-filters-btn"]');

      // Should show only high priority card
      await expect(page.locator('[data-testid="kanban-card"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="card-user-authentication"]')).toBeVisible();

      // Clear filter
      await page.click('[data-testid="clear-filters-btn"]');
      await expect(page.locator('[data-testid="kanban-card"]')).toHaveCount(3);
    });
  });

  test.describe('Milestones Integration', () => {
    test('should create milestone and assign cards', async () => {
      // Create milestone
      await page.click('[data-testid="board-settings-btn"]');
      await page.click('[data-testid="milestones-tab"]');
      await page.click('[data-testid="create-milestone-btn"]');

      await page.fill('[data-testid="milestone-title-input"]', 'Sprint 1');
      await page.fill('[data-testid="milestone-description-input"]', 'First development sprint');
      await page.fill('[data-testid="milestone-due-date-input"]', '2024-07-31');
      await page.click('[data-testid="save-milestone-btn"]');

      await expect(page.locator('[data-testid="milestone-sprint-1"]')).toBeVisible();
      await page.click('[data-testid="close-settings-btn"]');

      // Assign cards to milestone
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-overview"]');
      await page.selectOption('[data-testid="milestone-select"]', 'Sprint 1');
      await page.click('[data-testid="save-card-btn"]');

      // Verify milestone indicator on card
      await page.click('[data-testid="close-modal-btn"]');
      const cardElement = page.locator('[data-testid="card-user-authentication"]');
      await expect(cardElement.locator('[data-testid="milestone-indicator"]')).toHaveText('Sprint 1');

      // Check milestone progress
      await page.click('[data-testid="milestone-progress-btn"]');
      await expect(page.locator('[data-testid="milestone-progress-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-total-cards"]')).toHaveText('1');
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('0%');
    });

    test('should track milestone progress as cards are completed', async () => {
      // Set up milestone with multiple cards
      await kanbanHelpers.createMilestone('Sprint 1', '2024-07-31');
      
      const cards = ['User Authentication', 'API Integration', 'Dashboard'];
      for (const cardTitle of cards) {
        await kanbanHelpers.assignCardToMilestone(cardTitle, 'Sprint 1');
      }

      // Move one card to Done column
      await kanbanHelpers.moveCardToColumn('User Authentication', 'Done');

      // Check updated progress
      await page.click('[data-testid="milestone-progress-btn"]');
      await expect(page.locator('[data-testid="progress-completed-cards"]')).toHaveText('1');
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('33%');

      // Verify progress bar
      const progressBar = page.locator('[data-testid="milestone-progress-bar"]');
      await expect(progressBar).toHaveCSS('width', /33%/);

      // Move another card to Done
      await page.click('[data-testid="close-progress-modal"]');
      await kanbanHelpers.moveCardToColumn('API Integration', 'Done');

      // Verify updated progress
      await page.click('[data-testid="milestone-progress-btn"]');
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('67%');
    });

    test('should show milestone timeline and due date warnings', async () => {
      // Create milestone with past due date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      await kanbanHelpers.createMilestone('Overdue Milestone', pastDate.toISOString().split('T')[0]);

      // Should show overdue indicator
      await expect(page.locator('[data-testid="milestone-overdue-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-overdue-warning"]')).toHaveText(/5 days overdue/);

      // Create milestone due soon
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);
      
      await kanbanHelpers.createMilestone('Due Soon', soonDate.toISOString().split('T')[0]);

      // Should show due soon indicator
      await expect(page.locator('[data-testid="milestone-due-soon-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-due-soon-warning"]')).toHaveText(/due in 2 days/);
    });
  });

  test.describe('Subtasks Management', () => {
    test('should create hierarchical subtask structure', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-subtasks"]');

      // Create parent subtask
      await page.click('[data-testid="add-subtask-btn"]');
      await page.fill('[data-testid="subtask-title-input"]', 'Frontend Components');
      await page.selectOption('[data-testid="subtask-priority-select"]', 'high');
      await page.click('[data-testid="save-subtask-btn"]');

      await expect(page.locator('[data-testid="subtask-frontend-components"]')).toBeVisible();

      // Create child subtasks
      const childSubtasks = ['Login Form', 'Registration Form', 'Password Reset'];
      
      for (const subtaskTitle of childSubtasks) {
        await page.click('[data-testid="subtask-frontend-components"] [data-testid="add-child-subtask-btn"]');
        await page.fill('[data-testid="child-subtask-title-input"]', subtaskTitle);
        await page.click('[data-testid="save-child-subtask-btn"]');
      }

      // Verify hierarchical structure
      const parentSubtask = page.locator('[data-testid="subtask-frontend-components"]');
      await expect(parentSubtask.locator('[data-testid="child-subtask"]')).toHaveCount(3);

      // Expand/collapse functionality
      await page.click('[data-testid="subtask-frontend-components"] [data-testid="collapse-btn"]');
      await expect(parentSubtask.locator('[data-testid="child-subtask"]')).toHaveCount(0);

      await page.click('[data-testid="subtask-frontend-components"] [data-testid="expand-btn"]');
      await expect(parentSubtask.locator('[data-testid="child-subtask"]')).toHaveCount(3);
    });

    test('should track subtask completion and auto-complete parents', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-subtasks"]');

      // Create parent with two children
      await kanbanHelpers.createSubtask('Authentication Logic', [], 'User Authentication');
      await kanbanHelpers.createSubtask('JWT Setup', ['Authentication Logic'], 'User Authentication');
      await kanbanHelpers.createSubtask('Password Hashing', ['Authentication Logic'], 'User Authentication');

      // Complete first child
      await page.click('[data-testid="subtask-jwt-setup"] [data-testid="complete-checkbox"]');
      await expect(page.locator('[data-testid="subtask-jwt-setup"]')).toHaveClass(/completed/);

      // Parent should still be incomplete
      await expect(page.locator('[data-testid="subtask-authentication-logic"]')).not.toHaveClass(/completed/);

      // Complete second child
      await page.click('[data-testid="subtask-password-hashing"] [data-testid="complete-checkbox"]');

      // Parent should now be auto-completed
      await expect(page.locator('[data-testid="subtask-authentication-logic"]')).toHaveClass(/completed/);
      await expect(page.locator('[data-testid="auto-complete-notification"]')).toBeVisible();
    });

    test('should show subtask progress on card', async () => {
      // Create subtasks
      await kanbanHelpers.createSubtask('Task 1', [], 'User Authentication');
      await kanbanHelpers.createSubtask('Task 2', [], 'User Authentication');
      await kanbanHelpers.createSubtask('Task 3', [], 'User Authentication');

      // Should show progress indicator on card
      const cardElement = page.locator('[data-testid="card-user-authentication"]');
      await expect(cardElement.locator('[data-testid="subtask-progress"]')).toHaveText('0/3');
      await expect(cardElement.locator('[data-testid="subtask-progress-bar"]')).toHaveCSS('width', '0%');

      // Complete one subtask
      await kanbanHelpers.completeSubtask('Task 1', 'User Authentication');

      // Progress should update
      await expect(cardElement.locator('[data-testid="subtask-progress"]')).toHaveText('1/3');
      await expect(cardElement.locator('[data-testid="subtask-progress-bar"]')).toHaveCSS('width', /33%/);
    });

    test('should support drag and drop reordering of subtasks', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-subtasks"]');

      // Create multiple subtasks
      const subtasks = ['First Task', 'Second Task', 'Third Task'];
      for (const task of subtasks) {
        await kanbanHelpers.createSubtask(task, [], 'User Authentication');
      }

      // Verify initial order
      const subtaskList = page.locator('[data-testid="subtask-list"]');
      await expect(subtaskList.locator('[data-testid^="subtask-"]').first()).toContainText('First Task');

      // Drag first task to third position
      await page.dragAndDrop(
        '[data-testid="subtask-first-task"]',
        '[data-testid="subtask-third-task"]'
      );

      // Verify new order
      await expect(subtaskList.locator('[data-testid^="subtask-"]').first()).toContainText('Second Task');
      await expect(subtaskList.locator('[data-testid^="subtask-"]').last()).toContainText('First Task');
    });
  });

  test.describe('Time Tracking Integration', () => {
    test('should track time with start/stop functionality', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-time-tracking"]');

      // Start time tracking
      await page.click('[data-testid="start-timer-btn"]');
      await page.fill('[data-testid="time-description-input"]', 'Working on authentication logic');
      await page.click('[data-testid="confirm-start-timer"]');

      // Should show active timer
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      await expect(page.locator('[data-testid="timer-display"]')).toMatch(/00:00:\d{2}/);

      // Wait a bit for timer to increment
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="timer-display"]')).toMatch(/00:00:0[2-9]/);

      // Stop timer
      await page.click('[data-testid="stop-timer-btn"]');
      await expect(page.locator('[data-testid="active-timer"]')).not.toBeVisible();

      // Should show time entry in history
      await expect(page.locator('[data-testid="time-entry"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="time-entry"]').first()).toContainText('Working on authentication logic');
    });

    test('should set time estimates and track vs actual', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-time-tracking"]');

      // Set time estimate
      await page.fill('[data-testid="time-estimate-input"]', '8');
      await page.click('[data-testid="save-estimate-btn"]');

      // Log some actual time
      await page.click('[data-testid="add-time-entry-btn"]');
      await page.fill('[data-testid="manual-time-hours"]', '3');
      await page.fill('[data-testid="manual-time-description"]', 'Initial setup');
      await page.click('[data-testid="save-time-entry-btn"]');

      // Should show estimate vs actual comparison
      await expect(page.locator('[data-testid="estimated-hours"]')).toHaveText('8h');
      await expect(page.locator('[data-testid="actual-hours"]')).toHaveText('3h');
      await expect(page.locator('[data-testid="remaining-hours"]')).toHaveText('5h');
      
      // Progress bar should show 37.5% (3/8)
      const progressBar = page.locator('[data-testid="time-progress-bar"]');
      await expect(progressBar).toHaveCSS('width', /37\.5%|38%/);
    });

    test('should generate time reports', async () => {
      // Log time on multiple cards
      const timeData = [
        { card: 'User Authentication', hours: 5, description: 'Backend work' },
        { card: 'API Integration', hours: 3, description: 'API endpoints' },
        { card: 'Dashboard', hours: 2, description: 'UI components' }
      ];

      for (const entry of timeData) {
        await kanbanHelpers.logTime(entry.card, entry.hours, entry.description);
      }

      // Open time reports
      await page.click('[data-testid="board-menu-btn"]');
      await page.click('[data-testid="time-reports-option"]');

      // Should show report with totals
      await expect(page.locator('[data-testid="total-time-logged"]')).toHaveText('10h');
      
      // Should show breakdown by card
      const reportTable = page.locator('[data-testid="time-report-table"]');
      await expect(reportTable.locator('tr')).toHaveCount(4); // Header + 3 cards

      // Should show chart visualization
      await expect(page.locator('[data-testid="time-chart"]')).toBeVisible();

      // Filter by date range
      await page.fill('[data-testid="date-from-input"]', '2024-06-01');
      await page.fill('[data-testid="date-to-input"]', '2024-06-30');
      await page.click('[data-testid="apply-date-filter-btn"]');

      // Report should update with filtered data
      await expect(page.locator('[data-testid="date-range-info"]')).toContainText('June 2024');
    });

    test('should show time indicators on cards', async () => {
      // Set estimate and log time
      await kanbanHelpers.setTimeEstimate('User Authentication', 8);
      await kanbanHelpers.logTime('User Authentication', 3, 'Development work');

      // Card should show time indicators
      const cardElement = page.locator('[data-testid="card-user-authentication"]');
      await expect(cardElement.locator('[data-testid="time-estimate-badge"]')).toHaveText('8h');
      await expect(cardElement.locator('[data-testid="time-logged-badge"]')).toHaveText('3h');
      
      // Should show progress indicator
      await expect(cardElement.locator('[data-testid="time-progress-indicator"]')).toHaveClass(/under-estimate/);
    });
  });

  test.describe('Card Linking System', () => {
    test('should create and visualize card dependencies', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.click('[data-testid="tab-links"]');

      // Create blocking relationship
      await page.click('[data-testid="add-link-btn"]');
      await page.selectOption('[data-testid="link-type-select"]', 'blocks');
      await page.selectOption('[data-testid="target-card-select"]', 'API Integration');
      await page.fill('[data-testid="link-description-input"]', 'API needs auth to be completed first');
      await page.click('[data-testid="save-link-btn"]');

      // Should show link in links tab
      await expect(page.locator('[data-testid="card-link"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="card-link"]').first()).toContainText('blocks API Integration');

      // Should show visual indicators on cards
      const authCard = page.locator('[data-testid="card-user-authentication"]');
      await expect(authCard.locator('[data-testid="blocks-indicator"]')).toBeVisible();

      const apiCard = page.locator('[data-testid="card-api-integration"]');
      await expect(apiCard.locator('[data-testid="blocked-by-indicator"]')).toBeVisible();
    });

    test('should show dependency graph', async () => {
      // Create chain of dependencies: Dashboard -> API -> Auth
      await kanbanHelpers.createCardLink('Dashboard', 'API Integration', 'blocks', 'Dashboard needs API');
      await kanbanHelpers.createCardLink('API Integration', 'User Authentication', 'blocks', 'API needs auth');

      // Open dependency graph
      await page.click('[data-testid="board-menu-btn"]');
      await page.click('[data-testid="dependency-graph-option"]');

      // Should show graph visualization
      await expect(page.locator('[data-testid="dependency-graph"]')).toBeVisible();
      await expect(page.locator('[data-testid="graph-node"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="graph-edge"]')).toHaveCount(2);

      // Should show critical path
      await expect(page.locator('[data-testid="critical-path-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="critical-path-info"]')).toContainText('3 cards in critical path');

      // Click on node should highlight dependencies
      await page.click('[data-testid="graph-node-dashboard"]');
      await expect(page.locator('[data-testid="graph-node-api-integration"]')).toHaveClass(/highlighted/);
      await expect(page.locator('[data-testid="graph-node-user-authentication"]')).toHaveClass(/highlighted/);
    });

    test('should prevent circular dependencies', async () => {
      // Create initial link: A blocks B
      await kanbanHelpers.createCardLink('User Authentication', 'API Integration', 'blocks', 'Auth blocks API');

      // Try to create circular link: B blocks A
      await kanbanHelpers.openCardDetail('API Integration');
      await page.click('[data-testid="tab-links"]');
      await page.click('[data-testid="add-link-btn"]');
      await page.selectOption('[data-testid="link-type-select"]', 'blocks');
      await page.selectOption('[data-testid="target-card-select"]', 'User Authentication');
      await page.click('[data-testid="save-link-btn"]');

      // Should show error
      await expect(page.locator('[data-testid="circular-dependency-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="circular-dependency-error"]')).toContainText('circular dependency');

      // Link should not be created
      await expect(page.locator('[data-testid="card-link"]')).toHaveCount(0);
    });

    test('should show blocked card warnings', async () => {
      // Create blocking relationship
      await kanbanHelpers.createCardLink('API Integration', 'User Authentication', 'blocks', 'API blocks auth');

      // Try to move blocked card to In Progress
      await page.dragAndDrop(
        '[data-testid="card-api-integration"]',
        '[data-testid="column-in-progress"]'
      );

      // Should show warning
      await expect(page.locator('[data-testid="blocked-card-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="blocked-card-warning"]')).toContainText('blocked by User Authentication');

      // Should offer options to continue or cancel
      await expect(page.locator('[data-testid="continue-anyway-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-move-btn"]')).toBeVisible();

      // Cancel should revert the move
      await page.click('[data-testid="cancel-move-btn"]');
      await expect(page.locator('[data-testid="column-to-do"] [data-testid="card-api-integration"]')).toBeVisible();
    });
  });

  test.describe('Real-time Collaboration', () => {
    test.skip('should show live updates from other users', async ({ context }) => {
      // This test requires multiple browser contexts
      const secondPage = await context.newPage();
      await secondPage.goto('/kanban');
      
      // Simulate another user making changes
      await secondPage.evaluate(() => {
        // Simulate WebSocket message for card update
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'cardUpdated',
            data: {
              id: 'card-user-authentication',
              title: 'User Authentication (Updated by User 2)',
              column_id: 'column-in-progress'
            }
          }
        }));
      });

      // First page should show the update
      await expect(page.locator('[data-testid="card-user-authentication"]')).toContainText('Updated by User 2');
      await expect(page.locator('[data-testid="column-in-progress"] [data-testid="card-user-authentication"]')).toBeVisible();

      // Should show live user indicators
      await expect(page.locator('[data-testid="active-users-indicator"]')).toContainText('2 users online');
    });

    test('should handle real-time custom field updates', async () => {
      // Set up custom field
      await kanbanHelpers.createCustomField({
        name: 'Status',
        type: 'dropdown',
        options: ['Not Started', 'In Progress', 'Review', 'Done']
      });

      // Simulate real-time update from another user
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'customFieldValueUpdated',
            data: {
              card_id: 'card-user-authentication',
              field_name: 'Status',
              value: 'In Progress',
              updated_by: 'Jane Doe'
            }
          }
        }));
      });

      // Should show live update notification
      await expect(page.locator('[data-testid="live-update-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-update-notification"]')).toContainText('Jane Doe updated Status');

      // Field value should be updated on card
      const cardElement = page.locator('[data-testid="card-user-authentication"]');
      await expect(cardElement.locator('[data-testid="field-status-indicator"]')).toHaveText('In Progress');
    });

    test('should show conflict resolution for simultaneous edits', async () => {
      await kanbanHelpers.openCardDetail('User Authentication');

      // Start editing
      await page.fill('[data-testid="card-title-input"]', 'Updated Title Local');

      // Simulate concurrent update from another user
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'cardUpdated',
            data: {
              id: 'card-user-authentication',
              title: 'Updated Title Remote',
              updated_by: 'John Doe',
              version: 2
            }
          }
        }));
      });

      // Try to save local changes
      await page.click('[data-testid="save-card-btn"]');

      // Should show conflict resolution dialog
      await expect(page.locator('[data-testid="conflict-resolution-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-version"]')).toContainText('Updated Title Local');
      await expect(page.locator('[data-testid="remote-version"]')).toContainText('Updated Title Remote');

      // Should offer merge options
      await expect(page.locator('[data-testid="keep-local-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="keep-remote-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="merge-manually-btn"]')).toBeVisible();

      // Choose to keep local version
      await page.click('[data-testid="keep-local-btn"]');
      await expect(page.locator('[data-testid="card-title-input"]')).toHaveValue('Updated Title Local');
    });
  });

  test.describe('Board Analytics Dashboard', () => {
    test('should display comprehensive board analytics', async () => {
      // Set up test data
      await kanbanHelpers.setupAnalyticsTestData();

      // Open analytics dashboard
      await page.click('[data-testid="board-menu-btn"]');
      await page.click('[data-testid="analytics-dashboard-option"]');

      // Should show all 6 analytics views
      const expectedViews = [
        'Overview',
        'Velocity',
        'Cycle Time',
        'Burndown',
        'Custom Fields',
        'Predictive'
      ];

      for (const view of expectedViews) {
        await expect(page.locator(`[data-testid="analytics-tab-${view.toLowerCase().replace(' ', '-')}"]`)).toBeVisible();
      }

      // Test Overview tab
      await page.click('[data-testid="analytics-tab-overview"]');
      await expect(page.locator('[data-testid="total-cards-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-cycle-time-metric"]')).toBeVisible();

      // Test Velocity tab
      await page.click('[data-testid="analytics-tab-velocity"]');
      await expect(page.locator('[data-testid="velocity-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="velocity-trend-indicator"]')).toBeVisible();

      // Test Custom Fields analytics
      await page.click('[data-testid="analytics-tab-custom-fields"]');
      await expect(page.locator('[data-testid="custom-fields-distribution-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-correlation-matrix"]')).toBeVisible();
    });

    test('should show predictive analytics and recommendations', async () => {
      await kanbanHelpers.setupAnalyticsTestData();
      
      await page.click('[data-testid="board-menu-btn"]');
      await page.click('[data-testid="analytics-dashboard-option"]');
      await page.click('[data-testid="analytics-tab-predictive"]');

      // Should show ML-based predictions
      await expect(page.locator('[data-testid="completion-prediction"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottleneck-detection"]')).toBeVisible();
      await expect(page.locator('[data-testid="capacity-recommendations"]')).toBeVisible();

      // Should show confidence intervals
      await expect(page.locator('[data-testid="prediction-confidence"]')).toContainText(/\d+% confidence/);

      // Should show actionable recommendations
      const recommendationsList = page.locator('[data-testid="recommendations-list"]');
      await expect(recommendationsList.locator('li')).toHaveCount.greaterThan(0);

      // Click on recommendation should show details
      await page.click('[data-testid="recommendation-item"]');
      await expect(page.locator('[data-testid="recommendation-details-modal"]')).toBeVisible();
    });

    test('should export analytics data', async () => {
      await kanbanHelpers.setupAnalyticsTestData();
      
      await page.click('[data-testid="board-menu-btn"]');
      await page.click('[data-testid="analytics-dashboard-option"]');

      // Test various export formats
      const exportFormats = ['PDF', 'Excel', 'CSV'];
      
      for (const format of exportFormats) {
        const downloadPromise = page.waitForEvent('download');
        
        await page.click('[data-testid="export-analytics-btn"]');
        await page.click(`[data-testid="export-${format.toLowerCase()}-option"]`);
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(new RegExp(`analytics.*\\.${format.toLowerCase()}`));
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should handle large datasets efficiently', async () => {
      // Create board with many cards and features
      await kanbanHelpers.createLargeDataset({
        cards: 100,
        customFields: 10,
        milestones: 5,
        subtasksPerCard: 5
      });

      // Board should load within reasonable time
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 5000 });
      
      // Virtual scrolling should work
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('[data-testid="virtual-scroll-container"]')).toBeVisible();

      // Search should be responsive
      await page.fill('[data-testid="search-input"]', 'test card 50');
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('[data-testid="kanban-card"]')).toHaveCount(1);

      // Filtering should be fast
      await page.click('[data-testid="filter-btn"]');
      await page.selectOption('[data-testid="priority-filter"]', 'high');
      await page.click('[data-testid="apply-filters-btn"]');
      
      // Results should appear quickly
      await expect(page.locator('[data-testid="filtered-cards"]')).toBeVisible({ timeout: 2000 });
    });

    test('should be responsive on different screen sizes', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Board should adapt to mobile layout
      await expect(page.locator('[data-testid="mobile-board-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="column"]')).toHaveCSS('width', /100%/);

      // Card detail modal should be full screen on mobile
      await kanbanHelpers.openCardDetail('User Authentication');
      await expect(page.locator('[data-testid="card-detail-modal"]')).toHaveClass(/mobile-fullscreen/);

      // Tabs should be scrollable on mobile
      await expect(page.locator('[data-testid="tab-scroll-container"]')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="tablet-board-layout"]')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="desktop-board-layout"]')).toBeVisible();
    });

    test('should handle network interruptions gracefully', async () => {
      // Simulate offline mode
      await page.context().setOffline(true);

      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Working offline');

      // Local changes should be queued
      await kanbanHelpers.openCardDetail('User Authentication');
      await page.fill('[data-testid="card-title-input"]', 'Updated While Offline');
      await page.click('[data-testid="save-card-btn"]');

      // Should show queued changes indicator
      await expect(page.locator('[data-testid="queued-changes-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="queued-changes-count"]')).toHaveText('1');

      // Restore connectivity
      await page.context().setOffline(false);

      // Should show sync indicator and apply queued changes
      await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="queued-changes-count"]')).toHaveText('0');
    });
  });
});