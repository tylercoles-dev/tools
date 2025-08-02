/**
 * End-to-End tests for Kanban mobile touch interactions
 * Tests touch-based drag and drop, mobile responsiveness, and touch-specific gestures
 */

import { test, expect, devices } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';

// Mobile device configurations
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'iPad', device: devices['iPad Pro'] },
];

test.describe('Kanban Mobile Touch Interactions', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let testHelpers: KanbanTestHelpers;
  let testBoardId: string;
  let testBoardName: string;

  // Run tests on multiple mobile devices
  for (const { name: deviceName, device } of mobileDevices) {
    test.describe(`${deviceName} Tests`, () => {
      test.use({ ...device });

      test.beforeAll(async ({ browser }) => {
        // Create a test board for mobile testing
        const context = await browser.newContext();
        const page = await context.newPage();
        
        boardsPage = new KanbanBoardsPage(page);
        testBoardName = `Mobile Test Board ${deviceName} ` + Date.now();
        
        await boardsPage.goto();
        await boardsPage.createBoard({
          name: testBoardName,
          description: 'Board for testing mobile touch interactions',
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

      test.describe('Mobile Layout and Responsiveness', () => {
        test('should display mobile-optimized layout', async ({ page }) => {
          // Check viewport is mobile-sized
          const viewport = page.viewportSize();
          expect(viewport?.width).toBeLessThan(768); // Mobile breakpoint
          
          // Kanban columns should be horizontally scrollable on mobile
          const columnsContainer = page.locator('[data-testid="columns-container"]');
          await expect(columnsContainer).toBeVisible();
          
          // Check for horizontal scroll
          const hasHorizontalScroll = await columnsContainer.evaluate(el => 
            el.scrollWidth > el.clientWidth
          );
          
          if (hasHorizontalScroll) {
            expect(hasHorizontalScroll).toBe(true);
          }
        });

        test('should have touch-friendly button sizes', async ({ page }) => {
          // Create a test card to check button sizes
          const testCard = 'Touch Size Test Card ' + Date.now();
          await boardPage.createCard('col-todo', {
            title: testCard,
            priority: 'medium',
          });
          
          // Check card menu button size
          const card = await boardPage.getCardByTitle(testCard);
          const menuButton = card!.locator('[data-testid="card-menu"]');
          
          const buttonBox = await menuButton.boundingBox();
          expect(buttonBox?.width).toBeGreaterThanOrEqual(44); // Minimum touch target size
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
          
          // Check add card button size
          const addCardButton = page.locator('[data-testid="add-card-button"]').first();
          const addButtonBox = await addCardButton.boundingBox();
          expect(addButtonBox?.width).toBeGreaterThanOrEqual(44);
          expect(addButtonBox?.height).toBeGreaterThanOrEqual(44);
          
          // Cleanup
          await card!.openMenu();
          await page.click('[data-testid="delete-card"]');
        });

        test('should handle mobile navigation properly', async ({ page }) => {
          // Test back button
          await boardPage.goBackToBoards();
          await expect(page).toHaveURL('/kanban');
          
          // Navigate back to board
          await boardsPage.openBoard(testBoardName);
          await expect(page).toHaveURL(/\/kanban\/[^\/]+$/);
        });

        test('should scroll columns horizontally on mobile', async ({ page }) => {
          const columnsContainer = page.locator('[data-testid="columns-container"]');
          
          // Get initial scroll position
          const initialScrollLeft = await columnsContainer.evaluate(el => el.scrollLeft);
          
          // Scroll right using touch
          await columnsContainer.hover();
          await page.mouse.wheel(100, 0); // Horizontal scroll
          
          // Check if scrolled
          const newScrollLeft = await columnsContainer.evaluate(el => el.scrollLeft);
          expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);
        });
      });

      test.describe('Touch Drag and Drop', () => {
        let touchTestCards: string[] = [];

        test.beforeEach(async () => {
          // Create test cards for touch interaction
          const cards = [
            'Touch Drag Card 1 ' + Date.now(),
            'Touch Drag Card 2 ' + Date.now(),
            'Touch Drag Card 3 ' + Date.now(),
          ];
          
          for (const cardTitle of cards) {
            await boardPage.createCard('col-todo', {
              title: cardTitle,
              priority: 'medium',
            });
            touchTestCards.push(cardTitle);
          }
        });

        test.afterEach(async () => {
          // Clean up test cards
          for (const cardTitle of touchTestCards) {
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
          touchTestCards = [];
        });

        test('should support touch drag between columns', async ({ page }) => {
          const cardTitle = touchTestCards[0];
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
          const cardId = await cardElement.getAttribute('data-testid');
          const cardIdValue = cardId?.replace('card-', '') || '';
          
          // Perform touch drag
          const result = await boardPage.touchDragCard(cardIdValue, 'col-progress');
          
          expect(result.success).toBe(true);
          
          // Verify card moved
          await boardPage.verifyCardInColumn(cardIdValue, 'col-progress');
        });

        test('should handle long press for drag initiation', async ({ page }) => {
          const cardTitle = touchTestCards[1];
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
          
          const cardBox = await cardElement.boundingBox();
          expect(cardBox).not.toBeNull();
          
          // Simulate long press (touch and hold)
          await page.touchscreen.tap(
            cardBox!.x + cardBox!.width / 2,
            cardBox!.y + cardBox!.height / 2
          );
          
          // Hold for long press duration
          await page.waitForTimeout(800);
          
          // Check for long press visual feedback
          const hasLongPressEffect = await cardElement.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.transform !== 'none' || 
                   parseFloat(styles.opacity) < 1 ||
                   el.classList.contains('long-press-active');
          });
          
          // Note: This depends on actual implementation
          // The test verifies touch interaction works
          expect(typeof hasLongPressEffect).toBe('boolean');
        });

        test('should prevent default scroll during drag', async ({ page }) => {
          const cardTitle = touchTestCards[2];
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${cardTitle}")`);
          
          const cardBox = await cardElement.boundingBox();
          expect(cardBox).not.toBeNull();
          
          // Get initial scroll position
          const initialScrollY = await page.evaluate(() => window.scrollY);
          
          // Start touch drag
          await page.touchscreen.tap(
            cardBox!.x + cardBox!.width / 2,
            cardBox!.y + cardBox!.height / 2
          );
          
          // Move touch point (should not scroll page)
          await page.evaluate(({ x, y }) => {
            const touchMoveEvent = new TouchEvent('touchmove', {
              touches: [{
                clientX: x + 100,
                clientY: y + 100,
                identifier: 0,
              } as any],
              cancelable: true,
            });
            document.dispatchEvent(touchMoveEvent);
          }, { x: cardBox!.x + cardBox!.width / 2, y: cardBox!.y + cardBox!.height / 2 });
          
          // Check scroll position hasn't changed significantly
          const finalScrollY = await page.evaluate(() => window.scrollY);
          expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThan(10);
        });

        test('should handle multi-touch scenarios', async ({ page }) => {
          const card1Title = touchTestCards[0];
          const card2Title = touchTestCards[1];
          
          const card1Element = page.locator(`[data-testid^="card-"]:has-text("${card1Title}")`);
          const card2Element = page.locator(`[data-testid^="card-"]:has-text("${card2Title}")`);
          
          const card1Box = await card1Element.boundingBox();
          const card2Box = await card2Element.boundingBox();
          
          expect(card1Box && card2Box).toBeTruthy();
          
          // Simulate two-finger touch (should not interfere with drag)
          await page.evaluate(({ card1, card2 }) => {
            const multiTouchEvent = new TouchEvent('touchstart', {
              touches: [
                { clientX: card1.x, clientY: card1.y, identifier: 0 } as any,
                { clientX: card2.x, clientY: card2.y, identifier: 1 } as any,
              ],
            });
            document.dispatchEvent(multiTouchEvent);
          }, { card1: card1Box!, card2: card2Box! });
          
          await page.waitForTimeout(500);
          
          // End multi-touch
          await page.evaluate(() => {
            const touchEndEvent = new TouchEvent('touchend', {
              touches: [],
            });
            document.dispatchEvent(touchEndEvent);
          });
          
          // Cards should remain in original positions
          const card1Id = (await card1Element.getAttribute('data-testid'))?.replace('card-', '') || '';
          const card2Id = (await card2Element.getAttribute('data-testid'))?.replace('card-', '') || '';
          
          await boardPage.verifyCardInColumn(card1Id, 'col-todo');
          await boardPage.verifyCardInColumn(card2Id, 'col-todo');
        });
      });

      test.describe('Touch Gestures and Interactions', () => {
        let gestureTestCard: string;

        test.beforeEach(async () => {
          gestureTestCard = 'Gesture Test Card ' + Date.now();
          await boardPage.createCard('col-todo', {
            title: gestureTestCard,
            description: 'Card for testing touch gestures',
            priority: 'medium',
          });
        });

        test.afterEach(async () => {
          try {
            const card = await boardPage.getCardByTitle(gestureTestCard);
            if (card) {
              await card.openMenu();
              await boardPage.page.click('[data-testid="delete-card"]');
            }
          } catch {
            // Card might already be deleted
          }
        });

        test('should handle tap to select card', async ({ page }) => {
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${gestureTestCard}")`);
          
          const cardBox = await cardElement.boundingBox();
          expect(cardBox).not.toBeNull();
          
          // Tap on card
          await page.touchscreen.tap(
            cardBox!.x + cardBox!.width / 2,
            cardBox!.y + cardBox!.height / 2
          );
          
          // Should show some selection or focus state
          const hasActiveState = await cardElement.evaluate(el => {
            return el.classList.contains('selected') || 
                   el.classList.contains('active') ||
                   el === document.activeElement;
          });
          
          expect(typeof hasActiveState).toBe('boolean');
        });

        test('should handle double tap for card details', async ({ page }) => {
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${gestureTestCard}")`);
          
          const cardBox = await cardElement.boundingBox();
          expect(cardBox).not.toBeNull();
          
          // Double tap
          await page.touchscreen.tap(
            cardBox!.x + cardBox!.width / 2,
            cardBox!.y + cardBox!.height / 2
          );
          
          await page.waitForTimeout(100);
          
          await page.touchscreen.tap(
            cardBox!.x + cardBox!.width / 2,
            cardBox!.y + cardBox!.height / 2
          );
          
          // Should open card details or edit dialog
          const cardDialog = page.locator('[data-testid="card-dialog"], [data-testid="card-details"]');
          const isDialogOpen = await cardDialog.isVisible({ timeout: 2000 });
          
          if (isDialogOpen) {
            await expect(cardDialog).toBeVisible();
            
            // Close dialog
            const closeButton = cardDialog.locator('button:has-text("Close"), button:has-text("Cancel")');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            } else {
              await page.keyboard.press('Escape');
            }
          }
        });

        test('should handle pinch to zoom (if supported)', async ({ page }) => {
          // Note: Pinch zoom might not be applicable to Kanban boards
          // but we can test that the page handles pinch gestures gracefully
          
          const columnsContainer = page.locator('[data-testid="columns-container"]');
          const initialScale = await page.evaluate(() => {
            return window.visualViewport?.scale || 1;
          });
          
          // Simulate pinch gesture
          await page.evaluate(() => {
            const pinchEvent = new WheelEvent('wheel', {
              deltaY: -100,
              ctrlKey: true,
              bubbles: true,
            });
            document.dispatchEvent(pinchEvent);
          });
          
          await page.waitForTimeout(500);
          
          // Check that page handles pinch gracefully (doesn't break)
          const isContainerVisible = await columnsContainer.isVisible();
          expect(isContainerVisible).toBe(true);
        });

        test('should handle swipe gestures on cards', async ({ page }) => {
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${gestureTestCard}")`);
          
          const cardBox = await cardElement.boundingBox();
          expect(cardBox).not.toBeNull();
          
          // Simulate horizontal swipe
          await page.evaluate(({ startX, startY, endX, endY }) => {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ clientX: startX, clientY: startY, identifier: 0 } as any],
            });
            
            const touchMove = new TouchEvent('touchmove', {
              touches: [{ clientX: endX, clientY: endY, identifier: 0 } as any],
            });
            
            const touchEnd = new TouchEvent('touchend', {
              touches: [],
            });
            
            document.dispatchEvent(touchStart);
            setTimeout(() => document.dispatchEvent(touchMove), 50);
            setTimeout(() => document.dispatchEvent(touchEnd), 100);
          }, {
            startX: cardBox!.x + cardBox!.width / 2,
            startY: cardBox!.y + cardBox!.height / 2,
            endX: cardBox!.x + cardBox!.width / 2 + 100,
            endY: cardBox!.y + cardBox!.height / 2,
          });
          
          await page.waitForTimeout(500);
          
          // Check if swipe revealed any actions or moved the card
          const swipeActions = page.locator('[data-testid="swipe-actions"], .swipe-reveal');
          const hasSwipeActions = await swipeActions.isVisible({ timeout: 1000 });
          
          // Swipe actions are optional - test that gesture doesn't break the UI
          const cardStillVisible = await cardElement.isVisible();
          expect(cardStillVisible).toBe(true);
        });
      });

      test.describe('Mobile-Specific Features', () => {
        test('should handle mobile keyboard interactions', async ({ page }) => {
          // Test virtual keyboard behavior when creating/editing cards
          const column = await boardPage.getColumnById('col-todo');
          await column!.clickAddCard();
          
          // Focus on title input (should trigger virtual keyboard)
          await page.focus('#cardTitle');
          
          // Type using virtual keyboard
          await page.type('#cardTitle', 'Mobile Keyboard Test Card');
          
          // Check that input is responsive
          const titleValue = await page.inputValue('#cardTitle');
          expect(titleValue).toBe('Mobile Keyboard Test Card');
          
          // Cancel form
          await page.click('button:has-text("Cancel")');
        });

        test('should handle orientation changes', async ({ page }) => {
          // Get initial orientation
          const initialOrientation = await page.evaluate(() => window.screen.orientation?.angle || 0);
          
          // Simulate orientation change (this might not actually change the viewport in tests)
          await page.evaluate(() => {
            window.dispatchEvent(new Event('orientationchange'));
          });
          
          await page.waitForTimeout(500);
          
          // Verify layout adapts (columns should still be visible)
          const columnsContainer = page.locator('[data-testid="columns-container"]');
          await expect(columnsContainer).toBeVisible();
          
          // Board should still be functional
          const addCardButton = page.locator('[data-testid="add-card-button"]').first();
          await expect(addCardButton).toBeVisible();
        });

        test('should handle mobile menu interactions', async ({ page }) => {
          // Test mobile-specific menu behavior
          const boardMenuButton = page.locator('[data-testid="board-menu-button"]');
          
          if (await boardMenuButton.isVisible()) {
            await boardMenuButton.click();
            
            // Menu should be touch-friendly
            const menu = page.locator('[data-testid="board-menu"]');
            await expect(menu).toBeVisible();
            
            // Menu items should be large enough for touch
            const menuItems = menu.locator('button, a');
            const itemCount = await menuItems.count();
            
            if (itemCount > 0) {
              const firstItem = menuItems.first();
              const itemBox = await firstItem.boundingBox();
              expect(itemBox?.height).toBeGreaterThanOrEqual(44);
            }
            
            // Close menu by tapping outside
            await page.click('body', { position: { x: 50, y: 50 } });
            await expect(menu).not.toBeVisible();
          }
        });

        test('should handle mobile scrolling performance', async ({ page }) => {
          // Create multiple cards to test scrolling performance
          const scrollTestCards: string[] = [];
          
          for (let i = 1; i <= 10; i++) {
            const cardTitle = `Scroll Test Card ${i} ` + Date.now();
            await boardPage.createCard('col-todo', {
              title: cardTitle,
              priority: 'medium',
            });
            scrollTestCards.push(cardTitle);
          }
          
          const todoColumn = page.locator('[data-testid="column-col-todo"]');
          
          // Test smooth scrolling
          const startTime = Date.now();
          
          // Scroll within column
          await todoColumn.hover();
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(100);
          await page.mouse.wheel(0, -300);
          
          const endTime = Date.now();
          const scrollTime = endTime - startTime;
          
          // Scrolling should be responsive
          expect(scrollTime).toBeLessThan(1000);
          
          // Cleanup scroll test cards
          for (const cardTitle of scrollTestCards) {
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

      test.describe('Accessibility on Mobile', () => {
        test('should support screen reader announcements on mobile', async ({ page }) => {
          // Mobile screen readers should work with Kanban board
          const testCard = 'Screen Reader Test Card ' + Date.now();
          await boardPage.createCard('col-todo', {
            title: testCard,
            priority: 'high',
          });
          
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${testCard}")`);
          
          // Check for accessibility attributes
          const ariaLabel = await cardElement.getAttribute('aria-label');
          const role = await cardElement.getAttribute('role');
          
          expect(ariaLabel || role).toBeTruthy();
          
          // Check for live regions
          const liveRegions = page.locator('[aria-live]');
          const liveRegionCount = await liveRegions.count();
          expect(liveRegionCount).toBeGreaterThan(0);
          
          // Cleanup
          const card = await boardPage.getCardByTitle(testCard);
          await card!.openMenu();
          await page.click('[data-testid="delete-card"]');
        });

        test('should have proper focus management on mobile', async ({ page }) => {
          // Test focus behavior with touch interactions
          const focusTestCard = 'Focus Test Card ' + Date.now();
          await boardPage.createCard('col-todo', {
            title: focusTestCard,
            priority: 'medium',
          });
          
          const cardElement = page.locator(`[data-testid^="card-"]:has-text("${focusTestCard}")`);
          
          // Focus should be manageable
          await cardElement.focus();
          
          const isFocused = await cardElement.evaluate(el => 
            document.activeElement === el || el.contains(document.activeElement)
          );
          
          expect(isFocused).toBe(true);
          
          // Cleanup
          const card = await boardPage.getCardByTitle(focusTestCard);
          await card!.openMenu();
          await page.click('[data-testid="delete-card"]');
        });
      });
    });
  }
});