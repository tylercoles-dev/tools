/**
 * End-to-End tests for Kanban card CRUD operations
 * Tests card creation, reading, updating, and deletion with validation
 */

import { test, expect } from '@playwright/test';
import { KanbanBoardsPage, KanbanBoardPage } from '../pages/kanban';
import { 
  KanbanDataGenerator, 
  CARD_TEMPLATES, 
  VALIDATION_TEST_CASES, 
  TestKanbanCard 
} from '../fixtures/kanban-test-data';

test.describe('Kanban Card Operations', () => {
  let boardsPage: KanbanBoardsPage;
  let boardPage: KanbanBoardPage;
  let testBoardId: string;
  let testBoardName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test board for all card operations
    const context = await browser.newContext();
    const page = await context.newPage();
    
    boardsPage = new KanbanBoardsPage(page);
    testBoardName = 'Card Operations Test Board ' + Date.now();
    
    await boardsPage.goto();
    await boardsPage.createBoard({
      name: testBoardName,
      description: 'Board for testing card operations',
    });
    
    // Extract board ID from URL after navigation
    await boardsPage.openBoard(testBoardName);
    const url = page.url();
    testBoardId = url.split('/').pop() || '';
    
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    boardPage = new KanbanBoardPage(page);
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

  test.describe('Card Creation', () => {
    test('should create a card with all fields', async () => {
      const cardData = {
        ...CARD_TEMPLATES.complete,
        title: 'Complete Card ' + Date.now(),
      };

      await boardPage.createCard('col-todo', cardData);
      
      // Verify card exists
      const card = await boardPage.getCardByTitle(cardData.title);
      expect(card).not.toBeNull();
      
      // Verify card details
      expect(await card!.getTitle()).toBe(cardData.title);
      expect(await card!.getDescription()).toBe(cardData.description);
      expect(await card!.getPriority()).toBe(cardData.priority);
      expect(await card!.getAssignee()).toBe(cardData.assignee);
    });

    test('should create a minimal card with only required fields', async () => {
      const cardData = {
        ...CARD_TEMPLATES.minimal,
        title: 'Minimal Card ' + Date.now(),
      };

      await boardPage.createCard('col-todo', cardData);
      
      const card = await boardPage.getCardByTitle(cardData.title);
      expect(card).not.toBeNull();
      
      expect(await card!.getTitle()).toBe(cardData.title);
      expect(await card!.getPriority()).toBe(cardData.priority);
      expect(await card!.getDescription()).toBeFalsy();
      expect(await card!.getAssignee()).toBeFalsy();
    });

    test('should create card in specific column', async () => {
      const cardTitle = 'In Progress Card ' + Date.now();
      
      await boardPage.createCard('col-progress', {
        title: cardTitle,
        priority: 'medium',
      });
      
      await boardPage.verifyCardInColumn(cardTitle.replace(/\s+/g, '-').toLowerCase(), 'col-progress');
    });

    test('should validate required card title', async ({ page }) => {
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      // Try to submit empty form
      await page.click('button:has-text("Create Card")');
      
      // Should show validation error
      const errorMessage = page.locator('[data-testid="form-error"], .text-red-600');
      await expect(errorMessage).toContainText('Title is required');
    });

    test('should validate card title length', async ({ page }) => {
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      const longTitle = 'x'.repeat(256);
      await page.fill('#cardTitle', longTitle);
      await page.click('button:has-text("Create Card")');
      
      const errorMessage = page.locator('[data-testid="form-error"], .text-red-600');
      await expect(errorMessage).toContainText('Title too long');
    });

    test('should handle network errors during creation', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/kanban/cards', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Failed to create card' }),
        });
      });

      const cardTitle = 'Network Error Card';
      
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', cardTitle);
      await page.click('button:has-text("Create Card")');
      
      // Should show error message
      await expect(page.locator('.text-red-600, [data-testid="error-message"]')).toBeVisible();
      
      // Card should not be created
      const card = await boardPage.getCardByTitle(cardTitle);
      expect(card).toBeNull();
    });

    test('should handle due date validation', async ({ page }) => {
      const column = await boardPage.getColumnById('col-todo');
      await column!.clickAddCard();
      
      await page.fill('#cardTitle', 'Date Validation Card');
      await page.fill('#cardDueDate', '2024-13-01'); // Invalid date
      await page.click('button:has-text("Create Card")');
      
      // Should show validation error or handle gracefully
      const hasError = await page.locator('.text-red-600').isVisible({ timeout: 2000 });
      
      if (hasError) {
        const errorMessage = page.locator('.text-red-600');
        await expect(errorMessage).toContainText('Invalid date');
      }
    });
  });

  test.describe('Card Reading/Display', () => {
    let testCards: string[] = [];

    test.beforeEach(async () => {
      // Create test cards with different data
      const cards = [
        { ...CARD_TEMPLATES.complete, title: 'High Priority Card ' + Date.now() },
        { ...CARD_TEMPLATES.minimal, title: 'Low Priority Card ' + Date.now() },
        { ...CARD_TEMPLATES.overdue, title: 'Overdue Card ' + Date.now() },
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

    test('should display card information correctly', async () => {
      const cardTitle = testCards[0];
      const card = await boardPage.getCardByTitle(cardTitle);
      
      expect(card).not.toBeNull();
      expect(await card!.getTitle()).toBe(cardTitle);
      expect(await card!.getPriority()).toBeTruthy();
    });

    test('should show priority styling correctly', async ({ page }) => {
      const highPriorityCard = await boardPage.getCardByTitle(testCards[0]);
      
      // Check for high priority styling
      const priorityElement = highPriorityCard!.locator('[data-testid="card-priority"]');
      const classList = await priorityElement.getAttribute('class');
      
      expect(classList).toContain('red'); // High priority should have red styling
    });

    test('should display due dates with proper formatting', async () => {
      const overdueCard = await boardPage.getCardByTitle(testCards[2]);
      const dueDate = await overdueCard!.getDueDate();
      
      expect(dueDate).toBeTruthy();
      // Should be formatted as a readable date
      expect(dueDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    test('should show assignee information', async () => {
      const completeCard = await boardPage.getCardByTitle(testCards[0]);
      const assignee = await completeCard!.getAssignee();
      
      expect(assignee).toBeTruthy();
    });

    test('should display labels/tags correctly', async () => {
      const completeCard = await boardPage.getCardByTitle(testCards[0]);
      const labels = await completeCard!.getLabels();
      
      expect(labels.length).toBeGreaterThan(0);
      expect(labels).toContain('test');
    });
  });

  test.describe('Card Editing', () => {
    let editTestCard: string;

    test.beforeEach(async () => {
      editTestCard = 'Editable Card ' + Date.now();
      
      await boardPage.createCard('col-todo', {
        title: editTestCard,
        description: 'Original description',
        priority: 'low',
        assignee: 'Original Assignee',
      });
    });

    test.afterEach(async () => {
      try {
        const card = await boardPage.getCardByTitle(editTestCard);
        if (card) {
          await card.openMenu();
          await boardPage.page.click('[data-testid="delete-card"]');
        }
      } catch {
        // Card might already be deleted
      }
    });

    test('should edit card title', async () => {
      const newTitle = 'Updated Card Title ' + Date.now();
      
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="edit-card"]');
      
      await boardPage.page.fill('#cardTitle', newTitle);
      await boardPage.page.click('button:has-text("Update Card")');
      
      // Verify title changed
      const updatedCard = await boardPage.getCardByTitle(newTitle);
      expect(updatedCard).not.toBeNull();
      
      // Original card should not exist
      const originalCard = await boardPage.getCardByTitle(editTestCard);
      expect(originalCard).toBeNull();
      
      editTestCard = newTitle; // Update for cleanup
    });

    test('should edit card description', async () => {
      const newDescription = 'Updated card description';
      
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="edit-card"]');
      
      await boardPage.page.fill('#cardDescription', newDescription);
      await boardPage.page.click('button:has-text("Update Card")');
      
      const updatedCard = await boardPage.getCardByTitle(editTestCard);
      expect(await updatedCard!.getDescription()).toBe(newDescription);
    });

    test('should edit card priority', async () => {
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="edit-card"]');
      
      await boardPage.page.selectOption('#cardPriority', 'high');
      await boardPage.page.click('button:has-text("Update Card")');
      
      const updatedCard = await boardPage.getCardByTitle(editTestCard);
      expect(await updatedCard!.getPriority()).toBe('high');
    });

    test('should edit card assignee', async () => {
      const newAssignee = 'New Assignee';
      
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="edit-card"]');
      
      await boardPage.page.fill('#cardAssignee', newAssignee);
      await boardPage.page.click('button:has-text("Update Card")');
      
      const updatedCard = await boardPage.getCardByTitle(editTestCard);
      expect(await updatedCard!.getAssignee()).toBe(newAssignee);
    });

    test('should edit card due date', async () => {
      const newDueDate = '2025-12-25';
      
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await boardPage.page.click('[data-testid="edit-card"]');
      
      await boardPage.page.fill('#cardDueDate', newDueDate);
      await boardPage.page.click('button:has-text("Update Card")');
      
      const updatedCard = await boardPage.getCardByTitle(editTestCard);
      const displayedDate = await updatedCard!.getDueDate();
      
      // Should contain the date (may be formatted differently)
      expect(displayedDate).toContain('25');
      expect(displayedDate).toContain('12');
    });

    test('should handle edit cancellation', async ({ page }) => {
      const originalTitle = editTestCard;
      
      const card = await boardPage.getCardByTitle(editTestCard);
      await card!.openMenu();
      await page.click('[data-testid="edit-card"]');
      
      // Make changes but cancel
      await page.fill('#cardTitle', 'Should Not Save');
      await page.click('button:has-text("Cancel")');
      
      // Original card should still exist with original title
      const unchangedCard = await boardPage.getCardByTitle(originalTitle);
      expect(unchangedCard).not.toBeNull();
      
      const changedCard = await boardPage.getCardByTitle('Should Not Save');
      expect(changedCard).toBeNull();
    });
  });

  test.describe('Card Deletion', () => {
    test('should delete a card', async () => {
      const cardTitle = 'Card to Delete ' + Date.now();
      
      await boardPage.createCard('col-todo', {
        title: cardTitle,
        priority: 'medium',
      });
      
      // Verify card exists
      let card = await boardPage.getCardByTitle(cardTitle);
      expect(card).not.toBeNull();
      
      // Delete card
      await card!.openMenu();
      await boardPage.page.click('[data-testid="delete-card"]');
      
      // Handle confirmation if present
      try {
        await boardPage.page.click('button:has-text("Delete")', { timeout: 2000 });
      } catch {
        // No confirmation dialog
      }
      
      // Verify card is deleted
      card = await boardPage.getCardByTitle(cardTitle);
      expect(card).toBeNull();
    });

    test('should handle deletion confirmation', async ({ page }) => {
      const cardTitle = 'Confirmation Delete Card ' + Date.now();
      
      await boardPage.createCard('col-todo', {
        title: cardTitle,
        priority: 'medium',
      });
      
      const card = await boardPage.getCardByTitle(cardTitle);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      // If confirmation dialog appears, test cancellation
      const confirmDialog = page.locator('[data-testid="delete-card-dialog"]');
      const hasConfirmDialog = await confirmDialog.isVisible({ timeout: 2000 });
      
      if (hasConfirmDialog) {
        await confirmDialog.locator('button:has-text("Cancel")').click();
        
        // Card should still exist
        const stillExistsCard = await boardPage.getCardByTitle(cardTitle);
        expect(stillExistsCard).not.toBeNull();
        
        // Now actually delete it
        await stillExistsCard!.openMenu();
        await page.click('[data-testid="delete-card"]');
        await confirmDialog.locator('button:has-text("Delete")').click();
      }
      
      // Verify final deletion
      const deletedCard = await boardPage.getCardByTitle(cardTitle);
      expect(deletedCard).toBeNull();
    });

    test('should handle network errors during deletion', async ({ page }) => {
      const cardTitle = 'Network Error Delete Card ' + Date.now();
      
      await boardPage.createCard('col-todo', {
        title: cardTitle,
        priority: 'medium',
      });
      
      // Mock network failure
      await page.route('**/api/kanban/cards/*', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Failed to delete card' }),
          });
        } else {
          route.continue();
        }
      });

      const card = await boardPage.getCardByTitle(cardTitle);
      await card!.openMenu();
      await page.click('[data-testid="delete-card"]');
      
      // Should show error message
      await expect(page.locator('.text-red-600, [data-testid="error-message"]')).toBeVisible();
      
      // Card should still exist
      const stillExistsCard = await boardPage.getCardByTitle(cardTitle);
      expect(stillExistsCard).not.toBeNull();
      
      // Cleanup (remove route mock first)
      await page.unroute('**/api/kanban/cards/*');
      await stillExistsCard!.openMenu();
      await page.click('[data-testid="delete-card"]');
    });
  });

  test.describe('Card Filtering and Search', () => {
    let filterTestCards: string[] = [];

    test.beforeEach(async () => {
      // Create cards with different properties for filtering
      const cards = [
        { title: 'High Priority Task', priority: 'high' as const, assignee: 'Alice' },
        { title: 'Medium Priority Task', priority: 'medium' as const, assignee: 'Bob' },
        { title: 'Low Priority Task', priority: 'low' as const, assignee: 'Alice' },
        { title: 'Urgent Bug Fix', priority: 'high' as const, assignee: 'Charlie' },
      ];

      for (const cardData of cards) {
        const uniqueTitle = cardData.title + ' ' + Date.now();
        await boardPage.createCard('col-todo', { ...cardData, title: uniqueTitle });
        filterTestCards.push(uniqueTitle);
      }
    });

    test.afterEach(async () => {
      // Clean up test cards
      for (const cardTitle of filterTestCards) {
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
      filterTestCards = [];
    });

    test('should search cards by title', async ({ page }) => {
      const searchTerm = 'Priority';
      
      // Assuming there's a search functionality
      const searchInput = page.locator('[data-testid="card-search"], input[placeholder*="Search"]');
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(500); // Debounce
        
        // All visible cards should contain the search term
        const visibleCards = await page.locator('[data-testid^="card-"]').all();
        for (const card of visibleCards) {
          const title = await card.locator('[data-testid="card-title"]').textContent();
          expect(title?.toLowerCase()).toContain(searchTerm.toLowerCase());
        }
      }
    });

    test('should filter cards by priority', async ({ page }) => {
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      
      if (await priorityFilter.isVisible({ timeout: 2000 })) {
        await priorityFilter.selectOption('high');
        await page.waitForTimeout(500);
        
        // Only high priority cards should be visible
        const visibleCards = await page.locator('[data-testid^="card-"]').all();
        for (const card of visibleCards) {
          const priority = await card.locator('[data-testid="card-priority"]').textContent();
          expect(priority?.toLowerCase()).toContain('high');
        }
      }
    });

    test('should filter cards by assignee', async ({ page }) => {
      const assigneeFilter = page.locator('[data-testid="assignee-filter"]');
      
      if (await assigneeFilter.isVisible({ timeout: 2000 })) {
        await assigneeFilter.selectOption('Alice');
        await page.waitForTimeout(500);
        
        // Only Alice's cards should be visible
        const visibleCards = await page.locator('[data-testid^="card-"]').all();
        for (const card of visibleCards) {
          const assignee = await card.locator('[data-testid="card-assignee"]').textContent();
          expect(assignee).toContain('Alice');
        }
      }
    });
  });

  test.describe('Card Validation Edge Cases', () => {
    test('should handle special characters in card title', async () => {
      const specialTitle = 'Card with "quotes" & <special> chars! @#$%';
      
      await boardPage.createCard('col-todo', {
        title: specialTitle,
        priority: 'medium',
      });
      
      const card = await boardPage.getCardByTitle(specialTitle);
      expect(card).not.toBeNull();
      expect(await card!.getTitle()).toBe(specialTitle);
      
      // Cleanup
      await card!.openMenu();
      await boardPage.page.click('[data-testid="delete-card"]');
    });

    test('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const cardTitle = 'Long Description Card ' + Date.now();
      
      await boardPage.createCard('col-todo', {
        title: cardTitle,
        description: longDescription,
        priority: 'medium',
      });
      
      const card = await boardPage.getCardByTitle(cardTitle);
      expect(card).not.toBeNull();
      
      const description = await card!.getDescription();
      expect(description).toContain('A'.repeat(100)); // Should contain at least part of it
      
      // Cleanup
      await card!.openMenu();
      await boardPage.page.click('[data-testid="delete-card"]');
    });

    test('should handle unicode characters', async () => {
      const unicodeTitle = '测试卡片 🎯 émojis & spéciàl chârs';
      
      await boardPage.createCard('col-todo', {
        title: unicodeTitle,
        priority: 'medium',
      });
      
      const card = await boardPage.getCardByTitle(unicodeTitle);
      expect(card).not.toBeNull();
      expect(await card!.getTitle()).toBe(unicodeTitle);
      
      // Cleanup
      await card!.openMenu();
      await boardPage.page.click('[data-testid="delete-card"]');
    });
  });
});