import { Page, Locator, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * Base Page Object that all other page objects extend
 * Contains common functionality and navigation methods
 */
export class BasePage {
  protected helpers: TestHelpers;
  
  // Common selectors used across pages
  protected readonly selectors = {
    navigation: '[data-testid="main-navigation"]',
    userMenu: '[data-testid="user-menu"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    toast: '[data-testid="toast"]',
    modal: '[data-testid="modal"]',
    confirmDialog: '[data-testid="confirm-dialog"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]'
  };

  constructor(protected page: Page) {
    this.helpers = new TestHelpers(page);
  }

  /**
   * Navigate to this page's URL
   */
  async goto(path?: string): Promise<void> {
    const fullPath = path || this.getPath();
    await this.helpers.navigateAndWait(fullPath);
  }

  /**
   * Get the path for this page - should be overridden by subclasses
   */
  protected getPath(): string {
    throw new Error('getPath() must be implemented by subclasses');
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.helpers.waitForLoading();
  }

  /**
   * Check if the page is currently displayed
   */
  async isDisplayed(): Promise<boolean> {
    try {
      await this.waitForPageSpecificElement();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for a page-specific element - should be overridden by subclasses
   */
  protected async waitForPageSpecificElement(): Promise<void> {
    // Default implementation - subclasses should override
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Common navigation methods
   */
  async navigateToDashboard(): Promise<void> {
    await this.page.click('[data-testid="nav-dashboard"]');
    await this.page.waitForURL('**/dashboard**');
  }

  async navigateToKanban(): Promise<void> {
    await this.page.click('[data-testid="nav-kanban"]');
    await this.page.waitForURL('**/kanban**');
  }

  async navigateToWiki(): Promise<void> {
    await this.page.click('[data-testid="nav-wiki"]');
    await this.page.waitForURL('**/wiki**');
  }

  async navigateToMemory(): Promise<void> {
    await this.page.click('[data-testid="nav-memory"]');
    await this.page.waitForURL('**/memory**');
  }

  /**
   * User menu operations
   */
  async openUserMenu(): Promise<void> {
    await this.page.click(this.selectors.userMenu);
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('**/auth/login**');
  }

  async getUserInfo(): Promise<{ name: string; email: string }> {
    await this.openUserMenu();
    const name = await this.page.textContent('[data-testid="user-name"]');
    const email = await this.page.textContent('[data-testid="user-email"]');
    
    // Close menu
    await this.page.keyboard.press('Escape');
    
    return {
      name: name || '',
      email: email || ''
    };
  }

  /**
   * Toast and notification handling
   */
  async waitForSuccessToast(message?: string): Promise<void> {
    await this.helpers.waitForToast(message, 'success');
  }

  async waitForErrorToast(message?: string): Promise<void> {
    await this.helpers.waitForToast(message, 'error');
  }

  async dismissToast(): Promise<void> {
    const toast = this.page.locator(this.selectors.toast);
    if (await toast.count() > 0) {
      await toast.locator('[data-testid="toast-close"]').click();
    }
  }

  /**
   * Modal and dialog handling
   */
  async waitForModal(): Promise<Locator> {
    return await this.helpers.waitForModal();
  }

  async closeModal(): Promise<void> {
    await this.helpers.closeModal();
  }

  async confirmAction(confirmText?: string): Promise<void> {
    const dialog = await this.page.locator(this.selectors.confirmDialog);
    await expect(dialog).toBeVisible();
    
    if (confirmText) {
      await expect(dialog).toContainText(confirmText);
    }
    
    await dialog.locator('[data-testid="confirm-button"]').click();
  }

  async cancelAction(): Promise<void> {
    const dialog = await this.page.locator(this.selectors.confirmDialog);
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="cancel-button"]').click();
  }

  /**
   * Form handling utilities
   */
  async fillForm(formData: Record<string, string>, formSelector = 'form'): Promise<void> {
    await this.helpers.fillAndSubmitForm(formSelector, formData);
  }

  async submitForm(formSelector = 'form'): Promise<void> {
    const submitButton = this.page.locator(`${formSelector} [type="submit"], ${formSelector} [data-testid*="submit"]`).first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  /**
   * Error handling
   */
  async getErrorMessage(): Promise<string> {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    await expect(errorElement).toBeVisible();
    return await errorElement.textContent() || '';
  }

  async hasError(): Promise<boolean> {
    return await this.page.locator(this.selectors.errorMessage).count() > 0;
  }

  /**
   * Loading state handling
   */
  async isLoading(): Promise<boolean> {
    return await this.page.locator(this.selectors.loadingSpinner).count() > 0;
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.helpers.waitForLoading();
  }

  /**
   * Search functionality (common across many pages)
   */
  async search(query: string, searchSelector = '[data-testid="search-input"]'): Promise<void> {
    const searchInput = this.page.locator(searchSelector);
    await expect(searchInput).toBeVisible();
    await searchInput.fill(query);
    await searchInput.press('Enter');
    await this.waitForLoadingToFinish();
  }

  async clearSearch(searchSelector = '[data-testid="search-input"]'): Promise<void> {
    const searchInput = this.page.locator(searchSelector);
    await searchInput.clear();
    await searchInput.press('Enter');
    await this.waitForLoadingToFinish();
  }

  /**
   * Real-time updates handling
   */
  async waitForRealtimeConnection(): Promise<void> {
    await this.helpers.waitForRealtimeConnection();
  }

  /**
   * Accessibility helpers
   */
  async checkPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  async checkHeading(headingText: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1): Promise<void> {
    const heading = this.page.locator(`h${level}:has-text("${headingText}")`);
    await expect(heading).toBeVisible();
  }

  async checkFocusManagement(expectedFocusedSelector: string): Promise<void> {
    const focusedElement = this.page.locator(expectedFocusedSelector);
    await expect(focusedElement).toBeFocused();
  }

  /**
   * Utility methods
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.helpers.takeTimestampedScreenshot(name);
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  /**
   * Keyboard navigation helpers
   */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressShiftTab(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  /**
   * Viewport and responsive testing
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  async setMobileViewport(): Promise<void> {
    await this.setViewportSize(375, 667); // iPhone SE size
  }

  async setTabletViewport(): Promise<void> {
    await this.setViewportSize(768, 1024); // iPad size
  }

  async setDesktopViewport(): Promise<void> {
    await this.setViewportSize(1280, 720); // Standard desktop
  }
}