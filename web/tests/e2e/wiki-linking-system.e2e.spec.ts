import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';
import { edgeCaseWikiPages } from '../fixtures/wiki-test-data';

test.describe('Wiki Linking System', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
  });

  test.describe('Basic Wiki Link Creation', () => {
    test.beforeEach(async () => {
      // Create target pages for linking
      await testHelpers.createTestPage({
        title: 'Target Page One',
        content: '# Target Page One\n\nThis is the first target page.',
        category: 'documentation'
      });

      await testHelpers.createTestPage({
        title: 'Target Page Two',
        content: '# Target Page Two\n\nThis is the second target page.',
        category: 'guides'
      });

      // Create source page for testing links
      await testHelpers.createTestPage({
        title: 'Source Page',
        content: '# Source Page\n\nThis page will contain wiki links.',
        category: 'reference'
      });
    });

    test('should create basic wiki links correctly', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Source Page');
      await wikiEditor.enterEditMode();

      const wikiLinkContent = `# Source Page with Links

This page contains various wiki links:

## Basic Wiki Links
- [[Target Page One]] - Link to first target
- [[Target Page Two]] - Link to second target
- [[Non-existent Page]] - This should be a broken link

## Content with inline links
You can find more information in [[Target Page One]] about documentation,
and [[Target Page Two]] has guides for getting started.`;

      await wikiEditor.updateContent(wikiLinkContent);
      await wikiEditor.saveChanges();

      // Verify wiki links are rendered
      const wikiLinks = await wikiEditor.findWikiLinks();
      expect(wikiLinks.length).toBeGreaterThanOrEqual(4); // At least 4 wiki links

      // Check for working links
      const workingLinks = wikiLinks.filter(link => link.exists);
      expect(workingLinks.length).toBeGreaterThanOrEqual(2); // Target Page One and Two should work

      // Check for broken links
      const brokenLinks = wikiLinks.filter(link => !link.exists);
      expect(brokenLinks.length).toBeGreaterThanOrEqual(1); // Non-existent Page should be broken

      // Verify link text
      const targetOneLinks = wikiLinks.filter(link => link.text.includes('Target Page One'));
      expect(targetOneLinks.length).toBeGreaterThanOrEqual(2); // Should appear twice
    });

    test('should create wiki links with custom display text', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Source Page');
      await wikiEditor.enterEditMode();

      const customTextContent = `# Custom Link Text

## Wiki Links with Custom Display Text
- [[Target Page One|First Target]] - Custom text for first page
- [[Target Page Two|Second Target]] - Custom text for second page
- [[Non-existent Page|Broken Custom Link]] - Broken link with custom text

## Mixed Links
- [[Target Page One]] - Normal wiki link
- [[Target Page One|Documentation]] - Same page with custom text
- Regular [external link](https://example.com) for comparison`;

      await wikiEditor.updateContent(customTextContent);
      await wikiEditor.saveChanges();

      // Verify custom display text is used
      await expect(wikiEditor.contentDisplay).toContainText('First Target');
      await expect(wikiEditor.contentDisplay).toContainText('Second Target');
      await expect(wikiEditor.contentDisplay).toContainText('Broken Custom Link');
      await expect(wikiEditor.contentDisplay).toContainText('Documentation');

      // The actual page titles should not appear as display text for custom links
      const customLinks = await wikiEditor.findWikiLinks();
      const firstTargetCustom = customLinks.find(link => link.text === 'First Target');
      const documentationCustom = customLinks.find(link => link.text === 'Documentation');
      
      expect(firstTargetCustom).toBeDefined();
      expect(documentationCustom).toBeDefined();
    });

    test('should handle wiki links in different markdown contexts', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Source Page');
      await wikiEditor.enterEditMode();

      const contextualContent = `# Wiki Links in Different Contexts

## In Lists
1. First item with [[Target Page One]]
2. Second item with [[Target Page Two|Custom Text]]
3. Third item with [[Broken Link]]

### Unordered Lists
- Bullet point with [[Target Page One]]
- Another bullet with [[Target Page Two]]

## In Tables
| Description | Link | Status |
|-------------|------|--------|
| Documentation | [[Target Page One]] | Working |
| Guides | [[Target Page Two]] | Working |
| Missing | [[Non-existent Page]] | Broken |

## In Blockquotes
> This blockquote contains a link to [[Target Page One]] for reference.
> 
> It also mentions [[Target Page Two]] in the context of guides.

## In Code Blocks
The following should NOT be processed as links:
\`\`\`
[[Target Page One]] - This should remain as text
[[Target Page Two]] - This should also remain as text
\`\`\`

## Inline Code
Similarly, \`[[Target Page One]]\` should not be a link.`;

      await wikiEditor.updateContent(contextualContent);
      await wikiEditor.saveChanges();

      // Verify links work in lists and tables
      await expect(wikiEditor.verifyWikiLinkExists('Target Page One')).resolves.toBe(true);
      await expect(wikiEditor.verifyWikiLinkExists('Target Page Two')).resolves.toBe(true);

      // Verify links in blockquotes work
      const blockquoteLinks = await wikiEditor.contentDisplay.locator('blockquote a').count();
      expect(blockquoteLinks).toBeGreaterThanOrEqual(2);

      // Verify links in code blocks are NOT processed
      const codeBlocks = wikiEditor.contentDisplay.locator('pre code');
      const codeBlockContent = await codeBlocks.textContent();
      expect(codeBlockContent).toContain('[[Target Page One]]'); // Should be literal text

      // Verify inline code links are NOT processed
      const inlineCode = wikiEditor.contentDisplay.locator('code');
      const inlineCodeText = await inlineCode.textContent();
      expect(inlineCodeText).toContain('[[Target Page One]]'); // Should be literal text
    });
  });

  test.describe('Wiki Link Navigation', () => {
    test.beforeEach(async () => {
      // Set up a network of linked pages
      await testHelpers.createTestPage({
        title: 'Home Page',
        content: `# Home Page

Welcome to the wiki! Check out these sections:
- [[Getting Started]]
- [[Advanced Topics]]
- [[FAQ]]`,
        category: 'documentation'
      });

      await testHelpers.createTestPage({
        title: 'Getting Started',
        content: `# Getting Started

Basic information for new users.

For more advanced information, see [[Advanced Topics]].
For common questions, check the [[FAQ]].
Return to [[Home Page]].`,
        category: 'guides'
      });

      await testHelpers.createTestPage({
        title: 'Advanced Topics',  
        content: `# Advanced Topics

Advanced features and configuration.

Start with [[Getting Started]] if you haven't already.
For common questions, check the [[FAQ]].
Return to [[Home Page]].`,
        category: 'guides'
      });

      await testHelpers.createTestPage({
        title: 'FAQ',
        content: `# Frequently Asked Questions

Common questions and answers.

See [[Getting Started]] for basic info.
See [[Advanced Topics]] for complex topics.
Return to [[Home Page]].`,
        category: 'reference'
      });
    });

    test('should navigate between wiki pages via links', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Home Page');
      await wikiEditor.verifyPageLoaded('Home Page');

      // Click on Getting Started link
      await wikiEditor.clickWikiLink('Getting Started');
      await wikiEditor.verifyPageLoaded('Getting Started');

      // Navigate to Advanced Topics
      await wikiEditor.clickWikiLink('Advanced Topics');
      await wikiEditor.verifyPageLoaded('Advanced Topics');

      // Navigate to FAQ
      await wikiEditor.clickWikiLink('FAQ');
      await wikiEditor.verifyPageLoaded('FAQ');

      // Return to Home Page
      await wikiEditor.clickWikiLink('Home Page');
      await wikiEditor.verifyPageLoaded('Home Page');
    });

    test('should maintain browser history during wiki navigation', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Home Page');
      
      // Navigate through several pages
      await wikiEditor.clickWikiLink('Getting Started');
      await wikiEditor.clickWikiLink('Advanced Topics');
      await wikiEditor.clickWikiLink('FAQ');

      // Use browser back button
      await wikiEditor.page.goBack();
      await wikiEditor.verifyPageLoaded('Advanced Topics');

      await wikiEditor.page.goBack();
      await wikiEditor.verifyPageLoaded('Getting Started');

      // Use browser forward button
      await wikiEditor.page.goForward();
      await wikiEditor.verifyPageLoaded('Advanced Topics');
    });

    test('should show proper breadcrumbs for linked pages', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Home Page');
      await wikiEditor.clickWikiLink('Getting Started');

      const breadcrumbs = await wikiEditor.getBreadcrumbs();
      expect(breadcrumbs.length).toBeGreaterThan(1);
      expect(breadcrumbs).toContain('Wiki');
      expect(breadcrumbs).toContain('Getting Started');
    });
  });

  test.describe('Broken Link Detection and Handling', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Broken Links Test',
        content: edgeCaseWikiPages.brokenLinks.content,
        category: 'reference'
      });
    });

    test('should identify and style broken links correctly', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Broken Links Test');

      // Find all wiki links
      const wikiLinks = await wikiEditor.findWikiLinks();
      
      // Separate working and broken links
      const brokenLinks = wikiLinks.filter(link => !link.exists);
      const workingLinks = wikiLinks.filter(link => link.exists);

      expect(brokenLinks.length).toBeGreaterThan(0);
      
      // Verify broken links have appropriate styling
      for (const brokenLink of brokenLinks) {
        const linkElement = wikiEditor.contentDisplay.locator(`a:has-text("${brokenLink.text}")`);
        
        // Check for broken link styling (classes or attributes)
        const classes = await linkElement.getAttribute('class') || '';
        expect(classes).toMatch(/broken|missing|not-found|error/i);
      }
    });

    test('should provide helpful feedback for broken links', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Broken Links Test');

      // Test clicking on broken links
      const brokenLink = wikiEditor.contentDisplay.locator('a.broken, a.missing').first();
      
      if (await brokenLink.count() > 0) {
        await brokenLink.click();
        
        // Should either:
        // 1. Show a 404/not found page
        // 2. Offer to create the page
        // 3. Stay on current page with error message
        
        const currentUrl = wikiEditor.page.url();
        const pageContent = await wikiEditor.page.textContent('body');
        
        // Check for appropriate error handling
        expect(
          currentUrl.includes('404') || 
          pageContent.includes('not found') ||
          pageContent.includes('create page') ||
          pageContent.includes('Broken Links Test') // Stayed on same page
        ).toBe(true);
      }
    });

    test('should offer to create missing pages from broken links', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Broken Links Test');

      // This test assumes there's a "create page" feature for broken links
      const brokenLink = wikiEditor.contentDisplay.locator('a').filter({ hasText: 'This Page Does Not Exist' });
      
      if (await brokenLink.count() > 0) {
        await brokenLink.click();
        
        // Should either redirect to create page or show create page option
        await wikiEditor.page.waitForTimeout(1000);
        
        const currentUrl = wikiEditor.page.url();
        const pageContent = await wikiEditor.page.textContent('body');
        
        // Check if we're on a create page or there's a create option
        expect(
          currentUrl.includes('new') ||
          currentUrl.includes('create') ||
          pageContent.includes('Create') ||
          pageContent.includes('New Page')
        ).toBe(true);
      }
    });
  });

  test.describe('Wiki Link Auto-completion', () => {
    test.beforeEach(async () => {
      // Create pages with similar names for auto-completion testing
      const pages = [
        'API Documentation',
        'API Reference',
        'API Examples',
        'Authentication Guide',
        'Authorization Setup',
        'Database Configuration',
        'Database Migration',
        'User Management'
      ];

      for (const title of pages) {
        await testHelpers.createTestPage({
          title,
          content: `# ${title}\n\nContent for ${title}.`,
          category: 'documentation'
        });
      }

      await testHelpers.createTestPage({
        title: 'Auto-completion Test Page',
        content: '# Auto-completion Test\n\nTesting wiki link auto-completion.',
        category: 'reference'
      });
    });

    test('should show auto-completion suggestions when typing wiki links', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Auto-completion Test Page');
      await wikiEditor.enterEditMode();

      // Position cursor at end of content
      await wikiEditor.contentTextarea.focus();
      await wikiEditor.page.keyboard.press('Control+End');
      
      // Start typing a wiki link
      await wikiEditor.typeInEditor('\n\n[[API');
      
      // Look for auto-completion dropdown
      const autoCompleteDropdown = wikiEditor.page.locator('[data-testid="wiki-autocomplete"], .autocomplete, .suggestions');
      
      if (await autoCompleteDropdown.isVisible()) {
        // Verify suggestions contain relevant pages
        const suggestions = await autoCompleteDropdown.locator('li, .suggestion-item').allTextContents();
        
        // Should include API-related pages
        const apiSuggestions = suggestions.filter(s => s.includes('API'));
        expect(apiSuggestions.length).toBeGreaterThan(0);
        
        // Test selecting a suggestion
        await autoCompleteDropdown.locator('li, .suggestion-item').first().click();
        
        const content = await wikiEditor.getPageContent();
        expect(content).toMatch(/\[\[API [^\]]+\]\]/); // Should complete the wiki link
      }
    });

    test('should filter auto-completion suggestions based on input', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Auto-completion Test Page');
      await wikiEditor.enterEditMode();

      await wikiEditor.typeInEditor('\n\n[[Auth');
      
      const autoCompleteDropdown = wikiEditor.page.locator('[data-testid="wiki-autocomplete"]');
      
      if (await autoCompleteDropdown.isVisible()) {
        const suggestions = await autoCompleteDropdown.locator('li').allTextContents();
        
        // Should show Auth-related suggestions
        const authSuggestions = suggestions.filter(s => 
          s.includes('Authentication') || s.includes('Authorization')
        );
        expect(authSuggestions.length).toBeGreaterThan(0);
        
        // Should not show unrelated suggestions
        const databaseSuggestions = suggestions.filter(s => s.includes('Database'));
        expect(databaseSuggestions.length).toBe(0);
      }
    });

    test('should support keyboard navigation in auto-completion', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Auto-completion Test Page');
      await wikiEditor.enterEditMode();

      await wikiEditor.typeInEditor('\n\n[[Database');
      
      const autoCompleteDropdown = wikiEditor.page.locator('[data-testid="wiki-autocomplete"]');
      
      if (await autoCompleteDropdown.isVisible()) {
        // Use arrow keys to navigate
        await wikiEditor.page.keyboard.press('ArrowDown');
        await wikiEditor.page.keyboard.press('ArrowDown');
        
        // Select with Enter
        await wikiEditor.page.keyboard.press('Enter');
        
        const content = await wikiEditor.getPageContent();
        expect(content).toMatch(/\[\[Database [^\]]+\]\]/);
      }
    });
  });

  test.describe('Case Sensitivity and Link Matching', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Case Test Page',
        content: '# Case Test Page\n\nTesting case sensitivity.',
        category: 'reference'
      });

      await testHelpers.createTestPage({
        title: 'case test page',
        content: '# case test page\n\nLowercase version.',
        category: 'reference'
      });

      await testHelpers.createTestPage({
        title: 'CASE TEST PAGE',
        content: '# CASE TEST PAGE\n\nUppercase version.',
        category: 'reference'
      });
    });

    test('should handle case sensitivity in wiki links appropriately', async () => {
      await testHelpers.createTestPage({
        title: 'Case Sensitivity Test',
        content: `# Case Sensitivity Test

Testing different case variations:
- [[Case Test Page]] - Exact match
- [[case test page]] - Lowercase
- [[CASE TEST PAGE]] - Uppercase
- [[Case test Page]] - Mixed case`,
        category: 'reference'
      });

      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Case Sensitivity Test');

      const wikiLinks = await wikiEditor.findWikiLinks();
      
      // All links should either work (case-insensitive matching) 
      // or be broken (case-sensitive matching)
      // The behavior depends on implementation requirements
      
      const workingLinks = wikiLinks.filter(link => link.exists);
      const brokenLinks = wikiLinks.filter(link => !link.exists);
      
      // Verify consistent behavior - either all work or exact matches only
      if (workingLinks.length === wikiLinks.length) {
        // Case-insensitive implementation
        expect(brokenLinks.length).toBe(0);
      } else {
        // Case-sensitive implementation - only exact matches should work
        const exactMatches = wikiLinks.filter(link => 
          link.text === 'Case Test Page' || 
          link.text === 'case test page' || 
          link.text === 'CASE TEST PAGE'
        );
        const exactMatchesWorking = exactMatches.filter(link => link.exists);
        expect(exactMatchesWorking.length).toBe(exactMatches.length);
      }
    });
  });

  test.describe('Special Characters in Wiki Links', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'Special Characters: 中文 العربية Русский 🚀',
        content: '# Special Characters\n\nPage with unicode characters in title.',
        category: 'reference'
      });

      await testHelpers.createTestPage({
        title: 'Page with "Quotes" and (Parentheses)',
        content: '# Special Punctuation\n\nPage with special punctuation.',
        category: 'reference'
      });

      await testHelpers.createTestPage({
        title: 'Page/with/slashes',
        content: '# Slashes in Title\n\nPage with forward slashes.',
        category: 'reference'
      });
    });

    test('should handle unicode characters in wiki links', async () => {
      await testHelpers.createTestPage({
        title: 'Unicode Links Test',
        content: `# Unicode Links Test

Links to pages with special characters:
- [[Special Characters: 中文 العربية Русский 🚀]]
- [[Page with "Quotes" and (Parentheses)]]
- [[Page/with/slashes]]

These should all work correctly.`,
        category: 'reference'
      });

      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Unicode Links Test');

      const wikiLinks = await wikiEditor.findWikiLinks();
      const unicodeLink = wikiLinks.find(link => link.text.includes('中文'));
      const quotesLink = wikiLinks.find(link => link.text.includes('Quotes'));
      const slashesLink = wikiLinks.find(link => link.text.includes('slashes'));

      expect(unicodeLink?.exists).toBe(true);
      expect(quotesLink?.exists).toBe(true);
      expect(slashesLink?.exists).toBe(true);

      // Test navigation with unicode links
      await wikiEditor.clickWikiLink('Special Characters: 中文 العربية Русский 🚀');
      await wikiEditor.verifyPageLoaded('Special Characters');
    });
  });

  test.describe('Link Performance and Scalability', () => {
    test('should handle pages with many wiki links efficiently', async () => {
      // Create many target pages
      const targetPages = Array.from({length: 50}, (_, i) => ({
        title: `Target Page ${i + 1}`,
        content: `# Target Page ${i + 1}\n\nContent for page ${i + 1}.`,
        category: 'reference'
      }));

      for (const page of targetPages) {
        await testHelpers.createTestPage(page);
        await wikiEditor.page.waitForTimeout(50); // Small delay to prevent overwhelming
      }

      // Create page with many links
      const manyLinksContent = `# Page with Many Links

${targetPages.map((page, i) => `- [[${page.title}]]`).join('\n')}

This page contains ${targetPages.length} wiki links for performance testing.`;

      await testHelpers.createTestPage({
        title: 'Many Links Performance Test',
        content: manyLinksContent,
        category: 'reference'
      });

      const startTime = Date.now();
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Many Links Performance Test');
      await wikiEditor.verifyPageLoaded('Many Links Performance Test');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds

      // Verify all links are processed correctly
      const wikiLinks = await wikiEditor.findWikiLinks();
      expect(wikiLinks.length).toBe(targetPages.length);

      // Test clicking a few random links for performance
      const randomIndices = [0, 10, 25, 40];
      for (const index of randomIndices) {
        if (index < targetPages.length) {
          const linkStartTime = Date.now();
          await wikiEditor.clickWikiLink(targetPages[index].title);
          await wikiEditor.verifyPageLoaded(targetPages[index].title);
          const linkTime = Date.now() - linkStartTime;
          
          expect(linkTime).toBeLessThan(5000); // Each navigation should be under 5 seconds
          
          // Navigate back
          await wikiEditor.goBack();
        }
      }
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});