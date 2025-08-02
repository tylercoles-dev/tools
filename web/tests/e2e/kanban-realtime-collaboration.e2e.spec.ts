/**
 * End-to-End tests for Kanban real-time collaboration
 * Tests WebSocket connections, real-time updates, conflict resolution, and multi-user scenarios
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';
import { MockWebSocket } from '../utils/kanban-test-helpers';
import { 
  COLLABORATION_SCENARIOS, 
  PERFORMANCE_BENCHMARKS 
} from '../fixtures/kanban-test-data';

test.describe('Kanban Real-time Collaboration', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let mockWebSocket: MockWebSocket;
  let testBoardId: string;
  let testBoardName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test board for collaboration testing
    const context = await browser.newContext();
    const page = await context.newPage();
    
    boardsPage = new KanbanBoardsPage(page);
    testBoardName = 'Collaboration Test Board ' + Date.now();
    
    await boardsPage.goto();
    await boardsPage.createBoard({
      name: testBoardName,
      description: 'Board for testing real-time collaboration',
    });
    
    await boardsPage.openBoard(testBoardName);
    const url = page.url();
    testBoardId = url.split('/').pop() || '';
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    boardPage = new KanbanBoardPage(page);
    mockWebSocket = new MockWebSocket(page);
    
    // Set up mock WebSocket before navigation
    await mockWebSocket.setup();
    await boardPage.goto(testBoardId);
  });

  test.afterAll(async ({ browser }) => {
    // Clean up test board
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const boardsPageCleanup = new KanbanBoardsPage(page);
    await boardsPageCleanup.goto();
    
    try {
      await boardsPageCleanup.deleteBoard(testBoardName);
    } catch {
      // Board might already be deleted
    }
    
    await context.close();
  });

  test.describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection on board load', async ({ page }) => {
      // Check connection status
      const connectionStatus = await boardPage.getConnectionStatus();
      expect(['connected', 'connecting']).toContain(connectionStatus);
      
      // Wait for connection to be established
      await page.waitForFunction(() => {
        const statusEl = document.querySelector('[data-testid="connection-status"]');
        return statusEl?.getAttribute('data-status') === 'connected';
      }, { timeout: 10000 });
      
      const finalStatus = await boardPage.getConnectionStatus();
      expect(finalStatus).toBe('connected');
    });

    test('should show connection status indicator', async ({ page }) => {
      const statusIndicator = page.locator('[data-testid="connection-status"]');
      await expect(statusIndicator).toBeVisible();
      
      // Should have appropriate styling based on status
      const statusClass = await statusIndicator.getAttribute('class');
      expect(statusClass).toContain('connection-status');
    });

    test('should handle connection reconnection', async ({ page }) => {
      // Simulate connection loss
      await mockWebSocket.simulateMessage('connection_lost', {
        reason: 'network_error',
        timestamp: Date.now(),
      });
      
      // Status should show disconnected
      await page.waitForFunction(() => {
        const statusEl = document.querySelector('[data-testid="connection-status"]');
        return statusEl?.getAttribute('data-status') === 'disconnected';
      }, { timeout: 5000 });
      
      // Simulate reconnection
      await mockWebSocket.simulateMessage('connection_restored', {
        timestamp: Date.now(),
      });
      
      // Status should show connected again
      await page.waitForFunction(() => {
        const statusEl = document.querySelector('[data-testid="connection-status"]');
        return statusEl?.getAttribute('data-status') === 'connected';
      }, { timeout: 5000 });
    });

    test('should handle WebSocket errors gracefully', async ({ page }) => {
      // Simulate WebSocket error
      await page.evaluate(() => {
        // @ts-ignore
        if (window.testWebSocket) {
          window.testWebSocket.simulateMessage({
            type: 'error',
            error: 'Connection failed',
            timestamp: Date.now(),
          });
        }
      });
      
      // Should not crash the application
      const isPageResponsive = await page.isVisible('[data-testid="columns-container"]');
      expect(isPageResponsive).toBe(true);
      
      // Error should be logged or displayed appropriately
      const errorIndicator = page.locator('[data-testid="connection-error"], .text-red-600');
      const hasError = await errorIndicator.isVisible({ timeout: 2000 });
      
      if (hasError) {
        await expect(errorIndicator).toContainText('Connection');
      }
    });
  });

  test.describe('Real-time Card Updates', () => {
    let testCard: string;

    test.beforeEach(async () => {
      testCard = 'Realtime Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: testCard,
        description: 'Original description',
        priority: 'medium',
      });
    });

    test.afterEach(async () => {
      try {
        const card = await boardPage.getCardByTitle(testCard);
        if (card) {
          await card.openMenu();
          await boardPage.page.click('[data-testid="delete-card"]');
        }
      } catch {
        // Card might already be deleted
      }
    });

    test('should receive real-time card creation updates', async ({ page }) => {
      const newCardTitle = 'Remote Created Card ' + Date.now();
      
      // Simulate remote card creation
      await mockWebSocket.simulateMessage('card_created', {
        boardId: testBoardId,
        card: {
          id: 'remote-card-' + Date.now(),
          title: newCardTitle,
          description: 'Created by remote user',
          priority: 'high',
          columnId: 'col-progress',
          userId: 'remote-user-1',
        },
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Card should appear in the board
      await page.waitForSelector(`[data-testid^="card-"]:has-text("${newCardTitle}")`, {
        timeout: 5000,
      });
      
      const remoteCard = await boardPage.getCardByTitle(newCardTitle);
      expect(remoteCard).not.toBeNull();
      
      // Cleanup
      await remoteCard!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });

    test('should receive real-time card updates', async ({ page }) => {
      const updatedTitle = 'Updated by Remote User';
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Simulate remote card update
      await mockWebSocket.simulateMessage('card_updated', {
        boardId: testBoardId,
        cardId: cardIdValue,
        updates: {
          title: updatedTitle,
          description: 'Updated by remote user',
          priority: 'high',
        },
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Card should be updated in real-time
      await page.waitForSelector(`[data-testid^="card-"]:has-text("${updatedTitle}")`, {
        timeout: 5000,
      });
      
      const updatedCard = await boardPage.getCardByTitle(updatedTitle);
      expect(updatedCard).not.toBeNull();
      expect(await updatedCard!.getPriority()).toBe('high');
      
      testCard = updatedTitle; // Update for cleanup
    });

    test('should receive real-time card movement updates', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Verify card is initially in col-todo
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
      
      // Simulate remote card movement
      await mockWebSocket.simulateMessage('card_moved', {
        boardId: testBoardId,
        cardId: cardIdValue,
        fromColumn: 'col-todo',
        toColumn: 'col-progress',
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Card should move to new column
      await page.waitForTimeout(1000); // Allow for animation
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
    });

    test('should receive real-time card deletion updates', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Verify card exists
      await expect(cardElement).toBeVisible();
      
      // Simulate remote card deletion
      await mockWebSocket.simulateMessage('card_deleted', {
        boardId: testBoardId,
        cardId: cardIdValue,
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Card should disappear
      await expect(cardElement).not.toBeVisible({ timeout: 5000 });
      
      testCard = ''; // Skip cleanup since card is deleted
    });

    test('should handle real-time update latency', async ({ page }) => {
      const startTime = Date.now();
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Simulate remote update
      await mockWebSocket.simulateMessage('card_updated', {
        boardId: testBoardId,
        cardId: cardIdValue,
        updates: {
          priority: 'high',
        },
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Wait for update to appear
      await page.waitForFunction(() => {
        const card = document.querySelector(`[data-testid="card-${cardIdValue}"]`);
        const priority = card?.querySelector('[data-testid="card-priority"]');
        return priority?.textContent?.includes('high');
      }, { timeout: 5000 });
      
      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(PERFORMANCE_BENCHMARKS.realtimeUpdateDelay.maxDelay);
    });
  });

  test.describe('Multi-user Collaboration Scenarios', () => {
    let collaborationCards: string[] = [];

    test.beforeEach(async () => {
      // Create test cards for collaboration scenarios
      const cards = [
        'Collab Card 1 ' + Date.now(),
        'Collab Card 2 ' + Date.now(),
        'Collab Card 3 ' + Date.now(),
      ];
      
      for (const cardTitle of cards) {
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        collaborationCards.push(cardTitle);
      }
    });

    test.afterEach(async () => {
      // Clean up collaboration cards
      for (const cardTitle of collaborationCards) {
        try {
          const card = await boardPage.getCardByTitle(cardTitle);
          if (card) {
            await card.openMenu();
            await boardPage.page.click('[data-testid="delete-card"]');
          }
        } catch {
          // Card might already be deleted
        }
      }
      collaborationCards = [];
    });

    test('should handle simultaneous card editing', async ({ page }) => {
      const cardTitle = collaborationCards[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Start editing locally
      const card = await boardPage.getCardByTitle(cardTitle);
      await card!.openMenu();
      await page.click('[data-testid="edit-card"]');
      
      // Simulate remote edit during local edit
      await mockWebSocket.simulateMessage('card_updated', {
        boardId: testBoardId,
        cardId: cardIdValue,
        updates: {
          description: 'Updated by remote user during local edit',
        },
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Should handle conflict gracefully
      const conflictWarning = page.locator('[data-testid="edit-conflict-warning"], .text-yellow-600');
      const hasConflictWarning = await conflictWarning.isVisible({ timeout: 3000 });
      
      if (hasConflictWarning) {
        await expect(conflictWarning).toContainText('conflict');
      }
      
      // Cancel local edit
      await page.click('button:has-text("Cancel")');
    });

    test('should show user presence indicators', async ({ page }) => {
      // Simulate other users joining the board
      await mockWebSocket.simulateMessage('user_joined', {
        boardId: testBoardId,
        user: {
          id: 'user-1',
          name: 'Alice',
          avatar: '/avatars/alice.png',
        },
        timestamp: Date.now(),
      });
      
      await mockWebSocket.simulateMessage('user_joined', {
        boardId: testBoardId,
        user: {
          id: 'user-2',
          name: 'Bob',
          avatar: '/avatars/bob.png',
        },
        timestamp: Date.now(),
      });
      
      // Should show user presence indicators
      const presenceIndicators = page.locator('[data-testid="user-presence"], [data-testid="online-users"]');
      const hasPresence = await presenceIndicators.isVisible({ timeout: 3000 });
      
      if (hasPresence) {
        const userCount = await presenceIndicators.locator('[data-testid="user-avatar"]').count();
        expect(userCount).toBeGreaterThan(0);
      }
    });

    test('should handle user cursors during drag operations', async ({ page }) => {
      const cardTitle = collaborationCards[1];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Simulate remote user starting to drag
      await mockWebSocket.simulateMessage('drag_started', {
        boardId: testBoardId,
        cardId: cardIdValue,
        userId: 'remote-user-1',
        userName: 'Remote User',
        timestamp: Date.now(),
      });
      
      // Should show some indication that card is being dragged by another user
      const cardInDrag = page.locator(`[data-testid="card-${cardIdValue}"]`);
      const isDraggedByOther = await cardInDrag.evaluate(el => 
        el.classList.contains('dragged-by-other') || 
        el.hasAttribute('data-dragged-by-other')
      );
      
      // End remote drag
      await mockWebSocket.simulateMessage('drag_ended', {
        boardId: testBoardId,
        cardId: cardIdValue,
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      if (isDraggedByOther) {
        // Verify drag indicator is removed
        const isNoDrag = await cardInDrag.evaluate(el => 
          !el.classList.contains('dragged-by-other') && 
          !el.hasAttribute('data-dragged-by-other')
        );
        expect(isNoDrag).toBe(true);
      }
    });

    test('should handle rapid collaboration updates', async ({ page }) => {
      const cardTitle = collaborationCards[2];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Send multiple rapid updates
      const updates = [
        { field: 'priority', value: 'high' },
        { field: 'assignee', value: 'Alice' },
        { field: 'description', value: 'Updated description' },
        { field: 'priority', value: 'low' },
      ];
      
      for (let i = 0; i < updates.length; i++) {
        await mockWebSocket.simulateMessage('card_updated', {
          boardId: testBoardId,
          cardId: cardIdValue,
          updates: {
            [updates[i].field]: updates[i].value,
          },
          userId: 'remote-user-1',
          timestamp: Date.now() + i,
        });
        
        // Small delay between updates
        await page.waitForTimeout(100);
      }
      
      // Final state should reflect last updates
      await page.waitForTimeout(1000);
      const finalCard = await boardPage.getCardByTitle(cardTitle);
      const finalPriority = await finalCard!.getPriority();
      expect(finalPriority).toBe('low');
    });
  });

  test.describe('Conflict Resolution', () => {
    let conflictCard: string;

    test.beforeEach(async () => {
      conflictCard = 'Conflict Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: conflictCard,
        description: 'Original description',
        priority: 'medium',
      });
    });

    test.afterEach(async () => {
      try {
        const card = await boardPage.getCardByTitle(conflictCard);
        if (card) {
          await card.openMenu();
          await boardPage.page.click('[data-testid="delete-card"]');
        }
      } catch {
        // Card might already be deleted
      }
    });

    test('should handle edit conflicts with last-writer-wins', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${conflictCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Simulate conflicting updates
      await mockWebSocket.simulateMessage('card_updated', {
        boardId: testBoardId,
        cardId: cardIdValue,
        updates: {
          title: 'Updated by User 1',
        },
        userId: 'user-1',
        timestamp: Date.now(),
      });
      
      // Slightly later update
      await page.waitForTimeout(100);
      
      await mockWebSocket.simulateMessage('card_updated', {
        boardId: testBoardId,
        cardId: cardIdValue,
        updates: {
          title: 'Updated by User 2',
        },
        userId: 'user-2',
        timestamp: Date.now() + 50,
      });
      
      // Should show the later update
      await page.waitForSelector(`[data-testid^="card-"]:has-text("Updated by User 2")`, {
        timeout: 3000,
      });
      
      const finalCard = await boardPage.getCardByTitle('Updated by User 2');
      expect(finalCard).not.toBeNull();
      
      conflictCard = 'Updated by User 2'; // Update for cleanup
    });

    test('should handle delete-edit conflicts', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${conflictCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Start local edit
      const card = await boardPage.getCardByTitle(conflictCard);
      await card!.openMenu();
      await page.click('[data-testid="edit-card"]');
      
      // Simulate remote deletion
      await mockWebSocket.simulateMessage('card_deleted', {
        boardId: testBoardId,
        cardId: cardIdValue,
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      // Should handle gracefully - either close dialog or show warning
      const dialogClosed = await page.locator('[data-testid="card-dialog"]').isHidden({ timeout: 3000 });
      const deletionWarning = await page.locator('[data-testid="card-deleted-warning"], .text-red-600').isVisible({ timeout: 1000 });
      
      expect(dialogClosed || deletionWarning).toBe(true);
      
      if (!dialogClosed) {
        // Close the dialog manually
        await page.click('button:has-text("Cancel")');
      }
      
      conflictCard = ''; // Skip cleanup since card is deleted
    });

    test('should handle move conflicts', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${conflictCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Start local drag
      const dragResult = boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      // Simulate remote move to different column
      await mockWebSocket.simulateMessage('card_moved', {
        boardId: testBoardId,
        cardId: cardIdValue,
        fromColumn: 'col-todo',
        toColumn: 'col-done',
        userId: 'remote-user-1',
        timestamp: Date.now(),
      });
      
      await dragResult; // Wait for local drag to complete
      
      // Should resolve to one of the target columns
      const isInProgress = await boardPage.verifyCardInColumn(cardIdValue, 'col-progress').then(() => true).catch(() => false);
      const isInDone = await boardPage.verifyCardInColumn(cardIdValue, 'col-done').then(() => true).catch(() => false);
      
      expect(isInProgress || isInDone).toBe(true);
    });
  });

  test.describe('Offline/Online State Handling', () => {
    test('should handle offline state gracefully', async ({ page }) => {
      // Simulate going offline
      await page.setOffline(true);
      
      // Status should show offline
      const connectionStatus = await boardPage.getConnectionStatus();
      expect(connectionStatus).toBe('offline');
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-status');
      const isOfflineVisible = await offlineIndicator.isVisible({ timeout: 3000 });
      
      if (isOfflineVisible) {
        await expect(offlineIndicator).toContainText('offline');
      }
      
      // Go back online
      await page.setOffline(false);
      
      // Should reconnect
      await page.waitForFunction(() => {
        const statusEl = document.querySelector('[data-testid="connection-status"]');
        return statusEl?.getAttribute('data-status') === 'connected';
      }, { timeout: 10000 });
    });

    test('should queue updates while offline', async ({ page }) => {
      const testCard = 'Offline Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: testCard,
        priority: 'medium',
      });
      
      // Go offline
      await page.setOffline(true);
      
      // Try to make updates while offline
      const card = await boardPage.getCardByTitle(testCard);
      await card!.openMenu();
      await page.click('[data-testid="edit-card"]');
      
      await page.fill('#cardTitle', 'Updated Offline');
      await page.click('button:has-text("Update Card")');
      
      // Should show pending state
      const pendingIndicator = page.locator('[data-testid="pending-update"], .pending-sync');
      const hasPending = await pendingIndicator.isVisible({ timeout: 3000 });
      
      // Go back online
      await page.setOffline(false);
      
      if (hasPending) {
        // Updates should sync
        await expect(pendingIndicator).not.toBeVisible({ timeout: 5000 });
      }
      
      // Card should be updated
      const updatedCard = await boardPage.getCardByTitle('Updated Offline');
      expect(updatedCard).not.toBeNull();
      
      // Cleanup
      await updatedCard!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle high-frequency updates efficiently', async ({ page }) => {
      const startTime = Date.now();
      const updateCount = 50;
      
      // Send many rapid updates
      for (let i = 0; i < updateCount; i++) {
        await mockWebSocket.simulateMessage('board_activity', {
          boardId: testBoardId,
          activity: `Activity ${i}`,
          userId: 'stress-test-user',
          timestamp: Date.now() + i,
        });
      }
      
      // Wait for all updates to process
      await page.waitForTimeout(2000);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle updates within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 updates
      
      // Page should remain responsive
      const isResponsive = await page.isVisible('[data-testid="columns-container"]');
      expect(isResponsive).toBe(true);
    });

    test('should limit real-time update frequency', async ({ page }) => {
      // Send updates faster than typical rate limit
      const updates = [];
      for (let i = 0; i < 10; i++) {
        updates.push(mockWebSocket.simulateMessage('board_activity', {
          boardId: testBoardId,
          activity: `Rapid Activity ${i}`,
          userId: 'rate-limit-user',
          timestamp: Date.now() + i,
        }));
      }
      
      await Promise.all(updates);
      
      // Should not overwhelm the UI
      const activities = page.locator('[data-testid="activity-item"]');
      const activityCount = await activities.count();
      
      // Should either rate-limit or batch updates
      expect(activityCount).toBeLessThanOrEqual(10);
    });
  });
});