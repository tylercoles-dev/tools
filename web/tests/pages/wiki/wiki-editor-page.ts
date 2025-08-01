import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for the Wiki page editor/viewer (/wiki/[id])
 */
export class WikiEditorPage extends BasePage {
  // Header elements
  readonly backButton: Locator;
  readonly breadcrumbs: Locator;
  readonly pageTitle: Locator;
  
  // Action buttons
  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly previewToggle: Locator;

  // Edit form elements
  readonly titleInput: Locator;
  readonly categorySelect: Locator;
  readonly tagsInput: Locator;
  readonly contentTextarea: Locator;
  
  // Content display
  readonly contentDisplay: Locator;
  readonly markdownPreview: Locator;
  readonly previewContainer: Locator;
  
  // Sidebar elements
  readonly sidebar: Locator;
  readonly pageInfo: Locator;
  readonly createdDate: Locator;
  readonly updatedDate: Locator;
  readonly authorInfo: Locator;
  readonly childPages: Locator;
  
  // Status indicators
  readonly loadingSpinner: Locator;
  readonly savingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  
  // Edit mode specific
  readonly editModeContainer: Locator;
  readonly viewModeContainer: Locator;
  readonly editorToolbar: Locator;
  readonly previewPane: Locator;

  constructor(page: Page) {
    super(page);
    
    // Header elements
    this.backButton = page.locator('[data-testid="back-button"], button:has-text("Back"), [aria-label="Back"]');
    this.breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav');
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    
    // Action buttons
    this.editButton = page.locator('[data-testid="edit-button"], button:has-text("Edit")');
    this.saveButton = page.locator('[data-testid="save-button"], button:has-text("Save")');
    this.cancelButton = page.locator('[data-testid="cancel-button"], button:has-text("Cancel")');
    this.deleteButton = page.locator('[data-testid="delete-button"], button:has-text("Delete")');
    this.previewToggle = page.locator('[data-testid="preview-toggle"], button:has-text("Preview")');

    // Edit form elements
    this.titleInput = page.locator('[data-testid="title-input"], #title, input[name="title"]');
    this.categorySelect = page.locator('[data-testid="category-select"], #category, select[name="category"]');
    this.tagsInput = page.locator('[data-testid="tags-input"], #tags, input[name="tags"]');
    this.contentTextarea = page.locator('[data-testid="content-textarea"], #content, textarea[name="content"]');
    
    // Content display
    this.contentDisplay = page.locator('[data-testid="content-display"], .prose, .markdown-content');
    this.markdownPreview = page.locator('[data-testid="markdown-preview"], .preview');
    this.previewContainer = page.locator('[data-testid="preview-container"]');
    
    // Sidebar elements
    this.sidebar = page.locator('[data-testid="sidebar"], aside');
    this.pageInfo = page.locator('[data-testid="page-info"]');
    this.createdDate = page.locator('[data-testid="created-date"]');
    this.updatedDate = page.locator('[data-testid="updated-date"]');
    this.authorInfo = page.locator('[data-testid="author-info"]');
    this.childPages = page.locator('[data-testid="child-pages"]');
    
    // Status indicators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading');
    this.savingIndicator = page.locator('[data-testid="saving-indicator"], .saving');
    this.errorMessage = page.locator('[data-testid="error-message"], .error');
    this.successMessage = page.locator('[data-testid="success-message"], .success');
    
    // Edit mode specific
    this.editModeContainer = page.locator('[data-testid="edit-mode"]');
    this.viewModeContainer = page.locator('[data-testid="view-mode"]');
    this.editorToolbar = page.locator('[data-testid="editor-toolbar"], .toolbar');
    this.previewPane = page.locator('[data-testid="preview-pane"]');
  }

  async goto(pageId: string) {
    await this.navigateToRoute(`/wiki/${pageId}`);
    await this.waitForLoadState();
  }

  async gotoBySlug(slug: string) {
    await this.navigateToRoute(`/wiki/slug/${slug}`);
    await this.waitForLoadState();
  }

  async waitForLoadState() {
    // Wait for either content to load or error to appear
    await Promise.race([
      this.contentDisplay.waitFor({ timeout: 10000 }),
      this.errorMessage.waitFor({ timeout: 10000 }),
      this.editModeContainer.waitFor({ timeout: 10000 })
    ]);
  }

  async enterEditMode() {
    if (await this.isInEditMode()) {
      return; // Already in edit mode
    }
    
    await this.editButton.click();
    await this.editModeContainer.waitFor({ state: 'visible' });
  }

  async exitEditMode() {
    if (!await this.isInEditMode()) {
      return; // Already in view mode
    }
    
    await this.cancelButton.click();
    await this.viewModeContainer.waitFor({ state: 'visible' });
  }

  async saveChanges() {
    await this.saveButton.click();
    await this.savingIndicator.waitFor({ state: 'visible' });
    await this.savingIndicator.waitFor({ state: 'hidden' });
  }

  async updateTitle(newTitle: string) {
    await this.enterEditMode();
    await this.titleInput.fill(newTitle);
  }

  async updateContent(newContent: string) {
    await this.enterEditMode();
    await this.contentTextarea.fill(newContent);
  }

  async appendContent(additionalContent: string) {
    await this.enterEditMode();
    const currentContent = await this.contentTextarea.inputValue();
    await this.contentTextarea.fill(currentContent + additionalContent);
  }

  async updateCategory(category: string) {
    await this.enterEditMode();
    await this.categorySelect.selectOption(category);
  }

  async updateTags(tags: string) {
    await this.enterEditMode();
    await this.tagsInput.fill(tags);
  }

  async togglePreview() {
    await this.previewToggle.click();
    await this.page.waitForTimeout(300); // Wait for preview to render
  }

  async typeInEditor(text: string, options?: { delay?: number }) {
    await this.enterEditMode();
    await this.contentTextarea.type(text, { delay: options?.delay || 50 });
  }

  async clearEditor() {
    await this.enterEditMode();
    await this.contentTextarea.fill('');
  }

  async insertMarkdown(markdown: string, atPosition?: number) {
    await this.enterEditMode();
    
    if (atPosition !== undefined) {
      // Position cursor at specific location
      await this.contentTextarea.focus();
      await this.page.keyboard.press('Control+Home'); // Go to start
      for (let i = 0; i < atPosition; i++) {
        await this.page.keyboard.press('ArrowRight');
      }
    }
    
    await this.contentTextarea.type(markdown);
  }

  async insertWikiLink(pageName: string, displayText?: string) {
    const linkText = displayText ? `[[${pageName}|${displayText}]]` : `[[${pageName}]]`;
    await this.typeInEditor(linkText);
  }

  async deletePage() {
    await this.deleteButton.click();
    
    // Handle confirmation dialog
    await this.page.on('dialog', dialog => dialog.accept());
    
    // Wait for redirect back to wiki list
    await this.page.waitForURL(/\/wiki$/);
  }

  async goBack() {
    await this.backButton.click();
  }

  // Content validation methods
  async getPageTitle(): Promise<string> {
    if (await this.isInEditMode()) {
      return await this.titleInput.inputValue();
    }
    return await this.pageTitle.textContent() || '';
  }

  async getPageContent(): Promise<string> {
    if (await this.isInEditMode()) {
      return await this.contentTextarea.inputValue();
    }
    return await this.contentDisplay.textContent() || '';
  }

  async getPageCategory(): Promise<string> {
    if (await this.isInEditMode()) {
      return await this.categorySelect.inputValue();
    }
    
    // In view mode, find category badge
    const categoryBadge = this.page.locator('[data-testid="category-badge"], .category');
    if (await categoryBadge.count() > 0) {
      return await categoryBadge.textContent() || '';
    }
    return '';
  }

  async getPageTags(): Promise<string[]> {
    if (await this.isInEditMode()) {
      const tagsString = await this.tagsInput.inputValue();
      return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // In view mode, find tag badges
    const tagBadges = this.page.locator('[data-testid="tag-badge"], .tag');
    const tags: string[] = [];
    const count = await tagBadges.count();
    
    for (let i = 0; i < count; i++) {
      const tag = await tagBadges.nth(i).textContent();
      if (tag) {
        tags.push(tag.replace('#', '').trim());
      }
    }
    
    return tags;
  }

  async getRenderedHTML(): Promise<string> {
    if (await this.previewContainer.isVisible()) {
      return await this.previewContainer.innerHTML();
    }
    return await this.contentDisplay.innerHTML();
  }

  async getMarkdownPreview(): Promise<string> {
    await this.togglePreview();
    return await this.markdownPreview.textContent() || '';
  }

  async getBreadcrumbs(): Promise<string[]> {
    const breadcrumbLinks = this.breadcrumbs.locator('a, span');
    const breadcrumbs: string[] = [];
    const count = await breadcrumbLinks.count();
    
    for (let i = 0; i < count; i++) {
      const text = await breadcrumbLinks.nth(i).textContent();
      if (text) {
        breadcrumbs.push(text.trim());
      }
    }
    
    return breadcrumbs;
  }

  async getChildPages(): Promise<string[]> {
    const childLinks = this.childPages.locator('a');
    const children: string[] = [];
    const count = await childLinks.count();
    
    for (let i = 0; i < count; i++) {
      const text = await childLinks.nth(i).textContent();
      if (text) {
        children.push(text.trim());
      }
    }
    
    return children;
  }

  async getCreatedDate(): Promise<string> {
    return await this.createdDate.textContent() || '';
  }

  async getUpdatedDate(): Promise<string> {
    return await this.updatedDate.textContent() || '';
  }

  async getAuthor(): Promise<string> {
    return await this.authorInfo.textContent() || '';
  }

  // State checking methods
  async isInEditMode(): Promise<boolean> {
    return await this.editModeContainer.isVisible();
  }

  async isInViewMode(): Promise<boolean> {
    return await this.viewModeContainer.isVisible();
  }

  async isPreviewVisible(): Promise<boolean> {
    return await this.previewPane.isVisible();
  }

  async isSaving(): Promise<boolean> {
    return await this.savingIndicator.isVisible();
  }

  async hasUnsavedChanges(): Promise<boolean> {
    // Look for unsaved changes indicator (adjust based on implementation)
    const unsavedIndicator = this.page.locator('[data-testid="unsaved-changes"], .unsaved');
    return await unsavedIndicator.isVisible();
  }

  async isLoadingState(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  async hasErrors(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorMessage(): Promise<string> {
    if (await this.hasErrors()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }

  // Wiki link testing methods
  async findWikiLinks(): Promise<Array<{text: string, href: string, exists: boolean}>> {
    const wikiLinks = this.contentDisplay.locator('a[href*="/wiki/"]');
    const links: Array<{text: string, href: string, exists: boolean}> = [];
    const count = await wikiLinks.count();
    
    for (let i = 0; i < count; i++) {
      const link = wikiLinks.nth(i);
      const text = await link.textContent() || '';
      const href = await link.getAttribute('href') || '';
      
      // Check if link appears broken (usually styled differently)
      const classes = await link.getAttribute('class') || '';
      const exists = !classes.includes('broken') && !classes.includes('missing');
      
      links.push({ text: text.trim(), href, exists });
    }
    
    return links;
  }

  async clickWikiLink(linkText: string) {
    const wikiLink = this.contentDisplay.locator(`a:has-text("${linkText}")`);
    await wikiLink.click();
  }

  async verifyWikiLinkExists(linkText: string): Promise<boolean> {
    const wikiLink = this.contentDisplay.locator(`a:has-text("${linkText}")`);
    return await wikiLink.count() > 0;
  }

  async verifyWikiLinkBroken(linkText: string): Promise<boolean> {
    const wikiLink = this.contentDisplay.locator(`a:has-text("${linkText}")`);
    if (await wikiLink.count() === 0) return false;
    
    const classes = await wikiLink.getAttribute('class') || '';
    return classes.includes('broken') || classes.includes('missing');
  }

  // Validation methods
  async verifyPageLoaded(expectedTitle?: string) {
    await expect(this.pageTitle).toBeVisible();
    if (expectedTitle) {
      await expect(this.pageTitle).toContainText(expectedTitle);
    }
    await expect(this.contentDisplay).toBeVisible();
  }

  async verifyEditMode() {
    await expect(this.editModeContainer).toBeVisible();
    await expect(this.titleInput).toBeVisible();
    await expect(this.contentTextarea).toBeVisible();
    await expect(this.saveButton).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
  }

  async verifyViewMode() {
    await expect(this.viewModeContainer).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
    await expect(this.contentDisplay).toBeVisible();
    await expect(this.editButton).toBeVisible();
  }

  async verifyContentSaved() {
    // Wait for saving indicator to appear and disappear
    await expect(this.savingIndicator).toBeVisible();
    await expect(this.savingIndicator).toBeHidden();
    
    // Should be back in view mode
    await expect(this.viewModeContainer).toBeVisible();
  }

  async verifyMarkdownRendering(expectedElements: string[]) {
    for (const element of expectedElements) {
      await expect(this.contentDisplay.locator(element)).toBeVisible();
    }
  }

  async verifyPreviewSync() {
    await this.enterEditMode();
    await this.togglePreview();
    
    const editorContent = await this.contentTextarea.inputValue();
    const previewContent = await this.markdownPreview.textContent() || '';
    
    // Basic check that preview content reflects editor content
    expect(previewContent.length).toBeGreaterThan(0);
    
    // Type new content and verify preview updates
    const testText = '\n\nTest preview sync';
    await this.typeInEditor(testText);
    
    await this.page.waitForTimeout(500); // Wait for preview update
    
    const updatedPreview = await this.markdownPreview.textContent() || '';
    expect(updatedPreview).toContain('Test preview sync');
  }

  // Performance testing methods
  async measureEditModeSwitch(): Promise<number> {
    const startTime = Date.now();
    await this.enterEditMode();
    return Date.now() - startTime;
  }

  async measureSaveTime(): Promise<number> {
    const startTime = Date.now();
    await this.saveChanges();
    return Date.now() - startTime;
  }

  async measurePreviewRenderTime(content: string): Promise<number> {
    await this.enterEditMode();
    await this.clearEditor();
    
    const startTime = Date.now();
    await this.typeInEditor(content);
    await this.togglePreview();
    
    // Wait for preview to render
    await this.markdownPreview.waitFor({ state: 'visible' });
    
    return Date.now() - startTime;
  }
}