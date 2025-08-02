/**
 * Page Object Model for individual Kanban board page
 * Handles board view, columns, cards, and drag-and-drop interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestKanbanCard, TestKanbanColumn } from '../../fixtures/kanban-test-data';
import { DragDropResult } from '../../utils/kanban-test-helpers';

export class KanbanBoardPage extends BasePage {
  // Header elements
  private readonly backButton = this.page.locator('[data-testid="back-to-boards"]');
  private readonly boardTitle = this.page.locator('[data-testid="board-title"], h1');
  private readonly boardDescription = this.page.locator('[data-testid="board-description"]');
  private readonly inviteButton = this.page.locator('[data-testid="invite-button"], button:has-text("Invite")');
  private readonly boardMenuButton = this.page.locator('[data-testid="board-menu-button"]');
  private readonly connectionStatus = this.page.locator('[data-testid="connection-status"]');
  
  // Board elements
  private readonly columnsContainer = this.page.locator('[data-testid="columns-container"]');
  private readonly columns = this.page.locator('[data-testid^="column-"]');
  
  // Card dialog
  private readonly cardDialog = this.page.locator('[data-testid="card-dialog"]');
  private readonly cardTitleInput = this.page.locator('#cardTitle');
  private readonly cardDescriptionInput = this.page.locator('#cardDescription');
  private readonly cardPrioritySelect = this.page.locator('#cardPriority');
  private readonly cardAssigneeInput = this.page.locator('#cardAssignee');
  private readonly cardDueDateInput = this.page.locator('#cardDueDate');
  private readonly saveCardButton = this.page.locator('button:has-text("Create Card"), button:has-text("Update Card")');
  private readonly cancelCardButton = this.page.locator('button:has-text("Cancel")');
  
  constructor(page: Page) {
    super(page);
  }

  async goto(boardId: string): Promise<void> {
    await this.page.goto(`/kanban/${boardId}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.columns.first().waitFor({ timeout: 10000 });
  }

  // Navigation
  async goBackToBoards(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL('/kanban');
  }

  // Board information
  async getBoardTitle(): Promise<string> {
    return await this.boardTitle.textContent() || '';
  }

  async getBoardDescription(): Promise<string | null> {
    try {
      return await this.boardDescription.textContent();
    } catch {
      return null;
    }
  }

  async getConnectionStatus(): Promise<string> {
    try {
      return await this.connectionStatus.getAttribute('data-status') || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Column operations
  async getColumns(): Promise<KanbanColumn[]> {
    const columnElements = await this.columns.all();
    const columns: KanbanColumn[] = [];
    
    for (const columnEl of columnElements) {
      const column = new KanbanColumn(columnEl);
      columns.push(column);
    }
    
    return columns;
  }

  async getColumnByName(name: string): Promise<KanbanColumn | null> {
    const columns = await this.getColumns();
    return columns.find(col => col.getName() === name) || null;
  }

  async getColumnById(id: string): Promise<KanbanColumn | null> {
    const columnEl = this.page.locator(`[data-testid="column-${id}"]`);
    const isVisible = await columnEl.isVisible().catch(() => false);
    return isVisible ? new KanbanColumn(columnEl) : null;
  }

  async addColumn(name: string, color?: string): Promise<void> {
    const addColumnButton = this.page.locator('[data-testid="add-column-button"]');
    await addColumnButton.click();
    
    const columnDialog = this.page.locator('[data-testid="column-dialog"]');
    await columnDialog.waitFor({ state: 'visible' });
    
    await this.page.fill('#columnName', name);
    if (color) {
      await this.page.fill('#columnColor', color);
    }
    
    await this.page.click('button:has-text("Add Column")');
    await columnDialog.waitFor({ state: 'hidden' });
  }

  // Card operations
  async createCard(columnId: string, cardData: Partial<TestKanbanCard>): Promise<void> {
    const column = await this.getColumnById(columnId);
    if (!column) {
      throw new Error(`Column ${columnId} not found`);
    }
    
    await column.clickAddCard();
    await this.fillCardForm(cardData);
    await this.saveCardButton.click();
    
    await this.cardDialog.waitFor({ state: 'hidden' });
    
    // Wait for card to appear
    if (cardData.title) {
      await this.page.waitForSelector(`[data-testid^="card-"]:has-text("${cardData.title}")`, {
        timeout: 10000
      });
    }
  }

  async editCard(cardId: string, updates: Partial<TestKanbanCard>): Promise<void> {
    const card = await this.getCardById(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    await card.openMenu();
    await this.page.click('[data-testid="edit-card"]');
    
    await this.cardDialog.waitFor({ state: 'visible' });
    await this.fillCardForm(updates);
    await this.saveCardButton.click();
    
    await this.cardDialog.waitFor({ state: 'hidden' });
  }

  async deleteCard(cardId: string): Promise<void> {
    const card = await this.getCardById(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    await card.openMenu();
    await this.page.click('[data-testid="delete-card"]');
    
    // Handle confirmation if present
    try {
      await this.page.click('button:has-text("Delete")', { timeout: 2000 });
    } catch {
      // No confirmation dialog
    }
    
    // Verify card is gone
    const cardElement = this.page.locator(`[data-testid="card-${cardId}"]`);
    await expect(cardElement).not.toBeVisible();
  }

  private async fillCardForm(cardData: Partial<TestKanbanCard>): Promise<void> {
    if (cardData.title !== undefined) {
      await this.cardTitleInput.fill(cardData.title);
    }
    
    if (cardData.description !== undefined) {
      await this.cardDescriptionInput.fill(cardData.description);
    }
    
    if (cardData.priority) {
      await this.cardPrioritySelect.selectOption(cardData.priority);
    }
    
    if (cardData.assignee !== undefined) {
      await this.cardAssigneeInput.fill(cardData.assignee);
    }
    
    if (cardData.dueDate !== undefined) {
      await this.cardDueDateInput.fill(cardData.dueDate);
    }
  }

  async getCardById(cardId: string): Promise<KanbanCard | null> {
    const cardEl = this.page.locator(`[data-testid="card-${cardId}"]`);
    const isVisible = await cardEl.isVisible().catch(() => false);
    return isVisible ? new KanbanCard(cardEl) : null;
  }

  async getCardByTitle(title: string): Promise<KanbanCard | null> {
    const cardEl = this.page.locator(`[data-testid^="card-"]:has-text("${title}")`);
    const isVisible = await cardEl.isVisible().catch(() => false);
    return isVisible ? new KanbanCard(cardEl) : null;
  }

  // Drag and drop operations
  async dragCardToColumn(cardId: string, targetColumnId: string): Promise<DragDropResult> {
    const startTime = Date.now();
    
    try {
      const card = this.page.locator(`[data-testid="card-${cardId}"]`);
      const targetColumn = this.page.locator(`[data-testid="column-${targetColumnId}"]`);
      
      if (!await card.isVisible() || !await targetColumn.isVisible()) {
        throw new Error('Card or target column not visible');
      }
      
      // Get bounding boxes
      const cardBox = await card.boundingBox();
      const columnBox = await targetColumn.boundingBox();
      
      if (!cardBox || !columnBox) {
        throw new Error('Could not get element coordinates');
      }
      
      // Perform drag operation
      await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await this.page.mouse.down();
      
      // Move to target with animation steps
      const steps = 10;
      const deltaX = (columnBox.x + columnBox.width / 2 - cardBox.x - cardBox.width / 2) / steps;
      const deltaY = (columnBox.y + 100 - cardBox.y - cardBox.height / 2) / steps; // Drop in column area
      
      for (let i = 1; i <= steps; i++) {
        await this.page.mouse.move(
          cardBox.x + cardBox.width / 2 + deltaX * i,
          cardBox.y + cardBox.height / 2 + deltaY * i
        );
        await this.page.waitForTimeout(50);
      }
      
      await this.page.mouse.up();
      await this.page.waitForTimeout(500); // Wait for drop animation
      
      // Verify card moved
      const cardInNewColumn = targetColumn.locator(`[data-testid="card-${cardId}"]`);
      await expect(cardInNewColumn).toBeVisible({ timeout: 5000 });
      
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async dragCardWithinColumn(cardId: string, targetPosition: number): Promise<DragDropResult> {
    const startTime = Date.now();
    
    try {
      const card = this.page.locator(`[data-testid="card-${cardId}"]`);
      const cardBox = await card.boundingBox();
      
      if (!cardBox) {
        throw new Error('Could not get card coordinates');
      }
      
      // Calculate target Y position (approximate)
      const targetY = cardBox.y + (targetPosition * 120); // Approximate card height + margin
      
      await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(cardBox.x + cardBox.width / 2, targetY);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(500);
      
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Touch drag and drop for mobile
  async touchDragCard(cardId: string, targetColumnId: string): Promise<DragDropResult> {
    const startTime = Date.now();
    
    try {
      const card = this.page.locator(`[data-testid="card-${cardId}"]`);
      const targetColumn = this.page.locator(`[data-testid="column-${targetColumnId}"]`);
      
      const cardBox = await card.boundingBox();
      const columnBox = await targetColumn.boundingBox();
      
      if (!cardBox || !columnBox) {
        throw new Error('Could not get element coordinates');
      }
      
      // Simulate touch events
      await card.dispatchEvent('touchstart', {
        touches: [{
          clientX: cardBox.x + cardBox.width / 2,
          clientY: cardBox.y + cardBox.height / 2,
        }],
      });
      
      await card.dispatchEvent('touchmove', {
        touches: [{
          clientX: columnBox.x + columnBox.width / 2,
          clientY: columnBox.y + 100,
        }],
      });
      
      await targetColumn.dispatchEvent('touchend', {
        touches: [],
      });
      
      await this.page.waitForTimeout(500);
      
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Validation helpers
  async verifyCardInColumn(cardId: string, columnId: string): Promise<void> {
    const column = this.page.locator(`[data-testid="column-${columnId}"]`);
    const cardInColumn = column.locator(`[data-testid="card-${cardId}"]`);
    await expect(cardInColumn).toBeVisible();
  }

  async verifyColumnCardCount(columnId: string, expectedCount: number): Promise<void> {
    const column = this.page.locator(`[data-testid="column-${columnId}"]`);
    const cards = column.locator('[data-testid^="card-"]');
    await expect(cards).toHaveCount(expectedCount);
  }

  async verifyDragVisualFeedback(): Promise<void> {
    // This would need specific implementation based on drag styling
    const draggedElements = this.page.locator('[data-dragging="true"], .opacity-50');
    await expect(draggedElements).toHaveCount(0); // No elements should be dragging at rest
  }

  // Performance measurements
  async measureBoardLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForPageLoad();
    return Date.now() - startTime;
  }

  async measureDragLatency(cardId: string, targetColumnId: string): Promise<number> {
    const result = await this.dragCardToColumn(cardId, targetColumnId);
    return result.duration;
  }
}

/**
 * Kanban Column helper class
 */
export class KanbanColumn {
  constructor(private locator: Locator) {}

  async getName(): Promise<string> {
    const nameEl = this.locator.locator('[data-testid="column-name"], h3');
    return await nameEl.textContent() || '';
  }

  async getCardCount(): Promise<number> {
    const cards = this.locator.locator('[data-testid^="card-"]');
    return await cards.count();
  }

  async getCards(): Promise<KanbanCard[]> {
    const cardElements = await this.locator.locator('[data-testid^="card-"]').all();
    return cardElements.map(el => new KanbanCard(el));
  }

  async clickAddCard(): Promise<void> {
    const addButton = this.locator.locator('[data-testid="add-card-button"]');
    await addButton.click();
  }

  async getColor(): Promise<string> {
    const colorEl = this.locator.locator('[data-testid="column-color"]');
    return await colorEl.getAttribute('data-color') || '';
  }

  async openMenu(): Promise<void> {
    const menuButton = this.locator.locator('[data-testid="column-menu"]');
    await menuButton.click();
  }

  async isDropZoneActive(): Promise<boolean> {
    const hasActiveClass = await this.locator.evaluate(el => 
      el.classList.contains('bg-blue-50') || el.classList.contains('border-dashed')
    );
    return hasActiveClass;
  }
}

/**
 * Kanban Card helper class
 */
export class KanbanCard {
  constructor(private locator: Locator) {}

  async getTitle(): Promise<string> {
    const titleEl = this.locator.locator('[data-testid="card-title"]');
    return await titleEl.textContent() || '';
  }

  async getDescription(): Promise<string | null> {
    try {
      const descEl = this.locator.locator('[data-testid="card-description"]');
      return await descEl.textContent();
    } catch {
      return null;
    }
  }

  async getPriority(): Promise<string> {
    const priorityEl = this.locator.locator('[data-testid="card-priority"]');
    return await priorityEl.textContent() || '';
  }

  async getAssignee(): Promise<string | null> {
    try {
      const assigneeEl = this.locator.locator('[data-testid="card-assignee"]');
      return await assigneeEl.textContent();
    } catch {
      return null;
    }
  }

  async getDueDate(): Promise<string | null> {
    try {
      const dueDateEl = this.locator.locator('[data-testid="card-due-date"]');
      return await dueDateEl.textContent();
    } catch {
      return null;
    }
  }

  async getLabels(): Promise<string[]> {
    const labelElements = await this.locator.locator('[data-testid="card-label"]').all();
    const labels: string[] = [];
    
    for (const labelEl of labelElements) {
      const text = await labelEl.textContent();
      if (text) labels.push(text.trim());
    }
    
    return labels;
  }

  async openMenu(): Promise<void> {
    const menuButton = this.locator.locator('[data-testid="card-menu"]');
    await menuButton.click();
  }

  async click(): Promise<void> {
    await this.locator.click();
  }

  async hover(): Promise<void> {
    await this.locator.hover();
  }

  async isDragging(): Promise<boolean> {
    return await this.locator.getAttribute('data-dragging') === 'true';
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    const box = await this.locator.boundingBox();
    if (!box) throw new Error('Card not visible');
    
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  }
}