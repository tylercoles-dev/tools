import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for the Wiki pages listing (/wiki)
 */
export class WikiPagesPage extends BasePage {
  // Header elements
  readonly wikiHeader: Locator;
  readonly newPageButton: Locator;
  readonly pageTitle: Locator;

  // Search and filters
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly showTreeToggle: Locator;

  // Page creation dialog
  readonly createPageDialog: Locator;
  readonly pageTitleInput: Locator;
  readonly pageContentTextarea: Locator;
  readonly pageCategorySelect: Locator;
  readonly pageParentSelect: Locator;
  readonly pageTagsInput: Locator;
  readonly createPageSubmitButton: Locator;
  readonly createPageCancelButton: Locator;

  // Sidebar/tree view
  readonly sidebar: Locator;
  readonly pageTreeContainer: Locator;
  readonly treePageItems: Locator;

  // Page grid/list
  readonly pagesGrid: Locator;
  readonly pageCards: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    // Header elements
    this.wikiHeader = page.locator('[data-testid="wiki-header"], header');
    this.newPageButton = page.locator('[data-testid="new-page-button"], button:has-text("New Page")');
    this.pageTitle = page.locator('h1, [data-testid="page-title"]');

    // Search and filters
    this.searchInput = page.locator('[data-testid="wiki-search"], input[placeholder*="Search"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"], select');
    this.showTreeToggle = page.locator('[data-testid="show-tree-toggle"]');

    // Page creation dialog
    this.createPageDialog = page.locator('[data-testid="create-page-dialog"], [role="dialog"]');
    this.pageTitleInput = page.locator('[data-testid="page-title-input"], #pageTitle, input[name="title"]');
    this.pageContentTextarea = page.locator('[data-testid="page-content-textarea"], #pageContent, textarea[name="content"]');
    this.pageCategorySelect = page.locator('[data-testid="page-category-select"], #pageCategory, select[name="category"]');
    this.pageParentSelect = page.locator('[data-testid="page-parent-select"], #pageParent, select[name="parent"]');
    this.pageTagsInput = page.locator('[data-testid="page-tags-input"], #pageTags, input[name="tags"]');
    this.createPageSubmitButton = page.locator('[data-testid="create-page-submit"], button:has-text("Create Page")');
    this.createPageCancelButton = page.locator('[data-testid="create-page-cancel"], button:has-text("Cancel")');

    // Sidebar/tree view
    this.sidebar = page.locator('[data-testid="wiki-sidebar"], aside');
    this.pageTreeContainer = page.locator('[data-testid="page-tree-container"]');
    this.treePageItems = page.locator('[data-testid="tree-page-item"], .tree-item');

    // Page grid/list
    this.pagesGrid = page.locator('[data-testid="pages-grid"], main');
    this.pageCards = page.locator('[data-testid="page-card"], .page-card');
    this.emptyStateMessage = page.locator('[data-testid="empty-state"], .empty-state');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading');
    this.errorMessage = page.locator('[data-testid="error-message"], .error');
  }

  async goto() {
    await this.navigateToRoute('/wiki');
    await this.waitForLoadState();
  }

  async waitForLoadState() {
    // Wait for either page content or empty state to be visible
    await Promise.race([
      this.pageCards.first().waitFor({ timeout: 10000 }),
      this.emptyStateMessage.waitFor({ timeout: 10000 }),
      this.errorMessage.waitFor({ timeout: 10000 })
    ]);
  }

  async searchPages(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(500); // Wait for search results
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForTimeout(500); // Wait for filter results
  }

  async toggleSidebar() {
    await this.showTreeToggle.click();
    await this.page.waitForTimeout(300); // Wait for animation
  }

  async openCreatePageDialog() {
    await this.newPageButton.click();
    await this.createPageDialog.waitFor({ state: 'visible' });
  }

  async createPage(pageData: {
    title: string;
    content: string;
    category?: string;
    parent?: string;
    tags?: string;
  }) {
    await this.openCreatePageDialog();
    
    // Fill page title
    await this.pageTitleInput.fill(pageData.title);
    
    // Fill content
    await this.pageContentTextarea.fill(pageData.content);
    
    // Select category if provided
    if (pageData.category) {
      await this.pageCategorySelect.selectOption(pageData.category);
    }
    
    // Select parent if provided
    if (pageData.parent) {
      await this.pageParentSelect.selectOption(pageData.parent);
    }
    
    // Fill tags if provided
    if (pageData.tags) {
      await this.pageTagsInput.fill(pageData.tags);
    }
    
    // Submit the form
    await this.createPageSubmitButton.click();
    await this.createPageDialog.waitFor({ state: 'hidden' });
    
    // Wait for page to be created and list to update
    await this.page.waitForTimeout(1000);
  }

  async cancelPageCreation() {
    await this.createPageCancelButton.click();
    await this.createPageDialog.waitFor({ state: 'hidden' });
  }

  async getPageCardByTitle(title: string): Promise<Locator> {
    return this.pageCards.filter({ hasText: title });
  }

  async clickPageByTitle(title: string) {
    const pageCard = await this.getPageCardByTitle(title);
    await pageCard.click();
  }

  async getTreePageByTitle(title: string): Promise<Locator> {
    return this.treePageItems.filter({ hasText: title });
  }

  async clickTreePageByTitle(title: string) {
    const treePage = await this.getTreePageByTitle(title);
    await treePage.click();
  }

  async getPageCount(): Promise<number> {
    await this.pageCards.first().waitFor({ timeout: 5000 }).catch(() => {});
    return await this.pageCards.count();
  }

  async getVisiblePageTitles(): Promise<string[]> {
    const titles: string[] = [];
    const count = await this.getPageCount();
    
    for (let i = 0; i < count; i++) {
      const title = await this.pageCards.nth(i).locator('[data-testid="page-title"], .card-title, h3, h2').textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }

  async getPageCategories(): Promise<string[]> {
    const categories: string[] = [];
    const count = await this.getPageCount();
    
    for (let i = 0; i < count; i++) {
      const categoryElement = this.pageCards.nth(i).locator('[data-testid="page-category"], .category-badge');
      if (await categoryElement.count() > 0) {
        const category = await categoryElement.textContent();
        if (category) {
          categories.push(category.trim());
        }
      }
    }
    
    return categories;
  }

  async getPageTags(pageIndex: number = 0): Promise<string[]> {
    const tags: string[] = [];
    const pageCard = this.pageCards.nth(pageIndex);
    const tagElements = pageCard.locator('[data-testid="page-tag"], .tag');
    
    const count = await tagElements.count();
    for (let i = 0; i < count; i++) {
      const tag = await tagElements.nth(i).textContent();
      if (tag) {
        tags.push(tag.replace('#', '').trim());
      }
    }
    
    return tags;
  }

  async isEmptyState(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible();
  }

  async isLoadingState(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  async isErrorState(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isErrorState()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }

  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  async getTreeStructure(): Promise<Array<{title: string, level: number}>> {
    const structure: Array<{title: string, level: number}> = [];
    const treeItems = this.treePageItems;
    const count = await treeItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = treeItems.nth(i);
      const title = await item.locator('[data-testid="tree-item-title"], .tree-item-title').textContent();
      
      // Determine nesting level based on CSS classes or margin/padding
      const classList = await item.getAttribute('class') || '';
      let level = 0;
      
      // Look for level indicators (adjust based on actual implementation)
      if (classList.includes('ml-6') || classList.includes('level-1')) level = 1;
      if (classList.includes('ml-12') || classList.includes('level-2')) level = 2;
      if (classList.includes('ml-18') || classList.includes('level-3')) level = 3;
      
      if (title) {
        structure.push({ title: title.trim(), level });
      }
    }
    
    return structure;
  }

  // Validation methods
  async verifyPageExists(title: string): Promise<boolean> {
    const pageCard = await this.getPageCardByTitle(title);
    return await pageCard.count() > 0;
  }

  async verifyPageInTree(title: string): Promise<boolean> {
    const treePage = await this.getTreePageByTitle(title);
    return await treePage.count() > 0;
  }

  async verifySearchResults(expectedCount: number) {
    await expect(this.pageCards).toHaveCount(expectedCount);
  }

  async verifyCategoryFilter(category: string, expectedCount: number) {
    await this.filterByCategory(category);
    await expect(this.pageCards).toHaveCount(expectedCount);
    
    // Verify all visible pages have the correct category
    const categories = await this.getPageCategories();
    categories.forEach(cat => {
      expect(cat.toLowerCase()).toBe(category.toLowerCase());
    });
  }

  async verifyEmptyState(message?: string) {
    await expect(this.emptyStateMessage).toBeVisible();
    if (message) {
      await expect(this.emptyStateMessage).toContainText(message);
    }
  }

  async verifyPageCreationDialog() {
    await expect(this.createPageDialog).toBeVisible();
    await expect(this.pageTitleInput).toBeVisible();
    await expect(this.pageContentTextarea).toBeVisible();
    await expect(this.createPageSubmitButton).toBeVisible();
    await expect(this.createPageCancelButton).toBeVisible();
  }

  async verifyPageCreated(title: string) {
    // Wait for the page to appear in the list
    await this.page.waitForTimeout(1000);
    await expect(this.getPageCardByTitle(title)).toBeVisible();
  }

  // Performance testing methods
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.goto();
    await this.waitForLoadState();
    return Date.now() - startTime;
  }

  async measureSearchTime(query: string): Promise<number> {
    const startTime = Date.now();
    await this.searchPages(query);
    return Date.now() - startTime;
  }
}