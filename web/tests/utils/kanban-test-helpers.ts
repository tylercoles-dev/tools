/**
 * Kanban test helper utilities
 * Provides common functions for Kanban board testing
 */

import { Page, Locator, expect } from '@playwright/test';
import { TestKanbanBoard, TestKanbanCard, TestKanbanColumn } from '../fixtures/kanban-test-data';

export interface DragDropCoordinates {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface DragDropResult {
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Kanban test helper class with utilities for board interactions
 */
export class KanbanTestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToKanbanHome() {
    await this.page.goto('/kanban');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToBoard(boardId: string) {
    await this.page.goto(`/kanban/${boardId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Board management helpers
  async createBoard(name: string, description?: string): Promise<void> {
    // Click "New Board" button
    await this.page.click('[data-testid="new-board-button"], button:has-text("New Board")');
    
    // Fill board details
    await this.page.fill('#boardName', name);
    if (description) {
      await this.page.fill('#boardDescription', description);
    }
    
    // Submit form
    await this.page.click('button:has-text("Create Board")');
    
    // Wait for success
    await this.page.waitForSelector('[data-testid="board-card"]:has-text("' + name + '")', {
      timeout: 10000
    });
  }

  async deleteBoard(boardName: string): Promise<void> {
    // Find board card and open menu
    const boardCard = this.page.locator(`[data-testid="board-card"]:has-text("${boardName}")`);
    await boardCard.locator('[data-testid="board-menu"]').click();
    
    // Click delete option
    await this.page.click('[data-testid="delete-board"]');
    
    // Confirm deletion
    await this.page.click('button:has-text("Delete")');
    
    // Verify board is gone
    await expect(boardCard).not.toBeVisible();
  }

  // Card management helpers
  async createCard(columnId: string, cardData: Partial<TestKanbanCard>): Promise<void> {
    // Click add card button in column
    const column = this.page.locator(`[data-testid="column-${columnId}"]`);
    await column.locator('[data-testid="add-card-button"]').click();
    
    // Fill card form
    await this.page.fill('#cardTitle', cardData.title || 'Test Card');
    
    if (cardData.description) {
      await this.page.fill('#cardDescription', cardData.description);
    }
    
    if (cardData.priority) {
      await this.page.selectOption('#cardPriority', cardData.priority);
    }
    
    if (cardData.assignee) {
      await this.page.fill('#cardAssignee', cardData.assignee);
    }
    
    if (cardData.dueDate) {
      await this.page.fill('#cardDueDate', cardData.dueDate);
    }
    
    // Submit form
    await this.page.click('button:has-text("Create Card")');
    
    // Wait for card to appear
    await this.page.waitForSelector(`[data-testid="card"]:has-text("${cardData.title}")`, {
      timeout: 10000
    });
  }

  async editCard(cardId: string, updates: Partial<TestKanbanCard>): Promise<void> {
    // Open card menu
    const card = this.page.locator(`[data-testid="card-${cardId}"]`);
    await card.locator('[data-testid="card-menu"]').click();
    
    // Click edit option
    await this.page.click('[data-testid="edit-card"]');
    
    // Update fields
    if (updates.title) {
      await this.page.fill('#cardTitle', updates.title);
    }
    
    if (updates.description !== undefined) {
      await this.page.fill('#cardDescription', updates.description);
    }
    
    if (updates.priority) {
      await this.page.selectOption('#cardPriority', updates.priority);
    }
    
    // Save changes
    await this.page.click('button:has-text("Update Card")');
    
    // Wait for update to complete
    await this.page.waitForLoadState('networkidle');
  }

  async deleteCard(cardId: string): Promise<void> {
    // Open card menu
    const card = this.page.locator(`[data-testid="card-${cardId}"]`);
    await card.locator('[data-testid="card-menu"]').click();
    
    // Click delete option
    await this.page.click('[data-testid="delete-card"]');
    
    // Confirm deletion if modal appears
    try {
      await this.page.click('button:has-text("Delete")', { timeout: 2000 });
    } catch {
      // No confirmation modal
    }
    
    // Verify card is gone
    await expect(card).not.toBeVisible();
  }

  // Drag and drop helpers
  async dragCardToColumn(cardId: string, targetColumnId: string): Promise<DragDropResult> {
    const startTime = Date.now();
    
    try {
      const card = this.page.locator(`[data-testid="card-${cardId}"]`);
      const targetColumn = this.page.locator(`[data-testid="column-${targetColumnId}"]`);
      
      // Get coordinates
      const cardBox = await card.boundingBox();
      const columnBox = await targetColumn.boundingBox();
      
      if (!cardBox || !columnBox) {
        throw new Error('Could not get element coordinates');
      }
      
      // Perform drag and drop
      await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await this.page.mouse.down();
      
      // Move to target with steps for smooth animation
      const steps = 10;
      const deltaX = (columnBox.x + columnBox.width / 2 - cardBox.x - cardBox.width / 2) / steps;
      const deltaY = (columnBox.y + columnBox.height / 2 - cardBox.y - cardBox.height / 2) / steps;
      
      for (let i = 1; i <= steps; i++) {
        await this.page.mouse.move(
          cardBox.x + cardBox.width / 2 + deltaX * i,
          cardBox.y + cardBox.height / 2 + deltaY * i
        );
        await this.page.waitForTimeout(50); // Smooth animation
      }
      
      await this.page.mouse.up();
      
      // Wait for drop to complete
      await this.page.waitForTimeout(500);
      
      // Verify card moved
      const cardInNewColumn = targetColumn.locator(`[data-testid="card-${cardId}"]`);
      await expect(cardInNewColumn).toBeVisible();
      
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
      
      // Calculate target position within the same column
      const targetY = cardBox.y + (targetPosition * 100); // Approximate card height
      
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

  // Touch/mobile drag and drop helpers
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
      await this.page.dispatchEvent(`[data-testid="card-${cardId}"]`, 'touchstart', {
        touches: [{
          clientX: cardBox.x + cardBox.width / 2,
          clientY: cardBox.y + cardBox.height / 2,
        }],
      });
      
      await this.page.dispatchEvent(`[data-testid="card-${cardId}"]`, 'touchmove', {
        touches: [{
          clientX: columnBox.x + columnBox.width / 2,
          clientY: columnBox.y + columnBox.height / 2,
        }],
      });
      
      await this.page.dispatchEvent(`[data-testid="column-${targetColumnId}"]`, 'touchend', {
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

  // Real-time collaboration helpers
  async simulateCollaboratorAction(action: string, data: any): Promise<void> {
    // Simulate WebSocket message from another user
    await this.page.evaluate(({ action, data }) => {
      // @ts-ignore - accessing global WebSocket if available
      if (window.testWebSocket) {
        window.testWebSocket.simulateMessage({
          type: action,
          data,
          userId: 'test-collaborator',
          timestamp: Date.now(),
        });
      }
    }, { action, data });
  }

  // Verification helpers
  async verifyBoardExists(boardName: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`[data-testid="board-card"]:has-text("${boardName}")`, {
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  async verifyCardInColumn(cardId: string, columnId: string): Promise<boolean> {
    try {
      const column = this.page.locator(`[data-testid="column-${columnId}"]`);
      await column.locator(`[data-testid="card-${cardId}"]`).waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifyCardCount(columnId: string, expectedCount: number): Promise<boolean> {
    const column = this.page.locator(`[data-testid="column-${columnId}"]`);
    const cards = column.locator('[data-testid^="card-"]');
    const actualCount = await cards.count();
    return actualCount === expectedCount;
  }

  async verifyDragVisualFeedback(cardId: string): Promise<boolean> {
    const card = this.page.locator(`[data-testid="card-${cardId}"]`);
    
    // Start drag
    await card.hover();
    await this.page.mouse.down();
    
    // Check for drag styling
    const hasOpacity = await card.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseFloat(styles.opacity) < 1;
    });
    
    const hasTransform = await card.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.transform !== 'none';
    });
    
    // End drag
    await this.page.mouse.up();
    
    return hasOpacity || hasTransform;
  }

  // Performance helpers
  async measureBoardLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureDragLatency(cardId: string, targetColumnId: string): Promise<number> {
    const result = await this.dragCardToColumn(cardId, targetColumnId);
    return result.duration;
  }

  // Accessibility helpers
  async testKeyboardNavigation(): Promise<boolean> {
    try {
      // Tab through interactive elements
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
      
      // Check if focus is visible
      const focusedElement = await this.page.locator(':focus').count();
      return focusedElement > 0;
    } catch {
      return false;
    }
  }

  async testScreenReaderAnnouncements(): Promise<string[]> {
    const announcements: string[] = [];
    
    // Listen for aria-live announcements
    await this.page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      liveRegions.forEach(region => {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              // @ts-ignore
              window.testAnnouncements = window.testAnnouncements || [];
              // @ts-ignore
              window.testAnnouncements.push(region.textContent);
            }
          });
        });
        observer.observe(region, { childList: true, subtree: true, characterData: true });
      });
    });
    
    return announcements;
  }

  // Error handling helpers
  async captureErrorLogs(): Promise<string[]> {
    const logs: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      logs.push(error.message);
    });
    
    return logs;
  }

  // Cleanup helpers
  async cleanup(): Promise<void> {
    // Remove any test data created during test
    await this.page.evaluate(() => {
      // Clear any test WebSocket connections
      // @ts-ignore
      if (window.testWebSocket) {
        window.testWebSocket.close();
      }
      
      // Clear test announcements
      // @ts-ignore
      delete window.testAnnouncements;
    });
  }
}

/**
 * Mock WebSocket for real-time collaboration testing
 */
export class MockWebSocket {
  private messageHandlers: Array<(data: any) => void> = [];
  
  constructor(private page: Page) {}
  
  async setup(): Promise<void> {
    await this.page.addInitScript(() => {
      // Mock WebSocket for testing
      class TestWebSocket {
        private handlers: { [key: string]: Function[] } = {};
        
        addEventListener(event: string, handler: Function) {
          if (!this.handlers[event]) {
            this.handlers[event] = [];
          }
          this.handlers[event].push(handler);
        }
        
        simulateMessage(data: any) {
          if (this.handlers['message']) {
            this.handlers['message'].forEach(handler => 
              handler({ data: JSON.stringify(data) })
            );
          }
        }
        
        send(data: string) {
          // Simulate server response
          setTimeout(() => {
            this.simulateMessage({ type: 'ack', data: JSON.parse(data) });
          }, 100);
        }
        
        close() {
          // Cleanup
        }
      }
      
      // @ts-ignore
      window.testWebSocket = new TestWebSocket();
    });
  }
  
  async simulateMessage(type: string, data: any): Promise<void> {
    await this.page.evaluate(({ type, data }) => {
      // @ts-ignore
      if (window.testWebSocket) {
        window.testWebSocket.simulateMessage({ type, data });
      }
    }, { type, data });
  }
}

// Export utility functions
export const waitForDragToComplete = async (page: Page, timeout = 5000): Promise<void> => {
  await page.waitForFunction(() => {
    // Check if any drag operation is in progress
    const dragElements = document.querySelectorAll('[data-dragging="true"]');
    return dragElements.length === 0;
  }, { timeout });
};

export const getCardPosition = async (page: Page, cardId: string): Promise<{x: number, y: number}> => {
  const card = page.locator(`[data-testid="card-${cardId}"]`);
  const box = await card.boundingBox();
  
  if (!box) {
    throw new Error(`Card ${cardId} not found or not visible`);
  }
  
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
};

export const validateCardData = (actual: any, expected: Partial<TestKanbanCard>): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      return false;
    }
  }
  return true;
};