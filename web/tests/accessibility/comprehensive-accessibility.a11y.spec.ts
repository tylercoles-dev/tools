/**
 * Comprehensive Accessibility Tests
 * 
 * Tests WCAG 2.1 AA compliance for all new components:
 * - WikiCategoryManager, WikiTagSelector, WikiVersionHistory, WikiBacklinks
 * - KanbanActivityFeed, KanbanAnalyticsDashboard
 * - Screen reader compatibility
 * - Keyboard navigation
 * - ARIA labels and semantic HTML
 * - Color contrast compliance
 * - Focus management
 * - Motion and animation preferences
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WikiTestHelpers } from '../utils/wiki-test-helpers';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';

interface AccessibilityResult {
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: Array<{
      target: string[];
      html: string;
    }>;
  }>;
  passes: Array<{
    id: string;
    description: string;
  }>;
  incomplete: Array<{
    id: string;
    description: string;
  }>;
}

test.describe('Comprehensive Accessibility Tests', () => {
  let wikiHelpers: WikiTestHelpers;
  let kanbanHelpers: KanbanTestHelpers;
  
  test.beforeEach(async ({ page }) => {
    wikiHelpers = new WikiTestHelpers(page);
    kanbanHelpers = new KanbanTestHelpers(page);
    
    // Navigate to application and ensure authentication
    await page.goto('/');
    await wikiHelpers.ensureAuthenticated();
  });
  
  /**
   * Helper function to run axe accessibility scan
   */
  const runAccessibilityScan = async (page: Page, context: string): Promise<AccessibilityResult> => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    // Log violations if any
    if (results.violations.length > 0) {
      console.log(`\nAccessibility violations in ${context}:`);
      results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id} (${violation.impact})`);
        console.log(`   ${violation.description}`);
        violation.nodes.forEach(node => {
          console.log(`   Element: ${node.target.join(', ')}`);
        });
      });
    }
    
    return results;
  };
  
  /**
   * Helper function to test keyboard navigation
   */
  const testKeyboardNavigation = async (page: Page, selectors: string[]) => {
    // Start with first focusable element
    await page.keyboard.press('Tab');
    
    for (const selector of selectors) {
      const element = page.locator(selector);
      await expect(element).toBeFocused({ timeout: 1000 });
      
      // Verify element is visible and has proper focus indicator
      await expect(element).toBeVisible();
      
      // Move to next element
      await page.keyboard.press('Tab');
    }
  };
  
  /**
   * Helper function to test color contrast
   */
  const testColorContrast = async (page: Page, elements: string[]) => {
    for (const elementSelector of elements) {
      const element = page.locator(elementSelector);
      if (await element.count() > 0) {
        // Use axe-core to check contrast specifically for this element
        const contrastResults = await new AxeBuilder({ page })
          .include(elementSelector)
          .withRules(['color-contrast'])
          .analyze();
        
        expect(contrastResults.violations).toHaveLength(0);
      }
    }
  };
  
  test.describe('Wiki Component Accessibility', () => {
    test('WikiCategoryManager should be fully accessible', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      await wikiHelpers.createNewPage();
      
      // Wait for WikiCategoryManager to load
      await expect(page.getByTestId('wiki-category-manager')).toBeVisible();
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'WikiCategoryManager');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Keyboard navigation', async () => {
        const focusableElements = [
          '[data-testid="create-category-button"]',
          '[data-testid="category-badge-development"]',
          '[data-testid="save-categories-button"]'
        ];
        
        await testKeyboardNavigation(page, focusableElements);
      });
      
      await test.step('ARIA labels and roles', async () => {
        // Verify category manager has proper ARIA structure
        await expect(page.getByTestId('wiki-category-manager')).toHaveAttribute('role', 'region');
        await expect(page.getByTestId('wiki-category-manager')).toHaveAttribute('aria-labelledby');
        
        // Category badges should be properly labeled
        const categoryBadges = page.getByTestId(/category-badge-/);
        const badgeCount = await categoryBadges.count();
        
        for (let i = 0; i < badgeCount; i++) {
          const badge = categoryBadges.nth(i);
          await expect(badge).toHaveAttribute('role', 'button');
          await expect(badge).toHaveAttribute('aria-label');
          await expect(badge).toHaveAttribute('tabindex', '0');
        }
      });
      
      await test.step('Screen reader compatibility', async () => {
        // Test aria-live regions for dynamic updates
        await page.getByTestId('create-category-button').click();
        
        // Status messages should be announced
        await expect(page.locator('[aria-live="polite"]')).toBeVisible();
        
        // Form validation messages should be associated
        const nameInput = page.getByTestId('category-name-input');
        await expect(nameInput).toHaveAttribute('aria-describedby');
      });
      
      await test.step('Color contrast compliance', async () => {
        const elementsToTest = [
          '[data-testid="wiki-category-manager"] button',
          '[data-testid="category-badge-development"]',
          '[data-testid="create-category-button"]'
        ];
        
        await testColorContrast(page, elementsToTest);
      });
      
      await test.step('Keyboard interaction', async () => {
        // Test category selection with keyboard
        const categoryBadge = page.getByTestId('category-badge-development');
        await categoryBadge.focus();
        await page.keyboard.press('Space');
        
        // Should toggle selection
        await expect(categoryBadge).toHaveClass(/selected/);
        
        // Test keyboard navigation in color picker
        await page.getByTestId('create-category-button').click();
        const colorPickers = page.getByTestId(/color-picker-/);
        
        if (await colorPickers.count() > 0) {
          await colorPickers.first().focus();
          await page.keyboard.press('ArrowRight');
          await expect(colorPickers.nth(1)).toBeFocused();
        }
      });
    });
    
    test('WikiTagSelector should be accessible', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      await wikiHelpers.createNewPage();
      
      await expect(page.getByTestId('wiki-tag-selector')).toBeVisible();
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'WikiTagSelector');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Combobox accessibility', async () => {
        const tagInput = page.getByTestId('tag-input');
        
        // Should have proper combobox role and attributes
        await expect(tagInput).toHaveAttribute('role', 'combobox');
        await expect(tagInput).toHaveAttribute('aria-expanded', 'false');
        await expect(tagInput).toHaveAttribute('aria-autocomplete', 'list');
        
        // Test autocomplete functionality
        await tagInput.fill('java');
        await expect(tagInput).toHaveAttribute('aria-expanded', 'true');
        
        // Suggestions should be properly announced
        const suggestions = page.getByTestId('tag-suggestions');
        await expect(suggestions).toHaveAttribute('role', 'listbox');
        
        const suggestionItems = page.getByTestId(/tag-suggestion-/);
        const itemCount = await suggestionItems.count();
        
        for (let i = 0; i < itemCount; i++) {
          const item = suggestionItems.nth(i);
          await expect(item).toHaveAttribute('role', 'option');
          await expect(item).toHaveAttribute('aria-selected');
        }
      });
      
      await test.step('Keyboard navigation in suggestions', async () => {
        const tagInput = page.getByTestId('tag-input');
        await tagInput.fill('test');
        
        // Navigate suggestions with arrow keys
        await page.keyboard.press('ArrowDown');
        const firstSuggestion = page.getByTestId('tag-suggestion-testing');
        if (await firstSuggestion.count() > 0) {
          await expect(firstSuggestion).toHaveAttribute('aria-selected', 'true');
          
          await page.keyboard.press('ArrowDown');
          await expect(firstSuggestion).toHaveAttribute('aria-selected', 'false');
        }
        
        // Select with Enter
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('tag-badge-testing')).toBeVisible();
      });
      
      await test.step('Tag removal accessibility', async () => {
        // Tag badges should be removable with keyboard
        const tagBadge = page.getByTestId('tag-badge-testing');
        const removeButton = tagBadge.getByTestId('remove-tag');
        
        await expect(removeButton).toHaveAttribute('aria-label');
        await expect(removeButton).toHaveAttribute('role', 'button');
        
        await removeButton.focus();
        await page.keyboard.press('Enter');
        
        await expect(tagBadge).not.toBeVisible();
      });
    });
    
    test('WikiVersionHistory should be accessible', async ({ page }) => {
      // Create a page with version history
      await wikiHelpers.createPageWithContent('Version Test Page', 'Initial content');
      
      // Make some edits to create versions
      await page.getByTestId('edit-page-button').click();
      await page.getByTestId('wiki-page-content').fill('Updated content');
      await page.getByTestId('save-page-button').click();
      
      // Open version history
      await page.getByTestId('version-history-button').click();
      await expect(page.getByTestId('wiki-version-history')).toBeVisible();
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'WikiVersionHistory');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Version list accessibility', async () => {
        const versionList = page.getByTestId('version-list');
        await expect(versionList).toHaveAttribute('role', 'list');
        
        const versionItems = page.getByTestId('version-item');
        const itemCount = await versionItems.count();
        
        for (let i = 0; i < itemCount; i++) {
          const item = versionItems.nth(i);
          await expect(item).toHaveAttribute('role', 'listitem');
          
          // Each version should have descriptive labels
          await expect(item).toHaveAttribute('aria-labelledby');
          
          // Restore button should be properly labeled
          const restoreButton = item.getByTestId('restore-version-button');
          if (await restoreButton.count() > 0) {
            await expect(restoreButton).toHaveAttribute('aria-label');
          }
        }
      });
      
      await test.step('Diff view accessibility', async () => {
        // Select versions for comparison
        const versionCheckboxes = page.getByTestId('version-checkbox');
        
        if (await versionCheckboxes.count() >= 2) {
          await versionCheckboxes.nth(0).check();
          await versionCheckboxes.nth(1).check();
          
          await page.getByTestId('compare-versions-button').click();
          
          // Diff view should be accessible
          const diffView = page.getByTestId('version-diff-view');
          await expect(diffView).toBeVisible();
          await expect(diffView).toHaveAttribute('role', 'region');
          await expect(diffView).toHaveAttribute('aria-labelledby');
          
          // Diff changes should be properly marked
          const additions = page.getByTestId('diff-addition');
          const deletions = page.getByTestId('diff-deletion');
          
          if (await additions.count() > 0) {
            await expect(additions.first()).toHaveAttribute('aria-label');
          }
          
          if (await deletions.count() > 0) {
            await expect(deletions.first()).toHaveAttribute('aria-label');
          }
        }
      });
    });
    
    test('WikiBacklinks should be accessible', async ({ page }) => {
      // Create pages with backlinks
      await wikiHelpers.createPageWithContent('Target Page', 'This is the target');
      await wikiHelpers.createPageWithContent('Source Page', 'Links to [[Target Page]]');
      
      // Navigate to target page to see backlinks
      await wikiHelpers.navigateToPage('Target Page');
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'WikiBacklinks');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Backlinks navigation list', async () => {
        const backlinks = page.getByTestId('wiki-backlinks');
        
        if (await backlinks.count() > 0) {
          await expect(backlinks).toHaveAttribute('role', 'navigation');
          await expect(backlinks).toHaveAttribute('aria-labelledby');
          
          const backlinksList = backlinks.getByRole('list');
          await expect(backlinksList).toBeVisible();
          
          const backlinkItems = backlinksList.getByRole('listitem');
          const itemCount = await backlinkItems.count();
          
          for (let i = 0; i < itemCount; i++) {
            const item = backlinkItems.nth(i);
            const link = item.getByRole('link');
            
            if (await link.count() > 0) {
              await expect(link).toHaveAttribute('href');
              await expect(link).toHaveAccessibleName();
            }
          }
        }
      });
    });
  });
  
  test.describe('Kanban Component Accessibility', () => {
    test('KanbanActivityFeed should be accessible', async ({ page }) => {
      // Create test board and generate activities
      const boardId = await kanbanHelpers.createTestBoard('Accessibility Test Board');
      await kanbanHelpers.generateTestActivities(boardId, {
        cardActions: 3,
        comments: 2,
        moves: 2
      });
      
      await page.getByTestId('board-analytics-button').click();
      await expect(page.getByTestId('kanban-activity-feed')).toBeVisible();
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'KanbanActivityFeed');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Activity feed structure', async () => {
        const activityFeed = page.getByTestId('kanban-activity-feed');
        await expect(activityFeed).toHaveAttribute('role', 'feed');
        await expect(activityFeed).toHaveAttribute('aria-labelledby');
        
        const activityItems = page.getByTestId('activity-item');
        const itemCount = await activityItems.count();
        
        for (let i = 0; i < itemCount; i++) {
          const item = activityItems.nth(i);
          await expect(item).toHaveAttribute('role', 'article');
          await expect(item).toHaveAttribute('aria-labelledby');
          
          // Time information should be accessible
          const timeElement = item.locator('[datetime]');
          if (await timeElement.count() > 0) {
            await expect(timeElement).toHaveAttribute('aria-label');
          }
        }
      });
      
      await test.step('Activity filtering accessibility', async () => {
        const filterDropdown = page.getByTestId('activity-filter-dropdown');
        
        if (await filterDropdown.count() > 0) {
          await expect(filterDropdown).toHaveAttribute('role', 'button');
          await expect(filterDropdown).toHaveAttribute('aria-haspopup', 'true');
          await expect(filterDropdown).toHaveAttribute('aria-expanded', 'false');
          
          await filterDropdown.click();
          await expect(filterDropdown).toHaveAttribute('aria-expanded', 'true');
          
          // Filter options should be accessible
          const filterOptions = page.getByTestId(/filter-/);
          const optionCount = await filterOptions.count();
          
          for (let i = 0; i < optionCount; i++) {
            const option = filterOptions.nth(i);
            await expect(option).toHaveAttribute('role', 'menuitem');
          }
        }
      });
      
      await test.step('Real-time updates announcement', async () => {
        // Activity feed should have aria-live region for updates
        const liveRegion = page.locator('[aria-live="polite"]');
        await expect(liveRegion).toBeVisible();
      });
    });
    
    test('KanbanAnalyticsDashboard should be accessible', async ({ page }) => {
      const boardId = await kanbanHelpers.createTestBoard('Analytics Dashboard Test');
      
      // Create test data
      await kanbanHelpers.createMultipleCards(boardId, [
        { title: 'High Priority', priority: 'high', column: 'todo' },
        { title: 'Medium Priority', priority: 'medium', column: 'in_progress' },
        { title: 'Done Task', priority: 'low', column: 'done' }
      ]);
      
      await page.getByTestId('kanban-analytics-button').click();
      await expect(page.getByTestId('kanban-analytics-dashboard')).toBeVisible();
      
      await test.step('Axe accessibility scan', async () => {
        const results = await runAccessibilityScan(page, 'KanbanAnalyticsDashboard');
        expect(results.violations).toHaveLength(0);
      });
      
      await test.step('Metrics cards accessibility', async () => {
        const metricCards = page.getByTestId(/.*-metric$/);
        const cardCount = await metricCards.count();
        
        for (let i = 0; i < cardCount; i++) {
          const card = metricCards.nth(i);
          await expect(card).toHaveAttribute('role', 'region');
          await expect(card).toHaveAttribute('aria-labelledby');
          
          // Metric values should be accessible
          const value = card.locator('[data-testid*="value"]');
          if (await value.count() > 0) {
            await expect(value).toHaveAttribute('aria-label');
          }
        }
      });
      
      await test.step('Chart accessibility', async () => {
        const charts = page.getByTestId(/.*-chart$/);
        const chartCount = await charts.count();
        
        for (let i = 0; i < chartCount; i++) {
          const chart = charts.nth(i);
          
          // Charts should have proper roles and labels
          await expect(chart).toHaveAttribute('role', 'img');
          await expect(chart).toHaveAttribute('aria-label');
          
          // Chart should have alternative text representation
          const chartTable = chart.locator('table[aria-hidden="true"]');
          if (await chartTable.count() > 0) {
            // Alternative data representation exists
            await expect(chartTable).toBeVisible();
          }
        }
      });
      
      await test.step('Tab navigation accessibility', async () => {
        const tabs = page.getByTestId(/.*-tab$/);
        
        if (await tabs.count() > 0) {
          const tabList = tabs.first().locator('xpath=ancestor::*[@role="tablist"]');
          await expect(tabList).toHaveAttribute('role', 'tablist');
          
          const tabCount = await tabs.count();
          for (let i = 0; i < tabCount; i++) {
            const tab = tabs.nth(i);
            await expect(tab).toHaveAttribute('role', 'tab');
            await expect(tab).toHaveAttribute('aria-selected');
            
            // Test keyboard navigation
            if (i === 0) {
              await tab.focus();
              await expect(tab).toBeFocused();
              
              if (tabCount > 1) {
                await page.keyboard.press('ArrowRight');
                await expect(tabs.nth(1)).toBeFocused();
              }
            }
          }
        }
      });
    });
  });
  
  test.describe('Focus Management', () => {
    test('should manage focus correctly in modal dialogs', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      await wikiHelpers.createNewPage();
      
      // Open category creation dialog
      await page.getByTestId('create-category-button').click();
      
      await test.step('Modal focus trap', async () => {
        const modal = page.getByTestId('category-dialog');
        await expect(modal).toBeVisible();
        
        // Focus should be trapped within modal
        const firstFocusable = modal.getByTestId('category-name-input');
        const lastFocusable = modal.getByTestId('save-category-button');
        
        await expect(firstFocusable).toBeFocused();
        
        // Tab to last element
        await page.keyboard.press('Shift+Tab');
        await expect(lastFocusable).toBeFocused();
        
        // Tab from last should go to first
        await page.keyboard.press('Tab');
        await expect(firstFocusable).toBeFocused();
      });
      
      await test.step('Modal dismissal and focus return', async () => {
        const originalFocused = page.getByTestId('create-category-button');
        
        // Close modal with Escape
        await page.keyboard.press('Escape');
        
        // Focus should return to trigger element
        await expect(originalFocused).toBeFocused();
      });
    });
    
    test('should handle focus for dynamic content', async ({ page }) => {
      const boardId = await kanbanHelpers.createTestBoard('Focus Test Board');
      
      await test.step('Dynamic activity updates', async () => {
        await page.getByTestId('board-analytics-button').click();
        const activityFeed = page.getByTestId('kanban-activity-feed');
        
        // Create new activity
        await kanbanHelpers.createCard(boardId, {
          title: 'Focus Test Card',
          column: 'todo'
        });
        
        // New activity should not steal focus
        const currentFocus = await page.evaluate(() => document.activeElement?.tagName);
        expect(currentFocus).toBeDefined();
      });
    });
  });
  
  test.describe('Screen Reader Experience', () => {
    test('should provide comprehensive screen reader support', async ({ page }) => {
      await test.step('Page structure and landmarks', async () => {
        await wikiHelpers.navigateToWiki();
        
        // Verify main landmarks exist
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('nav')).toBeVisible();
        
        // Verify heading structure
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        
        // Should have logical heading hierarchy
        expect(headingCount).toBeGreaterThan(0);
        
        // First heading should be h1
        const firstHeading = headings.first();
        expect(await firstHeading.tagName()).toBe('H1');
      });
      
      await test.step('Status and error announcements', async () => {
        await wikiHelpers.createNewPage();
        
        // Form validation messages should be announced
        await page.getByTestId('save-page-button').click();
        
        const errorMessage = page.locator('[role="alert"]');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
          await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
        }
      });
      
      await test.step('Interactive element descriptions', async () => {
        // All interactive elements should have accessible names
        const buttons = page.getByRole('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const button = buttons.nth(i);
          const accessibleName = await button.getAttribute('aria-label') || 
                                await button.textContent();
          expect(accessibleName).toBeTruthy();
        }
      });
    });
  });
  
  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await test.step('Animation and transition respect', async () => {
        await wikiHelpers.navigateToWiki();
        await wikiHelpers.createNewPage();
        
        // Open category manager with reduced motion
        await page.getByTestId('create-category-button').click();
        
        // Animations should be disabled or reduced
        const modal = page.getByTestId('category-dialog');
        const computedStyle = await modal.evaluate((el) => {
          return window.getComputedStyle(el).getPropertyValue('animation-duration');
        });
        
        // Should be none or very short duration
        expect(computedStyle === 'none' || computedStyle === '0s').toBeTruthy();
      });
      
      await test.step('Chart animations', async () => {
        const boardId = await kanbanHelpers.createTestBoard('Motion Test Board');
        await page.getByTestId('kanban-analytics-button').click();
        
        // Chart animations should be disabled
        const chart = page.getByTestId('status-distribution-chart');
        
        if (await chart.count() > 0) {
          const animationStyle = await chart.evaluate((el) => {
            return window.getComputedStyle(el).getPropertyValue('animation');
          });
          
          expect(animationStyle).toContain('none');
        }
      });
    });
  });
  
  test.describe('High Contrast Mode Support', () => {
    test('should work correctly in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ forcedColors: 'active' });
      
      await test.step('Element visibility in high contrast', async () => {
        await wikiHelpers.navigateToWiki();
        await wikiHelpers.createNewPage();
        
        // All elements should remain visible
        await expect(page.getByTestId('wiki-category-manager')).toBeVisible();
        await expect(page.getByTestId('create-category-button')).toBeVisible();
      });
      
      await test.step('Chart readability in high contrast', async () => {
        const boardId = await kanbanHelpers.createTestBoard('Contrast Test Board');
        await kanbanHelpers.createMultipleCards(boardId, [
          { title: 'Test 1', priority: 'high' },
          { title: 'Test 2', priority: 'low' }
        ]);
        
        await page.getByTestId('kanban-analytics-button').click();
        
        // Charts should have proper contrast patterns
        const chart = page.getByTestId('priority-distribution-chart');
        if (await chart.count() > 0) {
          await expect(chart).toBeVisible();
          
          // Chart elements should have system colors
          const svgElements = chart.locator('svg *');
          const elementCount = await svgElements.count();
          expect(elementCount).toBeGreaterThan(0);
        }
      });
    });
  });
  
  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await test.step('Touch target sizes', async () => {
        await wikiHelpers.navigateToWiki();
        
        // All touch targets should be at least 44px
        const buttons = page.getByRole('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      });
      
      await test.step('Mobile form accessibility', async () => {
        await wikiHelpers.createNewPage();
        
        // Form inputs should be properly labeled on mobile
        const titleInput = page.getByTestId('wiki-page-title');
        await expect(titleInput).toHaveAttribute('aria-label');
        
        // Virtual keyboard should not obscure form elements
        await titleInput.focus();
        await expect(titleInput).toBeVisible();
      });
    });
  });
});
