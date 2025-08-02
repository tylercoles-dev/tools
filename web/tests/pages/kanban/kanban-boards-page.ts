/**
 * Page Object Model for Kanban Boards listing page
 * Handles interactions with the boards overview and creation
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestKanbanBoard } from '../../fixtures/kanban-test-data';

export class KanbanBoardsPage extends BasePage {
  // Selectors
  private readonly newBoardButton = this.page.locator('[data-testid="new-board-button"], button:has-text("New Board")');
  private readonly boardCards = this.page.locator('[data-testid="board-card"]');
  private readonly emptyState = this.page.locator('[data-testid="empty-boards-state"]');
  private readonly searchInput = this.page.locator('[data-testid="board-search"], input[placeholder*="Search"]');
  private readonly boardsGrid = this.page.locator('[data-testid="boards-grid"]');
  
  // Create Board Dialog
  private readonly createBoardDialog = this.page.locator('[data-testid="create-board-dialog"]');
  private readonly boardNameInput = this.page.locator('#boardName');
  private readonly boardDescriptionInput = this.page.locator('#boardDescription');
  private readonly createBoardSubmit = this.page.locator('button:has-text("Create Board")');
  private readonly cancelBoardCreation = this.page.locator('button:has-text("Cancel")');
  
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/kanban');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for either boards to load or empty state to appear
    await Promise.race([
      this.boardCards.first().waitFor({ timeout: 5000 }).catch(() => {}),
      this.emptyState.waitFor({ timeout: 5000 }).catch(() => {}),
    ]);
  }

  // Board listing interactions
  async getBoardCount(): Promise<number> {
    await this.waitForPageLoad();
    return await this.boardCards.count();
  }

  async getBoardNames(): Promise<string[]> {
    const boards = await this.boardCards.all();
    const names: string[] = [];
    
    for (const board of boards) {
      const name = await board.locator('[data-testid="board-title"], .font-semibold, h3').textContent();
      if (name) {
        names.push(name.trim());
      }
    }
    
    return names;
  }

  async findBoardByName(name: string): Promise<Locator | null> {
    const board = this.page.locator(`[data-testid="board-card"]:has-text("${name}")`);
    const isVisible = await board.isVisible({ timeout: 2000 }).catch(() => false);
    return isVisible ? board : null;
  }

  async openBoard(boardName: string): Promise<void> {
    const board = await this.findBoardByName(boardName);
    if (!board) {
      throw new Error(`Board "${boardName}" not found`);
    }
    
    await board.click();
    await this.page.waitForURL(/\/kanban\/[^\/]+$/);
    await this.page.waitForLoadState('networkidle');
  }

  async searchBoards(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for search debounce
  }

  // Board creation
  async openCreateBoardDialog(): Promise<void> {
    await this.newBoardButton.click();
    await this.createBoardDialog.waitFor({ state: 'visible' });
  }

  async createBoard(boardData: { name: string; description?: string }): Promise<void> {
    await this.openCreateBoardDialog();
    
    await this.boardNameInput.fill(boardData.name);
    
    if (boardData.description) {
      await this.boardDescriptionInput.fill(boardData.description);
    }
    
    await this.createBoardSubmit.click();
    
    // Wait for dialog to close and board to appear
    await this.createBoardDialog.waitFor({ state: 'hidden' });
    await this.page.waitForSelector(`[data-testid="board-card"]:has-text("${boardData.name}")`, {
      timeout: 10000
    });
  }

  async cancelBoardCreation(): Promise<void> {
    await this.cancelBoardCreation.click();
    await this.createBoardDialog.waitFor({ state: 'hidden' });
  }

  // Board management
  async openBoardMenu(boardName: string): Promise<Locator> {
    const board = await this.findBoardByName(boardName);
    if (!board) {
      throw new Error(`Board "${boardName}" not found`);
    }
    
    const menuButton = board.locator('[data-testid="board-menu"], button:has([data-testid="more-horizontal"]');
    await menuButton.click();
    
    const menu = this.page.locator('[data-testid="board-menu-dropdown"]');
    await menu.waitFor({ state: 'visible' });
    
    return menu;
  }

  async editBoard(boardName: string, newData: { name?: string; description?: string }): Promise<void> {
    const menu = await this.openBoardMenu(boardName);
    await menu.locator('[data-testid="edit-board"], button:has-text("Edit")').click();
    
    // Wait for edit dialog
    const editDialog = this.page.locator('[data-testid="edit-board-dialog"]');
    await editDialog.waitFor({ state: 'visible' });
    
    if (newData.name) {
      await this.page.fill('#editBoardName', newData.name);
    }
    
    if (newData.description !== undefined) {
      await this.page.fill('#editBoardDescription', newData.description);
    }
    
    await this.page.click('button:has-text("Save Changes")');
    await editDialog.waitFor({ state: 'hidden' });
  }

  async deleteBoard(boardName: string): Promise<void> {
    const menu = await this.openBoardMenu(boardName);
    await menu.locator('[data-testid="delete-board"], button:has-text("Delete")').click();
    
    // Handle confirmation dialog
    const confirmDialog = this.page.locator('[data-testid="delete-board-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.locator('button:has-text("Delete")').click();
    
    // Wait for board to be removed
    const boardCard = this.page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
    await expect(boardCard).not.toBeVisible();
  }

  // Board information
  async getBoardInfo(boardName: string): Promise<{
    name: string;
    description?: string;
    memberCount: number;
    cardCount: number;
  }> {
    const board = await this.findBoardByName(boardName);
    if (!board) {
      throw new Error(`Board "${boardName}" not found`);
    }
    
    const name = await board.locator('[data-testid="board-title"]').textContent() || boardName;
    const description = await board.locator('[data-testid="board-description"]').textContent();
    
    // Extract member and card counts from stats
    const memberText = await board.locator(':text-matches("\\d+ member")').textContent();
    const cardText = await board.locator(':text-matches("\\d+ card")').textContent();
    
    const memberCount = memberText ? parseInt(memberText.match(/\d+/)?.[0] || '0') : 0;
    const cardCount = cardText ? parseInt(cardText.match(/\d+/)?.[0] || '0') : 0;
    
    return {
      name: name.trim(),
      description: description?.trim(),
      memberCount,
      cardCount,
    };
  }

  // Validation helpers
  async verifyEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.page.locator(':has-text("No boards yet")')).toBeVisible();
  }

  async verifyBoardExists(boardName: string): Promise<void> {
    const board = await this.findBoardByName(boardName);
    expect(board).not.toBeNull();
    await expect(board!).toBeVisible();
  }

  async verifyBoardNotExists(boardName: string): Promise<void> {
    const board = this.page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
    await expect(board).not.toBeVisible();
  }

  async verifyBoardCount(expectedCount: number): Promise<void> {
    const actualCount = await this.getBoardCount();
    expect(actualCount).toBe(expectedCount);
  }

  // Form validation
  async verifyCreateBoardValidation(testCase: {
    name: string;
    description?: string;
    expectedError: string;
  }): Promise<void> {
    await this.openCreateBoardDialog();
    
    await this.boardNameInput.fill(testCase.name);
    if (testCase.description) {
      await this.boardDescriptionInput.fill(testCase.description);
    }
    
    await this.createBoardSubmit.click();
    
    // Check for validation error
    const errorMessage = this.page.locator('[data-testid="form-error"], .text-red-600');
    await expect(errorMessage).toContainText(testCase.expectedError);
  }

  // Loading and error states
  async verifyLoadingState(): Promise<void> {
    const loadingIndicator = this.page.locator('[data-testid="boards-loading"], .animate-pulse');
    await expect(loadingIndicator).toBeVisible();
  }

  async verifyErrorState(): Promise<void> {
    const errorMessage = this.page.locator('[data-testid="boards-error"], :has-text("Failed to load")');
    await expect(errorMessage).toBeVisible();
  }
}

/**
 * Board card component helper
 */
export class BoardCard {
  constructor(private locator: Locator) {}

  async getName(): Promise<string> {
    const name = await this.locator.locator('[data-testid="board-title"]').textContent();
    return name?.trim() || '';
  }

  async getDescription(): Promise<string | null> {
    const description = await this.locator.locator('[data-testid="board-description"]').textContent();
    return description?.trim() || null;
  }

  async getMemberCount(): Promise<number> {
    const memberText = await this.locator.locator(':text-matches("\\d+ member")').textContent();
    return memberText ? parseInt(memberText.match(/\d+/)?.[0] || '0') : 0;
  }

  async getCardCount(): Promise<number> {
    const cardText = await this.locator.locator(':text-matches("\\d+ card")').textContent();
    return cardText ? parseInt(cardText.match(/\d+/)?.[0] || '0') : 0;
  }

  async click(): Promise<void> {
    await this.locator.click();
  }

  async openMenu(): Promise<Locator> {
    const menuButton = this.locator.locator('[data-testid="board-menu"]');
    await menuButton.click();
    return this.locator.page().locator('[data-testid="board-menu-dropdown"]');
  }

  async hover(): Promise<void> {
    await this.locator.hover();
  }

  async isVisible(): Promise<boolean> {
    return await this.locator.isVisible();
  }
}