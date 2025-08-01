import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';
import { markdownTestPages } from '../fixtures/wiki-test-data';

test.describe('Wiki Visual Regression Tests', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
    
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test.describe('Wiki Pages List Visual Tests', () => {
    test.beforeEach(async () => {
      // Create consistent test data for visual tests
      await testHelpers.createMultiplePages([
        {
          title: 'Visual Test Page 1',
          content: '# Visual Test Page 1\n\nContent for visual testing.',
          category: 'documentation',
          tags: ['visual', 'test']
        },
        {
          title: 'Visual Test Page 2',
          content: '# Visual Test Page 2\n\nMore content for visual testing.',
          category: 'guides',
          tags: ['visual', 'guide']
        },
        {
          title: 'Visual Test Page 3',
          content: '# Visual Test Page 3\n\nAdditional content for testing.',
          category: 'api',
          tags: ['visual', 'api']
        }
      ]);
    });

    test('should match wiki pages list layout', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      // Take screenshot of full page list
      await expect(wikiPages.page).toHaveScreenshot('wiki-pages-list.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match wiki pages grid layout', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      // Focus on the main content area
      await expect(wikiPages.pagesGrid).toHaveScreenshot('wiki-pages-grid.png', {
        animations: 'disabled'
      });
    });

    test('should match sidebar tree view', async () => {
      await wikiPages.goto();
      
      if (!await wikiPages.isSidebarVisible()) {
        await wikiPages.toggleSidebar();
      }
      
      await expect(wikiPages.sidebar).toHaveScreenshot('wiki-sidebar-tree.png', {
        animations: 'disabled'
      });
    });

    test('should match page cards with different categories', async () => {
      await wikiPages.goto();
      
      // Screenshot individual page cards
      const pageCards = wikiPages.pageCards;
      const cardCount = await pageCards.count();
      
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        await expect(pageCards.nth(i)).toHaveScreenshot(`wiki-page-card-${i + 1}.png`, {
          animations: 'disabled'
        });
      }
    });

    test('should match empty state layout', async () => {
      // Clear all pages first (if possible)
      await wikiPages.goto();
      await wikiPages.searchPages('nonexistentquery123456');
      
      if (await wikiPages.isEmptyState()) {
        await expect(wikiPages.emptyStateMessage).toHaveScreenshot('wiki-empty-state.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match search results layout', async () => {
      await wikiPages.goto();
      await wikiPages.searchPages('visual');
      
      // Wait for search results
      await wikiPages.page.waitForTimeout(1000);
      
      await expect(wikiPages.pagesGrid).toHaveScreenshot('wiki-search-results.png', {
        animations: 'disabled'
      });
    });

    test('should match category filter dropdown', async () => {
      await wikiPages.goto();
      
      // Open category filter dropdown
      await wikiPages.categoryFilter.click();
      
      await expect(wikiPages.page).toHaveScreenshot('wiki-category-filter.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Wiki Editor Visual Tests', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Visual Editor Test Page',
        content: markdownTestPages.comprehensiveMarkdown.content,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Visual Editor Test Page');
    });

    test('should match page view mode layout', async () => {
      await wikiEditor.verifyPageLoaded('Visual Editor Test Page');
      
      await expect(wikiEditor.page).toHaveScreenshot('wiki-page-view-mode.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match page edit mode layout', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.verifyEditMode();
      
      await expect(wikiEditor.page).toHaveScreenshot('wiki-page-edit-mode.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match split view with preview', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.togglePreview();
      
      if (await wikiEditor.isPreviewVisible()) {
        await expect(wikiEditor.page).toHaveScreenshot('wiki-editor-split-view.png', {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('should match editor toolbar', async () => {
      await wikiEditor.enterEditMode();
      
      if (await wikiEditor.editorToolbar.isVisible()) {
        await expect(wikiEditor.editorToolbar).toHaveScreenshot('wiki-editor-toolbar.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match page info sidebar', async () => {
      if (await wikiEditor.sidebar.isVisible()) {
        await expect(wikiEditor.sidebar).toHaveScreenshot('wiki-page-sidebar.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match breadcrumb navigation', async () => {
      if (await wikiEditor.breadcrumbs.isVisible()) {
        await expect(wikiEditor.breadcrumbs).toHaveScreenshot('wiki-breadcrumbs.png', {
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Markdown Rendering Visual Tests', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Markdown Rendering Test',
        content: markdownTestPages.comprehensiveMarkdown.content,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Markdown Rendering Test');
    });

    test('should match comprehensive markdown rendering', async () => {
      await expect(wikiEditor.contentDisplay).toHaveScreenshot('markdown-comprehensive-rendering.png', {
        animations: 'disabled'
      });
    });

    test('should match code block syntax highlighting', async () => {
      const codeBlocks = wikiEditor.contentDisplay.locator('pre code');
      const codeBlockCount = await codeBlocks.count();
      
      for (let i = 0; i < Math.min(3, codeBlockCount); i++) {
        await expect(codeBlocks.nth(i)).toHaveScreenshot(`code-block-${i + 1}.png`, {
          animations: 'disabled'
        });
      }
    });

    test('should match table rendering', async () => {
      const tables = wikiEditor.contentDisplay.locator('table');
      const tableCount = await tables.count();
      
      for (let i = 0; i < Math.min(2, tableCount); i++) {
        await expect(tables.nth(i)).toHaveScreenshot(`markdown-table-${i + 1}.png`, {
          animations: 'disabled'
        });
      }
    });

    test('should match blockquote styling', async () => {
      const blockquotes = wikiEditor.contentDisplay.locator('blockquote');
      
      if (await blockquotes.count() > 0) {
        await expect(blockquotes.first()).toHaveScreenshot('markdown-blockquote.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match list rendering', async () => {
      const lists = wikiEditor.contentDisplay.locator('ul, ol');
      const listCount = await lists.count();
      
      for (let i = 0; i < Math.min(2, listCount); i++) {
        await expect(lists.nth(i)).toHaveScreenshot(`markdown-list-${i + 1}.png`, {
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Wiki Link Visual Tests', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Wiki Links Visual Test',
        content: markdownTestPages.wikiLinksTest.content,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Wiki Links Visual Test');
    });

    test('should match wiki link styling', async () => {
      const wikiLinks = wikiEditor.contentDisplay.locator('a[href*="/wiki/"]');
      
      if (await wikiLinks.count() > 0) {
        // Screenshot section containing wiki links
        const linkSection = wikiEditor.contentDisplay.locator('h2:has-text("Basic Wiki Links")').locator('..').first();
        await expect(linkSection).toHaveScreenshot('wiki-links-section.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match broken link styling', async () => {
      const brokenLinks = wikiEditor.contentDisplay.locator('a.broken, a.missing');
      
      if (await brokenLinks.count() > 0) {
        await expect(brokenLinks.first()).toHaveScreenshot('wiki-broken-link.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match wiki link hover states', async () => {
      const wikiLinks = wikiEditor.contentDisplay.locator('a[href*="/wiki/"]');
      
      if (await wikiLinks.count() > 0) {
        // Hover over first wiki link
        await wikiLinks.first().hover();
        
        await expect(wikiLinks.first()).toHaveScreenshot('wiki-link-hover.png', {
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Responsive Design Visual Tests', () => {
    test('should match mobile layout - pages list', async () => {
      await wikiPages.page.setViewportSize({ width: 375, height: 667 });
      
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      await expect(wikiPages.page).toHaveScreenshot('wiki-mobile-pages-list.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match tablet layout - pages list', async () => {
      await wikiPages.page.setViewportSize({ width: 768, height: 1024 });
      
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      await expect(wikiPages.page).toHaveScreenshot('wiki-tablet-pages-list.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match mobile layout - page editor', async () => {
      await testHelpers.createTestPage({
        title: 'Mobile Editor Test',
        content: '# Mobile Editor Test\n\nTesting mobile editor layout.',
        category: 'reference'
      });
      
      await wikiPages.page.setViewportSize({ width: 375, height: 667 });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Mobile Editor Test');
      await wikiEditor.enterEditMode();
      
      await expect(wikiEditor.page).toHaveScreenshot('wiki-mobile-editor.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match sidebar collapse on small screens', async () => {
      await wikiPages.page.setViewportSize({ width: 768, height: 600 });
      
      await wikiPages.goto();
      
      // Sidebar might be collapsed on smaller screens
      await expect(wikiPages.page).toHaveScreenshot('wiki-responsive-sidebar.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test.beforeEach(async () => {
      // Enable dark mode if supported
      await wikiPages.page.emulateMedia({ colorScheme: 'dark' });
      
      await testHelpers.createTestPage({
        title: 'Dark Mode Test Page',
        content: '# Dark Mode Test\n\n**Bold text** and *italic text* in dark mode.',
        category: 'reference'
      });
    });

    test('should match dark mode pages list', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      await expect(wikiPages.page).toHaveScreenshot('wiki-dark-mode-pages-list.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match dark mode editor', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Dark Mode Test Page');
      await wikiEditor.enterEditMode();
      
      await expect(wikiEditor.page).toHaveScreenshot('wiki-dark-mode-editor.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match dark mode markdown rendering', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Dark Mode Test Page');
      
      await expect(wikiEditor.contentDisplay).toHaveScreenshot('wiki-dark-mode-content.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Loading States Visual Tests', () => {
    test('should match loading spinner', async () => {
      await wikiPages.goto();
      
      // Intercept requests to slow down loading
      await wikiPages.page.route('**/api/wiki/pages**', async route => {
        await wikiPages.page.waitForTimeout(2000);
        await route.continue();
      });
      
      // Navigate and try to capture loading state
      const loadingPromise = wikiPages.goto();
      
      // Try to capture loading state
      if (await wikiPages.loadingSpinner.isVisible()) {
        await expect(wikiPages.loadingSpinner).toHaveScreenshot('wiki-loading-spinner.png', {
          animations: 'disabled'
        });
      }
      
      await loadingPromise;
    });

    test('should match saving indicator', async () => {
      await testHelpers.createTestPage({
        title: 'Save Test Page',
        content: '# Save Test\n\nTesting save indicator.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Save Test Page');
      await wikiEditor.enterEditMode();
      
      // Slow down save request
      await wikiPages.page.route('**/api/wiki/pages/**', async route => {
        await wikiPages.page.waitForTimeout(2000);
        await route.continue();
      });
      
      // Make change and save
      await wikiEditor.typeInEditor('\n\nAdditional content');
      const savePromise = wikiEditor.saveChanges();
      
      // Try to capture saving state
      if (await wikiEditor.savingIndicator.isVisible()) {
        await expect(wikiEditor.savingIndicator).toHaveScreenshot('wiki-saving-indicator.png', {
          animations: 'disabled'
        });
      }
      
      await savePromise;
    });
  });

  test.describe('Error States Visual Tests', () => {
    test('should match network error state', async () => {
      // Simulate network error
      await wikiPages.page.route('**/api/wiki/pages**', route => {
        route.abort('failed');
      });
      
      await wikiPages.goto();
      
      if (await wikiPages.isErrorState()) {
        await expect(wikiPages.errorMessage).toHaveScreenshot('wiki-network-error.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match 404 page not found', async () => {
      // Navigate to non-existent page
      await wikiEditor.page.goto('/wiki/non-existent-page-id-12345');
      
      await wikiEditor.page.waitForTimeout(2000);
      
      await expect(wikiEditor.page).toHaveScreenshot('wiki-404-error.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match validation error states', async () => {
      await wikiPages.goto();
      await wikiPages.openCreatePageDialog();
      
      // Try to submit without required fields
      await wikiPages.createPageSubmitButton.click();
      
      // Should show validation errors
      await expect(wikiPages.createPageDialog).toHaveScreenshot('wiki-validation-errors.png', {
        animations: 'disabled'
      });
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});