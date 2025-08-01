import { Page, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { wikiTestData, TestWikiPage, WikiTestDataGenerator } from '../fixtures/wiki-test-data';

/**
 * Wiki Test Helpers - Utility functions for Wiki testing
 */

export interface WikiTestContext {
  page: Page;
  wikiPages: WikiPagesPage;
  wikiEditor: WikiEditorPage;
}

export interface MarkdownTestCase {
  name: string;
  input: string;
  expectedElements: string[];
  expectedText?: string;
  shouldNotContain?: string[];
}

export interface SearchTestCase {
  query: string;
  expectedResults: number;
  expectedTitles?: string[];
  category?: string;
  tags?: string[];
}

export interface CollaborationScenario {
  users: number;
  actions: Array<{
    user: number;
    action: 'type' | 'save' | 'edit' | 'delete';
    content?: string;
    delay?: number;
  }>;
  expectedOutcome: string;
}

/**
 * Wiki Test Helper Class
 */
export class WikiTestHelpers {
  constructor(private context: WikiTestContext) {}

  /**
   * Create a test page with specific content
   */
  async createTestPage(pageData: Partial<TestWikiPage>): Promise<void> {
    const testPage = WikiTestDataGenerator.generatePage(pageData);
    
    await this.context.wikiPages.goto();
    await this.context.wikiPages.createPage({
      title: testPage.title,
      content: testPage.content,
      category: testPage.category,
      tags: testPage.tags?.join(', ')
    });

    // Verify page was created
    await this.context.wikiPages.verifyPageCreated(testPage.title);
  }

  /**
   * Create multiple test pages for testing
   */
  async createMultiplePages(pages: Array<Partial<TestWikiPage>>): Promise<void> {
    for (const pageData of pages) {
      await this.createTestPage(pageData);
      await this.context.page.waitForTimeout(500); // Prevent rate limiting
    }
  }

  /**
   * Set up hierarchical page structure
   */
  async createHierarchicalStructure(): Promise<void> {
    // Create parent pages first
    const parentPages = [
      { title: 'Documentation', content: '# Documentation\n\nMain documentation section.', category: 'documentation' },
      { title: 'API Reference', content: '# API Reference\n\nAPI documentation.', category: 'api' },
      { title: 'Guides', content: '# Guides\n\nStep-by-step guides.', category: 'guides' }
    ];

    for (const parent of parentPages) {
      await this.createTestPage(parent);
    }

    // Create child pages
    const childPages = [
      { 
        title: 'Getting Started', 
        content: '# Getting Started\n\nBasic setup guide.', 
        category: 'documentation',
        parent: 'Documentation'
      },
      { 
        title: 'Authentication API', 
        content: '# Authentication API\n\nAuth endpoints.', 
        category: 'api',
        parent: 'API Reference'
      }
    ];

    for (const child of childPages) {
      await this.createTestPage(child);
    }
  }

  /**
   * Test markdown rendering with various inputs
   */
  async testMarkdownRendering(testCases: MarkdownTestCase[]): Promise<void> {
    // Create a test page for markdown testing
    const testPageId = await this.createTestPage({
      title: 'Markdown Test Page',
      content: '# Markdown Test\n\nInitial content.',
      category: 'reference'
    });

    for (const testCase of testCases) {
      // Update page content with test markdown
      await this.context.wikiEditor.goto('test-page-id'); // Use actual page ID
      await this.context.wikiEditor.updateContent(testCase.input);
      await this.context.wikiEditor.saveChanges();

      // Verify rendering
      await this.verifyMarkdownRendering(testCase);
    }
  }

  /**
   * Verify markdown rendering results
   */
  async verifyMarkdownRendering(testCase: MarkdownTestCase): Promise<void> {
    // Check for expected HTML elements
    for (const selector of testCase.expectedElements) {
      await expect(this.context.wikiEditor.contentDisplay.locator(selector)).toBeVisible();
    }

    // Check for expected text content
    if (testCase.expectedText) {
      await expect(this.context.wikiEditor.contentDisplay).toContainText(testCase.expectedText);
    }

    // Check that certain content is NOT present
    if (testCase.shouldNotContain) {
      for (const text of testCase.shouldNotContain) {
        await expect(this.context.wikiEditor.contentDisplay).not.toContainText(text);
      }
    }
  }

  /**
   * Test search functionality with various queries
   */
  async testSearchFunctionality(testCases: SearchTestCase[]): Promise<void> {
    await this.context.wikiPages.goto();

    for (const testCase of testCases) {
      await this.context.wikiPages.searchPages(testCase.query);
      
      // Verify result count
      await this.context.wikiPages.verifySearchResults(testCase.expectedResults);
      
      // Verify specific titles if provided
      if (testCase.expectedTitles) {
        const visibleTitles = await this.context.wikiPages.getVisiblePageTitles();
        for (const expectedTitle of testCase.expectedTitles) {
          expect(visibleTitles).toContain(expectedTitle);
        }
      }
      
      // Test category filtering if specified
      if (testCase.category) {
        await this.context.wikiPages.filterByCategory(testCase.category);
        const categories = await this.context.wikiPages.getPageCategories();
        categories.forEach(cat => {
          expect(cat.toLowerCase()).toBe(testCase.category!.toLowerCase());
        });
      }
    }
  }

  /**
   * Test wiki linking functionality
   */
  async testWikiLinking(): Promise<void> {
    // Create source and target pages
    await this.createTestPage({
      title: 'Source Page',
      content: `# Source Page

This page contains links to other pages:
- [[Target Page]]
- [[Non-existent Page]]
- [[Target Page|Custom Text]]`,
      category: 'reference'
    });

    await this.createTestPage({
      title: 'Target Page',
      content: '# Target Page\n\nThis is the target of wiki links.',
      category: 'reference'
    });

    // Navigate to source page and test links
    await this.context.wikiEditor.goto('source-page-id'); // Use actual ID

    // Verify working wiki link
    await expect(this.context.wikiEditor.verifyWikiLinkExists('Target Page')).resolves.toBe(true);
    
    // Verify broken wiki link
    await expect(this.context.wikiEditor.verifyWikiLinkBroken('Non-existent Page')).resolves.toBe(true);
    
    // Test clicking wiki link
    await this.context.wikiEditor.clickWikiLink('Target Page');
    await this.context.wikiEditor.verifyPageLoaded('Target Page');
  }

  /**
   * Test page hierarchy and navigation
   */
  async testPageHierarchy(): Promise<void> {
    await this.createHierarchicalStructure();
    
    await this.context.wikiPages.goto();
    
    // Verify tree structure
    const treeStructure = await this.context.wikiPages.getTreeStructure();
    
    // Check that parent pages are at level 0
    const parentPages = treeStructure.filter(item => item.level === 0);
    expect(parentPages.length).toBeGreaterThan(0);
    
    // Check that child pages are at level 1
    const childPages = treeStructure.filter(item => item.level === 1);
    expect(childPages.length).toBeGreaterThan(0);
    
    // Test navigation through hierarchy
    await this.context.wikiPages.clickTreePageByTitle('Documentation');
    await this.context.wikiEditor.verifyPageLoaded('Documentation');
    
    // Verify breadcrumbs
    const breadcrumbs = await this.context.wikiEditor.getBreadcrumbs();
    expect(breadcrumbs).toContain('Documentation');
  }

  /**
   * Test page categorization and tagging
   */
  async testCategoriesAndTags(): Promise<void> {
    const testPages = [
      { title: 'Doc Page 1', category: 'documentation', tags: ['basic', 'setup'] },
      { title: 'Doc Page 2', category: 'documentation', tags: ['advanced', 'config'] },
      { title: 'API Page 1', category: 'api', tags: ['auth', 'security'] },
      { title: 'Guide Page 1', category: 'guides', tags: ['tutorial', 'beginner'] }
    ];

    for (const page of testPages) {
      await this.createTestPage({
        title: page.title,
        content: `# ${page.title}\n\nTest content.`,
        category: page.category,
        tags: page.tags
      });
    }

    await this.context.wikiPages.goto();

    // Test category filtering
    await this.context.wikiPages.verifyCategoryFilter('documentation', 2);
    await this.context.wikiPages.verifyCategoryFilter('api', 1);
    await this.context.wikiPages.verifyCategoryFilter('guides', 1);

    // Test tag-based search
    await this.context.wikiPages.searchPages('setup');
    const titles = await this.context.wikiPages.getVisiblePageTitles();
    expect(titles).toContain('Doc Page 1');
  }

  /**
   * Test performance with large documents
   */
  async testLargeDocumentPerformance(): Promise<void> {
    const largeContent = WikiTestDataGenerator.generateLargeContent(100, 200);
    
    await this.createTestPage({
      title: 'Large Document Test',
      content: largeContent,
      category: 'reference'
    });

    // Measure page load time
    const loadTime = await this.context.wikiEditor.measureEditModeSwitch();
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Test editing performance
    await this.context.wikiEditor.goto('large-document-id');
    await this.context.wikiEditor.enterEditMode();
    
    const typingStartTime = Date.now();
    await this.context.wikiEditor.typeInEditor('\n\nAdditional content');
    const typingTime = Date.now() - typingStartTime;
    
    expect(typingTime).toBeLessThan(2000); // Should respond within 2 seconds

    // Test save performance
    const saveTime = await this.context.wikiEditor.measureSaveTime();
    expect(saveTime).toBeLessThan(10000); // Should save within 10 seconds
  }

  /**
   * Test security and sanitization
   */
  async testSecuritySanitization(): Promise<void> {
    const maliciousContent = `# Security Test

<script>alert('XSS')</script>

<img src="x" onerror="alert('XSS')">

<iframe src="javascript:alert('XSS')"></iframe>

**Bold** and *italic* should work.`;

    await this.createTestPage({
      title: 'Security Test Page',
      content: maliciousContent,
      category: 'reference'
    });

    await this.context.wikiEditor.goto('security-test-id');

    // Verify that malicious scripts are not executed
    const pageContent = await this.context.wikiEditor.getRenderedHTML();
    
    // Should not contain dangerous HTML
    expect(pageContent).not.toContain('<script>');
    expect(pageContent).not.toContain('onerror=');
    expect(pageContent).not.toContain('<iframe');
    
    // Should contain safe markdown
    expect(pageContent).toContain('<strong>Bold</strong>');
    expect(pageContent).toContain('<em>italic</em>');
  }

  /**
   * Test mobile responsiveness
   */
  async testMobileResponsiveness(): Promise<void> {
    // Set mobile viewport
    await this.context.page.setViewportSize({ width: 375, height: 667 });

    await this.context.wikiPages.goto();
    
    // Verify mobile layout
    await expect(this.context.wikiPages.pagesGrid).toBeVisible();
    
    // Test mobile editing
    await this.context.wikiPages.clickPageByTitle('Test Page');
    await this.context.wikiEditor.enterEditMode();
    
    // Verify editor is usable on mobile
    await expect(this.context.wikiEditor.contentTextarea).toBeVisible();
    await this.context.wikiEditor.typeInEditor('Mobile test content');
    
    // Reset viewport
    await this.context.page.setViewportSize({ width: 1280, height: 720 });
  }

  /**
   * Test keyboard navigation and accessibility
   */
  async testKeyboardNavigation(): Promise<void> {
    await this.context.wikiPages.goto();
    
    // Test tab navigation
    await this.context.page.keyboard.press('Tab');
    await this.context.page.keyboard.press('Tab');
    await this.context.page.keyboard.press('Enter'); // Should activate focused element
    
    // Test editor keyboard shortcuts
    await this.context.wikiEditor.enterEditMode();
    await this.context.wikiEditor.contentTextarea.focus();
    
    // Test common markdown shortcuts (if implemented)
    await this.context.page.keyboard.press('Control+KeyB'); // Bold
    await this.context.wikiEditor.typeInEditor('bold text');
    await this.context.page.keyboard.press('Control+KeyB'); // End bold
    
    const content = await this.context.wikiEditor.getPageContent();
    expect(content).toContain('**bold text**');
  }

  /**
   * Clean up test data after tests
   */
  async cleanupTestData(): Promise<void> {
    // This would depend on having a way to identify and delete test pages
    // Implementation would vary based on the actual API/database setup
    console.log('Cleaning up test data...');
    
    // Example cleanup logic:
    // - Query for pages with test titles/tags
    // - Delete pages created during testing
    // - Reset any modified system state
  }

  /**
   * Verify page load performance
   */
  async verifyPageLoadPerformance(maxLoadTime: number = 3000): Promise<void> {
    const loadTime = await this.context.wikiPages.measurePageLoadTime();
    expect(loadTime).toBeLessThan(maxLoadTime);
  }

  /**
   * Verify search performance
   */
  async verifySearchPerformance(query: string, maxSearchTime: number = 2000): Promise<void> {
    const searchTime = await this.context.wikiPages.measureSearchTime(query);
    expect(searchTime).toBeLessThan(maxSearchTime);
  }

  /**
   * Test collaborative editing scenario
   */
  async testCollaborativeEditing(scenario: CollaborationScenario): Promise<void> {
    // This would require multiple browser contexts to simulate multiple users
    // For now, this is a placeholder for the test structure
    console.log(`Testing collaborative scenario with ${scenario.users} users`);
    
    // Implementation would involve:
    // 1. Creating multiple browser contexts
    // 2. Having each context perform actions according to the scenario
    // 3. Verifying the expected outcome
    // 4. Testing conflict resolution
  }

  /**
   * Verify wiki link auto-completion (if implemented)
   */
  async testWikiLinkAutoCompletion(): Promise<void> {
    await this.createTestPage({
      title: 'Auto Complete Test',
      content: '# Test Page\n\nInitial content.',
      category: 'reference'
    });

    await this.context.wikiEditor.goto('auto-complete-test-id');
    await this.context.wikiEditor.enterEditMode();
    
    // Type the beginning of a wiki link
    await this.context.wikiEditor.typeInEditor('\n\n[[Auto');
    
    // Check for auto-completion popup/dropdown (if implemented)
    const autoCompleteDropdown = this.context.page.locator('[data-testid="wiki-autocomplete"], .autocomplete');
    
    if (await autoCompleteDropdown.isVisible()) {
      // Test selecting from autocomplete
      await this.context.page.keyboard.press('ArrowDown');
      await this.context.page.keyboard.press('Enter');
      
      const content = await this.context.wikiEditor.getPageContent();
      expect(content).toContain('[[Auto Complete Test]]');
    }
  }
}

/**
 * Factory function to create WikiTestHelpers with proper context
 */
export function createWikiTestHelpers(page: Page): WikiTestHelpers {
  const context: WikiTestContext = {
    page,
    wikiPages: new WikiPagesPage(page),
    wikiEditor: new WikiEditorPage(page)
  };
  
  return new WikiTestHelpers(context);
}

/**
 * Common markdown test cases for reuse across tests
 */
export const commonMarkdownTests: MarkdownTestCase[] = [
  {
    name: 'Headers',
    input: '# H1\n## H2\n### H3',
    expectedElements: ['h1', 'h2', 'h3'],
    expectedText: 'H1'
  },
  {
    name: 'Text formatting',
    input: '**bold** and *italic* and `code`',
    expectedElements: ['strong', 'em', 'code'],
    expectedText: 'bold'
  },
  {
    name: 'Lists',
    input: '- Item 1\n- Item 2\n\n1. Numbered 1\n2. Numbered 2',
    expectedElements: ['ul', 'ol', 'li'],
    expectedText: 'Item 1'
  },
  {
    name: 'Code blocks',
    input: '```javascript\nconst test = "code";\n```',
    expectedElements: ['pre', 'code'],
    expectedText: 'const test'
  },
  {
    name: 'Links',
    input: '[External](https://example.com) and [[Wiki Link]]',
    expectedElements: ['a'],
    expectedText: 'External'
  },
  {
    name: 'Tables',
    input: '| Col 1 | Col 2 |\n|-------|-------|\n| A | B |',
    expectedElements: ['table', 'tr', 'td'],
    expectedText: 'Col 1'
  }
];

/**
 * Common search test cases
 */
export const commonSearchTests: SearchTestCase[] = [
  {
    query: 'documentation',
    expectedResults: 2,
    category: 'documentation'
  },
  {
    query: 'API',
    expectedResults: 3,
    expectedTitles: ['API Reference', 'API Documentation']
  },
  {
    query: 'nonexistent',
    expectedResults: 0
  },
  {
    query: 'test',
    expectedResults: 5
  }
];