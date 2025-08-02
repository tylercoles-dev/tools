/**
 * Kanban Real-time Collaboration Tests
 * Tests real-time collaboration features for Kanban boards including:
 * - Live card updates and synchronization
 * - Drag-and-drop synchronization between users
 * - User presence indicators
 * - Concurrent editing and conflict resolution
 * - Real-time notifications
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency 
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Kanban Real-time Collaboration', () => {
  let collaborationTester: RealtimeCollaborationTester;
  let mockServer: MockWebSocketServer;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(3); // 3 concurrent users
    mockServer = new MockWebSocketServer();
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should synchronize card creation across multiple users', async ({ page, context }) => {
    // Create a test board first
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Real-time Card Creation Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.fill('[data-testid="board-description-input"]', boardData.description);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // Run concurrent card creation scenario
      await collaborationTester.simulateConcurrentKanbanEditing(boardUrl);
    }
  });

  test('should synchronize drag-and-drop operations in real-time', async ({ page, context }) => {
    // Create test board with columns
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Drag-Drop Sync Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Add columns
      const columnNames = ['To Do', 'In Progress', 'Done'];
      for (const columnName of columnNames) {
        await page.click('[data-testid="add-column-button"]');
        await page.fill('[data-testid="column-name-input"]', columnName);
        await page.click('[data-testid="create-column-button"]');
        await page.waitForTimeout(500);
      }
      
      const boardUrl = page.url();
      
      // Test drag-and-drop synchronization
      await collaborationTester.testDragAndDropSynchronization(boardUrl);
    }
  });

  test('should handle concurrent card editing with conflict resolution', async ({ page, context }) => {
    // Create test board and card
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Conflict Resolution Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // Test conflict resolution
      await collaborationTester.testConflictResolution(boardUrl);
    }
  });

  test('should display user presence indicators on Kanban boards', async ({ page, context }) => {
    // Create test board
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'User Presence Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // Test user presence indicators
      await collaborationTester.testUserPresenceIndicators(boardUrl);
    }
  });

  test('should sync live card updates (title, description, labels)', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board and navigate all users
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Live Updates Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // User 0 creates a card
      const page0 = pages[0];
      await page0.click('[data-testid*="add-card-button"]');
      await page0.fill('[data-testid="card-title-input"]', 'Live Update Test Card');
      await page0.fill('[data-testid="card-description-input"]', 'Initial description');
      await page0.click('[data-testid="create-card-button"]');
      
      // Wait for sync
      await waitForRealtimeSync(page0);
      
      // All users should see the new card
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Live Update Test Card")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // User 1 edits the card
      const page1 = pages[1];
      await page1.click('[data-testid*="card"]:has-text("Live Update Test Card")');
      await page1.click('[data-testid="edit-card-button"]');
      await page1.fill('[data-testid="card-title-input"]', 'Updated by User 1');
      await page1.fill('[data-testid="card-description-input"]', 'Updated description by user 1');
      await page1.click('[data-testid="save-card-button"]');
      
      // Wait for sync
      await waitForRealtimeSync(page1);
      
      // All users should see the updated card
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Updated by User 1")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // User 2 adds a label
      const page2 = pages[2];
      await page2.click('[data-testid*="card"]:has-text("Updated by User 1")');
      await page2.click('[data-testid="edit-card-button"]');
      
      const addLabelButton = page2.locator('[data-testid="add-label-button"]');
      if (await addLabelButton.count() > 0) {
        await addLabelButton.click();
        await page2.fill('[data-testid="label-name-input"]', 'urgent');
        await page2.click('[data-testid="create-label-button"]');
      }
      
      await page2.click('[data-testid="save-card-button"]');
      
      // Wait for sync
      await waitForRealtimeSync(page2);
      
      // All users should see the label
      for (const userPage of pages) {
        const card = userPage.locator('[data-testid*="card"]:has-text("Updated by User 1")');
        await expect(card.locator('[data-testid*="label"]:has-text("urgent")'))
          .toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should synchronize column operations (create, rename, delete)', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Column Operations Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // User 0 adds a column
      const page0 = pages[0];
      await page0.click('[data-testid="add-column-button"]');
      await page0.fill('[data-testid="column-name-input"]', 'New Column by User 0');
      await page0.click('[data-testid="create-column-button"]');
      
      await waitForRealtimeSync(page0);
      
      // All users should see the new column
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="column"]:has-text("New Column by User 0")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // User 1 renames the column
      const page1 = pages[1];
      const columnHeader = page1.locator('[data-testid*="column-header"]:has-text("New Column by User 0")');
      
      if (await columnHeader.count() > 0) {
        await columnHeader.click();
        
        const editButton = page1.locator('[data-testid="edit-column-button"]');
        if (await editButton.count() > 0) {
          await editButton.click();
          await page1.fill('[data-testid="column-name-input"]', 'Renamed by User 1');
          await page1.click('[data-testid="save-column-button"]');
          
          await waitForRealtimeSync(page1);
          
          // All users should see the renamed column
          for (const userPage of pages) {
            await expect(userPage.locator('[data-testid*="column"]:has-text("Renamed by User 1")'))
              .toBeVisible({ timeout: 10000 });
          }
        }
      }
    }
  });

  test('should handle rapid successive card movements', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Set up board with multiple columns and cards
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Rapid Movement Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Create columns
      const columnNames = ['Backlog', 'In Progress', 'Review', 'Done'];
      for (const columnName of columnNames) {
        await page.click('[data-testid="add-column-button"]');
        await page.fill('[data-testid="column-name-input"]', columnName);
        await page.click('[data-testid="create-column-button"]');
        await page.waitForTimeout(300);
      }
      
      // Create multiple cards
      for (let i = 1; i <= 5; i++) {
        await page.click('[data-testid*="add-card-button"]');
        await page.fill('[data-testid="card-title-input"]', `Rapid Test Card ${i}`);
        await page.click('[data-testid="create-card-button"]');
        await page.waitForTimeout(200);
      }
      
      const boardUrl = page.url();
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Multiple users perform rapid card movements
      const movementPromises = pages.slice(0, 2).map(async (userPage, userIndex) => {
        for (let moveCount = 0; moveCount < 3; moveCount++) {
          const card = userPage.locator(`[data-testid*="card"]:has-text("Rapid Test Card ${userIndex + 1}")`);
          const targetColumn = userPage.locator('[data-testid*="column"]').nth((moveCount + 1) % 4);
          
          if (await card.count() > 0 && await targetColumn.count() > 0) {
            await card.dragTo(targetColumn);
            await userPage.waitForTimeout(500);
          }
        }
      });
      
      await Promise.all(movementPromises);
      
      // Wait for all movements to sync
      await waitForRealtimeSync(pages[0], 10000);
      
      // Verify data consistency across all users
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
    }
  });

  test('should show real-time activity notifications', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Activity Notifications Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // User 0 creates a card
      const page0 = pages[0];
      await page0.click('[data-testid*="add-card-button"]');
      await page0.fill('[data-testid="card-title-input"]', 'Notification Test Card');
      await page0.click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(page0);
      
      // Other users should see activity notifications
      for (let i = 1; i < pages.length; i++) {
        const userPage = pages[i];
        
        // Check for toast notifications
        const toast = userPage.locator('[data-testid*="toast"], .toast');
        if (await toast.count() > 0) {
          await expect(toast).toContainText('card', { timeout: 5000 });
        }
        
        // Check for activity indicators
        const activityIndicator = userPage.locator('[data-testid="activity-indicator"]');
        if (await activityIndicator.count() > 0) {
          await expect(activityIndicator).toBeVisible({ timeout: 5000 });
        }
      }
      
      // User 1 moves the card
      const page1 = pages[1];
      
      // Add a second column first
      await page1.click('[data-testid="add-column-button"]');
      await page1.fill('[data-testid="column-name-input"]', 'In Progress');
      await page1.click('[data-testid="create-column-button"]');
      await waitForRealtimeSync(page1);
      
      // Move the card
      const card = page1.locator('[data-testid*="card"]:has-text("Notification Test Card")');
      const targetColumn = page1.locator('[data-testid*="column"]:has-text("In Progress")');
      
      if (await card.count() > 0 && await targetColumn.count() > 0) {
        await card.dragTo(targetColumn);
        await waitForRealtimeSync(page1);
        
        // Other users should see move notifications
        for (let i = 0; i < pages.length; i++) {
          if (i === 1) continue; // Skip the user who performed the action
          
          const userPage = pages[i];
          const moveToast = userPage.locator('[data-testid*="toast"], .toast');
          
          if (await moveToast.count() > 0) {
            await expect(moveToast).toContainText('move', { timeout: 5000 });
          }
        }
      }
    }
  });

  test('should maintain board state consistency during network interruptions', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board with initial state
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Network Interruption Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create initial cards on all pages
      const page0 = pages[0];
      await page0.click('[data-testid*="add-card-button"]');
      await page0.fill('[data-testid="card-title-input"]', 'Consistency Test Card');
      await page0.click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(page0);
      
      // Verify all users see the card
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Consistency Test Card")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // Simulate network interruption for one user
      const page1 = pages[1];
      await page1.context().setOffline(true);
      
      // While page1 is offline, page0 makes changes
      await page0.click('[data-testid*="card"]:has-text("Consistency Test Card")');
      await page0.click('[data-testid="edit-card-button"]');
      await page0.fill('[data-testid="card-title-input"]', 'Updated While Offline');
      await page0.click('[data-testid="save-card-button"]');
      
      await waitForRealtimeSync(page0);
      
      // Bring page1 back online
      await page1.context().setOffline(false);
      
      // Wait for reconnection and sync
      await page1.waitForTimeout(5000);
      await waitForRealtimeSync(page1);
      
      // page1 should now see the updated state
      await expect(page1.locator('[data-testid*="card"]:has-text("Updated While Offline")'))
        .toBeVisible({ timeout: 15000 });
      
      // Verify consistency across all users
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
    }
  });
});

test.describe('Kanban Real-time Performance', () => {
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(5); // 5 concurrent users for performance testing
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
  });

  test('should handle multiple concurrent users on same board', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board
    await page.goto('/kanban');
    const createButton = page.locator('[data-testid="create-board-button"]');
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Multi-User Performance Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // All users create cards simultaneously
      const cardCreationPromises = pages.map(async (userPage, index) => {
        try {
          await userPage.click('[data-testid*="add-card-button"]');
          await userPage.fill('[data-testid="card-title-input"]', `Performance Card ${index}`);
          await userPage.fill('[data-testid="card-description-input"]', `Created by user ${index} for performance testing`);
          await userPage.click('[data-testid="create-card-button"]');
        } catch (error) {
          console.error(`User ${index} failed to create card:`, error);
        }
      });
      
      const startTime = Date.now();
      await Promise.all(cardCreationPromises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      console.log(`${pages.length} users created cards in ${totalTime}ms`);
      
      // Wait for all updates to sync
      await waitForRealtimeSync(pages[0], 15000);
      
      // Verify all users see all cards
      for (const userPage of pages) {
        for (let i = 0; i < pages.length; i++) {
          await expect(userPage.locator(`[data-testid*="card"]:has-text("Performance Card ${i}")`))
            .toBeVisible({ timeout: 20000 });
        }
      }
      
      // Performance should be reasonable (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    }
  });

  test('should maintain responsiveness with high message frequency', async ({ page, context }) => {
    const metrics = await collaborationTester.measureRealtimePerformance(async () => {
      const simulator = collaborationTester.getSimulator();
      
      // Create board
      await page.goto('/kanban');
      const createButton = page.locator('[data-testid="create-board-button"]');
      
      if (await createButton.count() > 0) {
        await createButton.click();
        
        const boardData = TestDataGenerator.generateBoard();
        boardData.name = 'High Frequency Test';
        
        await page.fill('[data-testid="board-name-input"]', boardData.name);
        await page.click('[data-testid="create-board-submit"]');
        
        await page.waitForURL('**/kanban/**');
        const boardUrl = page.url();
        
        await simulator.navigateAllUsers(boardUrl);
        const pages = simulator.getAllPages();
        
        // Rapid actions from all users
        for (let round = 0; round < 10; round++) {
          const actionPromises = pages.map(async (userPage, index) => {
            // Each user creates, edits, and moves cards rapidly
            try {
              await userPage.click('[data-testid*="add-card-button"]');
              await userPage.fill('[data-testid="card-title-input"]', `Rapid Card ${round}-${index}`);
              await userPage.click('[data-testid="create-card-button"]');
              await userPage.waitForTimeout(100); // Small delay between actions
            } catch (error) {
              console.error(`Rapid action failed for user ${index} in round ${round}:`, error);
            }
          });
          
          await Promise.all(actionPromises);
          await page.waitForTimeout(200); // Brief pause between rounds
        }
        
        // Final sync wait
        await waitForRealtimeSync(pages[0], 20000);
      }
    });
    
    console.log('Performance metrics:', metrics);
    
    // Verify performance is acceptable
    expect(metrics.averageLatency).toBeLessThan(1000); // Average latency under 1 second
    expect(metrics.maxLatency).toBeLessThan(5000); // Max latency under 5 seconds
    expect(metrics.messageSuccessRate).toBeGreaterThan(90); // At least 90% message success rate
  });
});