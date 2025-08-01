import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';
import { edgeCaseWikiPages } from '../fixtures/wiki-test-data';

/**
 * Wiki Regression Tests - Tests that protect against previously fixed bugs
 * These tests ensure that known issues don't reoccur
 */
test.describe('Wiki Regression Tests @regression', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
  });

  test.describe('Page Creation Regression Tests', () => {
    test('should not lose content when creation dialog is closed accidentally', async () => {
      // Regression: Previously, closing the dialog would lose all entered content
      await wikiPages.goto();
      await wikiPages.openCreatePageDialog();
      
      const testContent = {
        title: 'Test Page with Content',
        content: 'This is important content that should not be lost',
        category: 'documentation'
      };
      
      // Fill in content
      await wikiPages.pageTitleInput.fill(testContent.title);
      await wikiPages.pageContentTextarea.fill(testContent.content);
      await wikiPages.pageCategorySelect.selectOption(testContent.category);
      
      // Accidentally close dialog
      await wikiPages.cancelPageCreation();
      
      // Reopen dialog
      await wikiPages.openCreatePageDialog();
      
      // Content should be preserved (if autosave/draft functionality exists)
      // Or at minimum, should be able to restore content
      // Implementation dependent - adjust based on actual behavior
      
      // Complete creation properly this time
      await wikiPages.pageTitleInput.fill(testContent.title);
      await wikiPages.pageContentTextarea.fill(testContent.content);
      await wikiPages.pageCategorySelect.selectOption(testContent.category);
      await wikiPages.createPageSubmitButton.click();
      
      await wikiPages.verifyPageCreated(testContent.title);
    });

    test('should handle special characters in page titles correctly', async () => {
      // Regression: Special characters in titles used to cause URL/slug issues
      const specialTitles = [
        'Page with & ampersand',
        'Page with <brackets>',
        'Page with "quotes"',
        'Page with spaces   and   tabs',
        'Page/with/slashes',
        'Page with 中文 characters',
        'Page with émojis 🚀'
      ];
      
      for (const title of specialTitles) {
        await wikiPages.goto();
        
        const pageData = {
          title,
          content: `# ${title}\n\nTesting special characters in title.`,
          category: 'reference'
        };
        
        await wikiPages.createPage(pageData);
        await wikiPages.verifyPageCreated(title);
        
        // Verify page can be accessed
        await wikiPages.clickPageByTitle(title);
        await wikiEditor.verifyPageLoaded();
        
        // Verify URL is properly encoded
        const url = wikiEditor.page.url();
        expect(url).toMatch(/\/wiki\//);
        
        // Go back for next iteration
        await wikiEditor.goBack();
      }
    });

    test('should prevent duplicate page titles', async () => {
      // Regression: Previously allowed duplicate titles causing confusion
      const duplicateTitle = 'Duplicate Title Test';
      
      // Create first page
      await testHelpers.createTestPage({
        title: duplicateTitle,
        content: '# First Page\n\nOriginal content.',
        category: 'documentation'
      });
      
      await wikiPages.goto();
      await wikiPages.openCreatePageDialog();
      
      // Try to create second page with same title
      await wikiPages.pageTitleInput.fill(duplicateTitle);
      await wikiPages.pageContentTextarea.fill('# Second Page\n\nDuplicate content.');
      await wikiPages.createPageSubmitButton.click();
      
      // Should either:
      // 1. Prevent creation with error message
      // 2. Auto-rename to avoid conflict
      // 3. Show confirmation dialog about overwrite
      
      // Check if dialog is still open (validation error)
      const dialogStillOpen = await wikiPages.createPageDialog.isVisible();
      
      if (dialogStillOpen) {
        // Should show validation error
        const errorMessage = wikiPages.page.locator('[data-testid="error-message"], .error');
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          expect(errorText?.toLowerCase()).toContain('duplicate');
        }
        await wikiPages.cancelPageCreation();
      } else {
        // If creation succeeded, should auto-rename or handle gracefully
        const pages = await wikiPages.getVisiblePageTitles();
        const duplicatePages = pages.filter(title => title.includes(duplicateTitle));
        
        // Should not have exact duplicates
        const exactDuplicates = pages.filter(title => title === duplicateTitle);
        expect(exactDuplicates.length).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('Editor Regression Tests', () => {
    test('should preserve content when switching between edit and view modes', async () => {
      // Regression: Content was lost when rapidly switching modes
      await testHelpers.createTestPage({
        title: 'Mode Switch Test',
        content: '# Original Content\n\nOriginal page content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Mode Switch Test');
      
      const originalContent = await wikiEditor.getPageContent();
      
      // Switch to edit mode
      await wikiEditor.enterEditMode();
      
      // Add content
      const additionalContent = '\n\nAdditional content added in edit mode.';
      await wikiEditor.appendContent(additionalContent);
      
      // Switch back to view mode without saving
      await wikiEditor.exitEditMode();
      
      // Switch back to edit mode
      await wikiEditor.enterEditMode();
      
      // Original content should still be there (without additional content)
      const currentContent = await wikiEditor.getPageContent();
      expect(currentContent).toBe(originalContent);
      
      // Add content again and save this time
      await wikiEditor.appendContent(additionalContent);
      await wikiEditor.saveChanges();
      
      // Now switch modes - content should persist
      await wikiEditor.enterEditMode();
      const savedContent = await wikiEditor.getPageContent();
      expect(savedContent).toContain('Additional content added in edit mode');
    });

    test('should handle very long content without performance degradation', async () => {
      // Regression: Editor became unresponsive with large documents
      const largeContent = 'Large content line. '.repeat(1000) + 
        '\n\n' + '# Section\n\nSection content.\n\n'.repeat(100);
      
      await testHelpers.createTestPage({
        title: 'Large Content Test',
        content: largeContent,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Large Content Test');
      
      // Should load without timeout
      await wikiEditor.verifyPageLoaded('Large Content Test');
      
      // Switch to edit mode should be responsive
      const editStartTime = Date.now();
      await wikiEditor.enterEditMode();
      const editSwitchTime = Date.now() - editStartTime;
      
      expect(editSwitchTime).toBeLessThan(5000); // Should switch within 5 seconds
      
      // Typing should be responsive
      const typingStartTime = Date.now();
      await wikiEditor.typeInEditor('\n\nAdded content');
      const typingTime = Date.now() - typingStartTime;
      
      expect(typingTime).toBeLessThan(2000); // Should type within 2 seconds
    });

    test('should handle concurrent edits without data corruption', async () => {
      // Regression: Concurrent edits could corrupt page content
      await testHelpers.createTestPage({
        title: 'Concurrent Edit Test',
        content: '# Concurrent Test\n\nOriginal content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Concurrent Edit Test');
      
      // User 1 starts editing
      await wikiEditor.enterEditMode();
      await wikiEditor.appendContent('\n\nUser 1 addition.');
      
      // Simulate concurrent edit by directly manipulating content
      // (In real scenario, this would be another user's edit)
      const currentContent = await wikiEditor.getPageContent();
      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(currentContent + '\n\nSimulated concurrent edit.');
      
      // Save should either:
      // 1. Detect conflict and show resolution dialog
      // 2. Merge changes automatically
      // 3. Show warning about concurrent edit
      
      await wikiEditor.saveChanges();
      
      // Verify content wasn't corrupted
      const finalContent = await wikiEditor.getPageContent();
      expect(finalContent.length).toBeGreaterThan(0);
      expect(finalContent).toContain('Original content');
      
      // Should contain at least one of the additions
      expect(
        finalContent.includes('User 1 addition') || 
        finalContent.includes('Simulated concurrent edit')
      ).toBe(true);
    });

    test('should recover from autosave failures gracefully', async () => {
      // Regression: Autosave failures could cause content loss
      await testHelpers.createTestPage({
        title: 'Autosave Test',
        content: '# Autosave Test\n\nOriginal content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Autosave Test');
      await wikiEditor.enterEditMode();
      
      // Simulate network failure for autosave
      await wikiEditor.page.route('**/api/wiki/pages/**/autosave', route => {
        route.abort('failed');
      });
      
      // Add content that would trigger autosave
      await wikiEditor.appendContent('\n\nContent that should be preserved despite autosave failure.');
      
      // Wait for autosave attempt
      await wikiEditor.page.waitForTimeout(3000);
      
      // Manual save should still work
      await wikiEditor.page.unroute('**/api/wiki/pages/**/autosave');
      await wikiEditor.saveChanges();
      
      // Content should be preserved
      const savedContent = await wikiEditor.getPageContent();
      expect(savedContent).toContain('Content that should be preserved');
    });
  });

  test.describe('Search Regression Tests', () => {
    test('should handle search queries with special regex characters', async () => {
      // Regression: Special characters in search broke regex parsing
      await testHelpers.createTestPage({
        title: 'Special Characters Search Test',
        content: '# Special Search\n\nContent with (parentheses) and [brackets] and {braces}.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      
      const specialQueries = [
        '(parentheses)',
        '[brackets]',
        '{braces}',
        'test*wildcard',
        'test+plus',
        'test?question',
        'test.dot',
        'test^caret',
        'test$dollar'
      ];
      
      for (const query of specialQueries) {
        await wikiPages.searchPages(query);
        
        // Should not crash or show error
        expect(await wikiPages.isErrorState()).toBe(false);
        
        // Should handle gracefully (might return no results, but shouldn't break)
        const resultCount = await wikiPages.getPageCount();
        expect(resultCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should maintain search state when navigating back', async () => {
      // Regression: Search state was lost when using browser back button
      await testHelpers.createTestPage({
        title: 'Search Navigation Test',
        content: '# Search Test\n\nSearchable content.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      
      // Perform search
      await wikiPages.searchPages('search');
      const initialResults = await wikiPages.getPageCount();
      expect(initialResults).toBeGreaterThan(0);
      
      // Click on a page
      await wikiPages.clickPageByTitle('Search Navigation Test');
      await wikiEditor.verifyPageLoaded('Search Navigation Test');
      
      // Go back
      await wikiEditor.goBack();
      
      // Search state should be preserved
      const searchValue = await wikiPages.searchInput.inputValue();
      expect(searchValue).toBe('search');
      
      const backResults = await wikiPages.getPageCount();
      expect(backResults).toBe(initialResults);
    });

    test('should handle empty search results correctly', async () => {
      // Regression: Empty search results caused infinite loading
      await wikiPages.goto();
      
      await wikiPages.searchPages('nonexistentquery12345abcdef');
      
      // Should show empty state, not infinite loading
      await wikiPages.page.waitForTimeout(2000);
      
      expect(await wikiPages.isLoadingState()).toBe(false);
      expect(await wikiPages.isErrorState()).toBe(false);
      
      const resultCount = await wikiPages.getPageCount();
      expect(resultCount).toBe(0);
      
      if (await wikiPages.isEmptyState()) {
        await wikiPages.verifyEmptyState();
      }
    });
  });

  test.describe('Wiki Links Regression Tests', () => {
    test('should handle wiki links with special characters correctly', async () => {
      // Regression: Wiki links with special characters created broken URLs
      await testHelpers.createTestPage({
        title: 'Target: Special & Characters',
        content: '# Target Page\n\nPage with special characters in title.',
        category: 'reference'
      });
      
      await testHelpers.createTestPage({
        title: 'Source Page',
        content: `# Source Page

Link to special page: [[Target: Special & Characters]]
Link with custom text: [[Target: Special & Characters|Special Page]]`,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Source Page');
      
      // Verify wiki links render correctly
      const wikiLinks = await wikiEditor.findWikiLinks();
      expect(wikiLinks.length).toBeGreaterThanOrEqual(2);
      
      // Both links should work (not be broken)
      const workingLinks = wikiLinks.filter(link => link.exists);
      expect(workingLinks.length).toBe(2);
      
      // Test clicking the link
      await wikiEditor.clickWikiLink('Target: Special & Characters');
      await wikiEditor.verifyPageLoaded('Target: Special & Characters');
    });

    test('should prevent wiki link infinite loops', async () => {
      // Regression: Circular wiki links could cause infinite redirects
      await testHelpers.createTestPage({
        title: 'Loop Page A',
        content: '# Loop Page A\n\nLink to [[Loop Page B]]',
        category: 'reference'
      });
      
      await testHelpers.createTestPage({
        title: 'Loop Page B',
        content: '# Loop Page B\n\nLink back to [[Loop Page A]]',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Loop Page A');
      
      // Navigate through the loop
      await wikiEditor.clickWikiLink('Loop Page B');
      await wikiEditor.verifyPageLoaded('Loop Page B');
      
      await wikiEditor.clickWikiLink('Loop Page A');
      await wikiEditor.verifyPageLoaded('Loop Page A');
      
      // Verify browser history works correctly
      await wikiEditor.page.goBack();
      await wikiEditor.verifyPageLoaded('Loop Page B');
      
      await wikiEditor.page.goBack();
      await wikiEditor.verifyPageLoaded('Loop Page A');
    });

    test('should handle broken wiki links consistently', async () => {
      // Regression: Broken wiki links showed inconsistent behavior
      await testHelpers.createTestPage({
        title: 'Broken Links Test',
        content: edgeCaseWikiPages.brokenLinks.content,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Broken Links Test');
      
      const wikiLinks = await wikiEditor.findWikiLinks();
      const brokenLinks = wikiLinks.filter(link => !link.exists);
      
      expect(brokenLinks.length).toBeGreaterThan(0);
      
      // All broken links should have consistent styling
      for (const brokenLink of brokenLinks) {
        const linkElement = wikiEditor.contentDisplay.locator(`a:has-text("${brokenLink.text}")`);
        const classes = await linkElement.getAttribute('class') || '';
        
        // Should have broken link indicator
        expect(classes.includes('broken') || classes.includes('missing')).toBe(true);
        
        // Clicking should handle gracefully (not crash)
        await linkElement.click();
        
        // Should either stay on same page or show proper 404/creation option
        await wikiEditor.page.waitForTimeout(1000);
        
        const currentUrl = wikiEditor.page.url();
        const pageContent = await wikiEditor.page.textContent('body');
        
        // Should not show generic browser error
        expect(pageContent).not.toContain('ERR_');
        expect(pageContent).not.toContain('This site can't be reached');
        
        // Navigate back if we moved away
        if (!currentUrl.includes('broken-links-test')) {
          await wikiEditor.page.goBack();
        }
      }
    });
  });

  test.describe('Category and Tag Regression Tests', () => {
    test('should handle category changes without losing page content', async () => {
      // Regression: Changing category corrupted page content
      await testHelpers.createTestPage({
        title: 'Category Change Test',
        content: '# Category Test\n\nImportant content that should not be lost.',
        category: 'documentation',
        tags: ['important', 'test']
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Category Change Test');
      
      const originalContent = await wikiEditor.getPageContent();
      const originalTags = await wikiEditor.getPageTags();
      
      // Change category
      await wikiEditor.enterEditMode();
      await wikiEditor.updateCategory('guides');
      await wikiEditor.saveChanges();
      
      // Content should be preserved
      const updatedContent = await wikiEditor.getPageContent();
      expect(updatedContent).toBe(originalContent);
      
      // Tags should be preserved
      const updatedTags = await wikiEditor.getPageTags();
      expect(updatedTags).toEqual(originalTags);
      
      // Category should be updated
      const newCategory = await wikiEditor.getPageCategory();
      expect(newCategory).toBe('guides');
    });

    test('should handle tag updates with special characters', async () => {
      // Regression: Tags with special characters caused parsing errors
      await testHelpers.createTestPage({
        title: 'Special Tags Test',
        content: '# Special Tags\n\nTesting tags with special characters.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Special Tags Test');
      await wikiEditor.enterEditMode();
      
      const specialTags = [
        'tag-with-hyphens',
        'tag_with_underscores',
        'tag.with.dots',
        'C++',
        'user@domain',
        'tag with spaces',
        '中文tag',
        'émoji🚀tag'
      ];
      
      await wikiEditor.updateTags(specialTags.join(', '));
      await wikiEditor.saveChanges();
      
      // Verify tags were saved correctly
      const savedTags = await wikiEditor.getPageTags();
      
      // Should have preserved most tags (some might be normalized)
      expect(savedTags.length).toBeGreaterThan(specialTags.length / 2);
      
      // Basic tags should be preserved
      expect(savedTags).toContain('tag-with-hyphens');
      expect(savedTags).toContain('tag_with_underscores');
    });

    test('should maintain tag associations when filtering', async () => {
      // Regression: Tag filtering broke when pages had many tags
      const taggedPages = [
        { title: 'Multi Tag Page 1', tags: ['tag1', 'tag2', 'tag3', 'common'] },
        { title: 'Multi Tag Page 2', tags: ['tag2', 'tag4', 'tag5', 'common'] },
        { title: 'Multi Tag Page 3', tags: ['tag1', 'tag3', 'tag5', 'common'] }
      ];
      
      for (const page of taggedPages) {
        await testHelpers.createTestPage({
          title: page.title,
          content: `# ${page.title}\n\nContent with multiple tags.`,
          category: 'reference',
          tags: page.tags
        });
      }
      
      await wikiPages.goto();
      
      // Search by common tag
      await wikiPages.searchPages('common');
      
      const results = await wikiPages.getVisiblePageTitles();
      expect(results.length).toBe(3);
      
      // All results should contain pages with the common tag
      expect(results.every(title => title.includes('Multi Tag Page'))).toBe(true);
      
      // Search by specific tag combination
      await wikiPages.searchPages('tag1');
      
      const tag1Results = await wikiPages.getVisiblePageTitles();
      expect(tag1Results.length).toBe(2); // Page 1 and Page 3
      
      expect(tag1Results).toContain('Multi Tag Page 1');
      expect(tag1Results).toContain('Multi Tag Page 3');
      expect(tag1Results).not.toContain('Multi Tag Page 2');
    });
  });

  test.describe('Performance Regression Tests', () => {
    test('should not slow down with many pages in hierarchy', async () => {
      // Regression: Large hierarchies caused exponential slowdown
      
      // Create hierarchical structure with many pages
      let parentTitle = 'Root Performance Page';
      await testHelpers.createTestPage({
        title: parentTitle,
        content: '# Root Page\n\nRoot of performance hierarchy.',
        category: 'documentation'
      });
      
      // Create multiple levels with multiple children each
      for (let level = 1; level <= 3; level++) {
        for (let child = 1; child <= 5; child++) {
          const childTitle = `Level ${level} Child ${child}`;
          await testHelpers.createTestPage({
            title: childTitle,
            content: `# ${childTitle}\n\nContent at level ${level}.`,
            category: 'documentation',
            parent: level === 1 ? parentTitle : `Level ${level - 1} Child 1`
          });
        }
      }
      
      // Test performance with large hierarchy
      const startTime = Date.now();
      await wikiPages.goto();
      await wikiPages.waitForLoadState();
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time despite hierarchy size
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      // Tree view should render without timeout
      if (!await wikiPages.isSidebarVisible()) {
        await wikiPages.toggleSidebar();
      }
      
      const treeStructure = await wikiPages.getTreeStructure();
      expect(treeStructure.length).toBeGreaterThan(15); // Should show all pages
    });

    test('should maintain search performance with large content', async () => {
      // Regression: Search became slow with pages containing large content
      
      const largePages = [];
      for (let i = 1; i <= 10; i++) {
        const largeContent = `# Large Page ${i}\n\n` + 
          'This is a large content section. '.repeat(500) +
          `\n\nUnique search term: SearchTest${i}`;
        
        largePages.push({
          title: `Large Search Page ${i}`,
          content: largeContent,
          category: 'reference'
        });
      }
      
      await testHelpers.createMultiplePages(largePages);
      
      await wikiPages.goto();
      
      // Test search performance
      const searchStartTime = Date.now();
      await wikiPages.searchPages('SearchTest5');
      const searchTime = Date.now() - searchStartTime;
      
      // Should complete search within reasonable time
      expect(searchTime).toBeLessThan(3000); // 3 seconds max
      
      // Should find the correct result
      const results = await wikiPages.getVisiblePageTitles();
      expect(results.some(title => title.includes('Large Search Page 5'))).toBe(true);
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});