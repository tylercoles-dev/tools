/**
 * Visual regression tests for Kanban drag states
 * Tests visual appearance of drag operations, animations, and state changes
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';

test.describe('Kanban Drag States Visual Regression', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let testBoardId: string;
  let testBoardName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test board for visual testing
    const context = await browser.newContext();
    const page = await context.newPage();
    
    boardsPage = new KanbanBoardsPage(page);
    testBoardName = 'Visual Test Board ' + Date.now();
    
    await boardsPage.goto();
    await boardsPage.createBoard({
      name: testBoardName,
      description: 'Board for visual regression testing',
    });
    
    await boardsPage.openBoard(testBoardName);
    const url = page.url();
    testBoardId = url.split('/').pop() || '';
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    boardPage = new KanbanBoardPage(page);
    await boardPage.goto(testBoardId);
    
    // Create consistent test cards for visual testing
    const testCards = [
      { title: 'High Priority Task', priority: 'high' as const, description: 'Important task that needs attention' },
      { title: 'Medium Priority Task', priority: 'medium' as const, description: 'Regular task' },
      { title: 'Low Priority Task', priority: 'low' as const, assignee: 'John Doe' },
      { title: 'Overdue Task', priority: 'high' as const, dueDate: '2024-12-01' },
    ];
    
    for (const cardData of testCards) {
      await boardPage.createCard('col-todo', cardData);
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up test cards
    const cardElements = page.locator('[data-testid^="card-"]');
    const cardCount = await cardElements.count();
    
    for (let i = 0; i < cardCount; i++) {
      try {
        const card = cardElements.nth(i);
        const menuButton = card.locator('[data-testid="card-menu"]');
        
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.click('[data-testid="delete-card"]');
          
          // Handle confirmation if present
          try {
            await page.click('button:has-text("Delete")', { timeout: 1000 });
          } catch {
            // No confirmation dialog
          }
        }
      } catch {
        // Card might already be deleted or not accessible
      }
    }
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

  test.describe('Initial Board State', () => {
    test('should match board layout baseline', async ({ page }) => {
      // Wait for all content to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Allow for any animations to settle
      
      // Take screenshot of entire board
      await expect(page).toHaveScreenshot('board-initial-state.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match column layouts', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Screenshot each column individually
      const columns = ['col-todo', 'col-progress', 'col-done'];
      
      for (const columnId of columns) {
        const column = page.locator(`[data-testid="column-${columnId}"]`);
        await expect(column).toHaveScreenshot(`column-${columnId}-layout.png`, {
          animations: 'disabled',
        });
      }
    });

    test('should match card visual states', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Screenshot cards with different priorities
      const highPriorityCard = page.locator('[data-testid^="card-"]:has-text("High Priority Task")');
      const mediumPriorityCard = page.locator('[data-testid^="card-"]:has-text("Medium Priority Task")');
      const lowPriorityCard = page.locator('[data-testid^="card-"]:has-text("Low Priority Task")');
      const overdueCard = page.locator('[data-testid^="card-"]:has-text("Overdue Task")');
      
      await expect(highPriorityCard).toHaveScreenshot('card-high-priority.png');
      await expect(mediumPriorityCard).toHaveScreenshot('card-medium-priority.png');
      await expect(lowPriorityCard).toHaveScreenshot('card-low-priority.png');
      await expect(overdueCard).toHaveScreenshot('card-overdue.png');
    });
  });

  test.describe('Hover States', () => {
    test('should match card hover state', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("High Priority Task")');
      await card.hover();
      
      // Wait for hover animations to complete
      await page.waitForTimeout(300);
      
      await expect(card).toHaveScreenshot('card-hover-state.png');
    });

    test('should match column hover state during drag', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Medium Priority Task")');
      const targetColumn = page.locator('[data-testid="column-col-progress"]');
      
      // Start drag
      const cardBox = await card.boundingBox();
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move over target column
      const columnBox = await targetColumn.boundingBox();
      await page.mouse.move(columnBox!.x + columnBox!.width / 2, columnBox!.y + 100);
      
      // Wait for hover state to activate
      await page.waitForTimeout(200);
      
      await expect(targetColumn).toHaveScreenshot('column-drag-hover-state.png');
      
      // End drag
      await page.mouse.up();
    });

    test('should match add card button hover state', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const addCardButton = page.locator('[data-testid="add-card-button"]').first();
      await addCardButton.hover();
      
      await page.waitForTimeout(200);
      
      await expect(addCardButton).toHaveScreenshot('add-card-button-hover.png');
    });
  });

  test.describe('Drag States', () => {
    test('should match card dragging visual state', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("High Priority Task")');
      
      // Start drag
      const cardBox = await card.boundingBox();
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move slightly to trigger drag state
      await page.mouse.move(cardBox!.x + cardBox!.width / 2 + 10, cardBox!.y + cardBox!.height / 2 + 10);
      
      // Wait for drag styling to apply
      await page.waitForTimeout(100);
      
      await expect(card).toHaveScreenshot('card-dragging-state.png');
      
      // End drag
      await page.mouse.up();
    });

    test('should match drop zone active state', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Medium Priority Task")');
      const targetColumn = page.locator('[data-testid="column-col-done"]');
      
      // Start drag
      const cardBox = await card.boundingBox();
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Move to target column to activate drop zone
      const columnBox = await targetColumn.boundingBox();
      await page.mouse.move(columnBox!.x + columnBox!.width / 2, columnBox!.y + 150);
      
      // Wait for drop zone styling
      await page.waitForTimeout(200);
      
      await expect(targetColumn).toHaveScreenshot('column-drop-zone-active.png');
      
      // End drag
      await page.mouse.up();
    });

    test('should match drag preview at different positions', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Low Priority Task")');
      
      // Start drag
      const cardBox = await card.boundingBox();
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Capture drag at different positions
      const positions = [
        { x: cardBox!.x + 50, y: cardBox!.y + 50, name: 'position-1' },
        { x: cardBox!.x + 150, y: cardBox!.y + 100, name: 'position-2' },
        { x: cardBox!.x + 250, y: cardBox!.y + 50, name: 'position-3' },
      ];
      
      for (const position of positions) {
        await page.mouse.move(position.x, position.y);
        await page.waitForTimeout(100);
        
        // Screenshot the entire board to show drag preview position
        await expect(page).toHaveScreenshot(`drag-preview-${position.name}.png`, {
          clip: { x: 0, y: 100, width: 1200, height: 600 }, // Focus on board area
          animations: 'disabled',
        });
      }
      
      // End drag
      await page.mouse.up();
    });

    test('should match multi-card selection state', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // If multi-selection is supported, test it
      // This is a placeholder for multi-selection functionality
      const cards = page.locator('[data-testid^="card-"]');
      const cardCount = await cards.count();
      
      if (cardCount >= 2) {
        // Try to select multiple cards (implementation dependent)
        // For now, just capture the current state
        await expect(page.locator('[data-testid="columns-container"]')).toHaveScreenshot('multi-selection-placeholder.png');
      }
    });
  });

  test.describe('Animation States', () => {
    test('should match card creation animation frames', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      // Fill form
      await page.fill('#cardTitle', 'Animation Test Card');
      await page.fill('#cardDescription', 'Testing creation animation');
      await page.selectOption('#cardPriority', 'medium');
      
      // Submit and capture creation animation
      await page.click('button:has-text("Create Card")');
      
      // Capture different animation frames
      const animationFrames = [100, 300, 500];
      
      for (let i = 0; i < animationFrames.length; i++) {
        await page.waitForTimeout(animationFrames[i]);
        
        const todoColumn = page.locator('[data-testid="column-col-todo"]');
        await expect(todoColumn).toHaveScreenshot(`card-creation-frame-${i + 1}.png`);
      }
      
      // Clean up the animation test card
      const animationCard = await boardPage.getCardByTitle('Animation Test Card');
      if (animationCard) {
        await animationCard.openMenu();
        await page.click('[data-testid="delete-card"]');
      }
    });

    test('should match card movement animation', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Overdue Task")');
      const cardBox = await card.boundingBox();
      const targetColumn = page.locator('[data-testid="column-col-progress"]');
      const targetBox = await targetColumn.boundingBox();
      
      // Start drag animation
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      // Capture animation frames during movement
      const steps = 5;
      const deltaX = (targetBox!.x + targetBox!.width / 2 - cardBox!.x - cardBox!.width / 2) / steps;
      const deltaY = (targetBox!.y + 100 - cardBox!.y - cardBox!.height / 2) / steps;
      
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          cardBox!.x + cardBox!.width / 2 + deltaX * i,
          cardBox!.y + cardBox!.height / 2 + deltaY * i
        );
        
        await page.waitForTimeout(100);
        
        // Capture animation frame
        await expect(page).toHaveScreenshot(`movement-animation-frame-${i}.png`, {
          clip: { x: 0, y: 100, width: 1200, height: 600 },
          animations: 'disabled',
        });
      }
      
      await page.mouse.up();
      
      // Capture final state after animation
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('movement-animation-complete.png', {
        clip: { x: 0, y: 100, width: 1200, height: 600 },
        animations: 'disabled',
      });
    });

    test('should match card deletion animation', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Create a card specifically for deletion testing
      await boardPage.createCard('col-todo', {
        title: 'Deletion Test Card',
        priority: 'low',
      });
      
      await page.waitForTimeout(500); // Wait for creation to complete
      
      const deletionCard = await boardPage.getCardByTitle('Deletion Test Card');
      await deletionCard!.openMenu();
      
      // Capture before deletion
      const todoColumn = page.locator('[data-testid="column-col-todo"]');
      await expect(todoColumn).toHaveScreenshot('before-deletion.png');
      
      await page.click('[data-testid="delete-card"]');
      
      // Capture deletion animation frames
      const deletionFrames = [100, 300, 500];
      
      for (let i = 0; i < deletionFrames.length; i++) {
        await page.waitForTimeout(deletionFrames[i]);
        
        await expect(todoColumn).toHaveScreenshot(`deletion-animation-frame-${i + 1}.png`);
      }
    });
  });

  test.describe('Error and Loading States', () => {
    test('should match loading states visual appearance', async ({ page }) => {
      // Mock slow API to capture loading states
      await page.route('**/api/kanban/cards', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', 'Loading State Test');
      
      const submitButton = page.locator('button:has-text("Create Card")');
      await submitButton.click();
      
      // Capture loading button state
      await page.waitForTimeout(200);
      const loadingButton = page.locator('button:has-text("Creating...")');
      await expect(loadingButton).toHaveScreenshot('button-loading-state.png');
      
      // Wait for creation to complete and clean up
      await page.waitForSelector(`[data-testid^="card-"]:has-text("Loading State Test")`, {
        timeout: 5000,
      });
      
      const loadingCard = await boardPage.getCardByTitle('Loading State Test');
      await loadingCard!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      await page.unroute('**/api/kanban/cards');
    });

    test('should match error states visual appearance', async ({ page }) => {
      // Mock API error
      await page.route('**/api/kanban/cards', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      });
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', 'Error State Test');
      await page.click('button:has-text("Create Card")');
      
      // Wait for error message
      await page.waitForTimeout(1000);
      
      const cardDialog = page.locator('[data-testid="card-dialog"]');
      await expect(cardDialog).toHaveScreenshot('error-state-dialog.png');
      
      // Close dialog and remove route mock
      await page.click('button:has-text("Cancel")');
      await page.unroute('**/api/kanban/cards');
    });

    test('should match offline state appearance', async ({ page }) => {
      // Simulate offline state
      await page.setOffline(true);
      
      // Wait for offline indicator
      await page.waitForTimeout(2000);
      
      // Capture offline state
      await expect(page).toHaveScreenshot('offline-state.png', {
        fullPage: true,
        animations: 'disabled',
      });
      
      // Go back online
      await page.setOffline(false);
    });
  });

  test.describe('Mobile Visual States', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size
    
    test('should match mobile layout', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('mobile-board-layout.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match mobile card states', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("High Priority Task")');
      
      // Regular state
      await expect(card).toHaveScreenshot('mobile-card-normal.png');
      
      // Hover/touch state
      await card.hover();
      await page.waitForTimeout(200);
      await expect(card).toHaveScreenshot('mobile-card-hover.png');
    });

    test('should match mobile drag states', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Medium Priority Task")');
      
      // Start touch drag
      const cardBox = await card.boundingBox();
      await page.touchscreen.tap(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('mobile-drag-state.png', {
        clip: { x: 0, y: 100, width: 375, height: 500 },
        animations: 'disabled',
      });
    });
  });

  test.describe('Theme and Color Variations', () => {
    test('should match dark theme appearance', async ({ page }) => {
      // If dark theme is supported, test it
      const darkModeToggle = page.locator('[data-testid="theme-toggle"], [data-testid="dark-mode-toggle"]');
      
      if (await darkModeToggle.isVisible({ timeout: 2000 })) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('dark-theme-board.png', {
          fullPage: true,
          animations: 'disabled',
        });
        
        // Test dark theme drag states
        const card = page.locator('[data-testid^="card-"]').first();
        await card.hover();
        await page.waitForTimeout(200);
        
        await expect(card).toHaveScreenshot('dark-theme-card-hover.png');
        
        // Switch back to light theme
        await darkModeToggle.click();
      } else {
        // If no dark theme toggle, test with CSS media query simulation
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('dark-mode-simulation.png', {
          fullPage: true,
          animations: 'disabled',
        });
        
        await page.emulateMedia({ colorScheme: 'light' });
      }
    });

    test('should match high contrast mode', async ({ page }) => {
      // Test high contrast accessibility mode
      await page.emulateMedia({ forcedColors: 'active' });
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
      
      // Test high contrast drag state
      const card = page.locator('[data-testid^="card-"]').first();
      const cardBox = await card.boundingBox();
      
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBox!.x + 50, cardBox!.y + 50);
      
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('high-contrast-drag-state.png', {
        clip: { x: 0, y: 100, width: 1200, height: 600 },
        animations: 'disabled',
      });
      
      await page.mouse.up();
      await page.emulateMedia({ forcedColors: 'none' });
    });
  });

  test.describe('Browser-Specific Variations', () => {
    test('should match cross-browser drag cursor states', async ({ page, browserName }) => {
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid^="card-"]:has-text("Low Priority Task")');
      
      // Start drag to test cursor
      const cardBox = await card.boundingBox();
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
      await page.mouse.down();
      
      await page.waitForTimeout(100);
      
      // Screenshot with browser-specific naming
      await expect(page).toHaveScreenshot(`drag-cursor-${browserName}.png`, {
        clip: { x: 0, y: 100, width: 800, height: 400 },
        animations: 'disabled',
      });
      
      await page.mouse.up();
    });
  });
});