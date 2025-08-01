import { Page, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for the Dashboard page
 */
export class DashboardPage extends BasePage {
  private readonly selectors = {
    dashboard: '[data-testid="dashboard"]',
    welcomeMessage: '[data-testid="welcome-message"]',
    recentBoards: '[data-testid="recent-boards"]',
    recentPages: '[data-testid="recent-pages"]',
    recentMemories: '[data-testid="recent-memories"]',
    quickActions: '[data-testid="quick-actions"]',
    analyticsWidget: '[data-testid="analytics-widget"]',
    activityFeed: '[data-testid="activity-feed"]',
    createBoardButton: '[data-testid="create-board-quick"]',
    createPageButton: '[data-testid="create-page-quick"]',
    createMemoryButton: '[data-testid="create-memory-quick"]',
    viewAllBoardsButton: '[data-testid="view-all-boards"]',
    viewAllPagesButton: '[data-testid="view-all-pages"]',
    viewAllMemoriesButton: '[data-testid="view-all-memories"]',
    searchBox: '[data-testid="dashboard-search"]',
    connectionStatus: '[data-testid="connection-status"]'
  };

  constructor(page: Page) {
    super(page);
  }

  protected getPath(): string {
    return '/dashboard';
  }

  protected async waitForPageSpecificElement(): Promise<void> {
    await expect(this.page.locator(this.selectors.dashboard)).toBeVisible();
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    const welcomeElement = this.page.locator(this.selectors.welcomeMessage);
    await expect(welcomeElement).toBeVisible();
    return await welcomeElement.textContent() || '';
  }

  /**
   * Check if dashboard sections are visible
   */
  async checkDashboardSections(): Promise<{
    recentBoards: boolean;
    recentPages: boolean;
    recentMemories: boolean;
    quickActions: boolean;
    analyticsWidget: boolean;
    activityFeed: boolean;
  }> {
    return {
      recentBoards: await this.page.locator(this.selectors.recentBoards).count() > 0,
      recentPages: await this.page.locator(this.selectors.recentPages).count() > 0,
      recentMemories: await this.page.locator(this.selectors.recentMemories).count() > 0,
      quickActions: await this.page.locator(this.selectors.quickActions).count() > 0,
      analyticsWidget: await this.page.locator(this.selectors.analyticsWidget).count() > 0,
      activityFeed: await this.page.locator(this.selectors.activityFeed).count() > 0
    };
  }

  /**
   * Quick action methods
   */
  async createBoardQuickAction(): Promise<void> {
    await this.page.click(this.selectors.createBoardButton);
    await this.page.waitForURL('**/kanban/new**');
  }

  async createPageQuickAction(): Promise<void> {
    await this.page.click(this.selectors.createPageButton);
    await this.page.waitForURL('**/wiki/new**');
  }

  async createMemoryQuickAction(): Promise<void> {
    await this.page.click(this.selectors.createMemoryButton);
    await this.page.waitForURL('**/memory/new**');
  }

  /**
   * Navigation to full views
   */
  async viewAllBoards(): Promise<void> {
    await this.page.click(this.selectors.viewAllBoardsButton);
    await this.page.waitForURL('**/kanban**');
  }

  async viewAllPages(): Promise<void> {
    await this.page.click(this.selectors.viewAllPagesButton);
    await this.page.waitForURL('**/wiki**');
  }

  async viewAllMemories(): Promise<void> {
    await this.page.click(this.selectors.viewAllMemoriesButton);
    await this.page.waitForURL('**/memory**');
  }

  /**
   * Get recent items count
   */
  async getRecentBoardsCount(): Promise<number> {
    const boards = this.page.locator(`${this.selectors.recentBoards} [data-testid*="board-item"]`);
    return await boards.count();
  }

  async getRecentPagesCount(): Promise<number> {
    const pages = this.page.locator(`${this.selectors.recentPages} [data-testid*="page-item"]`);
    return await pages.count();
  }

  async getRecentMemoriesCount(): Promise<number> {
    const memories = this.page.locator(`${this.selectors.recentMemories} [data-testid*="memory-item"]`);
    return await memories.count();
  }

  /**
   * Click on recent items
   */
  async clickRecentBoard(index: number = 0): Promise<void> {
    const boards = this.page.locator(`${this.selectors.recentBoards} [data-testid*="board-item"]`);
    await boards.nth(index).click();
    await this.page.waitForURL('**/kanban/**');
  }

  async clickRecentPage(index: number = 0): Promise<void> {
    const pages = this.page.locator(`${this.selectors.recentPages} [data-testid*="page-item"]`);
    await pages.nth(index).click();
    await this.page.waitForURL('**/wiki/**');
  }

  async clickRecentMemory(index: number = 0): Promise<void> {
    const memories = this.page.locator(`${this.selectors.recentMemories} [data-testid*="memory-item"]`);
    await memories.nth(index).click();
    await this.page.waitForURL('**/memory/**');
  }

  /**
   * Search functionality
   */
  async searchFromDashboard(query: string): Promise<void> {
    await this.search(query, this.selectors.searchBox);
  }

  /**
   * Check analytics widget
   */
  async getAnalyticsData(): Promise<{
    hasData: boolean;
    boardsCount?: string;
    pagesCount?: string;
    memoriesCount?: string;
  }> {
    const analyticsWidget = this.page.locator(this.selectors.analyticsWidget);
    const hasData = await analyticsWidget.count() > 0;

    if (!hasData) {
      return { hasData: false };
    }

    const boardsCount = await analyticsWidget.locator('[data-testid="boards-count"]').textContent();
    const pagesCount = await analyticsWidget.locator('[data-testid="pages-count"]').textContent();
    const memoriesCount = await analyticsWidget.locator('[data-testid="memories-count"]').textContent();

    return {
      hasData: true,
      boardsCount: boardsCount || undefined,
      pagesCount: pagesCount || undefined,
      memoriesCount: memoriesCount || undefined
    };
  }

  /**
   * Activity feed methods
   */
  async getActivityFeedItems(): Promise<string[]> {
    const activityItems = this.page.locator(`${this.selectors.activityFeed} [data-testid*="activity-item"]`);
    const count = await activityItems.count();
    const items: string[] = [];

    for (let i = 0; i < count; i++) {
      const itemText = await activityItems.nth(i).textContent();
      if (itemText) {
        items.push(itemText);
      }
    }

    return items;
  }

  async hasRecentActivity(): Promise<boolean> {
    const activityItems = await this.getActivityFeedItems();
    return activityItems.length > 0;
  }

  /**
   * Connection status check
   */
  async checkConnectionStatus(): Promise<'connected' | 'disconnected' | 'connecting'> {
    const statusElement = this.page.locator(this.selectors.connectionStatus);
    
    if (await statusElement.count() === 0) {
      return 'disconnected';
    }

    const status = await statusElement.getAttribute('data-status');
    return (status as 'connected' | 'disconnected' | 'connecting') || 'disconnected';
  }

  /**
   * Wait for real-time updates
   */
  async waitForActivityUpdate(): Promise<void> {
    // Wait for new activity to appear in the feed
    await this.page.waitForFunction(() => {
      const feed = document.querySelector('[data-testid="activity-feed"]');
      return feed && feed.children.length > 0;
    }, { timeout: 10000 });
  }

  /**
   * Check if dashboard is showing empty state
   */
  async isEmptyState(): Promise<{
    hasBoards: boolean;
    hasPages: boolean;
    hasMemories: boolean;
    showingEmptyState: boolean;
  }> {
    const hasBoards = await this.getRecentBoardsCount() > 0;
    const hasPages = await this.getRecentPagesCount() > 0;
    const hasMemories = await this.getRecentMemoriesCount() > 0;
    
    const emptyStateElement = this.page.locator('[data-testid="empty-dashboard"]');
    const showingEmptyState = await emptyStateElement.count() > 0;

    return {
      hasBoards,
      hasPages,
      hasMemories,
      showingEmptyState
    };
  }

  /**
   * Verify dashboard loads with user data
   */
  async verifyDashboardLoaded(): Promise<void> {
    // Check essential elements are present
    await expect(this.page.locator(this.selectors.dashboard)).toBeVisible();
    await expect(this.page.locator(this.selectors.welcomeMessage)).toBeVisible();
    await expect(this.page.locator(this.selectors.quickActions)).toBeVisible();

    // Wait for any loading to complete
    await this.waitForLoadingToFinish();
  }

  /**
   * Test responsive behavior
   */
  async testMobileLayout(): Promise<void> {
    await this.setMobileViewport();
    
    // Check if mobile-specific elements are shown
    const mobileNav = this.page.locator('[data-testid="mobile-nav"]');
    const desktopSidebar = this.page.locator('[data-testid="desktop-sidebar"]');
    
    // Mobile nav should be visible, desktop sidebar should be hidden
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
    
    if (await desktopSidebar.count() > 0) {
      await expect(desktopSidebar).toBeHidden();
    }
  }

  async testTabletLayout(): Promise<void> {
    await this.setTabletViewport();
    
    // Verify layout adapts to tablet size
    await expect(this.page.locator(this.selectors.dashboard)).toBeVisible();
  }

  /**
   * Keyboard navigation testing
   */
  async testKeyboardNavigation(): Promise<void> {
    // Test tab navigation through quick actions
    await this.page.keyboard.press('Tab');
    
    // Should be able to navigate through all interactive elements
    const quickActionButtons = this.page.locator(`${this.selectors.quickActions} button`);
    const buttonCount = await quickActionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const currentButton = quickActionButtons.nth(i);
      await expect(currentButton).toBeFocused();
      await this.page.keyboard.press('Tab');
    }
  }
}