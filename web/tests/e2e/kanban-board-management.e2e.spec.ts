/**
 * End-to-End tests for Kanban board management
 * Tests board creation, editing, deletion, and listing functionality
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage } from '../pages/kanban';
import { KanbanDataGenerator, VALIDATION_TEST_CASES } from '../fixtures/kanban-test-data';

test.describe('Kanban Board Management', () => {
  let boardsPage: KanbanBoardsPage;
  
  test.beforeEach(async ({ page }) => {
    boardsPage = new KanbanBoardsPage(page);
    await boardsPage.goto();
  });

  test.describe('Board Creation', () => {
    test('should create a new board with valid data', async () => {
      const boardData = {
        name: 'Test Board ' + Date.now(),
        description: 'A test board for automated testing',
      };

      await boardsPage.createBoard(boardData);
      
      // Verify board appears in list
      await boardsPage.verifyBoardExists(boardData.name);
      
      // Verify board information
      const boardInfo = await boardsPage.getBoardInfo(boardData.name);
      expect(boardInfo.name).toBe(boardData.name);
      expect(boardInfo.description).toBe(boardData.description);
    });

    test('should create a board with only required fields', async () => {
      const boardName = 'Minimal Board ' + Date.now();

      await boardsPage.createBoard({ name: boardName });
      
      await boardsPage.verifyBoardExists(boardName);
      
      const boardInfo = await boardsPage.getBoardInfo(boardName);
      expect(boardInfo.name).toBe(boardName);
      expect(boardInfo.description).toBeFalsy();
    });

    test('should handle board creation cancellation', async () => {
      const initialCount = await boardsPage.getBoardCount();
      
      await boardsPage.openCreateBoardDialog();
      await boardsPage.cancelBoardCreation();
      
      const finalCount = await boardsPage.getBoardCount();
      expect(finalCount).toBe(initialCount);
    });

    test('should validate required board name', async () => {
      await boardsPage.verifyCreateBoardValidation({
        name: '',
        expectedError: 'Board name is required',
      });
    });

    test('should validate board name length', async () => {
      await boardsPage.verifyCreateBoardValidation({
        name: 'x'.repeat(101),
        expectedError: 'Board name too long',
      });
    });

    test('should handle network errors during creation', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/kanban/boards', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const boardName = 'Network Error Board';
      
      await boardsPage.openCreateBoardDialog();
      await page.fill('#boardName', boardName);
      await page.click('button:has-text("Create Board")');
      
      // Should show error message
      await expect(page.locator('.text-red-600, [data-testid="error-message"]')).toBeVisible();
      
      // Board should not be created
      await boardsPage.verifyBoardNotExists(boardName);
    });
  });

  test.describe('Board Listing', () => {
    let testBoards: string[] = [];

    test.beforeEach(async () => {
      // Create test boards
      for (let i = 0; i < 3; i++) {
        const boardName = `Test Board ${i + 1} - ${Date.now()}`;
        await boardsPage.createBoard({
          name: boardName,
          description: `Description for board ${i + 1}`,
        });
        testBoards.push(boardName);
      }
    });

    test.afterEach(async () => {
      // Clean up test boards
      for (const boardName of testBoards) {
        try {
          await boardsPage.deleteBoard(boardName);
        } catch {
          // Board might already be deleted
        }
      }
      testBoards = [];
    });

    test('should display all created boards', async () => {
      const boardNames = await boardsPage.getBoardNames();
      
      for (const testBoard of testBoards) {
        expect(boardNames).toContain(testBoard);
      }
    });

    test('should show board count correctly', async () => {
      const displayedCount = await boardsPage.getBoardCount();
      expect(displayedCount).toBeGreaterThanOrEqual(testBoards.length);
    });

    test('should navigate to board when clicked', async ({ page }) => {
      const boardName = testBoards[0];
      
      await boardsPage.openBoard(boardName);
      
      // Should navigate to board page
      await expect(page).toHaveURL(/\/kanban\/[^\/]+$/);
      
      // Should show board title
      await expect(page.locator('h1')).toContainText(boardName);
    });

    test('should search boards by name', async () => {
      const searchTerm = testBoards[0].split(' ')[0]; // First word
      
      await boardsPage.searchBoards(searchTerm);
      
      const visibleBoardNames = await boardsPage.getBoardNames();
      
      // Should show only matching boards
      for (const boardName of visibleBoardNames) {
        expect(boardName.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('should show empty results for non-existent search', async () => {
      await boardsPage.searchBoards('NonExistentBoard12345');
      
      const boardCount = await boardsPage.getBoardCount();
      expect(boardCount).toBe(0);
    });
  });

  test.describe('Board Editing', () => {
    let testBoardName: string;

    test.beforeEach(async () => {
      testBoardName = 'Editable Board ' + Date.now();
      await boardsPage.createBoard({
        name: testBoardName,
        description: 'Original description',
      });
    });

    test.afterEach(async () => {
      try {
        // Clean up - try to delete with original or new name
        await boardsPage.deleteBoard(testBoardName);
      } catch {
        // Board might have been renamed or deleted
      }
    });

    test('should edit board name and description', async () => {
      const newName = 'Updated Board Name';
      const newDescription = 'Updated board description';

      await boardsPage.editBoard(testBoardName, {
        name: newName,
        description: newDescription,
      });

      // Verify changes
      await boardsPage.verifyBoardExists(newName);
      await boardsPage.verifyBoardNotExists(testBoardName);
      
      const boardInfo = await boardsPage.getBoardInfo(newName);
      expect(boardInfo.name).toBe(newName);
      expect(boardInfo.description).toBe(newDescription);
      
      testBoardName = newName; // Update for cleanup
    });

    test('should edit only board name', async () => {
      const newName = 'Only Name Changed';

      await boardsPage.editBoard(testBoardName, {
        name: newName,
      });

      await boardsPage.verifyBoardExists(newName);
      
      const boardInfo = await boardsPage.getBoardInfo(newName);
      expect(boardInfo.name).toBe(newName);
      expect(boardInfo.description).toBe('Original description');
      
      testBoardName = newName;
    });

    test('should clear board description', async () => {
      await boardsPage.editBoard(testBoardName, {
        description: '',
      });

      const boardInfo = await boardsPage.getBoardInfo(testBoardName);
      expect(boardInfo.description).toBeFalsy();
    });
  });

  test.describe('Board Deletion', () => {
    test('should delete a board with confirmation', async () => {
      const boardName = 'Board to Delete ' + Date.now();
      
      await boardsPage.createBoard({ name: boardName });
      await boardsPage.verifyBoardExists(boardName);
      
      const initialCount = await boardsPage.getBoardCount();
      
      await boardsPage.deleteBoard(boardName);
      
      // Verify board is deleted
      await boardsPage.verifyBoardNotExists(boardName);
      
      const finalCount = await boardsPage.getBoardCount();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('should handle deletion cancellation', async ({ page }) => {
      const boardName = 'Board Not to Delete ' + Date.now();
      
      await boardsPage.createBoard({ name: boardName });
      
      // Open delete confirmation but cancel
      const menu = await boardsPage.openBoardMenu(boardName);
      await menu.locator('button:has-text("Delete")').click();
      
      const confirmDialog = page.locator('[data-testid="delete-board-dialog"]');
      await confirmDialog.waitFor({ state: 'visible' });
      await confirmDialog.locator('button:has-text("Cancel")').click();
      
      // Board should still exist
      await boardsPage.verifyBoardExists(boardName);
      
      // Cleanup
      await boardsPage.deleteBoard(boardName);
    });

    test('should handle network errors during deletion', async ({ page }) => {
      const boardName = 'Network Error Deletion ' + Date.now();
      
      await boardsPage.createBoard({ name: boardName });
      
      // Mock network failure for deletion
      await page.route('**/api/kanban/boards/*', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Failed to delete board' }),
          });
        } else {
          route.continue();
        }
      });

      const menu = await boardsPage.openBoardMenu(boardName);
      await menu.locator('button:has-text("Delete")').click();
      
      const confirmDialog = page.locator('[data-testid="delete-board-dialog"]');
      await confirmDialog.locator('button:has-text("Delete")').click();
      
      // Should show error message
      await expect(page.locator('.text-red-600, [data-testid="error-message"]')).toBeVisible();
      
      // Board should still exist
      await boardsPage.verifyBoardExists(boardName);
      
      // Cleanup (remove route mock first)
      await page.unroute('**/api/kanban/boards/*');
      await boardsPage.deleteBoard(boardName);
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no boards exist', async ({ page }) => {
      // Navigate to empty kanban page
      await page.goto('/kanban?empty=true'); // Assuming query param for empty state
      
      await boardsPage.verifyEmptyState();
      
      // Should allow creating first board from empty state
      const boardName = 'First Board ' + Date.now();
      await boardsPage.createBoard({ name: boardName });
      
      await boardsPage.verifyBoardExists(boardName);
      
      // Cleanup
      await boardsPage.deleteBoard(boardName);
    });
  });

  test.describe('Loading and Error States', () => {
    test('should show loading state while fetching boards', async ({ page }) => {
      // Delay the API response
      await page.route('**/api/kanban/boards', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });

      const loadingPromise = boardsPage.verifyLoadingState();
      await boardsPage.goto();
      
      await loadingPromise;
    });

    test('should show error state on API failure', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/kanban/boards', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await boardsPage.goto();
      await boardsPage.verifyErrorState();
    });
  });

  test.describe('Board Information Display', () => {
    test('should display board metadata correctly', async () => {
      const boardData = KanbanDataGenerator.createBoard({
        name: 'Metadata Test Board',
        description: 'Board for testing metadata display',
      });

      await boardsPage.createBoard({
        name: boardData.name,
        description: boardData.description,
      });

      const boardInfo = await boardsPage.getBoardInfo(boardData.name);
      
      expect(boardInfo.name).toBe(boardData.name);
      expect(boardInfo.description).toBe(boardData.description);
      expect(boardInfo.memberCount).toBeGreaterThanOrEqual(1);
      expect(boardInfo.cardCount).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      await boardsPage.deleteBoard(boardData.name);
    });

    test('should show board progress indicators', async ({ page }) => {
      const boardName = 'Progress Test Board';
      
      await boardsPage.createBoard({ name: boardName });
      
      const board = await boardsPage.findBoardByName(boardName);
      expect(board).not.toBeNull();
      
      // Should have progress bars for columns
      const progressBars = board!.locator('.h-2, [data-testid="column-progress"]');
      const progressCount = await progressBars.count();
      expect(progressCount).toBeGreaterThan(0);
      
      // Cleanup
      await boardsPage.deleteBoard(boardName);
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      const boardName = 'Keyboard Nav Board';
      await boardsPage.createBoard({ name: boardName });
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test Enter key on board
      const board = await boardsPage.findBoardByName(boardName);
      await board!.focus();
      await page.keyboard.press('Enter');
      
      // Should navigate to board
      await expect(page).toHaveURL(/\/kanban\/[^\/]+$/);
      
      // Go back and cleanup
      await page.goBack();
      await boardsPage.deleteBoard(boardName);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const boardName = 'ARIA Test Board';
      await boardsPage.createBoard({ name: boardName });
      
      const board = await boardsPage.findBoardByName(boardName);
      expect(board).not.toBeNull();
      
      // Check for accessibility attributes
      const ariaLabel = await board!.getAttribute('aria-label');
      const role = await board!.getAttribute('role');
      
      expect(ariaLabel || role).toBeTruthy();
      
      // Cleanup
      await boardsPage.deleteBoard(boardName);
    });
  });
});