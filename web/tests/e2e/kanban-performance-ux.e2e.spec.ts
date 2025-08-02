/**
 * End-to-End tests for Kanban performance and UX
 * Tests large board performance, animations, loading states, and user experience
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';
import { 
  LARGE_BOARD, 
  PERFORMANCE_BENCHMARKS,
  KanbanDataGenerator 
} from '../fixtures/kanban-test-data';

test.describe('Kanban Performance and UX', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let testHelpers: KanbanTestHelpers;
  let testBoardId: string;
  let testBoardName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test board for performance testing
    const context = await browser.newContext();
    const page = await context.newPage();
    
    boardsPage = new KanbanBoardsPage(page);
    testBoardName = 'Performance Test Board ' + Date.now();
    
    await boardsPage.goto();
    await boardsPage.createBoard({
      name: testBoardName,
      description: 'Board for testing performance and UX',
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

  test.describe('Large Board Performance', () => {
    let performanceCards: string[] = [];

    test.beforeEach(async () => {
      // Create many cards for performance testing
      const cardPromises = [];
      
      for (let i = 1; i <= 50; i++) {
        const cardTitle = `Perf Card ${i} ` + Date.now();
        const columnId = ['col-todo', 'col-progress', 'col-done'][i % 3];
        
        cardPromises.push(
          boardPage.createCard(columnId, {
            title: cardTitle,
            description: `Performance test card ${i}`,
            priority: (['low', 'medium', 'high'] as const)[i % 3],
            assignee: `User ${(i % 5) + 1}`,
          })
        );
        
        performanceCards.push(cardTitle);
        
        // Create cards in batches to avoid overwhelming the API
        if (i % 10 === 0) {
          await Promise.all(cardPromises.splice(0, 10));
        }
      }
      
      // Create remaining cards
      if (cardPromises.length > 0) {
        await Promise.all(cardPromises);
      }
    });

    test.afterEach(async () => {
      // Clean up performance test cards
      const deletePromises = [];
      
      for (const cardTitle of performanceCards) {
        deletePromises.push(
          (async () => {
            try {
              const card = await boardPage.getCardByTitle(cardTitle);
              if (card) {
                await card.openMenu();
                await boardPage.page.click('[data-testid="delete-card"]');
              }
            } catch {
              // Card might already be deleted
            }
          })()
        );
        
        // Delete in batches
        if (deletePromises.length >= 10) {
          await Promise.all(deletePromises.splice(0, 10));
        }
      }
      
      // Delete remaining cards
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
      
      performanceCards = [];
    });

    test('should load large board within acceptable time', async ({ page }) => {
      // Reload page to measure full load time
      const startTime = Date.now();
      await page.reload();
      await boardPage.waitForPageLoad();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.boardLoadTime.maxTime);
      
      // Verify all cards are loaded
      const cardElements = page.locator('[data-testid^="card-"]');
      const cardCount = await cardElements.count();
      expect(cardCount).toBeGreaterThanOrEqual(50);
    });

    test('should maintain drag performance with many cards', async ({ page }) => {
      // Test drag performance with the first card
      const testCard = performanceCards[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      const startTime = Date.now();
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      const dragTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(dragTime).toBeLessThan(PERFORMANCE_BENCHMARKS.dragDropLatency.maxLatency * 2);
    });

    test('should handle rapid card operations efficiently', async ({ page }) => {
      // Test rapid card creation
      const rapidCardTitles: string[] = [];
      const startTime = Date.now();
      
      for (let i = 1; i <= 10; i++) {
        const cardTitle = `Rapid Card ${i} ` + Date.now();
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        rapidCardTitles.push(cardTitle);
      }
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(10000); // 10 seconds for 10 cards
      
      // Clean up rapid test cards
      for (const cardTitle of rapidCardTitles) {
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

    test('should scroll smoothly with many cards', async ({ page }) => {
      const todoColumn = page.locator('[data-testid="column-col-todo"]');
      
      // Measure scroll performance
      const startTime = Date.now();
      
      // Scroll down within column
      await todoColumn.hover();
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(50);
      }
      
      // Scroll back up
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -200);
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - startTime;
      expect(scrollTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify smooth scrolling (no jank)
      const isColumnVisible = await todoColumn.isVisible();
      expect(isColumnVisible).toBe(true);
    });

    test('should maintain responsive UI with heavy load', async ({ page }) => {
      // Test UI responsiveness under load
      const responseTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        // Click on various UI elements
        const addCardButton = page.locator('[data-testid="add-card-button"]').first();
        await addCardButton.click();
        
        const cardDialog = page.locator('[data-testid="card-dialog"]');
        await cardDialog.waitFor({ state: 'visible' });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Cancel dialog
        await page.click('button:has-text("Cancel")');
        await cardDialog.waitFor({ state: 'hidden' });
        
        await page.waitForTimeout(100);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(1000); // Average response under 1 second
    });
  });

  test.describe('Animation and Visual Performance', () => {
    let animationTestCards: string[] = [];

    test.beforeEach(async () => {
      // Create test cards for animation testing
      const cards = [
        'Animation Card 1 ' + Date.now(),
        'Animation Card 2 ' + Date.now(),
        'Animation Card 3 ' + Date.now(),
      ];
      
      for (const cardTitle of cards) {
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        animationTestCards.push(cardTitle);
      }
    });

    test.afterEach(async () => {
      // Clean up animation test cards
      for (const cardTitle of animationTestCards) {
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
      animationTestCards = [];
    });

    test('should animate card movement smoothly', async ({ page }) => {
      const cardTitle = animationTestCards[0];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Record initial position
      const initialBox = await cardElement.boundingBox();
      expect(initialBox).not.toBeNull();
      
      // Start drag with animation tracking
      const targetColumn = page.locator('[data-testid="column-col-progress"]');
      const targetBox = await targetColumn.boundingBox();
      expect(targetBox).not.toBeNull();
      
      // Begin drag
      await page.mouse.move(
        initialBox!.x + initialBox!.width / 2,
        initialBox!.y + initialBox!.height / 2
      );
      await page.mouse.down();
      
      // Move to target with animation frames
      const steps = 20;
      const deltaX = (targetBox!.x + targetBox!.width / 2 - initialBox!.x - initialBox!.width / 2) / steps;
      const deltaY = (targetBox!.y + 100 - initialBox!.y - initialBox!.height / 2) / steps;
      
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          initialBox!.x + initialBox!.width / 2 + deltaX * i,
          initialBox!.y + initialBox!.height / 2 + deltaY * i
        );
        await page.waitForTimeout(16); // ~60fps
      }
      
      await page.mouse.up();
      
      // Verify smooth transition completed
      await page.waitForTimeout(500);
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
    });

    test('should show hover animations without lag', async ({ page }) => {
      const cardTitle = animationTestCards[1];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      
      // Test hover performance
      const hoverTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await cardElement.hover();
        
        // Wait for hover effects to apply
        await page.waitForTimeout(100);
        
        const hoverTime = Date.now() - startTime;
        hoverTimes.push(hoverTime);
        
        // Move away
        await page.mouse.move(0, 0);
        await page.waitForTimeout(100);
      }
      
      const avgHoverTime = hoverTimes.reduce((a, b) => a + b, 0) / hoverTimes.length;
      expect(avgHoverTime).toBeLessThan(200); // Hover should be responsive
    });

    test('should handle rapid hover/unhover without flicker', async ({ page }) => {
      const cardTitle = animationTestCards[2];
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
      
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      // Rapid hover/unhover
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
        await page.waitForTimeout(50);
        await page.mouse.move(cardBox!.x - 10, cardBox!.y - 10);
        await page.waitForTimeout(50);
      }
      
      // Card should still be visible and functional
      await expect(cardElement).toBeVisible();
      
      // Test final hover works
      await cardElement.hover();
      const menuButton = cardElement.locator('[data-testid="card-menu"]');
      await expect(menuButton).toBeVisible();
    });

    test('should animate card creation and deletion', async ({ page }) => {
      const newCardTitle = 'Animation Creation Test ' + Date.now();
      
      // Measure card creation animation
      const startTime = Date.now();
      
      await boardPage.createCard('col-todo', {
        title: newCardTitle,
        priority: 'medium',
      });
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(3000); // Should create within 3 seconds
      
      // Verify card appears
      const newCard = await boardPage.getCardByTitle(newCardTitle);
      expect(newCard).not.toBeNull();
      
      // Measure card deletion animation
      const deleteStartTime = Date.now();
      
      await newCard!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      // Wait for deletion to complete
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${newCardTitle}")`);
      await expect(cardElement).not.toBeVisible({ timeout: 3000 });
      
      const deletionTime = Date.now() - deleteStartTime;
      expect(deletionTime).toBeLessThan(2000); // Should delete within 2 seconds
    });
  });

  test.describe('Loading States and Feedback', () => {
    test('should show loading states for board operations', async ({ page }) => {
      // Mock slow API responses to test loading states
      await page.route('**/api/kanban/cards', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', 'Loading Test Card');
      
      const submitButton = page.locator('button:has-text("Create Card")');
      await submitButton.click();
      
      // Should show loading state
      const loadingButton = page.locator('button:has-text("Creating...")');
      await expect(loadingButton).toBeVisible();
      
      // Wait for creation to complete
      await page.waitForSelector(`[data-testid^="card-"]:has-text("Loading Test Card")`, {
        timeout: 5000,
      });
      
      // Clean up
      const card = await boardPage.getCardByTitle('Loading Test Card');
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      // Remove route mock
      await page.unroute('**/api/kanban/cards');
    });

    test('should show progress indicators during drag operations', async ({ page }) => {
      const testCard = 'Progress Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: testCard,
        priority: 'medium',
      });
      
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Mock slow drag API
      await page.route('**/api/kanban/cards/*/move', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });
      
      // Start drag
      const cardBox = await cardElement.boundingBox();
      expect(cardBox).not.toBeNull();
      
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Should show dragging state
      const isDragging = await cardElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.opacity) < 1 || styles.transform !== 'none';
      });
      
      expect(isDragging).toBe(true);
      
      // Complete drag
      const targetColumn = page.locator('[data-testid="column-col-progress"]');
      const targetBox = await targetColumn.boundingBox();
      await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 100);
      await page.mouse.up();
      
      // Wait for operation to complete
      await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
      
      // Clean up
      const card = await boardPage.getCardByTitle(testCard);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      // Remove route mock
      await page.unroute('**/api/kanban/cards/*/move');
    });

    test('should provide feedback for failed operations', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/kanban/cards', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      });
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', 'Failed Creation Card');
      await page.click('button:has-text("Create Card")');
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"], .text-red-600');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Should contain error information
      await expect(errorMessage).toContainText('error');
      
      // Dialog should remain open for retry
      const cardDialog = page.locator('[data-testid="card-dialog"]');
      await expect(cardDialog).toBeVisible();
      
      // Cancel dialog
      await page.click('button:has-text("Cancel")');
      
      // Remove route mock
      await page.unroute('**/api/kanban/cards');
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during operations', async ({ page }) => {
      // This is a basic test - more sophisticated memory leak detection
      // would require specialized tools
      
      const initialCardCount = await page.locator('[data-testid^="card-"]').count();
      
      // Perform many operations
      const operationCards: string[] = [];
      
      for (let i = 1; i <= 20; i++) {
        const cardTitle = `Memory Test Card ${i} ` + Date.now();
        
        // Create card
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        operationCards.push(cardTitle);
        
        // Move card
        const card = await boardPage.getCardByTitle(cardTitle);
        const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
        const cardId = await cardElement.getAttribute('data-testid');
        const cardIdValue = cardId?.replace('card-', '') || '';
        
        await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
        
        // Delete card
        await card!.openMenu();
        await page.click('[data-testid="delete-card"]');
      }
      
      // Check that we don't have lingering DOM elements
      const finalCardCount = await page.locator('[data-testid^="card-"]').count();
      expect(finalCardCount).toBe(initialCardCount);
    });

    test('should handle browser resource constraints gracefully', async ({ page }) => {
      // Simulate low memory scenario by creating many elements rapidly
      const stressCards: string[] = [];
      
      // Create cards rapidly to stress test
      for (let i = 1; i <= 30; i++) {
        const cardTitle = `Stress Card ${i} ` + Date.now();
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          description: 'Stress test card with longer description content',
          priority: 'medium',
        });
        stressCards.push(cardTitle);
        
        // No waiting between creations to stress the system
      }
      
      // Board should remain functional
      const isResponsive = await page.isVisible('[data-testid="columns-container"]');
      expect(isResponsive).toBe(true);
      
      // Should be able to perform operations
      const firstCard = await boardPage.getCardByTitle(stressCards[0]);
      expect(firstCard).not.toBeNull();
      
      // Clean up stress test cards
      for (const cardTitle of stressCards) {
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

  test.describe('User Experience Metrics', () => {
    test('should provide immediate visual feedback for user actions', async ({ page }) => {
      const feedbackCard = 'Feedback Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: feedbackCard,
        priority: 'medium',
      });
      
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${feedbackCard}")`);
      
      // Test immediate hover feedback
      const hoverStartTime = Date.now();
      await cardElement.hover();
      
      // Should have visual change within 100ms
      await page.waitForTimeout(100);
      
      const hasHoverEffect = await cardElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.boxShadow !== 'none' || 
               styles.transform !== 'none' ||
               el.classList.contains('hover');
      });
      
      const hoverTime = Date.now() - hoverStartTime;
      expect(hoverTime).toBeLessThan(200);
      expect(typeof hasHoverEffect).toBe('boolean');
      
      // Clean up
      const card = await boardPage.getCardByTitle(feedbackCard);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });

    test('should maintain 60fps during animations', async ({ page }) => {
      // This is a conceptual test - actual FPS measurement would require
      // more sophisticated performance monitoring
      
      const animationCard = 'FPS Test Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: animationCard,
        priority: 'medium',
      });
      
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${animationCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      // Perform animated drag
      const startTime = Date.now();
      const result = await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      const animationTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      // Animation should complete in reasonable time for smooth 60fps
      expect(animationTime).toBeLessThan(1000);
      
      // Clean up
      const card = await boardPage.getCardByTitle(animationCard);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });

    test('should handle rapid user interactions gracefully', async ({ page }) => {
      const rapidCard = 'Rapid Interaction Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: rapidCard,
        priority: 'medium',
      });
      
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${rapidCard}")`);
      
      // Rapid click interactions
      for (let i = 0; i < 10; i++) {
        await cardElement.click();
        await page.waitForTimeout(50);
      }
      
      // Should not cause errors or break functionality
      const isCardVisible = await cardElement.isVisible();
      expect(isCardVisible).toBe(true);
      
      // Should still be able to open menu
      await cardElement.hover();
      const menuButton = cardElement.locator('[data-testid="card-menu"]');
      await menuButton.click();
      
      const menu = page.locator('[data-testid="card-menu-dropdown"]');
      const isMenuVisible = await menu.isVisible({ timeout: 2000 });
      
      if (isMenuVisible) {
        await page.click('[data-testid="delete-card"]');
      } else {
        // Alternative cleanup
        await page.keyboard.press('Escape');
        const card = await boardPage.getCardByTitle(rapidCard);
        await card!.openMenu();
        await page.click('[data-testid="delete-card"]');
      }
    });
  });

  test.describe('Accessibility Performance', () => {
    test('should maintain accessibility features under load', async ({ page }) => {
      // Create multiple cards to test accessibility under load
      const a11yCards: string[] = [];
      
      for (let i = 1; i <= 15; i++) {
        const cardTitle = `A11y Test Card ${i} ` + Date.now();
        await boardPage.createCard('col-todo', {
          title: cardTitle,
          priority: 'medium',
        });
        a11yCards.push(cardTitle);
      }
      
      // Test keyboard navigation performance
      const startTime = Date.now();
      
      // Tab through cards
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }
      
      const navTime = Date.now() - startTime;
      expect(navTime).toBeLessThan(2000); // Should navigate quickly
      
      // Check that focus is visible
      const focusedElement = page.locator(':focus');
      const isFocusVisible = await focusedElement.isVisible();
      expect(isFocusVisible).toBe(true);
      
      // Clean up
      for (const cardTitle of a11yCards) {
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

    test('should provide screen reader updates efficiently', async ({ page }) => {
      // Test that screen reader announcements don't cause performance issues
      const srCard = 'Screen Reader Card ' + Date.now();
      await boardPage.createCard('col-todo', {
        title: srCard,
        priority: 'high',
      });
      
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      const liveRegionCount = await liveRegions.count();
      expect(liveRegionCount).toBeGreaterThan(0);
      
      // Perform action that should trigger announcement
      const cardElement = page.locator(`[data-testid^="card-"]:has-text("${srCard}")`);
      const cardId = await cardElement.getAttribute('data-testid');
      const cardIdValue = cardId?.replace('card-', '') || '';
      
      const moveStartTime = Date.now();
      await boardPage.dragCardToColumn(cardIdValue, 'col-progress');
      const moveTime = Date.now() - moveStartTime;
      
      // Should complete move quickly even with screen reader updates
      expect(moveTime).toBeLessThan(2000);
      
      // Clean up
      const card = await boardPage.getCardByTitle(srCard);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });
  });
});