import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers } from '../utils/wiki-test-helpers';
import { hierarchicalWikiPages, testWikiCategories } from '../fixtures/wiki-test-data';

test.describe('Wiki Page Organization', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);
  });

  test.describe('Hierarchical Page Structure', () => {
    test.beforeEach(async () => {
      // Create a comprehensive hierarchical structure
      await testHelpers.createMultiplePages([
        hierarchicalWikiPages.rootApiDocs,
        hierarchicalWikiPages.authenticationDocs,
        hierarchicalWikiPages.boardsApi,
        hierarchicalWikiPages.pagesApi,
        {
          title: 'User Guide',
          content: '# User Guide\n\nMain user documentation section.',
          category: 'documentation'
        },
        {
          title: 'Getting Started',
          content: '# Getting Started\n\nBasic setup and introduction.',
          category: 'documentation',
          parent: 'User Guide'
        },
        {
          title: 'Advanced Features',
          content: '# Advanced Features\n\nAdvanced functionality guide.',
          category: 'documentation',
          parent: 'User Guide'
        },
        {
          title: 'Troubleshooting',
          content: '# Troubleshooting\n\nCommon issues and solutions.',
          category: 'documentation',
          parent: 'Getting Started'
        }
      ]);
    });

    test('should display hierarchical structure in sidebar tree', async () => {
      await wikiPages.goto();
      
      // Ensure sidebar is visible
      if (!await wikiPages.isSidebarVisible()) {
        await wikiPages.toggleSidebar();
      }
      
      const treeStructure = await wikiPages.getTreeStructure();
      
      // Should have multiple levels
      const rootPages = treeStructure.filter(item => item.level === 0);
      const childPages = treeStructure.filter(item => item.level === 1);
      const grandchildPages = treeStructure.filter(item => item.level === 2);
      
      expect(rootPages.length).toBeGreaterThan(0);
      expect(childPages.length).toBeGreaterThan(0);
      
      // Check specific hierarchy
      const userGuideRoot = rootPages.find(page => page.title.includes('User Guide'));
      expect(userGuideRoot).toBeDefined();
      
      const gettingStartedChild = childPages.find(page => page.title.includes('Getting Started'));
      expect(gettingStartedChild).toBeDefined();
    });

    test('should navigate through hierarchical structure correctly', async () => {
      await wikiPages.goto();
      
      // Navigate to root page
      await wikiPages.clickTreePageByTitle('User Guide');
      await wikiEditor.verifyPageLoaded('User Guide');
      
      // Verify breadcrumbs show hierarchy
      const breadcrumbs = await wikiEditor.getBreadcrumbs();
      expect(breadcrumbs).toContain('Wiki');
      expect(breadcrumbs).toContain('User Guide');
      
      // Navigate to child page via tree
      await wikiEditor.goBack();
      await wikiPages.clickTreePageByTitle('Getting Started');
      await wikiEditor.verifyPageLoaded('Getting Started');
      
      // Verify breadcrumbs show parent relationship
      const childBreadcrumbs = await wikiEditor.getBreadcrumbs();
      expect(childBreadcrumbs).toContain('User Guide');
      expect(childBreadcrumbs).toContain('Getting Started');
    });

    test('should show child pages in parent page sidebar', async () => {
      await wikiPages.goto();
      await wikiPages.clickTreePageByTitle('User Guide');
      
      // Check if child pages are listed in the sidebar
      const childPages = await wikiEditor.getChildPages();
      expect(childPages.length).toBeGreaterThan(0);
      expect(childPages).toContain('Getting Started');
      expect(childPages).toContain('Advanced Features');
    });

    test('should handle moving pages between hierarchies', async () => {
      // This test assumes there's a UI for moving pages
      // Implementation would depend on actual page management features
      
      await wikiPages.goto();
      await wikiPages.clickTreePageByTitle('Advanced Features');
      await wikiEditor.enterEditMode();
      
      // If there's a parent selection field in edit mode
      const parentSelect = wikiEditor.page.locator('[data-testid="parent-select"], select[name="parent"]');
      if (await parentSelect.isVisible()) {
        // Move from "User Guide" to "Getting Started"
        await parentSelect.selectOption('Getting Started');
        await wikiEditor.saveChanges();
        
        // Verify new hierarchy
        const breadcrumbs = await wikiEditor.getBreadcrumbs();
        expect(breadcrumbs).toContain('Getting Started');
        expect(breadcrumbs).toContain('Advanced Features');
      }
    });

    test('should prevent circular parent-child relationships', async () => {
      await wikiPages.goto();
      await wikiPages.clickTreePageByTitle('User Guide');
      await wikiEditor.enterEditMode();
      
      const parentSelect = wikiEditor.page.locator('[data-testid="parent-select"], select[name="parent"]');
      if (await parentSelect.isVisible()) {
        // Try to set a child page as parent (should be prevented)
        const options = await parentSelect.locator('option').allTextContents();
        
        // Child pages should not appear as parent options
        expect(options).not.toContain('Getting Started');
        expect(options).not.toContain('Advanced Features');
      }
    });

    test('should show correct hierarchy depth limits', async () => {
      // Create deeply nested structure to test depth limits
      let currentParent = 'User Guide';
      const deepPages = [];
      
      for (let i = 1; i <= 5; i++) {
        const pageTitle = `Deep Level ${i}`;
        await testHelpers.createTestPage({
          title: pageTitle,
          content: `# ${pageTitle}\n\nContent at depth level ${i}.`,
          category: 'documentation',
          parent: currentParent
        });
        deepPages.push(pageTitle);
        currentParent = pageTitle;
      }
      
      await wikiPages.goto();
      const treeStructure = await wikiPages.getTreeStructure();
      
      // Check maximum depth levels are displayed
      const maxLevel = Math.max(...treeStructure.map(item => item.level));
      expect(maxLevel).toBeGreaterThan(2); // Should support at least 3 levels
      
      // Verify deep pages are accessible
      const deepestPage = treeStructure.find(item => item.level === maxLevel);
      expect(deepestPage).toBeDefined();
    });
  });

  test.describe('Category Management', () => {
    test.beforeEach(async () => {
      // Create pages in different categories
      const categoryPages = [
        { title: 'Doc Page 1', category: 'documentation', content: '# Documentation Page 1' },
        { title: 'Doc Page 2', category: 'documentation', content: '# Documentation Page 2' },
        { title: 'Guide Page 1', category: 'guides', content: '# Guide Page 1' },
        { title: 'Guide Page 2', category: 'guides', content: '# Guide Page 2' },
        { title: 'API Page 1', category: 'api', content: '# API Page 1' },
        { title: 'Tutorial Page 1', category: 'tutorials', content: '# Tutorial Page 1' },
        { title: 'Reference Page 1', category: 'reference', content: '# Reference Page 1' }
      ];
      
      await testHelpers.createMultiplePages(categoryPages);
    });

    test('should filter pages by category correctly', async () => {
      await wikiPages.goto();
      
      // Test each category filter
      const categories = ['documentation', 'guides', 'api', 'tutorials', 'reference'];
      
      for (const category of categories) {
        await wikiPages.filterByCategory(category);
        
        const visibleTitles = await wikiPages.getVisiblePageTitles();
        const visibleCategories = await wikiPages.getPageCategories();
        
        // Should only show pages from selected category
        visibleCategories.forEach(pageCategory => {
          expect(pageCategory.toLowerCase()).toBe(category.toLowerCase());
        });
        
        // Should show at least one page for populated categories
        if (['documentation', 'guides'].includes(category)) {
          expect(visibleTitles.length).toBeGreaterThan(0);
        }
      }
    });

    test('should show all pages when "all categories" is selected', async () => {
      await wikiPages.goto();
      
      // First filter by specific category
      await wikiPages.filterByCategory('documentation');
      const filteredCount = await wikiPages.getPageCount();
      
      // Then show all categories
      await wikiPages.filterByCategory('all');
      const allCount = await wikiPages.getPageCount();
      
      // Should show more pages when showing all
      expect(allCount).toBeGreaterThan(filteredCount);
    });

    test('should display category information on page cards', async () => {
      await wikiPages.goto();
      
      const pageCards = await wikiPages.pageCards.count();
      expect(pageCards).toBeGreaterThan(0);
      
      // Check that categories are displayed on cards
      for (let i = 0; i < Math.min(pageCards, 5); i++) {
        const card = wikiPages.pageCards.nth(i);
        const categoryBadge = card.locator('[data-testid="category-badge"], .category');
        
        if (await categoryBadge.count() > 0) {
          const categoryText = await categoryBadge.textContent();
          expect(categoryText?.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('should maintain category filter when searching', async () => {
      await wikiPages.goto();
      
      // Apply category filter
      await wikiPages.filterByCategory('documentation');
      
      // Perform search
      await wikiPages.searchPages('page');
      
      // Should still show only documentation category results
      const categories = await wikiPages.getPageCategories();
      categories.forEach(category => {
        expect(category.toLowerCase()).toBe('documentation');
      });
    });

    test('should show category counts in filter dropdown', async () => {
      await wikiPages.goto();
      
      // Check if category filter shows counts
      const categoryFilter = wikiPages.categoryFilter;
      const options = await categoryFilter.locator('option').allTextContents();
      
      // Look for count indicators (implementation-dependent)
      const hasCountIndicators = options.some(option => /\(\d+\)/.test(option));
      
      if (hasCountIndicators) {
        // Verify counts are reasonable
        const documentationOption = options.find(option => 
          option.toLowerCase().includes('documentation') && /\(\d+\)/.test(option)
        );
        
        if (documentationOption) {
          const countMatch = documentationOption.match(/\((\d+)\)/);
          const count = countMatch ? parseInt(countMatch[1]) : 0;
          expect(count).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Tag System', () => {
    test.beforeEach(async () => {
      // Create pages with various tag combinations
      const taggedPages = [
        { 
          title: 'Setup Guide', 
          tags: ['setup', 'beginner', 'configuration'],
          content: '# Setup Guide\n\nBasic setup instructions.',
          category: 'guides'
        },
        { 
          title: 'Advanced Configuration', 
          tags: ['configuration', 'advanced', 'expert'],
          content: '# Advanced Configuration\n\nAdvanced setup options.',
          category: 'guides'
        },
        { 
          title: 'Troubleshooting API', 
          tags: ['troubleshooting', 'api', 'debugging'],
          content: '# Troubleshooting API\n\nAPI troubleshooting guide.',
          category: 'api'
        },
        { 
          title: 'Security Best Practices', 
          tags: ['security', 'best-practices', 'api'],
          content: '# Security Best Practices\n\nSecurity guidelines.',
          category: 'guides'
        }
      ];
      
      await testHelpers.createMultiplePages(taggedPages);
    });

    test('should display tags on page cards', async () => {
      await wikiPages.goto();
      
      // Check first few page cards for tag display
      const pageCount = await wikiPages.getPageCount();
      expect(pageCount).toBeGreaterThan(0);
      
      for (let i = 0; i < Math.min(pageCount, 3); i++) {
        const tags = await wikiPages.getPageTags(i);
        if (tags.length > 0) {
          // Tags should be non-empty strings
          tags.forEach(tag => {
            expect(tag.length).toBeGreaterThan(0);
            expect(tag).not.toContain('#'); // Should be cleaned
          });
        }
      }
    });

    test('should search pages by tags', async () => {
      await wikiPages.goto();
      
      // Search for pages with specific tag
      await wikiPages.searchPages('configuration');
      
      const visibleTitles = await wikiPages.getVisiblePageTitles();
      
      // Should find pages tagged with 'configuration'
      expect(visibleTitles.some(title => 
        title.includes('Setup Guide') || title.includes('Advanced Configuration')
      )).toBe(true);
    });

    test('should show related pages based on common tags', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Setup Guide');
      
      // Look for related pages section (implementation-dependent)
      const relatedPages = wikiEditor.page.locator('[data-testid="related-pages"], .related-content');
      
      if (await relatedPages.isVisible()) {
        const relatedLinks = await relatedPages.locator('a').allTextContents();
        
        // Should show pages with similar tags
        expect(relatedLinks.some(link => 
          link.includes('Advanced Configuration') // Both have 'configuration' tag
        )).toBe(true);
      }
    });

    test('should support tag-based filtering in search', async () => {
      await wikiPages.goto();
      
      // Search with tag syntax (if supported)
      await wikiPages.searchPages('tag:api');
      
      const results = await wikiPages.getVisiblePageTitles();
      
      // Should find pages tagged with 'api'
      const apiPages = results.filter(title => 
        title.includes('Troubleshooting API') || title.includes('Security Best Practices')
      );
      
      expect(apiPages.length).toBeGreaterThan(0);
    });

    test('should show tag cloud or popular tags', async () => {
      await wikiPages.goto();
      
      // Look for tag cloud or popular tags display
      const tagCloud = wikiPages.page.locator('[data-testid="tag-cloud"], .popular-tags, .tag-list');
      
      if (await tagCloud.isVisible()) {
        const tags = await tagCloud.locator('.tag, .tag-item').allTextContents();
        
        expect(tags.length).toBeGreaterThan(0);
        
        // Should include some of the tags we created
        const expectedTags = ['setup', 'configuration', 'api', 'security'];
        const foundTags = expectedTags.filter(expectedTag => 
          tags.some(tag => tag.toLowerCase().includes(expectedTag))
        );
        
        expect(foundTags.length).toBeGreaterThan(0);
        
        // Test clicking on a tag
        await tagCloud.locator('.tag, .tag-item').first().click();
        
        // Should filter pages by that tag
        const filteredResults = await wikiPages.getPageCount();
        expect(filteredResults).toBeGreaterThan(0);
      }
    });

    test('should handle tag editing and updates', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('Setup Guide');
      await wikiEditor.enterEditMode();
      
      // Update tags
      const newTags = 'setup, beginner, configuration, updated, testing';
      await wikiEditor.updateTags(newTags);
      await wikiEditor.saveChanges();
      
      // Verify tags were updated
      const updatedTags = await wikiEditor.getPageTags();
      expect(updatedTags).toContain('updated');
      expect(updatedTags).toContain('testing');
      expect(updatedTags).toContain('setup'); // Original tag should remain
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test.beforeEach(async () => {
      await testHelpers.createHierarchicalStructure();
    });

    test('should show correct breadcrumbs for nested pages', async () => {
      await wikiPages.goto();
      await wikiPages.clickTreePageByTitle('Getting Started');
      
      const breadcrumbs = await wikiEditor.getBreadcrumbs();
      
      // Should show path from root to current page
      expect(breadcrumbs.length).toBeGreaterThan(1);
      expect(breadcrumbs).toContain('Wiki');
      expect(breadcrumbs).toContain('Getting Started');
      
      // May also contain parent page if hierarchical
      if (breadcrumbs.length > 2) {
        expect(breadcrumbs).toContain('Documentation');
      }
    });

    test('should allow navigation via breadcrumb links', async () => {
      await wikiPages.goto();
      await wikiPages.clickTreePageByTitle('Getting Started');
      
      const breadcrumbs = await wikiEditor.getBreadcrumbs();
      if (breadcrumbs.includes('Wiki')) {
        // Click on Wiki breadcrumb
        const wikiBreadcrumb = wikiEditor.breadcrumbs.locator('a:has-text("Wiki")');
        if (await wikiBreadcrumb.count() > 0) {
          await wikiBreadcrumb.click();
          
          // Should navigate back to wiki list
          await expect(wikiEditor.page).toHaveURL(/\/wiki$/);
        }
      }
    });

    test('should update breadcrumbs when navigating between pages', async () => {
      await wikiPages.goto();
      
      // Navigate to first page
      await wikiPages.clickTreePageByTitle('Documentation');
      const firstBreadcrumbs = await wikiEditor.getBreadcrumbs();
      expect(firstBreadcrumbs).toContain('Documentation');
      
      // Navigate to different page
      await wikiEditor.goBack();
      await wikiPages.clickTreePageByTitle('Guides');
      const secondBreadcrumbs = await wikiEditor.getBreadcrumbs();
      expect(secondBreadcrumbs).toContain('Guides');
      
      // Breadcrumbs should be different
      expect(firstBreadcrumbs).not.toEqual(secondBreadcrumbs);
    });

    test('should handle long page titles in breadcrumbs', async () => {
      // Create page with very long title
      await testHelpers.createTestPage({
        title: 'This is a Very Long Page Title That Should Be Handled Gracefully in Breadcrumb Navigation',
        content: '# Long Title Test\n\nTesting long titles in breadcrumbs.',
        category: 'reference'
      });
      
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('This is a Very Long Page Title');
      
      const breadcrumbs = await wikiEditor.getBreadcrumbs();
      const longTitleBreadcrumb = breadcrumbs.find(crumb => crumb.length > 50);
      
      if (longTitleBreadcrumb) {
        // Should be truncated or wrapped appropriately
        // Check that breadcrumb container doesn't overflow
        const breadcrumbContainer = wikiEditor.breadcrumbs;
        const containerWidth = await breadcrumbContainer.boundingBox();
        
        if (containerWidth) {
          expect(containerWidth.width).toBeLessThan(1000); // Reasonable width
        }
      }
    });
  });

  test.describe('Table of Contents (TOC)', () => {
    test.beforeEach(async () => {
      await testHelpers.createTestPage({
        title: 'TOC Test Page',
        content: `# Main Title

This page tests table of contents generation.

## Section 1: Introduction

Introduction content here.

### Subsection 1.1: Getting Started

Getting started information.

### Subsection 1.2: Prerequisites

Prerequisites information.

## Section 2: Implementation

Implementation details.

### Subsection 2.1: Setup

Setup instructions.

#### Sub-subsection 2.1.1: Configuration

Configuration details.

### Subsection 2.2: Usage

Usage examples.

## Section 3: Conclusion

Conclusion content.`,
        category: 'reference'
      });
    });

    test('should generate table of contents from page headers', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('TOC Test Page');
      
      // Look for TOC in sidebar or page content
      const toc = wikiEditor.page.locator('[data-testid="table-of-contents"], .toc, .page-toc');
      
      if (await toc.isVisible()) {
        const tocLinks = await toc.locator('a').allTextContents();
        
        // Should contain main sections
        expect(tocLinks.some(link => link.includes('Introduction'))).toBe(true);
        expect(tocLinks.some(link => link.includes('Implementation'))).toBe(true);
        expect(tocLinks.some(link => link.includes('Conclusion'))).toBe(true);
        
        // Should contain subsections
        expect(tocLinks.some(link => link.includes('Getting Started'))).toBe(true);
        expect(tocLinks.some(link => link.includes('Prerequisites'))).toBe(true);
      }
    });

    test('should support TOC navigation to page sections', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('TOC Test Page');
      
      const toc = wikiEditor.page.locator('[data-testid="table-of-contents"], .toc');
      
      if (await toc.isVisible()) {
        // Click on TOC link
        const implementationLink = toc.locator('a:has-text("Implementation")');
        if (await implementationLink.count() > 0) {
          await implementationLink.click();
          
          // Should scroll to section
          await wikiEditor.page.waitForTimeout(1000);
          
          // Verify we're at the correct section (check URL fragment or scroll position)
          const url = wikiEditor.page.url();
          expect(url).toMatch(/#.*implementation/i);
        }
      }
    });

    test('should show current section in TOC', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('TOC Test Page');
      
      const toc = wikiEditor.page.locator('[data-testid="table-of-contents"], .toc');
      
      if (await toc.isVisible()) {
        // Scroll to a section
        const implementationHeader = wikiEditor.contentDisplay.locator('h2:has-text("Implementation")');
        if (await implementationHeader.count() > 0) {
          await implementationHeader.scrollIntoViewIfNeeded();
          await wikiEditor.page.waitForTimeout(500);
          
          // Check if current section is highlighted in TOC
          const currentTocItem = toc.locator('.current, .active, [aria-current="true"]');
          if (await currentTocItem.count() > 0) {
            const currentText = await currentTocItem.textContent();
            expect(currentText?.toLowerCase()).toContain('implementation');
          }
        }
      }
    });

    test('should handle nested TOC levels correctly', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('TOC Test Page');
      
      const toc = wikiEditor.page.locator('[data-testid="table-of-contents"], .toc');
      
      if (await toc.isVisible()) {
        const tocItems = toc.locator('li, .toc-item');
        const tocCount = await tocItems.count();
        
        if (tocCount > 0) {
          // Check for nested structure
          const nestedItems = toc.locator('ul ul li, .toc-level-2, .nested');
          const nestedCount = await nestedItems.count();
          
          expect(nestedCount).toBeGreaterThan(0); // Should have nested items
          
          // Verify different nesting levels have different styling
          const level1Items = toc.locator('> ul > li, .toc-level-1');
          const level2Items = toc.locator('ul ul li, .toc-level-2');
          
          if (await level1Items.count() > 0 && await level2Items.count() > 0) {
            // Different levels should have different indentation or styling
            const level1Box = await level1Items.first().boundingBox();
            const level2Box = await level2Items.first().boundingBox();
            
            if (level1Box && level2Box) {
              expect(level2Box.x).toBeGreaterThan(level1Box.x); // Level 2 should be indented
            }
          }
        }
      }
    });
  });

  test.describe('Page Collections and Grouping', () => {
    test.beforeEach(async () => {
      // Create pages that could be grouped into collections
      const collectionPages = [
        { title: 'API Overview', category: 'api', tags: ['overview', 'api'] },
        { title: 'API Authentication', category: 'api', tags: ['auth', 'api'] },
        { title: 'API Endpoints', category: 'api', tags: ['endpoints', 'api'] },
        { title: 'User Guide Overview', category: 'guides', tags: ['overview', 'users'] },
        { title: 'User Registration', category: 'guides', tags: ['registration', 'users'] },
        { title: 'User Management', category: 'guides', tags: ['management', 'users'] }
      ];
      
      for (const page of collectionPages) {
        await testHelpers.createTestPage({
          title: page.title,
          content: `# ${page.title}\n\nContent for ${page.title}.`,
          category: page.category,
          tags: page.tags
        });
      }
    });

    test('should group related pages by category', async () => {
      await wikiPages.goto();
      
      // Filter by API category
      await wikiPages.filterByCategory('api');
      
      const apiPages = await wikiPages.getVisiblePageTitles();
      
      // Should show all API-related pages together
      expect(apiPages.filter(title => title.includes('API')).length).toBe(3);
      expect(apiPages).toContain('API Overview');
      expect(apiPages).toContain('API Authentication');
      expect(apiPages).toContain('API Endpoints');
    });

    test('should suggest related pages based on tags', async () => {
      await wikiPages.goto();
      await wikiPages.clickPageByTitle('API Overview');
      
      // Look for related pages section
      const relatedSection = wikiEditor.page.locator('[data-testid="related-pages"], .related-content');
      
      if (await relatedSection.isVisible()) {
        const relatedLinks = await relatedSection.locator('a').allTextContents();
        
        // Should suggest other API pages
        expect(relatedLinks.some(link => link.includes('API Authentication'))).toBe(true);
        expect(relatedLinks.some(link => link.includes('API Endpoints'))).toBe(true);
      }
    });

    test('should create custom page collections', async () => {
      // This test assumes there's functionality for creating custom collections
      // Implementation would depend on the actual collection management features
      
      await wikiPages.goto();
      
      // Look for collection creation UI
      const createCollectionButton = wikiPages.page.locator('[data-testid="create-collection"], button:has-text("Collection")');
      
      if (await createCollectionButton.isVisible()) {
        await createCollectionButton.click();
        
        // Collection creation dialog should appear
        const collectionDialog = wikiPages.page.locator('[data-testid="collection-dialog"], [role="dialog"]');
        await expect(collectionDialog).toBeVisible();
        
        // Fill collection details
        const nameInput = collectionDialog.locator('input[name="name"], [data-testid="collection-name"]');
        await nameInput.fill('API Documentation Collection');
        
        // Select pages for collection
        const pageSelectors = collectionDialog.locator('input[type="checkbox"]');
        const pageCount = await pageSelectors.count();
        
        if (pageCount > 0) {
          // Select first few API pages
          for (let i = 0; i < Math.min(3, pageCount); i++) {
            await pageSelectors.nth(i).check();
          }
          
          // Create collection
          const createButton = collectionDialog.locator('button:has-text("Create")');
          await createButton.click();
          
          // Verify collection was created
          await expect(collectionDialog).toBeHidden();
        }
      }
    });

    test('should show page collections in navigation', async () => {
      await wikiPages.goto();
      
      // Look for collections in sidebar or navigation
      const collectionsSection = wikiPages.page.locator('[data-testid="collections"], .page-collections');
      
      if (await collectionsSection.isVisible()) {
        const collections = await collectionsSection.locator('.collection-item, .collection').allTextContents();
        
        expect(collections.length).toBeGreaterThan(0);
        
        // Click on a collection
        await collectionsSection.locator('.collection-item, .collection').first().click();
        
        // Should show pages in that collection
        const collectionPages = await wikiPages.getPageCount();
        expect(collectionPages).toBeGreaterThan(0);
      }
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});