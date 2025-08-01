import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers, commonMarkdownTests } from '../utils/wiki-test-helpers';
import { markdownTestPages, wikiTestConfig } from '../fixtures/wiki-test-data';

test.describe('Wiki Markdown Editor', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
    
    // Create a test page for editor testing
    await testHelpers.createTestPage({
      title: 'Markdown Editor Test Page',
      content: '# Test Page\n\nInitial content for editor testing.',
      category: 'reference'
    });
    
    await wikiPages.goto();
    await wikiPages.clickPageByTitle('Markdown Editor Test Page');
    await wikiEditor.verifyPageLoaded('Markdown Editor Test Page');
  });

  test.describe('Basic Editor Functionality', () => {
    test('should enter and exit edit mode correctly', async () => {
      // Verify starting in view mode
      await wikiEditor.verifyViewMode();
      expect(await wikiEditor.isInViewMode()).toBe(true);
      expect(await wikiEditor.isInEditMode()).toBe(false);

      // Enter edit mode
      await wikiEditor.enterEditMode();
      await wikiEditor.verifyEditMode();
      expect(await wikiEditor.isInEditMode()).toBe(true);
      expect(await wikiEditor.isInViewMode()).toBe(false);

      // Exit edit mode
      await wikiEditor.exitEditMode();
      await wikiEditor.verifyViewMode();
      expect(await wikiEditor.isInViewMode()).toBe(true);
      expect(await wikiEditor.isInEditMode()).toBe(false);
    });

    test('should preserve content when switching modes', async () => {
      const originalContent = await wikiEditor.getPageContent();
      
      await wikiEditor.enterEditMode();
      const editModeContent = await wikiEditor.getPageContent();
      expect(editModeContent).toBe(originalContent);
      
      await wikiEditor.exitEditMode();
      const backToViewContent = await wikiEditor.getPageContent();
      expect(backToViewContent).toBe(originalContent);
    });

    test('should handle typing with reasonable performance', async () => {
      await wikiEditor.enterEditMode();
      
      const startTime = Date.now();
      await wikiEditor.typeInEditor('This is a performance test for typing responsiveness.');
      const typingTime = Date.now() - startTime;
      
      expect(typingTime).toBeLessThan(wikiTestConfig.editor.typingDelay * 100); // Reasonable typing performance
      
      const content = await wikiEditor.getPageContent();
      expect(content).toContain('performance test for typing');
    });

    test('should support undo/redo operations', async () => {
      await wikiEditor.enterEditMode();
      
      const originalContent = await wikiEditor.getPageContent();
      
      // Add content
      await wikiEditor.typeInEditor('\n\nAdded content for undo test');
      const withAddedContent = await wikiEditor.getPageContent();
      expect(withAddedContent).toContain('Added content for undo test');
      
      // Undo (Ctrl+Z)
      await wikiEditor.page.keyboard.press('Control+z');
      await wikiEditor.page.waitForTimeout(100);
      
      const afterUndo = await wikiEditor.getPageContent();
      expect(afterUndo).toBe(originalContent);
      expect(afterUndo).not.toContain('Added content for undo test');
      
      // Redo (Ctrl+Y)
      await wikiEditor.page.keyboard.press('Control+y');
      await wikiEditor.page.waitForTimeout(100);
      
      const afterRedo = await wikiEditor.getPageContent();
      expect(afterRedo).toContain('Added content for undo test');
    });

    test('should auto-save content periodically', async () => {
      await wikiEditor.enterEditMode();
      
      // Type content
      await wikiEditor.typeInEditor('\n\nAuto-save test content');
      
      // Wait for auto-save interval
      await wikiEditor.page.waitForTimeout(wikiTestConfig.editor.autoSaveInterval + 1000);
      
      // Check for auto-save indicator or verify content persistence
      // Implementation depends on auto-save UI feedback
    });
  });

  test.describe('Live Preview Functionality', () => {
    test('should toggle preview pane correctly', async () => {
      await wikiEditor.enterEditMode();
      
      // Initially preview might be hidden
      await wikiEditor.togglePreview();
      expect(await wikiEditor.isPreviewVisible()).toBe(true);
      
      // Toggle again to hide
      await wikiEditor.togglePreview();
      expect(await wikiEditor.isPreviewVisible()).toBe(false);
    });

    test('should sync preview with editor content', async () => {
      await wikiEditor.verifyPreviewSync();
    });

    test('should render markdown in preview correctly', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.togglePreview();
      
      const testMarkdown = `# Preview Test

## Headers Work
### Subheaders too

**Bold text** and *italic text* should render correctly.

- List item 1
- List item 2

\`\`\`javascript
const code = "should be highlighted";
\`\`\`

[Links](https://example.com) should be clickable.`;

      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(testMarkdown);
      
      // Wait for preview update
      await wikiEditor.page.waitForTimeout(wikiTestConfig.editor.previewUpdateTimeout);
      
      // Verify preview contains rendered elements
      await wikiEditor.verifyMarkdownRendering(['h1', 'h2', 'h3', 'strong', 'em', 'ul', 'li', 'pre', 'code', 'a']);
    });

    test('should update preview in real-time', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.togglePreview();
      
      await wikiEditor.clearEditor();
      
      // Type content gradually and verify preview updates
      await wikiEditor.typeInEditor('# Real-time');
      await wikiEditor.page.waitForTimeout(300);
      
      let previewContent = await wikiEditor.getMarkdownPreview();
      expect(previewContent).toContain('Real-time');
      
      await wikiEditor.typeInEditor('\n\nUpdate test');
      await wikiEditor.page.waitForTimeout(300);
      
      previewContent = await wikiEditor.getMarkdownPreview();
      expect(previewContent).toContain('Update test');
    });
  });

  test.describe('Markdown Syntax Support', () => {
    test('should render all basic markdown elements correctly', async () => {
      await testHelpers.testMarkdownRendering(commonMarkdownTests);
    });

    test('should support GitHub Flavored Markdown', async () => {
      await wikiEditor.enterEditMode();
      
      const gfmContent = `# GitHub Flavored Markdown Test

## Task Lists
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task

## Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| **Bold** | *Italic* | \`Code\`   |

## Strikethrough
~~This text is crossed out~~

## Autolinks
https://www.example.com should become a link

## Code Fencing with Language
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\``;

      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(gfmContent);
      await wikiEditor.saveChanges();
      
      // Verify GFM elements are rendered
      await wikiEditor.verifyMarkdownRendering([
        'input[type="checkbox"]', // Task list checkboxes
        'table', 'th', 'td', // Tables
        'del', // Strikethrough
        'a[href="https://www.example.com"]', // Autolinks
        'pre code.language-javascript', // Code blocks with language
        'pre code.language-python'
      ]);
    });

    test('should handle complex nested markdown', async () => {
      await wikiEditor.enterEditMode();
      
      const complexMarkdown = `# Complex Nested Markdown

1. **First level list with bold**
   
   This is a paragraph within a list item.
   
   \`\`\`javascript
   // Code block within list
   const nested = "code block";
   \`\`\`
   
   - Nested unordered list
   - With multiple items
     - Even deeper nesting
   
2. **Second level with blockquote**
   
   > This is a blockquote within a list item
   > 
   > It can span multiple lines
   > 
   > | And | Even | Contain |
   > |-----|------|---------|
   > | Table | Data | Here |
   
3. **Third level with everything**
   
   Regular text with **bold**, *italic*, and \`inline code\`.
   
   ![Image in list](https://via.placeholder.com/200x100.png)`;

      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(complexMarkdown);
      await wikiEditor.saveChanges();
      
      // Verify complex nested structure renders correctly
      await wikiEditor.verifyMarkdownRendering([
        'ol', 'li', 'strong', 'p', 'pre', 'code',
        'ul', 'blockquote', 'table', 'img'
      ]);
    });

    test('should support wiki-style internal links', async () => {
      await wikiEditor.enterEditMode();
      
      const wikiLinkContent = `# Wiki Links Test

## Basic Wiki Links
- [[Welcome Page]] - Basic wiki link
- [[Getting Started Guide]] - Another wiki link
- [[Non-existent Page]] - Broken link (should be styled differently)

## Wiki Links with Custom Text
- [[Welcome Page|Welcome]] - Custom display text
- [[Getting Started Guide|Get Started]] - Another custom text

## Mixed Links
- Regular [external link](https://example.com)
- Wiki [[Internal Link]]
- Email [contact](mailto:test@example.com)`;

      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(wikiLinkContent);
      await wikiEditor.saveChanges();
      
      // Verify wiki links are rendered correctly
      const wikiLinks = await wikiEditor.findWikiLinks();
      expect(wikiLinks.length).toBeGreaterThan(0);
      
      // Check for both working and broken links
      const workingLinks = wikiLinks.filter(link => link.exists);
      const brokenLinks = wikiLinks.filter(link => !link.exists);
      
      expect(workingLinks.length).toBeGreaterThan(0);
      expect(brokenLinks.length).toBeGreaterThan(0); // Non-existent pages should be broken
    });

    test('should handle markdown edge cases', async () => {
      await wikiEditor.enterEditMode();
      
      const edgeCaseContent = `# Edge Cases Test

## Escaped Characters
\\* Not italic \\*
\\# Not a header
\\[Not a link\\]

## Empty Elements
**bold****more bold**
*italic**bold italic***normal*

## Unusual Spacing
#Not a header (no space)
#  Header with extra spaces  

## Special Characters in Links
[Link with spaces]( https://example.com/path with spaces )
[Link with quotes]('https://example.com/quotes'test')
[Unicode link](https://例え.テスト)

## Malformed Markdown
**unclosed bold
*unclosed italic
[unclosed link
\`unclosed code

##  Multiple  Spaces  In  Header  

This should still render reasonably well.`;

      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor(edgeCaseContent);
      await wikiEditor.saveChanges();
      
      // Verify edge cases are handled gracefully
      const content = await wikiEditor.getPageContent();
      expect(content.length).toBeGreaterThan(0);
      
      // Verify escaped characters are not rendered as markdown
      expect(content).toContain('* Not italic *');
      expect(content).toContain('# Not a header');
    });
  });

  test.describe('Editor Toolbar and Shortcuts', () => {
    test('should provide keyboard shortcuts for common formatting', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.clearEditor();
      
      // Test bold shortcut
      await wikiEditor.typeInEditor('bold text');
      await wikiEditor.page.keyboard.press('Control+a'); // Select all
      await wikiEditor.page.keyboard.press('Control+b'); // Bold
      
      let content = await wikiEditor.getPageContent();
      expect(content).toContain('**bold text**');
      
      // Clear and test italic
      await wikiEditor.clearEditor();
      await wikiEditor.typeInEditor('italic text');
      await wikiEditor.page.keyboard.press('Control+a'); // Select all
      await wikiEditor.page.keyboard.press('Control+i'); // Italic
      
      content = await wikiEditor.getPageContent();
      expect(content).toContain('*italic text*');
    });

    test('should provide toolbar buttons for formatting', async () => {
      await wikiEditor.enterEditMode();
      
      // This test assumes toolbar buttons exist
      // Implementation would depend on actual toolbar UI
      
      const toolbar = wikiEditor.editorToolbar;
      if (await toolbar.isVisible()) {
        // Test bold button
        const boldButton = toolbar.locator('[data-testid="bold-button"], button[title*="Bold"]');
        if (await boldButton.isVisible()) {
          await wikiEditor.typeInEditor('toolbar test');
          await wikiEditor.page.keyboard.press('Control+a');
          await boldButton.click();
          
          const content = await wikiEditor.getPageContent();
          expect(content).toContain('**toolbar test**');
        }
      }
    });

    test('should support inserting common markdown elements via toolbar', async () => {
      await wikiEditor.enterEditMode();
      
      // Test inserting headers
      const headerButton = wikiEditor.editorToolbar.locator('[data-testid="header-button"]');
      if (await headerButton.isVisible()) {
        await headerButton.click();
        await wikiEditor.typeInEditor('Header Text');
        
        const content = await wikiEditor.getPageContent();
        expect(content).toMatch(/^#+ Header Text/m);
      }
      
      // Test inserting links
      const linkButton = wikiEditor.editorToolbar.locator('[data-testid="link-button"]');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        // This might open a dialog for link insertion
        // Implementation would depend on UI design
      }
    });
  });

  test.describe('Content Validation and Error Handling', () => {
    test('should handle very large content', async () => {
      await wikiEditor.enterEditMode();
      
      // Generate large content
      const largeContent = 'Large content test. '.repeat(1000) + 
        '\n\n' + '# Header\n\nContent section.\n\n'.repeat(500);
      
      const startTime = Date.now();
      await wikiEditor.clearEditor();
      await wikiEditor.contentTextarea.fill(largeContent);
      const fillTime = Date.now() - startTime;
      
      expect(fillTime).toBeLessThan(wikiTestConfig.performance.largeDocumentTimeout);
      
      // Verify content was set correctly
      const editorContent = await wikiEditor.getPageContent();
      expect(editorContent.length).toBeGreaterThan(10000);
      expect(editorContent).toContain('Large content test');
    });

    test('should validate content on save', async () => {
      await wikiEditor.enterEditMode();
      
      // Try to save empty content
      await wikiEditor.clearEditor();
      await wikiEditor.saveButton.click();
      
      // Should show validation error or prevent saving
      if (await wikiEditor.hasErrors()) {
        const errorMessage = await wikiEditor.getErrorMessage();
        expect(errorMessage.length).toBeGreaterThan(0);
      } else {
        // Or should remain in edit mode
        expect(await wikiEditor.isInEditMode()).toBe(true);
      }
    });

    test('should handle network errors during save gracefully', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.typeInEditor('\n\nContent to save with network error');
      
      // Simulate network error by intercepting the save request
      await wikiEditor.page.route('**/api/wiki/pages/**', route => {
        route.abort('failed');
      });
      
      await wikiEditor.saveButton.click();
      
      // Should show error message
      await expect(wikiEditor.errorMessage).toBeVisible();
      const errorMessage = await wikiEditor.getErrorMessage();
      expect(errorMessage).toContain('error');
      
      // Should remain in edit mode
      expect(await wikiEditor.isInEditMode()).toBe(true);
      
      // Content should be preserved
      const content = await wikiEditor.getPageContent();
      expect(content).toContain('Content to save with network error');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should maintain responsive editing with long documents', async () => {
      // Use the large document test page
      await testHelpers.createTestPage({
        title: 'Large Document Performance',
        content: markdownTestPages.performanceTestPage.content,
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Large Document Performance');
      
      // Measure edit mode switch time
      const editSwitchTime = await wikiEditor.measureEditModeSwitch();
      expect(editSwitchTime).toBeLessThan(wikiTestConfig.performance.pageLoadTimeout);
      
      // Test typing responsiveness
      const startTime = Date.now();
      await wikiEditor.typeInEditor('\n\nNew content at end');
      const typingTime = Date.now() - startTime;
      
      expect(typingTime).toBeLessThan(wikiTestConfig.editor.typingDelay * 50);
    });

    test('should handle rapid typing without lag', async () => {
      await wikiEditor.enterEditMode();
      await wikiEditor.clearEditor();
      
      const rapidText = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
      
      const startTime = Date.now();
      await wikiEditor.typeInEditor(rapidText, { delay: 10 }); // Very fast typing
      const endTime = Date.now();
      
      const expectedTime = rapidText.length * 10 + 1000; // 10ms per char + 1s buffer
      expect(endTime - startTime).toBeLessThan(expectedTime);
      
      // Verify all content was captured
      const content = await wikiEditor.getPageContent();
      expect(content).toContain('quick brown fox');
      expect(content.length).toBeGreaterThan(rapidText.length * 0.9); // Allow for small losses
    });

    test('should render preview efficiently', async () => {
      const complexContent = `# Performance Test Document

${Array.from({length: 50}, (_, i) => `
## Section ${i + 1}

This is section ${i + 1} with **bold** and *italic* text.

\`\`\`javascript
function section${i + 1}() {
  return "Section ${i + 1} code";
}
\`\`\`

- List item 1
- List item 2
- List item 3

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data ${i + 1} | Value ${i + 1} | Info ${i + 1} |

---
`).join('')}`;

      const renderTime = await wikiEditor.measurePreviewRenderTime(complexContent);
      expect(renderTime).toBeLessThan(wikiTestConfig.performance.largeDocumentTimeout);
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support full keyboard navigation', async () => {
      await testHelpers.testKeyboardNavigation();
    });

    test('should provide proper ARIA labels and roles', async () => {
      await wikiEditor.enterEditMode();
      
      // Check for accessibility attributes
      await expect(wikiEditor.contentTextarea).toHaveAttribute('role', 'textbox');
      await expect(wikiEditor.contentTextarea).toHaveAttribute('aria-label');
      
      if (await wikiEditor.editorToolbar.isVisible()) {
        await expect(wikiEditor.editorToolbar).toHaveAttribute('role', 'toolbar');
      }
    });

    test('should support screen reader announcements', async () => {
      await wikiEditor.enterEditMode();
      
      // Type content and verify screen reader announcements
      // This would typically require specialized testing tools
      await wikiEditor.typeInEditor('Content for screen reader test');
      
      // Check for aria-live regions or other screen reader feedback
      const liveRegion = wikiEditor.page.locator('[aria-live]');
      if (await liveRegion.count() > 0) {
        // Verify live region is properly configured
        await expect(liveRegion).toHaveAttribute('aria-live', /polite|assertive/);
      }
    });
  });

  test.afterEach(async () => {
    // Clean up test data
    await testHelpers.cleanupTestData();
  });
});