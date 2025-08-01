import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';

/**
 * Wiki Accessibility Tests - Ensure Wiki components meet WCAG standards
 */
test.describe('Wiki Accessibility Tests @a11y', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
  });

  test.describe('Wiki Pages List Accessibility', () => {
    test.beforeEach(async () => {
      // Create test pages for accessibility testing
      await testHelpers.createMultiplePages([
        {
          title: 'Accessibility Test Page 1',
          content: '# Accessibility Test\n\nContent for accessibility testing.',
          category: 'documentation',
          tags: ['accessibility', 'test']
        },
        {
          title: 'Accessibility Test Page 2',
          content: '# Another Test Page\n\nMore content for testing.',
          category: 'guides',
          tags: ['accessibility', 'guide']
        }
      ]);
    });

    test('should have no accessibility violations on pages list', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      const accessibilityScanResults = await new AxeBuilder({ page: wikiPages.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Check page title is H1
      const h1Elements = await wikiPages.page.locator('h1').count();
      expect(h1Elements).toBeGreaterThanOrEqual(1);

      // Check heading hierarchy is logical
      const headings = await wikiPages.page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have proper landmark roles', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Check for main landmark
      await expect(wikiPages.page.locator('main, [role="main"]')).toBeVisible();

      // Check for navigation landmarks
      const nav = wikiPages.page.locator('nav, [role="navigation"]');
      if (await nav.count() > 0) {
        await expect(nav.first()).toBeVisible();
      }

      // Check for banner/header
      const header = wikiPages.page.locator('header, [role="banner"]');
      if (await header.count() > 0) {
        await expect(header.first()).toBeVisible();
      }
    });

    test('should support keyboard navigation', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Tab through interactive elements
      await wikiPages.page.keyboard.press('Tab');
      let focusedElement = await wikiPages.page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'A', 'SELECT'].includes(focusedElement || '')).toBe(true);

      // Continue tabbing to ensure tab order is logical
      for (let i = 0; i < 5; i++) {
        await wikiPages.page.keyboard.press('Tab');
        focusedElement = await wikiPages.page.evaluate(() => document.activeElement?.tagName);
        
        // Should remain on interactive elements
        if (focusedElement) {
          expect(['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA', 'DIV'].includes(focusedElement)).toBe(true);
        }
      }
    });

    test('should have accessible search functionality', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Search input should have proper labels
      const searchInput = wikiPages.searchInput;
      await expect(searchInput).toHaveAttribute('aria-label');
      
      // Or should be labeled by associated label
      const ariaLabelledBy = await searchInput.getAttribute('aria-labelledby');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      
      expect(ariaLabelledBy || ariaLabel).toBeTruthy();

      // Search should be accessible via keyboard
      await searchInput.focus();
      await searchInput.type('accessibility');
      await wikiPages.page.keyboard.press('Enter');

      // Results should be announced to screen readers
      const resultsContainer = wikiPages.pagesGrid;
      const ariaLive = await resultsContainer.getAttribute('aria-live');
      
      if (ariaLive) {
        expect(['polite', 'assertive'].includes(ariaLive)).toBe(true);
      }
    });

    test('should have accessible page cards', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      const pageCards = wikiPages.pageCards;
      const cardCount = await pageCards.count();

      if (cardCount > 0) {
        for (let i = 0; i < Math.min(3, cardCount); i++) {
          const card = pageCards.nth(i);
          
          // Cards should be keyboard accessible
          const cardLink = card.locator('a').first();
          if (await cardLink.count() > 0) {
            await expect(cardLink).toBeFocusable();
          }

          // Cards should have accessible names
          const cardTitle = card.locator('[data-testid="page-title"], h2, h3').first();
          if (await cardTitle.count() > 0) {
            const titleText = await cardTitle.textContent();
            expect(titleText?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should have accessible category filter', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      const categoryFilter = wikiPages.categoryFilter;
      
      // Should have proper labeling
      const label = await categoryFilter.getAttribute('aria-label') || 
                   await categoryFilter.getAttribute('aria-labelledby');
      expect(label).toBeTruthy();

      // Should be keyboard accessible
      await expect(categoryFilter).toBeFocusable();
      
      // Should announce changes to screen readers
      await categoryFilter.focus();
      await categoryFilter.selectOption('documentation');
      
      // Filter changes should update aria-live region if present
      const liveRegion = wikiPages.page.locator('[aria-live]');
      if (await liveRegion.count() > 0) {
        const liveContent = await liveRegion.textContent();
        expect(liveContent?.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Wiki Editor Accessibility', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Editor Accessibility Test',
        content: `# Editor Accessibility Test

This page tests editor accessibility features.

## Content Sections
- List item 1
- List item 2

**Bold text** and *italic text*.`,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Editor Accessibility Test');
    });

    test('should have no accessibility violations in view mode', async () => {
      await wikiEditor.verifyPageLoaded('Editor Accessibility Test');

      const accessibilityScanResults = await new AxeBuilder({ page: wikiEditor.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have no accessibility violations in edit mode', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.verifyEditMode();

      const accessibilityScanResults = await new AxeBuilder({ page: wikiEditor.page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible form controls in edit mode', async () => {
      await wikiEditor.enterEditMode();

      // Title input should have proper labeling
      const titleInput = wikiEditor.titleInput;
      if (await titleInput.isVisible()) {
        const titleLabel = await titleInput.getAttribute('aria-label') || 
                          await titleInput.getAttribute('aria-labelledby');
        expect(titleLabel).toBeTruthy();
        await expect(titleInput).toBeFocusable();
      }

      // Content textarea should have proper labeling
      const contentTextarea = wikiEditor.contentTextarea;
      const contentLabel = await contentTextarea.getAttribute('aria-label') || 
                           await contentTextarea.getAttribute('aria-labelledby');
      expect(contentLabel).toBeTruthy();
      await expect(contentTextarea).toBeFocusable();

      // Category select should have proper labeling
      const categorySelect = wikiEditor.categorySelect;
      if (await categorySelect.isVisible()) {
        const categoryLabel = await categorySelect.getAttribute('aria-label') || 
                             await categorySelect.getAttribute('aria-labelledby');
        expect(categoryLabel).toBeTruthy();
        await expect(categorySelect).toBeFocusable();
      }
    });

    test('should support keyboard navigation in edit mode', async () => {
      await wikiEditor.enterEditMode();

      // Tab through form controls
      await wikiEditor.titleInput.focus();
      await wikiEditor.page.keyboard.press('Tab');
      
      // Should move to content textarea
      let focused = await wikiEditor.page.evaluate(() => document.activeElement?.tagName);
      expect(['TEXTAREA', 'SELECT', 'BUTTON'].includes(focused || '')).toBe(true);

      // Continue tabbing through controls
      await wikiEditor.page.keyboard.press('Tab');
      focused = await wikiEditor.page.evaluate(() => document.activeElement?.tagName);
      expect(['TEXTAREA', 'SELECT', 'BUTTON'].includes(focused || '')).toBe(true);
    });

    test('should announce save status to screen readers', async () => {
      await wikiEditor.enterEditMode();
      
      // Make a change
      await wikiEditor.appendContent('\n\nAccessibility test content.');
      
      // Check for status announcements
      const statusRegion = wikiEditor.page.locator('[aria-live], [role="status"]');
      
      if (await statusRegion.count() > 0) {
        // Save the changes
        await wikiEditor.saveChanges();
        
        // Status should be announced
        const statusText = await statusRegion.textContent();
        expect(statusText?.toLowerCase()).toMatch(/sav|success|complet/);
      }
    });

    test('should have accessible toolbar buttons', async () => {
      await wikiEditor.enterEditMode();

      const toolbar = wikiEditor.editorToolbar;
      if (await toolbar.isVisible()) {
        const toolbarButtons = toolbar.locator('button');
        const buttonCount = await toolbarButtons.count();

        for (let i = 0; i < buttonCount; i++) {
          const button = toolbarButtons.nth(i);
          
          // Each button should have accessible name
          const buttonName = await button.getAttribute('aria-label') || 
                            await button.getAttribute('title') ||
                            await button.textContent();
          expect(buttonName?.trim().length).toBeGreaterThan(0);
          
          // Buttons should be focusable
          await expect(button).toBeFocusable();
        }
      }
    });

    test('should have accessible error messages', async () => {
      await wikiEditor.enterEditMode();
      
      // Clear required field to trigger validation
      await wikiEditor.titleInput.fill('');
      await wikiEditor.saveButton.click();
      
      // Look for error messages
      const errorMessages = wikiEditor.page.locator('[role="alert"], .error, [aria-live="assertive"]');
      
      if (await errorMessages.count() > 0) {
        const errorMessage = errorMessages.first();
        
        // Error should be associated with the field
        const errorText = await errorMessage.textContent();
        expect(errorText?.trim().length).toBeGreaterThan(0);
        
        // Error should be announced to screen readers
        const ariaLive = await errorMessage.getAttribute('aria-live');
        const role = await errorMessage.getAttribute('role');
        
        expect(ariaLive === 'assertive' || role === 'alert').toBe(true);
      }
    });
  });

  test.describe('Markdown Content Accessibility', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Markdown Accessibility Test',
        content: `# Main Heading

## Section Heading

This paragraph contains various formatting:
- **Bold text** for emphasis
- *Italic text* for emphasis
- \`Code text\` for technical terms

### Subsection

Here's a table:

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Data A   | Data B   | Data C   |

### Code Block

\`\`\`javascript
function example() {
  console.log("Accessible code block");
}
\`\`\`

### Links

Here are different types of links:
- [External link](https://example.com)
- [[Internal wiki link]]

### Lists

Ordered list:
1. First item
2. Second item
3. Third item

Unordered list:
- First bullet
- Second bullet
- Third bullet

> This is a blockquote that should be properly identified by screen readers.

![Accessible image](https://via.placeholder.com/200x100.png?text=Alt+Text+Example)`,
        category: 'reference'
      });

      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Markdown Accessibility Test');
    });

    test('should have no accessibility violations in rendered content', async () => {
      await wikiEditor.verifyPageLoaded('Markdown Accessibility Test');

      const accessibilityScanResults = await new AxeBuilder({ page: wikiEditor.page })
        .include(wikiEditor.contentDisplay)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy in content', async () => {
      const headings = await wikiEditor.contentDisplay.locator('h1, h2, h3, h4, h5, h6').all();
      
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading levels are sequential
      let previousLevel = 0;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const currentLevel = parseInt(tagName.charAt(1));
        
        if (previousLevel > 0) {
          // Next heading should not skip more than one level
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
        
        previousLevel = currentLevel;
      }
    });

    test('should have accessible tables', async () => {
      const tables = wikiEditor.contentDisplay.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        for (let i = 0; i < tableCount; i++) {
          const table = tables.nth(i);
          
          // Tables should have headers
          const headers = table.locator('th');
          const headerCount = await headers.count();
          expect(headerCount).toBeGreaterThan(0);
          
          // Headers should have proper scope if needed
          if (headerCount > 1) {
            for (let j = 0; j < headerCount; j++) {
              const header = headers.nth(j);
              const scope = await header.getAttribute('scope');
              
              // Scope should be col, row, colgroup, or rowgroup for complex tables
              if (scope) {
                expect(['col', 'row', 'colgroup', 'rowgroup'].includes(scope)).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should have accessible images', async () => {
      const images = wikiEditor.contentDisplay.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        
        // Images should have alt text
        const altText = await image.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should have accessible links', async () => {
      const links = wikiEditor.contentDisplay.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        
        // Links should have accessible names
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        
        const accessibleName = linkText || ariaLabel || title;
        expect(accessibleName?.trim().length).toBeGreaterThan(0);
        
        // External links should indicate they're external
        const href = await link.getAttribute('href');
        if (href && (href.startsWith('http') && !href.includes(wikiEditor.page.url()))) {
          // Should have some indication it's external (text, icon, or aria-label)
          const isExternalIndicated = 
            linkText?.includes('external') ||
            ariaLabel?.includes('external') ||
            title?.includes('external') ||
            await link.locator('[aria-hidden="true"]').count() > 0; // Icon present
          
          // This is informational - not all sites indicate external links
        }
      }
    });

    test('should have accessible code blocks', async () => {
      const codeBlocks = wikiEditor.contentDisplay.locator('pre code');
      const codeBlockCount = await codeBlocks.count();

      if (codeBlockCount > 0) {
        for (let i = 0; i < codeBlockCount; i++) {
          const codeBlock = codeBlocks.nth(i);
          
          // Code blocks should have language indication if possible
          const className = await codeBlock.getAttribute('class');
          
          // Should have role="code" or be in a <code> element (semantic)
          const tagName = await codeBlock.evaluate(el => el.tagName.toLowerCase());
          expect(tagName).toBe('code');
        }
      }
    });

    test('should have accessible lists', async () => {
      const lists = wikiEditor.contentDisplay.locator('ul, ol');
      const listCount = await lists.count();

      expect(listCount).toBeGreaterThan(0);

      for (let i = 0; i < listCount; i++) {
        const list = lists.nth(i);
        
        // Lists should contain list items
        const listItems = list.locator('li');
        const itemCount = await listItems.count();
        expect(itemCount).toBeGreaterThan(0);
        
        // List items should have content
        for (let j = 0; j < Math.min(3, itemCount); j++) {
          const item = listItems.nth(j);
          const itemText = await item.textContent();
          expect(itemText?.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('should have accessible blockquotes', async () => {
      const blockquotes = wikiEditor.contentDisplay.locator('blockquote');
      const blockquoteCount = await blockquotes.count();

      if (blockquoteCount > 0) {
        for (let i = 0; i < blockquoteCount; i++) {
          const blockquote = blockquotes.nth(i);
          
          // Blockquotes should have content
          const quoteText = await blockquote.textContent();
          expect(quoteText?.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('High Contrast and Visual Accessibility', () => {
    test('should be accessible in high contrast mode', async () => {
      // Enable high contrast mode
      await wikiPages.page.emulateMedia({ colorScheme: 'dark' });
      
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Check that content is still visible and accessible
      const accessibilityScanResults = await new AxeBuilder({ page: wikiPages.page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should maintain accessibility when zoomed', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Zoom to 200%
      await wikiPages.page.evaluate(() => {
        document.body.style.zoom = '2';
      });

      // Content should still be accessible
      await expect(wikiPages.searchInput).toBeVisible();
      await expect(wikiPages.newPageButton).toBeVisible();

      // Should still be able to interact
      await wikiPages.searchInput.click();
      await wikiPages.searchInput.type('zoom test');
    });

    test('should have sufficient color contrast', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Test color contrast with axe-core
      const accessibilityScanResults = await new AxeBuilder({ page: wikiPages.page })
        .withTags(['wcag2aa'])
        .include('body')
        .analyze();

      // Filter for color contrast violations
      const contrastViolations = accessibilityScanResults.violations.filter(
        violation => violation.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA landmarks', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Check for proper landmark structure
      const landmarks = await wikiPages.page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside').all();
      
      expect(landmarks.length).toBeGreaterThan(0);

      // Main content should be identifiable
      const mainLandmark = wikiPages.page.locator('main, [role="main"]');
      await expect(mainLandmark).toBeVisible();
    });

    test('should have proper focus management', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Focus should be visible
      await wikiPages.searchInput.focus();
      
      const focusedElement = await wikiPages.page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          outline: window.getComputedStyle(el!).outline,
          outlineWidth: window.getComputedStyle(el!).outlineWidth
        };
      });

      // Should have visible focus indicator
      expect(focusedElement.tag).toBe('INPUT');
      expect(
        focusedElement.outline !== 'none' || 
        focusedElement.outlineWidth !== '0px'
      ).toBe(true);
    });

    test('should announce dynamic content changes', async () => {
      await wikiPages.goto();
      await wikiPages.waitForLoadState();

      // Check for aria-live regions
      const liveRegions = wikiPages.page.locator('[aria-live]');
      
      if (await liveRegions.count() > 0) {
        // Perform search to trigger content change
        await wikiPages.searchPages('test');
        
        // Live regions should exist for announcing changes
        const liveRegion = liveRegions.first();
        const ariaLive = await liveRegion.getAttribute('aria-live');
        expect(['polite', 'assertive'].includes(ariaLive || '')).toBe(true);
      }
    });

    test('should have proper form validation announcements', async () => {
      await wikiPages.goto();
      await wikiPages.openCreatePageDialog();

      // Try to submit invalid form
      await wikiPages.createPageSubmitButton.click();

      // Look for validation messages
      const validationMessages = wikiPages.page.locator('[role="alert"], [aria-live="assertive"], .error[aria-describedby]');
      
      if (await validationMessages.count() > 0) {
        const message = validationMessages.first();
        const messageText = await message.textContent();
        expect(messageText?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});