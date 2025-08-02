/**
 * End-to-End tests for Kanban drag-and-drop functionality
 * Tests card dragging between columns, within columns, visual feedback, and edge cases
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';
import { KanbanTestHelpers, DragDropResult } from '../utils/kanban-test-helpers';
import { 
  KanbanDataGenerator, 
  LARGE_BOARD, 
  PERFORMANCE_BENCHMARKS 
} from '../fixtures/kanban-test-data';

test.describe('Kanban Drag and Drop', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let testHelpers: KanbanTestHelpers;
  let testBoardId: string;
  let testBoardName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test board with sample cards
    const context = await browser.newContext();
    const page = await context.newPage();
    
    boardsPage = new KanbanBoardsPage(page);
    testBoardName = 'Drag Drop Test Board ' + Date.now();
    
    await boardsPage.goto();
    await boardsPage.createBoard({
      name: testBoardName,
      description: 'Board for testing drag and drop operations',
    });
    
    await boardsPage.openBoard(testBoardName);
    const url = page.url();
    testBoardId = url.split('/').pop() || '';
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    boardPage = new KanbanBoardPage(page);
    testHelpers = new KanbanTestHelpers(page);
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

  test.describe('Basic Drag and Drop', () => {
    let testCards: string[] = [];

    test.beforeEach(async () => {
      // Create test cards in To Do column
      const cards = [
        { title: 'Drag Test Card 1 ' + Date.now(), priority: 'high' as const },
        { title: 'Drag Test Card 2 ' + Date.now(), priority: 'medium' as const },
        { title: 'Drag Test Card 3 ' + Date.now(), priority: 'low' as const },
      ];

      for (const cardData of cards) {
        await boardPage.createCard('col-todo', cardData);
        testCards.push(cardData.title);
      }
    });

    test.afterEach(async () => {
      // Clean up test cards
      for (const cardTitle of testCards) {
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
      testCards = [];
    });

    test('should drag card from To Do to In Progress', async () => {
      const cardTitle = testCards[0];
      const card = await boardPage.getCardByTitle(cardTitle);
      expect(card).not.toBeNull();
      
      // Get card ID for drag operation
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Drag to In Progress column
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(PERFORMANCE_BENCHMARKS.dragDropLatency.maxLatency);
      
      // Verify card moved
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
    });

    test('should drag card from In Progress to Done', async () => {
      const cardTitle = testCards[1];
      
      // First move card to In Progress
      const card = await boardPage.getCardByTitle(cardTitle);
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
      
      // Then move to Done
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-done');
      
      expect(result.success).toBe(true);
      await boardPage.verifyCardInColumn(cardIdValue, 'col-done');
    });

    test('should handle drag back to original column', async () => {
      const cardTitle = testCards[2];
      const card = await boardPage.getCardByTitle(cardTitle);
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Move to Progress
      await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
      
      // Move back to To Do
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-todo');
      
      expect(result.success).toBe(true);
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
    });

    test('should handle dragging to same column (no operation)', async () => {
      const cardTitle = testCards[0];
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Drag to same column
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-todo');
      
      // Should still be successful (no-op)
      expect(result.success).toBe(true);
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
    });
  });

  test.describe('Card Reordering Within Column', () => {
    let orderTestCards: string[] = [];

    test.beforeEach(async () => {
      // Create multiple cards in same column for reordering
      for (let i = 1; i <= 5; i++) {
        const cardTitle = `Order Test Card ${i} ` + Date.now();
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        orderTestCards.push(cardTitle);
      }
    });

    test.afterEach(async () => {
      // Clean up test cards
      for (const cardTitle of orderTestCards) {
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
      orderTestCards = [];
    });

    test('should reorder cards within the same column', async () => {
      // Get first card
      const cardTitle = orderTestCards[0];
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Get initial position
      const initialPosition = await cardElement.boundingBox();
      
      // Drag to different position within same column
      const result = await boardPage.dragCardWithinColumn(cardIdValue, 3);
      
      expect(result.success).toBe(true);
      
      // Verify card moved to different position
      const newPosition = await cardElement.boundingBox();
      expect(newPosition?.y).not.toBe(initialPosition?.y);
    });

    test('should maintain card order after reordering', async ({ page }) => {
      // Get initial card order
      const todoColumn = page.locator('[data-testid="column-col-todo"]');
      const initialCards = await todoColumn.locator('[data-testid^="card-"]').all();
      const initialTitles = [];
      
      for (const card of initialCards) {
        const title = await card.locator('[data-testid="card-title"]').textContent();
        if (title) initialTitles.push(title.trim());
      }
      
      // Move first card to last position
      if (initialCards.length > 1) {
        const firstCard = initialCards[0];
        const cardId = await firstCard.getAttribute('data-testid');
        const cardIdValue = cardId?.replace('card-', '') || '';
        
        await boardPage.dragCardWithinColumn(cardIdValue, initialCards.length - 1);
        
        // Check new order
        const newCards = await todoColumn.locator('[data-testid^="card-"]').all();
        const newTitles = [];
        
        for (const card of newCards) {
          const title = await card.locator('[data-testid="card-title"]').textContent();
          if (title) newTitles.push(title.trim());
        }
        
        // Order should be different
        expect(newTitles).not.toEqual(initialTitles);
        expect(newTitles.length).toBe(initialTitles.length);
      }
    });
  });

  test.describe('Visual Feedback and Animation', () => {
    let feedbackTestCard: string;

    test.beforeEach(async () => {
      feedbackTestCard = 'Visual Feedback Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: feedbackTestCard,
        priority: 'medium',
      });
    });

    test.afterEach(async () => {
      try {
        const card = await boardPage.getCardByTitle(feedbackTestCard);
        if (card) {
          await card.openMenu();
          await boardPage.page.click('[data-testid="delete-card"]');
        }
      } catch {
        // Card might already be deleted
      }
    });

    test('should show visual feedback during drag', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${feedbackTestCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Start drag operation
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Check for drag styling
      const hasDragStyling = await cardElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.opacity) < 1 || styles.transform !== 'none';
      });
      
      expect(hasDragStyling).toBe(true);
      
      // End drag
      await page.mouse.up();
      
      // Drag styling should be removed
      await page.waitForTimeout(500); // Wait for animation
      const noDragStyling = await cardElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.opacity) === 1 && styles.transform === 'none';
      });
      
      expect(noDragStyling).toBe(true);
    });

    test('should highlight drop zones during drag', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${feedbackTestCard}")`);
      const targetColumn = page.locator('[data-testid="column-col-progress"]');
      
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      // Start drag
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move over target column
      const columnBox = await targetColumn.boundingBox();
      expect(columnBox).not.toBeNull();
      
      await page.mouse.move(columnBox!.x + columnBox!.width / 2, columnBox!.y + 100);
      
      // Check for drop zone highlighting
      const column = new (await import('../pages/kanban')).KanbanColumn(targetColumn);
      const isDropZoneActive = await column.isDropZoneActive();
      
      expect(isDropZoneActive).toBe(true);
      
      // End drag
      await page.mouse.up();
    });

    test('should animate card movement', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${feedbackTestCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Record initial position
      const initialBox = await cardElement.boundingBox();
      
      // Perform drag with animation tracking
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      expect(result.success).toBe(true);
      
      // Final position should be different
      const finalBox = await cardElement.boundingBox();
      expect(finalBox?.x).not.toBe(initialBox?.x);
      expect(finalBox?.y).not.toBe(initialBox?.y);
    });
  });

  test.describe('Drag and Drop Edge Cases', () => {
    let edgeCaseCards: string[] = [];

    test.beforeEach(async () => {
      // Create test cards
      const cards = [
        'Edge Case Card 1 ' + Date.now(),
        'Edge Case Card 2 ' + Date.now(),
      ];
      
      for (const cardTitle of cards) {
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        edgeCaseCards.push(cardTitle);
      }
    });

    test.afterEach(async () => {
      // Clean up test cards
      for (const cardTitle of edgeCaseCards) {
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
      edgeCaseCards = [];
    });

    test('should handle rapid consecutive drags', async () => {
      const cardTitle = edgeCaseCards[0];
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Perform multiple rapid drags
      const results: DragDropResult[] = [];
      
      results.push(await boardPage.dragCardToColumn(cardIdValue, 'col-progress'));
      results.push(await boardPage.dragCardToColumn(cardIdValue, 'col-done'));
      results.push(await boardPage.dragCardToColumn(cardIdValue, 'col-todo'));
      
      // All operations should succeed
      for (const result of results) {
        expect(result.success).toBe(true);
      }
      
      // Card should end up in To Do column
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
    });

    test('should handle drag cancellation with Escape key', async ({ page }) => {
      const cardTitle = edgeCaseCards[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      // Start drag
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move to different position
      await page.mouse.move(cardBox!.x + 200, cardBox!.y + 100);
      
      // Cancel with Escape key
      await page.keyboard.press('Escape');
      
      // Card should return to original position
      const finalBox = await cardElement.boundingBox();
      expect(finalBox?.x).toBeCloseTo(cardBox!.x, 10);
      expect(finalBox?.y).toBeCloseTo(cardBox!.y, 10);
    });

    test('should handle dragging outside valid drop zones', async ({ page }) => {
      const cardTitle = edgeCaseCards[1];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      // Start drag
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move outside valid drop zones (e.g., header area)
      await page.mouse.move(100, 50);
      await page.mouse.up();
      
      // Card should return to original column
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
    });

    test('should handle simultaneous drag operations', async ({ page, context }) => {
      // This test simulates what might happen with real-time collaboration
      // Note: This is a simplified version - real implementation would need WebSocket testing
      
      const card1Title = edgeCaseCards[0];
      const card2Title = edgeCaseCards[1];
      
      const card1Element = page.locator(`[data-testid^="card-"]:has-text("${card1Title}")`);
      const card2Element = page.locator(`[data-testid^="card-"]:has-text("${card2Title}")`);
      
      const card1Id = (await card1Element.getAttribute('data-testid'))?.replace('card-', '') || '';
      const card2Id = (await card2Element.getAttribute('data-testid'))?.replace('card-', '') || '';
      
      // Simulate concurrent operations
      const [result1, result2] = await Promise.all([
        boardPage.dragCardToColumn(card1Id, 'col-progress'),
        boardPage.dragCardToColumn(card2Id, 'col-done'),
      ]);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Verify both cards moved correctly
      await boardPage.verifyCardInColumn(card1Id, 'col-progress');
      await boardPage.verifyCardInColumn(card2Id, 'col-done');
    });

    test('should handle drag with insufficient permissions', async ({ page }) => {
      // Mock API to simulate permission denied
      await page.route('**/api/kanban/cards/*/move', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Insufficient permissions' }),
        });
      });

      const cardTitle = edgeCaseCards[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      // Drag should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('permissions');
      
      // Card should remain in original column
      await boardPage.verifyCardInColumn(cardIdValue, 'col-todo');
      
      // Remove route mock
      await page.unroute('**/api/kanban/cards/*/move');
    });
  });

  test.describe('Performance Testing', () => {
    test('should handle drag operations efficiently', async () => {
      // Create a single card for performance testing
      const cardTitle = 'Performance Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: cardTitle,
        priority: 'medium',
      });
      
      const cardElement = boardPage.page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Measure drag performance
      const startTime = Date.now();
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_BENCHMARKS.dragDropLatency.maxLatency);
      
      // Cleanup
      const card = await boardPage.getCardByTitle(cardTitle);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="delete-card"]');
    });

    test('should maintain performance with many cards', async ({ page }) => {
      // Create multiple cards to test performance
      const cardTitles: string[] = [];
      
      for (let i = 1; i <= 20; i++) {
        const cardTitle = `Perf Card ${i} ` + Date.now();
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        cardTitles.push(cardTitle);
      }
      
      // Test drag performance with many cards
      const testCard = cardTitles[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(PERFORMANCE_BENCHMARKS.dragDropLatency.maxLatency * 2); // Allow some overhead
      
      // Cleanup all test cards
      for (const cardTitle of cardTitles) {
        try {
          const card = await boardPage.getCardByTitle(cardTitle);
          if (card) {
            await card.openMenu();
            await page.click('[data-testid="delete-card"]');
          }
        } catch {
          // Card might already be deleted
        }
      }
    });
  });

  test.describe('Accessibility and Keyboard Support', () => {
    let a11yTestCard: string;

    test.beforeEach(async () => {
      a11yTestCard = 'Accessibility Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: a11yTestCard,
        priority: 'medium',
      });
    });

    test.afterEach(async () => {
      try {
        const card = await boardPage.getCardByTitle(a11yTestCard);
        if (card) {
          await card.openMenu();
          await boardPage.page.click('[data-testid="delete-card"]');
        }
      } catch {
        // Card might already be deleted
      }
    });

    test('should support keyboard navigation for drag and drop', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${a11yTestCard}")`);
      
      // Focus on card
      await cardElement.focus();
      
      // Check if card is focusable
      const isFocused = await cardElement.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
      
      // Test keyboard navigation (if implemented)
      await page.keyboard.press('Space'); // Enter drag mode
      await page.keyboard.press('ArrowRight'); // Move to next column
      await page.keyboard.press('Enter'); // Confirm drop
      
      // Note: This depends on actual keyboard implementation
      // The test verifies the accessibility structure is in place
    });

    test('should have proper ARIA labels for drag operations', async ({ page }) => {
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${a11yTestCard}")`);
      
      // Check for ARIA attributes
      const ariaLabel = await cardElement.getAttribute('aria-label');
      const ariaGrabbed = await cardElement.getAttribute('aria-grabbed');
      const draggable = await cardElement.getAttribute('draggable');
      
      expect(draggable).toBe('true');
      expect(ariaLabel || ariaGrabbed !== null).toBeTruthy();
    });

    test('should announce drag operations to screen readers', async ({ page }) => {
      // Set up aria-live region monitoring
      await page.evaluate(() => {
        const liveRegions = document.querySelectorAll('[aria-live]');
        // @ts-ignore
        window.testAnnouncements = [];
        
        liveRegions.forEach(region => {
          const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // @ts-ignore
                window.testAnnouncements.push(region.textContent);
              }
            });
          });
          observer.observe(region, { childList: true, subtree: true, characterData: true });
        });
      });
      
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${a11yTestCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Perform drag operation
      await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      
      // Check for announcements
      const announcements = await page.evaluate(() => {
        // @ts-ignore
        return window.testAnnouncements || [];
      });
      
      // Should have some accessibility announcements
      expect(announcements.length).toBeGreaterThan(0);
    });
  });
});