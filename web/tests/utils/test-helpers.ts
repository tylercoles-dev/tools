import { Page, Locator, expect } from '@playwright/test';

/**
 * Test helper utilities for common operations across tests
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a loading spinner to disappear
   */
  async waitForLoading(timeout = 10000) {
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any loading spinners to disappear
    const loadingSpinners = this.page.locator('[data-testid*="loading"], [data-testid*="spinner"], .loading');
    if (await loadingSpinners.count() > 0) {
      await loadingSpinners.first().waitFor({ state: 'hidden', timeout });
    }
  }

  /**
   * Fill form and submit with validation
   */
  async fillAndSubmitForm(formSelector: string, data: Record<string, string>, submitButtonSelector?: string) {
    const form = this.page.locator(formSelector);
    await expect(form).toBeVisible();

    // Fill form fields
    for (const [field, value] of Object.entries(data)) {
      const input = form.locator(`[data-testid="${field}"], [name="${field}"], [id="${field}"]`).first();
      await expect(input).toBeVisible();
      await input.fill(value);
    }

    // Submit form
    const submitButton = submitButtonSelector 
      ? form.locator(submitButtonSelector)
      : form.locator('[type="submit"], [data-testid*="submit"], [data-testid*="save"]').first();
    
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  /**
   * Navigate to a page and wait for it to load completely
   */
  async navigateAndWait(url: string, waitForSelector?: string) {
    await this.page.goto(url);
    await this.waitForLoading();
    
    if (waitForSelector) {
      await expect(this.page.locator(waitForSelector)).toBeVisible();
    }
  }

  /**
   * Take a screenshot with timestamp for debugging
   */
  async takeTimestampedScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for toast message and verify its content
   */
  async waitForToast(expectedMessage?: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') {
    const toastSelector = `[data-testid="toast"], [data-testid="toast-${type}"], .toast`;
    const toast = this.page.locator(toastSelector).first();
    
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    if (expectedMessage) {
      await expect(toast).toContainText(expectedMessage);
    }
    
    return toast;
  }

  /**
   * Wait for modal/dialog to appear and return its locator
   */
  async waitForModal(modalSelector = '[data-testid*="modal"], [data-testid*="dialog"], [role="dialog"]') {
    const modal = this.page.locator(modalSelector).first();
    await expect(modal).toBeVisible();
    return modal;
  }

  /**
   * Close modal/dialog by clicking outside or close button
   */
  async closeModal(modalSelector?: string) {
    const modal = modalSelector 
      ? this.page.locator(modalSelector).first()
      : this.page.locator('[data-testid*="modal"], [data-testid*="dialog"], [role="dialog"]').first();
    
    // Try close button first
    const closeButton = modal.locator('[data-testid*="close"], [aria-label*="close"], .close').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
    } else {
      // Press Escape key
      await this.page.keyboard.press('Escape');
    }
    
    await expect(modal).toBeHidden();
  }

  /**
   * Drag and drop between elements
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    const source = this.page.locator(sourceSelector);
    const target = this.page.locator(targetSelector);
    
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();
    
    await source.dragTo(target);
  }

  /**
   * Wait for WebSocket connection and real-time updates
   */
  async waitForRealtimeConnection(timeout = 5000) {
    // Wait for connection status indicator
    const connectionStatus = this.page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.count() > 0) {
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected', { timeout });
    }
  }

  /**
   * Generate random test data
   */
  generateTestData() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    return {
      email: `test+${timestamp}@mcptools.dev`,
      username: `testuser${random}`,
      boardName: `Test Board ${timestamp}`,
      cardTitle: `Test Card ${timestamp}`,
      pageTitle: `Test Page ${timestamp}`,
      comment: `Test comment at ${new Date().toISOString()}`,
      tag: `test-tag-${random}`,
    };
  }

  /**
   * Clean up test data by searching for test-prefixed items
   */
  async cleanupTestData() {
    // Clean up test boards
    await this.page.goto('/kanban');
    await this.waitForLoading();
    
    const testBoards = this.page.locator('[data-testid*="board"]:has-text("Test Board"), [data-testid*="board"]:has-text("E2E Test")');
    const boardCount = await testBoards.count();
    
    for (let i = 0; i < Math.min(boardCount, 5); i++) { // Limit cleanup to prevent infinite loops
      try {
        await testBoards.nth(0).click(); // Always click first as list changes
        await this.page.click('[data-testid="board-menu-button"]');
        await this.page.click('[data-testid="delete-board-button"]');
        await this.page.click('[data-testid="confirm-delete"]');
        await this.waitForLoading();
      } catch (error) {
        console.warn(`Failed to delete test board ${i}:`, error);
        break; // Stop cleanup if it's failing
      }
    }
    
    // Clean up test wiki pages
    await this.page.goto('/wiki');
    await this.waitForLoading();
    
    const testPages = this.page.locator('[data-testid*="page"]:has-text("Test Page"), [data-testid*="page"]:has-text("E2E Test")');
    const pageCount = await testPages.count();
    
    for (let i = 0; i < Math.min(pageCount, 5); i++) {
      try {
        await testPages.nth(0).click();
        await this.page.click('[data-testid="page-menu-button"]');
        await this.page.click('[data-testid="delete-page-button"]');
        await this.page.click('[data-testid="confirm-delete"]');
        await this.waitForLoading();
      } catch (error) {
        console.warn(`Failed to delete test page ${i}:`, error);
        break;
      }
    }
  }

  /**
   * Assert URL matches pattern with timeout
   */
  async assertUrlMatches(pattern: string | RegExp, timeout = 5000) {
    await this.page.waitForURL(pattern, { timeout });
    expect(this.page.url()).toMatch(pattern);
  }

  /**
   * Get element text content safely
   */
  async getTextContent(selector: string): Promise<string> {
    const element = this.page.locator(selector).first();
    await expect(element).toBeVisible();
    return await element.textContent() || '';
  }

  /**
   * Check if element exists without throwing
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(urlPattern: string | RegExp, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
    return await this.page.waitForResponse(response => 
      response.url().match(urlPattern) !== null && 
      response.request().method() === method
    );
  }

  /**
   * Mock API response for testing
   */
  async mockApiResponse(urlPattern: string | RegExp, responseData: any, status = 200) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }
}

/**
 * Custom test fixtures that extend Playwright's base test
 */
export const testData = {
  validUser: {
    email: 'test@mcptools.dev',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User'
  },
  
  invalidUser: {
    email: 'invalid@test.com',
    password: 'wrongpassword'
  },
  
  sampleBoard: {
    name: 'Sample Test Board',
    description: 'A board for testing purposes',
    columns: ['To Do', 'In Progress', 'Done']
  },
  
  sampleCard: {
    title: 'Sample Test Card',
    description: 'A card for testing drag and drop functionality'
  },
  
  sampleWikiPage: {
    title: 'Sample Test Wiki Page',
    content: '# Test Page\n\nThis is a test wiki page with some content.',
    tags: ['test', 'sample']
  }
};

/**
 * Test environment utilities
 */
export class TestEnvironment {
  static isCI(): boolean {
    return !!process.env.CI;
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static getBaseUrl(): string {
    return process.env.BASE_URL || 'http://localhost:3000';
  }

  static getApiUrl(): string {
    return process.env.API_URL || 'http://localhost:3001';
  }

  static shouldRunSlowTests(): boolean {
    return !this.isCI() || process.env.RUN_SLOW_TESTS === 'true';
  }

  static getTimeout(): number {
    return this.isCI() ? 60000 : 30000;
  }
}