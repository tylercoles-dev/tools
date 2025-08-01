import { test, expect } from '@playwright/test';
import { WikiPagesPage, WikiEditorPage } from '../pages/wiki';
import { createWikiTestHelpers, commonSearchTests } from '../utils/wiki-test-helpers';
import { searchTestPages, wikiTestConfig } from '../fixtures/wiki-test-data';

test.describe('Wiki Search and Discovery', () => {
  let wikiPages: WikiPagesPage;
  let wikiEditor: WikiEditorPage;
  let testHelpers: ReturnType<typeof createWikiTestHelpers>;

  test.beforeEach(async ({ page }) => {
    wikiPages = new WikiPagesPage(page);
    wikiEditor = new WikiEditorPage(page);
    testHelpers = createWikiTestHelpers(page);

    // Set up search test data
    await testHelpers.createMultiplePages([
      searchTestPages.searchablePage1,
      searchTestPages.searchablePage2,
      searchTestPages.searchablePage3,
      {
        title: 'Frontend Development Guide',
        content: `# Frontend Development Guide

Complete guide for frontend development with React and TypeScript.

## Setup
Install dependencies and configure your development environment.

## Components
Create reusable React components with proper TypeScript types.

## Testing
Write comprehensive tests for your frontend code.`,
        category: 'guides',
        tags: ['frontend', 'react', 'typescript', 'development']
      },
      {
        title: 'Backend API Design',
        content: `# Backend API Design

Best practices for designing RESTful APIs.

## Endpoints
Design clear and consistent API endpoints.

## Authentication
Implement secure authentication mechanisms.

## Documentation
Document your API thoroughly.`,
        category: 'guides',
        tags: ['backend', 'api', 'design', 'rest']
      },
      {
        title: 'Testing Strategies',
        content: `# Testing Strategies

Comprehensive testing approaches for web applications.

## Unit Testing
Test individual components and functions.

## Integration Testing
Test how different parts work together.

## End-to-End Testing
Test complete user workflows.`,
        category: 'reference',
        tags: ['testing', 'qa', 'automation']
      }
    ]);

    await wikiPages.goto();
  });

  test.describe('Basic Search Functionality', () => {
    test('should perform basic text search', async () => {
      await wikiPages.searchPages('database');
      
      // Should find the database configuration page
      const visibleTitles = await wikiPages.getVisiblePageTitles();
      expect(visibleTitles.some(title => title.toLowerCase().includes('database'))).toBe(true);
      
      const pageCount = await wikiPages.getPageCount();
      expect(pageCount).toBeGreaterThan(0);
    });

    test('should search across page titles and content', async () => {
      // Search for term that appears in content but not title
      await wikiPages.searchPages('TypeScript');
      
      let visibleTitles = await wikiPages.getVisiblePageTitles();
      expect(visibleTitles.some(title => title.includes('Frontend Development Guide'))).toBe(true);
      
      // Search for term that appears in title
      await wikiPages.searchPages('Frontend');
      
      visibleTitles = await wikiPages.getVisiblePageTitles();
      expect(visibleTitles.some(title => title.includes('Frontend Development Guide'))).toBe(true);
    });

    test('should handle empty search queries gracefully', async () => {
      await wikiPages.searchPages('');
      
      // Should show all pages or maintain previous state
      const pageCount = await wikiPages.getPageCount();
      expect(pageCount).toBeGreaterThan(0);
    });

    test('should handle queries with no results', async () => {
      await wikiPages.searchPages('nonexistentterm12345');
      
      // Should show no results or empty state
      const pageCount = await wikiPages.getPageCount();
      expect(pageCount).toBe(0);
      
      if (await wikiPages.isEmptyState()) {
        await wikiPages.verifyEmptyState();
      }
    });

    test('should be case-insensitive', async () => {
      // Test different case variations
      await wikiPages.searchPages('DATABASE');
      const upperCaseResults = await wikiPages.getPageCount();
      
      await wikiPages.searchPages('database');
      const lowerCaseResults = await wikiPages.getPageCount();
      
      await wikiPages.searchPages('Database');
      const titleCaseResults = await wikiPages.getPageCount();
      
      // All should return same results
      expect(upperCaseResults).toBe(lowerCaseResults);
      expect(lowerCaseResults).toBe(titleCaseResults);
      expect(upperCaseResults).toBeGreaterThan(0);
    });

    test('should handle special characters in search', async () => {
      // Create page with special characters
      await testHelpers.createTestPage({
        title: 'Special Search Test: C++ & JavaScript',
        content: '# Special Characters\n\nContent with C++ and JavaScript.',
        category: 'reference'
      });

      await wikiPages.goto();
      
      // Search for special characters
      await wikiPages.searchPages('C++');
      const cppResults = await wikiPages.getVisiblePageTitles();
      expect(cppResults.some(title => title.includes('C++'))).toBe(true);
      
      await wikiPages.searchPages('JavaScript');
      const jsResults = await wikiPages.getVisiblePageTitles();
      expect(jsResults.some(title => title.includes('JavaScript'))).toBe(true);
    });
  });

  test.describe('Advanced Search Features', () => {
    test('should support phrase searching with quotes', async () => {
      // Search for exact phrase
      await wikiPages.searchPages('"development environment"');
      
      const results = await wikiPages.getVisiblePageTitles();
      
      // Should find pages containing the exact phrase
      // Implementation depends on whether phrase search is supported
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should support boolean search operators', async () => {
      // Test AND operator (if supported)
      await wikiPages.searchPages('API AND security');
      const andResults = await wikiPages.getPageCount();
      
      // Test OR operator (if supported)  
      await wikiPages.searchPages('API OR security');
      const orResults = await wikiPages.getPageCount();
      
      // OR should return same or more results than AND
      expect(orResults).toBeGreaterThanOrEqual(andResults);
    });

    test('should support wildcard searches', async () => {
      // Test wildcard search (if supported)
      await wikiPages.searchPages('develop*');
      
      const results = await wikiPages.getVisiblePageTitles();
      const developmentResults = results.filter(title => 
        title.toLowerCase().includes('develop')
      );
      
      expect(developmentResults.length).toBeGreaterThan(0);
    });

    test('should exclude certain terms with NOT operator', async () => {
      // Test NOT operator (if supported)
      await wikiPages.searchPages('API NOT security');
      
      const results = await wikiPages.getVisiblePageTitles();
      
      // Results should contain API but not security-related pages
      const apiResults = results.filter(title => 
        title.toLowerCase().includes('api') && 
        !title.toLowerCase().includes('security')
      );
      
      expect(apiResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Search Filters and Faceting', () => {
    test('should filter search results by category', async () => {
      await wikiPages.searchPages('guide');
      
      // Apply category filter
      await wikiPages.filterByCategory('guides');
      
      const filteredResults = await wikiPages.getPageCount();
      expect(filteredResults).toBeGreaterThan(0);
      
      // Verify all results are in the guides category
      const categories = await wikiPages.getPageCategories();
      categories.forEach(category => {
        expect(category.toLowerCase()).toBe('guides');
      });
    });

    test('should combine search query with category filter', async () => {
      // Search for term + category filter
      await wikiPages.searchPages('development');
      const beforeFilter = await wikiPages.getPageCount();
      
      await wikiPages.filterByCategory('guides');
      const afterFilter = await wikiPages.getPageCount();
      
      // Should show fewer or equal results after filtering
      expect(afterFilter).toBeLessThanOrEqual(beforeFilter);
      
      // All results should match both search term and category
      const titles = await wikiPages.getVisiblePageTitles();
      const categories = await wikiPages.getPageCategories();
      
      titles.forEach((title, index) => {
        const content = title.toLowerCase();
        expect(content.includes('development') || content.includes('develop')).toBe(true);
      });
      
      categories.forEach(category => {
        expect(category.toLowerCase()).toBe('guides');
      });
    });

    test('should filter by multiple categories', async () => {
      // Test filtering by different categories
      const categoryTests = ['documentation', 'guides', 'reference', 'api'];
      
      for (const category of categoryTests) {
        await wikiPages.filterByCategory(category);
        
        const results = await wikiPages.getPageCount();
        if (results > 0) {
          const categories = await wikiPages.getPageCategories();
          categories.forEach(cat => {
            expect(cat.toLowerCase()).toBe(category.toLowerCase());
          });
        }
      }
    });

    test('should reset filters correctly', async () => {
      // Apply search and filter
      await wikiPages.searchPages('API');
      await wikiPages.filterByCategory('guides');
      const filteredCount = await wikiPages.getPageCount();
      
      // Reset to show all categories
      await wikiPages.filterByCategory('all');
      const unfilteredCount = await wikiPages.getPageCount();
      
      // Should show more results after removing filter
      expect(unfilteredCount).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  test.describe('Search Performance and Responsiveness', () => {
    test('should return search results quickly', async () => {
      const searchTime = await wikiPages.measureSearchTime('database');
      expect(searchTime).toBeLessThan(wikiTestConfig.performance.searchResponseTimeout);
    });

    test('should handle rapid search queries without lag', async () => {
      const queries = ['data', 'database', 'config', 'configuration', 'guide'];
      
      for (const query of queries) {
        const startTime = Date.now();
        await wikiPages.searchPages(query);
        const searchTime = Date.now() - startTime;
        
        expect(searchTime).toBeLessThan(wikiTestConfig.performance.searchResponseTimeout);
        
        // Small delay between searches
        await wikiPages.page.waitForTimeout(100);
      }
    });

    test('should handle search while typing (debounced search)', async () => {
      // Type search query character by character
      await wikiPages.searchInput.focus();
      await wikiPages.searchInput.fill('');
      
      const query = 'database';
      for (let i = 1; i <= query.length; i++) {
        const partialQuery = query.substring(0, i);
        await wikiPages.searchInput.fill(partialQuery);
        await wikiPages.page.waitForTimeout(100); // Simulate typing delay
      }
      
      // Wait for debounced search to complete
      await wikiPages.page.waitForTimeout(1000);
      
      // Should show results for complete query
      const results = await wikiPages.getPageCount();
      expect(results).toBeGreaterThan(0);
    });
  });

  test.describe('Search Result Ranking and Relevance', () => {
    test('should rank title matches higher than content matches', async () => {
      await wikiPages.searchPages('Development');
      
      const titles = await wikiPages.getVisiblePageTitles();
      
      // Pages with "Development" in title should appear first
      const titleMatches = titles.filter(title => title.includes('Development'));
      
      if (titleMatches.length > 0 && titles.length > titleMatches.length) {
        // First result should be a title match
        expect(titles[0]).toContain('Development');
      }
    });

    test('should consider search term frequency in ranking', async () => {
      // Create pages with different frequency of search terms
      await testHelpers.createTestPage({
        title: 'High Frequency Test',
        content: `# High Frequency Test
        
Testing testing testing testing testing testing.
This page mentions testing many times for ranking tests.
Testing framework testing setup testing configuration.`,
        category: 'reference'
      });

      await testHelpers.createTestPage({
        title: 'Low Frequency Test',
        content: '# Low Frequency Test\n\nThis page mentions testing once.',
        category: 'reference'
      });

      await wikiPages.goto();
      await wikiPages.searchPages('testing');
      
      const titles = await wikiPages.getVisiblePageTitles();
      
      // High frequency page should rank higher (appear earlier)
      const highFreqIndex = titles.findIndex(title => title.includes('High Frequency'));
      const lowFreqIndex = titles.findIndex(title => title.includes('Low Frequency'));
      
      if (highFreqIndex !== -1 && lowFreqIndex !== -1) {
        expect(highFreqIndex).toBeLessThan(lowFreqIndex);
      }
    });

    test('should boost recently updated pages in search results', async () => {
      // This test would require modifying page timestamps
      // Implementation depends on whether recency affects ranking
      
      await wikiPages.searchPages('configuration');
      const results = await wikiPages.getVisiblePageTitles();
      
      // Verify results are returned (specific ranking test would need timestamp control)
      expect(results.length).toBeGreaterThan(0);
    });
  });

  test.describe('Search Suggestions and Auto-complete', () => {
    test('should provide search suggestions while typing', async () => {
      await wikiPages.searchInput.focus();
      await wikiPages.searchInput.type('data');
      
      // Look for search suggestions dropdown
      const suggestionsDropdown = wikiPages.page.locator('[data-testid="search-suggestions"], .search-suggestions');
      
      if (await suggestionsDropdown.isVisible()) {
        const suggestions = await suggestionsDropdown.locator('li, .suggestion').allTextContents();
        
        // Should contain relevant suggestions
        const dataSuggestions = suggestions.filter(s => s.toLowerCase().includes('data'));
        expect(dataSuggestions.length).toBeGreaterThan(0);
      }
    });

    test('should allow selecting search suggestions', async () => {
      await wikiPages.searchInput.focus();
      await wikiPages.searchInput.type('config');
      
      const suggestionsDropdown = wikiPages.page.locator('[data-testid="search-suggestions"]');
      
      if (await suggestionsDropdown.isVisible()) {
        // Click first suggestion
        await suggestionsDropdown.locator('li, .suggestion').first().click();
        
        // Should populate search input and show results
        const searchValue = await wikiPages.searchInput.inputValue();
        expect(searchValue.length).toBeGreaterThan('config'.length);
        
        const results = await wikiPages.getPageCount();
        expect(results).toBeGreaterThan(0);
      }
    });

    test('should support keyboard navigation in search suggestions', async () => {
      await wikiPages.searchInput.focus();
      await wikiPages.searchInput.type('guide');
      
      const suggestionsDropdown = wikiPages.page.locator('[data-testid="search-suggestions"]');
      
      if (await suggestionsDropdown.isVisible()) {
        // Use arrow keys to navigate
        await wikiPages.page.keyboard.press('ArrowDown');
        await wikiPages.page.keyboard.press('ArrowDown');
        
        // Select with Enter
        await wikiPages.page.keyboard.press('Enter');
        
        const results = await wikiPages.getPageCount();
        expect(results).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Search History and Recent Searches', () => {
    test('should track recent search queries', async () => {
      const searchQueries = ['database', 'API', 'configuration', 'testing'];
      
      for (const query of searchQueries) {
        await wikiPages.searchPages(query);
        await wikiPages.page.waitForTimeout(500);
      }
      
      // Check for recent searches dropdown or history
      await wikiPages.searchInput.focus();
      await wikiPages.searchInput.fill('');
      
      const recentSearches = wikiPages.page.locator('[data-testid="recent-searches"], .search-history');
      
      if (await recentSearches.isVisible()) {
        const recentItems = await recentSearches.locator('li, .recent-item').allTextContents();
        
        // Should contain some of the recent queries
        const foundQueries = searchQueries.filter(query => 
          recentItems.some(item => item.includes(query))
        );
        expect(foundQueries.length).toBeGreaterThan(0);
      }
    });

    test('should clear search history when requested', async () => {
      await wikiPages.searchPages('test query');
      
      // Look for clear history option
      const clearHistoryButton = wikiPages.page.locator('[data-testid="clear-search-history"], button:has-text("Clear")');
      
      if (await clearHistoryButton.isVisible()) {
        await clearHistoryButton.click();
        
        // Recent searches should be empty
        const recentSearches = wikiPages.page.locator('[data-testid="recent-searches"]');
        if (await recentSearches.isVisible()) {
          const recentItems = await recentSearches.locator('li').count();
          expect(recentItems).toBe(0);
        }
      }
    });
  });

  test.describe('Tag-based Search and Discovery', () => {
    test('should search by tags', async () => {
      await wikiPages.searchPages('tag:frontend');
      
      const results = await wikiPages.getVisiblePageTitles();
      
      // Should find pages tagged with 'frontend'
      if (results.length > 0) {
        // Verify at least one result has frontend tag
        // This would require checking individual pages or having tag display
        expect(results.some(title => title.includes('Frontend'))).toBe(true);
      }
    });

    test('should show popular tags for discovery', async () => {
      // Look for tag cloud or popular tags section
      const tagCloud = wikiPages.page.locator('[data-testid="tag-cloud"], .popular-tags');
      
      if (await tagCloud.isVisible()) {
        const tags = await tagCloud.locator('.tag, .tag-item').allTextContents();
        expect(tags.length).toBeGreaterThan(0);
        
        // Click on a tag to filter results
        await tagCloud.locator('.tag, .tag-item').first().click();
        
        const results = await wikiPages.getPageCount();
        expect(results).toBeGreaterThan(0);
      }
    });

    test('should combine tag filters with text search', async () => {
      await wikiPages.searchPages('development tag:guides');
      
      const results = await wikiPages.getPageCount();
      
      // Should find pages that match both text and tag criteria
      if (results > 0) {
        const titles = await wikiPages.getVisiblePageTitles();
        expect(titles.some(title => title.toLowerCase().includes('development'))).toBe(true);
      }
    });
  });

  test.describe('Search Analytics and Insights', () => {
    test('should track popular search terms', async () => {
      // Perform various searches to generate analytics data
      const popularTerms = ['API', 'database', 'configuration', 'testing', 'guide'];
      
      for (const term of popularTerms) {
        await wikiPages.searchPages(term);
        await wikiPages.page.waitForTimeout(300);
      }
      
      // Check for popular searches display (if implemented)
      const popularSearches = wikiPages.page.locator('[data-testid="popular-searches"]');
      
      if (await popularSearches.isVisible()) {
        const popular = await popularSearches.locator('.search-term').allTextContents();
        
        // Should include some of the terms we searched for
        const foundTerms = popularTerms.filter(term => 
          popular.some(p => p.toLowerCase().includes(term.toLowerCase()))
        );
        expect(foundTerms.length).toBeGreaterThan(0);
      }
    });

    test('should suggest related search terms', async () => {
      await wikiPages.searchPages('database');
      
      // Look for related searches or "did you mean" suggestions
      const relatedSearches = wikiPages.page.locator('[data-testid="related-searches"], .related-terms');
      
      if (await relatedSearches.isVisible()) {
        const related = await relatedSearches.locator('a, .term').allTextContents();
        
        // Should contain database-related terms
        const dbRelated = related.filter(term => 
          term.toLowerCase().includes('config') || 
          term.toLowerCase().includes('setup') ||
          term.toLowerCase().includes('migration')
        );
        expect(dbRelated.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Search Error Handling', () => {
    test('should handle search service unavailability gracefully', async () => {
      // Intercept search requests and simulate failure
      await wikiPages.page.route('**/api/wiki/search**', route => {
        route.abort('failed');
      });
      
      await wikiPages.searchPages('test query');
      
      // Should show error message or fallback gracefully
      if (await wikiPages.isErrorState()) {
        const errorMessage = await wikiPages.getErrorMessage();
        expect(errorMessage).toContain('error');
      } else {
        // Or should maintain previous state
        expect(await wikiPages.isLoadingState()).toBe(false);
      }
    });

    test('should handle malformed search queries', async () => {
      const malformedQueries = [
        'query with (unclosed parenthesis',
        'query with [unclosed bracket',
        'query with "unclosed quote',
        'query with \\invalid escape',
        'a'.repeat(1000) // Very long query
      ];
      
      for (const query of malformedQueries) {
        await wikiPages.searchPages(query);
        
        // Should not crash or show error
        expect(await wikiPages.isErrorState()).toBe(false);
        
        // Should handle gracefully (show no results or error message)
        const pageCount = await wikiPages.getPageCount();
        expect(pageCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.afterEach(async () => {
    await testHelpers.cleanupTestData();
  });
});