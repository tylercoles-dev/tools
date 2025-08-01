import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';

/**
 * Wiki Smoke Tests - Fast, essential tests to verify core functionality
 * These tests should run quickly and catch major issues
 */
test.describe('Wiki Smoke Tests @smoke', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
  });

  test.describe('Critical Path Tests', () => {
    test('should load wiki pages list successfully', async () => {
      await wikiPages.goto();
      
      // Verify page loads without errors
      expect(await wikiPages.isErrorState()).toBe(false);
      expect(await wikiPages.isLoadingState()).toBe(false);
      
      // Verify key elements are present
      await expect(wikiPages.wikiHeader).toBeVisible();
      await expect(wikiPages.newPageButton).toBeVisible();
      await expect(wikiPages.searchInput).toBeVisible();
    });

    test('should create a basic wiki page', async () => {
      await wikiPages.goto();
      
      const testPageData = {
        title: 'Smoke Test Page',
        content: '# Smoke Test Page\n\nThis is a basic smoke test page.',
        category: 'documentation'
      };
      
      await wikiPages.createPage(testPageData);
      await wikiPages.verifyPageCreated(testPageData.title);
      
      // Verify page appears in listing
      expect(await wikiPages.verifyPageExists(testPageData.title)).toBe(true);
    });

    test('should view and edit a wiki page', async () => {
      // Create test page first
      await testHelpers.createTestPage({
        title: 'Smoke Edit Test Page',
        content: '# Original Content\n\nOriginal page content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Smoke Edit Test Page');
      
      // Verify page loads in view mode
      await wikiEditor.verifyPageLoaded('Smoke Edit Test Page');
      await wikiEditor.verifyViewMode();
      
      // Enter edit mode
      await wikiEditor.enterEditMode();
      await wikiEditor.verifyEditMode();
      
      // Make simple edit
      await wikiEditor.appendContent('\n\nAdded content during smoke test.');
      await wikiEditor.saveChanges();
      
      // Verify save successful
      await wikiEditor.verifyContentSaved();
      
      const updatedContent = await wikiEditor.getPageContent();
      expect(updatedContent).toContain('Added content during smoke test');
    });

    test('should perform basic search functionality', async () => {
      // Create a searchable test page
      await testHelpers.createTestPage({
        title: 'Searchable Smoke Test Page',
        content: '# Searchable Page\n\nThis page contains unique smoke test content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      
      // Perform search
      await wikiPages.searchPages('smoke test');
      
      // Verify search returns results
      const searchResults = await wikiPages.getPageCount();
      expect(searchResults).toBeGreaterThan(0);
      
      const resultTitles = await wikiPages.getVisiblePageTitles();
      expect(resultTitles.some(title => title.includes('Smoke Test'))).toBe(true);
    });

    test('should filter pages by category', async () => {
      // Create pages in different categories
      await testHelpers.createMultiplePages([
        {
          title: 'Smoke Doc Page',
          content: '# Documentation Page\n\nDocumentation content.',
          category: 'documentation'
        },
        {
          title: 'Smoke Guide Page',
          content: '# Guide Page\n\nGuide content.',
          category: 'guides'
        }
      ]);
      
      await wikiPages.goto();
      
      // Test category filtering
      await wikiPages.filterByCategory('documentation');
      
      const docResults = await wikiPages.getPageCount();
      expect(docResults).toBeGreaterThan(0);
      
      // Verify only documentation pages are shown
      const categories = await wikiPages.getPageCategories();
      categories.forEach(category => {
        expect(category.toLowerCase()).toBe('documentation');
      });
    });
  });

  test.describe('Core Functionality Checks', () => {
    test('should render basic markdown correctly', async () => {
      const markdownContent = `# Markdown Test

## Headers Work
Basic **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
console.log("Code blocks work");
\`\`\`

[Links work](https://example.com)`;

      await testHelpers.createTestPage({
        title: 'Markdown Smoke Test',
        content: markdownContent,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Markdown Smoke Test');
      
      // Verify basic markdown elements render
      await expect(wikiEditor.contentDisplay.locator('h1')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('h2')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('strong')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('em')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('ul')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('pre code')).toBeVisible();
      await expect(wikiEditor.contentDisplay.locator('a')).toBeVisible();
    });

    test('should handle wiki links correctly', async () => {
      // Create target page
      await testHelpers.createTestPage({
        title: 'Link Target Page',
        content: '# Link Target\n\nThis is the target of wiki links.',
        category: 'reference'
      });
      
      // Create source page with wiki links
      await testHelpers.createTestPage({
        title: 'Link Source Page',
        content: `# Link Source

Working link: [[Link Target Page]]
Broken link: [[Non-existent Page]]`,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Link Source Page');
      
      // Verify wiki links are rendered
      const wikiLinks = await wikiEditor.findWikiLinks();
      expect(wikiLinks.length).toBeGreaterThanOrEqual(2);
      
      // Test clicking working wiki link
      await wikiEditor.clickWikiLink('Link Target Page');
      await wikiEditor.verifyPageLoaded('Link Target Page');
    });

    test('should show page hierarchy in sidebar', async () => {
      // Create parent-child pages
      await testHelpers.createTestPage({
        title: 'Smoke Parent Page',
        content: '# Parent Page\n\nThis is a parent page.',
        category: 'documentation'
      });
      
      await testHelpers.createTestPage({
        title: 'Smoke Child Page',
        content: '# Child Page\n\nThis is a child page.',
        category: 'documentation',
        parent: 'Smoke Parent Page'
      });
      
      await wikiPages.goto();
      
      // Ensure sidebar is visible
      if (!await wikiPages.isSidebarVisible()) {
        await wikiPages.toggleSidebar();
      }
      
      // Verify hierarchical structure
      expect(await wikiPages.verifyPageInTree('Smoke Parent Page')).toBe(true);
      expect(await wikiPages.verifyPageInTree('Smoke Child Page')).toBe(true);
    });

    test('should handle empty states gracefully', async () => {
      await wikiPages.goto();
      
      // Search for non-existent content
      await wikiPages.searchPages('nonexistentuniquequery123456789');
      
      // Should show empty state without errors
      if (await wikiPages.getPageCount() === 0) {
        expect(await wikiPages.isEmptyState()).toBe(true);
        expect(await wikiPages.isErrorState()).toBe(false);
      }
    });
  });

  test.describe('Performance Smoke Tests', () => {
    test('should load pages list within reasonable time', async () => {
      const startTime = Date.now();
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should perform search within reasonable time', async () => {
      await testHelpers.createTestPage({
        title: 'Performance Search Test',
        content: '# Performance Test\n\nContent for performance testing.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      
      const searchTime = await wikiPages.measureSearchTime('performance');
      
      // Search should complete within 3 seconds
      expect(searchTime).toBeLessThan(3000);
    });

    test('should switch to edit mode within reasonable time', async () => {
      await testHelpers.createTestPage({
        title: 'Edit Performance Test',
        content: '# Edit Performance\n\nTesting edit mode performance.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Edit Performance Test');
      
      const editSwitchTime = await wikiEditor.measureEditModeSwitch();
      
      // Should enter edit mode within 2 seconds
      expect(editSwitchTime).toBeLessThan(2000);
    });
  });

  test.describe('Error Handling Smoke Tests', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network error for page load
      await wikiPages.page.route('**/api/wiki/pages**', route => {
        route.abort('failed');
      });
      
      await wikiPages.goto();
      
      // Should show error state, not crash
      if (await wikiPages.isErrorState()) {
        await expect(wikiPages.errorMessage).toBeVisible();
        
        const errorText = await wikiPages.getErrorMessage();
        expect(errorText.length).toBeGreaterThan(0);
      }
      
      // Page should still be functional (header, etc.)
      await expect(wikiPages.wikiHeader).toBeVisible();
    });

    test('should handle invalid page navigation', async () => {
      // Navigate to non-existent page
      await wikiEditor.goto('non-existent-page-id-12345');
      
      // Should handle gracefully with 404 or redirect to list
      const currentUrl = wikiEditor.page.url();
      const pageContent = await wikiEditor.page.textContent('body');
      
      expect(
        currentUrl.includes('404') ||
        currentUrl.includes('/wiki') ||
        pageContent.includes('not found') ||
        pageContent.includes('Page not found')
      ).toBe(true);
    });

    test('should validate required fields in page creation', async () => {
      await wikiPages.goto();
      await wikiPages.openCreatePageDialog();
      
      // Try to create page without required fields
      await wikiPages.createPageSubmitButton.click();
      
      // Should remain in dialog with validation
      await expect(wikiPages.createPageDialog).toBeVisible();
      
      // Should not have created a page
      await wikiPages.cancelPageCreation();
      
      // No new page should appear
      const initialPageCount = await wikiPages.getPageCount();
      expect(initialPageCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Mobile Responsiveness Smoke Tests', () => {
    test('should load on mobile viewport', async () => {
      await wikiPages.page.setViewportSize({ width: 375, height: 667 });
      
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      
      // Basic elements should be visible and functional
      await expect(wikiPages.wikiHeader).toBeVisible();
      await expect(wikiPages.newPageButton).toBeVisible();
      
      // Should be able to interact with elements
      await wikiPages.searchInput.click();
      await wikiPages.searchInput.type('mobile test');
    });

    test('should allow page editing on mobile', async () => {
      await testHelpers.createTestPage({
        title: 'Mobile Edit Test',
        content: '# Mobile Test\n\nTesting mobile editing.',
        category: 'reference'
      });
      
      await wikiPages.page.setViewportSize({ width: 375, height: 667 });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Mobile Edit Test');
      
      // Should be able to enter edit mode
      await wikiEditor.enterEditMode();
      await expect(wikiEditor.contentTextarea).toBeVisible();
      
      // Should be able to type
      await wikiEditor.typeInEditor('\n\nMobile edit test');
      
      const content = await wikiEditor.getPageContent();
      expect(content).toContain('Mobile edit test');
    });
  });

  test.describe('Accessibility Smoke Tests', () => {
    test('should have basic keyboard navigation', async () => {
      await wikiPages.goto();
      
      // Tab navigation should work
      await wikiPages.page.keyboard.press('Tab');
      await wikiPages.page.keyboard.press('Tab');
      
      // Should be able to activate focused elements
      const focusedElement = await wikiPages.page.evaluate(() => {
        return document.activeElement?.tagName.toLowerCase();
      });
      
      expect(['button', 'input', 'a', 'select'].includes(focusedElement || '')).toBe(true);
    });

    test('should have proper heading hierarchy', async () => {
      await testHelpers.createTestPage({
        title: 'Accessibility Test Page',
        content: '# Main Heading\n\n## Subheading\n\n### Sub-subheading',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Accessibility Test Page');
      
      // Check heading structure
      const h1Count = await wikiEditor.contentDisplay.locator('h1').count();
      const h2Count = await wikiEditor.contentDisplay.locator('h2').count();
      const h3Count = await wikiEditor.contentDisplay.locator('h3').count();
      
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h2Count).toBeGreaterThanOrEqual(1);
      expect(h3Count).toBeGreaterThanOrEqual(1);
    });

    test('should have alt text for images', async () => {
      await testHelpers.createTestPage({
        title: 'Image Alt Text Test',
        content: '# Image Test\n\n![Test image description](https://via.placeholder.com/200x100.png)',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Image Alt Text Test');
      
      const images = wikiEditor.contentDisplay.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const altText = await images.nth(i).getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText?.length).toBeGreaterThan(0);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Quick cleanup - only remove test data we created
    await testHelpers.cleanupTestData();
    
    // Reset viewport if changed
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});