/**
 * Wiki Enhanced Features E2E Tests
 * 
 * Tests all the newly implemented wiki features:
 * - Category & tag management with UI components
 * - Internal linking system with [[PageName]] support
 * - Version history with visual diff comparison
 * - Real-time collaboration features
 * - Mobile responsive behavior
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { WikiTestHelpers } from '../utils/wiki-test-helpers';
import { RealtimeTestHelpers } from '../utils/realtime-test-helpers';
import { WikiPageData } from '../fixtures/wiki-test-data';

test.describe('Wiki Enhanced Features E2E Tests', () => {
  let wikiHelpers: WikiTestHelpers;
  let realtimeHelpers: RealtimeTestHelpers;
  
  test.beforeEach(async ({ page, context }) => {
    wikiHelpers = new WikiTestHelpers(page);
    realtimeHelpers = new RealtimeTestHelpers(page, context);
    
    // Navigate to wiki section and ensure authentication
    await wikiHelpers.navigateToWiki();
    await wikiHelpers.ensureAuthenticated();
  });
  
  test.describe('Category & Tag Management', () => {
    test('should create and manage wiki categories', async ({ page }) => {
      // Navigate to wiki page creation
      await wikiHelpers.createNewPage();
      
      // Test category creation
      await test.step('Create new category', async () => {
        await page.getByTestId('wiki-category-manager').isVisible();
        await page.getByTestId('create-category-button').click();
        
        // Fill category form
        await page.getByTestId('category-name-input').fill('Development');
        await page.getByTestId('category-description-input').fill('Software development related pages');
        
        // Select color
        await page.getByTestId('color-picker').first().click();
        
        // Save category
        await page.getByTestId('save-category-button').click();
        
        // Verify category was created
        await expect(page.getByTestId('category-badge-development')).toBeVisible();
      });
      
      await test.step('Assign category to page', async () => {
        // Click on the category to assign it
        await page.getByTestId('category-badge-development').click();
        
        // Verify category is selected
        await expect(page.getByTestId('category-badge-development')).toHaveClass(/selected/);
        
        // Save page with category
        await page.getByTestId('wiki-page-title').fill('Test Development Page');
        await page.getByTestId('wiki-page-content').fill('This page is about development.');
        await page.getByTestId('save-page-button').click();
        
        // Verify page was saved with category
        await expect(page.getByTestId('page-category-development')).toBeVisible();
      });
      
      await test.step('Filter pages by category', async () => {
        // Navigate back to wiki home
        await wikiHelpers.navigateToWiki();
        
        // Use category filter
        await page.getByTestId('category-filter').selectOption('Development');
        
        // Verify only development pages are shown
        await expect(page.getByTestId('wiki-page-list')).toContainText('Test Development Page');
      });
    });
    
    test('should manage tags with autocomplete', async ({ page }) => {
      await wikiHelpers.createNewPage();
      
      await test.step('Add tags with autocomplete', async () => {
        await page.getByTestId('wiki-tag-selector').isVisible();
        
        // Start typing tag
        await page.getByTestId('tag-input').fill('java');
        
        // Verify autocomplete suggestions appear
        await expect(page.getByTestId('tag-suggestions')).toBeVisible();
        
        // Select from suggestions or create new
        await page.getByTestId('tag-suggestion-javascript').click();
        
        // Verify tag is added
        await expect(page.getByTestId('tag-badge-javascript')).toBeVisible();
      });
      
      await test.step('Remove tags', async () => {
        // Click remove button on tag
        await page.getByTestId('tag-badge-javascript').getByTestId('remove-tag').click();
        
        // Verify tag is removed
        await expect(page.getByTestId('tag-badge-javascript')).not.toBeVisible();
      });
    });
    
    test('should handle category color management', async ({ page }) => {
      await wikiHelpers.createNewPage();
      
      await test.step('Change category color', async () => {
        // Open category manager
        await page.getByTestId('manage-categories-button').click();
        
        // Select existing category
        await page.getByTestId('category-item-development').click();
        
        // Change color
        await page.getByTestId('color-picker-red').click();
        
        // Save changes
        await page.getByTestId('save-category-button').click();
        
        // Verify color changed in UI
        const categoryBadge = page.getByTestId('category-badge-development');
        await expect(categoryBadge).toHaveCSS('background-color', 'rgb(239, 68, 68)');
      });
    });
  });
  
  test.describe('Internal Linking System', () => {
    test('should create and navigate internal links', async ({ page }) => {
      // Create target page first
      await test.step('Create target page', async () => {
        await wikiHelpers.createPageWithContent('Target Page', 'This is the target of internal links.');
      });
      
      // Create source page with internal link
      await test.step('Create source page with internal link', async () => {
        await wikiHelpers.createNewPage();
        
        await page.getByTestId('wiki-page-title').fill('Source Page');
        
        // Use markdown editor with internal link syntax
        const content = 'This page links to [[Target Page]] for more information.';
        await page.getByTestId('wiki-page-content').fill(content);
        
        await page.getByTestId('save-page-button').click();
      });
      
      await test.step('Verify link rendering and navigation', async () => {
        // Switch to preview mode
        await page.getByTestId('preview-mode-button').click();
        
        // Verify internal link is rendered as clickable
        const internalLink = page.getByTestId('internal-link-target-page');
        await expect(internalLink).toBeVisible();
        await expect(internalLink).toHaveAttribute('href', '/wiki/target-page');
        
        // Click link and verify navigation
        await internalLink.click();
        
        // Should navigate to target page
        await expect(page).toHaveURL(/\/wiki\/target-page/);
        await expect(page.getByTestId('wiki-page-title')).toHaveValue('Target Page');
      });
    });
    
    test('should show link suggestions during editing', async ({ page }) => {
      // Create some pages to link to
      await wikiHelpers.createPageWithContent('API Documentation', 'API docs content');
      await wikiHelpers.createPageWithContent('User Guide', 'User guide content');
      
      await test.step('Show link suggestions', async () => {
        await wikiHelpers.createNewPage();
        
        // Start typing internal link syntax
        await page.getByTestId('wiki-page-content').fill('See [[');
        
        // Verify suggestions popup appears
        await expect(page.getByTestId('link-suggestions-popup')).toBeVisible();
        
        // Verify existing pages are suggested
        await expect(page.getByTestId('link-suggestion-api-documentation')).toBeVisible();
        await expect(page.getByTestId('link-suggestion-user-guide')).toBeVisible();
        
        // Select a suggestion
        await page.getByTestId('link-suggestion-api-documentation').click();
        
        // Verify link is completed
        await expect(page.getByTestId('wiki-page-content')).toHaveValue('See [[API Documentation]]');
      });
    });
    
    test('should handle broken links gracefully', async ({ page }) => {
      await test.step('Create page with broken link', async () => {
        await wikiHelpers.createNewPage();
        
        const content = 'This links to [[Non Existent Page]] which does not exist.';
        await page.getByTestId('wiki-page-content').fill(content);
        await page.getByTestId('wiki-page-title').fill('Page with Broken Link');
        await page.getByTestId('save-page-button').click();
      });
      
      await test.step('Verify broken link handling', async () => {
        await page.getByTestId('preview-mode-button').click();
        
        // Broken link should be styled differently
        const brokenLink = page.getByTestId('internal-link-non-existent-page');
        await expect(brokenLink).toBeVisible();
        await expect(brokenLink).toHaveClass(/broken-link/);
        
        // Clicking should offer to create the page
        await brokenLink.click();
        await expect(page.getByTestId('create-page-prompt')).toBeVisible();
        await expect(page.getByTestId('create-page-prompt')).toContainText('Non Existent Page');
      });
    });
    
    test('should show backlinks in target pages', async ({ page }) => {
      // Create pages with links
      await wikiHelpers.createPageWithContent('Page A', 'Links to [[Target Page]]');
      await wikiHelpers.createPageWithContent('Page B', 'Also links to [[Target Page]]');
      await wikiHelpers.createPageWithContent('Target Page', 'This is the target');
      
      await test.step('View backlinks', async () => {
        // Navigate to target page
        await wikiHelpers.navigateToPage('Target Page');
        
        // Verify backlinks section is visible
        await expect(page.getByTestId('wiki-backlinks')).toBeVisible();
        
        // Verify backlinks are listed
        await expect(page.getByTestId('backlink-page-a')).toBeVisible();
        await expect(page.getByTestId('backlink-page-b')).toBeVisible();
        
        // Click backlink to navigate
        await page.getByTestId('backlink-page-a').click();
        await expect(page).toHaveURL(/\/wiki\/page-a/);
      });
    });
  });
  
  test.describe('Version History & Diff Comparison', () => {
    test('should track and display version history', async ({ page }) => {
      await test.step('Create initial version', async () => {
        await wikiHelpers.createPageWithContent('Versioned Page', 'Initial content of the page.');
      });
      
      await test.step('Make edits to create versions', async () => {
        // Edit 1
        await page.getByTestId('edit-page-button').click();
        await page.getByTestId('wiki-page-content').fill('Initial content of the page.\n\nAdded second paragraph.');
        await page.getByTestId('save-page-button').click();
        
        // Wait a moment to ensure different timestamps
        await page.waitForTimeout(1000);
        
        // Edit 2
        await page.getByTestId('edit-page-button').click();
        await page.getByTestId('wiki-page-content').fill('Updated content of the page.\n\nAdded second paragraph.\n\nAdded third paragraph.');
        await page.getByTestId('save-page-button').click();
      });
      
      await test.step('View version history', async () => {
        // Open version history
        await page.getByTestId('version-history-button').click();
        
        // Verify version history component is visible
        await expect(page.getByTestId('wiki-version-history')).toBeVisible();
        
        // Should show multiple versions
        await expect(page.getByTestId('version-list')).toBeVisible();
        
        // Should have at least 3 versions (initial + 2 edits)
        const versions = page.getByTestId('version-item');
        await expect(versions).toHaveCount(3);
        
        // Verify version information
        await expect(versions.first()).toContainText('Latest');
        await expect(versions.first()).toContainText(/\d{4}-\d{2}-\d{2}/);
      });
    });
    
    test('should show visual diff between versions', async ({ page }) => {
      // Create page with multiple versions (reuse from previous test setup)
      await wikiHelpers.createPageWithContent('Diff Test Page', 'Original content');
      
      // Create second version
      await page.getByTestId('edit-page-button').click();
      await page.getByTestId('wiki-page-content').fill('Modified content with changes');
      await page.getByTestId('save-page-button').click();
      
      await test.step('Compare versions with diff view', async () => {
        await page.getByTestId('version-history-button').click();
        
        // Select two versions to compare
        const versions = page.getByTestId('version-item');
        await versions.nth(0).getByTestId('version-checkbox').check();
        await versions.nth(1).getByTestId('version-checkbox').check();
        
        // Click compare button
        await page.getByTestId('compare-versions-button').click();
        
        // Verify diff view is shown
        await expect(page.getByTestId('version-diff-view')).toBeVisible();
        
        // Verify additions and deletions are highlighted
        await expect(page.getByTestId('diff-addition')).toBeVisible();
        await expect(page.getByTestId('diff-deletion')).toBeVisible();
        
        // Verify diff content
        await expect(page.getByTestId('diff-addition')).toContainText('Modified');
        await expect(page.getByTestId('diff-addition')).toContainText('changes');
        await expect(page.getByTestId('diff-deletion')).toContainText('Original');
      });
    });
    
    test('should restore previous versions', async ({ page }) => {
      // Create page with versions
      await wikiHelpers.createPageWithContent('Restore Test Page', 'Good content');
      
      // Make a bad edit
      await page.getByTestId('edit-page-button').click();
      await page.getByTestId('wiki-page-content').fill('Bad content that needs to be reverted');
      await page.getByTestId('save-page-button').click();
      
      await test.step('Restore previous version', async () => {
        await page.getByTestId('version-history-button').click();
        
        // Select the good version (second in list)
        const versions = page.getByTestId('version-item');
        await versions.nth(1).getByTestId('restore-version-button').click();
        
        // Confirm restoration
        await page.getByTestId('confirm-restore-button').click();
        
        // Verify content is restored
        await expect(page.getByTestId('wiki-page-content')).toContainText('Good content');
        await expect(page.getByTestId('wiki-page-content')).not.toContainText('Bad content');
        
        // Verify new version is created for the restoration
        await page.getByTestId('version-history-button').click();
        const updatedVersions = page.getByTestId('version-item');
        await expect(updatedVersions.first()).toContainText('Restored from');
      });
    });
  });
  
  test.describe('Real-time Collaboration', () => {
    test('should show collaborative editing with multiple users', async ({ context, page }) => {
      // Create second browser context for second user
      const secondContext = await context.browser()!.newContext();
      const secondPage = await secondContext.newPage();
      const secondUserHelpers = new WikiTestHelpers(secondPage);
      
      await test.step('Setup collaborative session', async () => {
        // First user creates page
        await wikiHelpers.createPageWithContent('Collaborative Page', 'Initial content');
        
        // Second user navigates to same page
        await secondUserHelpers.navigateToWiki();
        await secondUserHelpers.ensureAuthenticated('second-user@example.com');
        await secondUserHelpers.navigateToPage('Collaborative Page');
        
        // Both users enter edit mode
        await page.getByTestId('edit-page-button').click();
        await secondPage.getByTestId('edit-page-button').click();
      });
      
      await test.step('Real-time editing updates', async () => {
        // First user types
        await page.getByTestId('wiki-page-content').fill('Initial content\n\nFirst user addition');
        
        // Second user should see the change in real-time
        await expect(secondPage.getByTestId('collaborative-indicator')).toBeVisible();
        await expect(secondPage.getByTestId('other-user-cursor')).toBeVisible();
        
        // Second user types
        await secondPage.getByTestId('wiki-page-content').fill('Initial content\n\nFirst user addition\n\nSecond user addition');
        
        // First user should see second user's changes
        await expect(page.getByTestId('wiki-page-content')).toContainText('Second user addition');
      });
      
      await test.step('Conflict resolution', async () => {
        // Simulate conflicting edits
        await page.getByTestId('wiki-page-content').fill('Conflicting edit from user 1');
        await secondPage.getByTestId('wiki-page-content').fill('Conflicting edit from user 2');
        
        // First user saves
        await page.getByTestId('save-page-button').click();
        
        // Second user should get conflict notification
        await expect(secondPage.getByTestId('conflict-resolution-dialog')).toBeVisible();
        
        // Second user resolves conflict
        await secondPage.getByTestId('accept-merge-button').click();
        
        // Verify conflict is resolved
        await expect(secondPage.getByTestId('wiki-page-content')).not.toContainText('Conflicting edit from user 2');
      });
      
      await secondContext.close();
    });
    
    test('should show user presence indicators', async ({ context, page }) => {
      const secondContext = await context.browser()!.newContext();
      const secondPage = await secondContext.newPage();
      const secondUserHelpers = new WikiTestHelpers(secondPage);
      
      await wikiHelpers.createPageWithContent('Presence Test Page', 'Testing presence');
      
      await test.step('Show active users', async () => {
        // Second user joins
        await secondUserHelpers.navigateToWiki();
        await secondUserHelpers.ensureAuthenticated('presence-user@example.com');
        await secondUserHelpers.navigateToPage('Presence Test Page');
        
        // First user should see second user in presence list
        await expect(page.getByTestId('active-users-list')).toBeVisible();
        await expect(page.getByTestId('user-presence-presence-user')).toBeVisible();
        
        // Should show user avatar and status
        await expect(page.getByTestId('user-presence-presence-user')).toContainText('presence-user');
        await expect(page.getByTestId('user-status-presence-user')).toContainText('viewing');
      });
      
      await test.step('Update presence on edit mode', async () => {
        // Second user enters edit mode
        await secondPage.getByTestId('edit-page-button').click();
        
        // First user should see updated status
        await expect(page.getByTestId('user-status-presence-user')).toContainText('editing');
      });
      
      await secondContext.close();
    });
  });
  
  test.describe('Mobile Responsive Behavior', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await test.step('Mobile navigation', async () => {
        await wikiHelpers.navigateToWiki();
        
        // Verify mobile-specific UI elements
        await expect(page.getByTestId('mobile-wiki-menu')).toBeVisible();
        await expect(page.getByTestId('mobile-search-button')).toBeVisible();
      });
      
      await test.step('Mobile page creation', async () => {
        // Create page on mobile
        await page.getByTestId('mobile-create-page-button').click();
        
        // Verify mobile form layout
        await expect(page.getByTestId('mobile-page-form')).toBeVisible();
        
        // Fill form
        await page.getByTestId('wiki-page-title').fill('Mobile Test Page');
        await page.getByTestId('wiki-page-content').fill('Content created on mobile');
        
        // Test mobile category selector
        await page.getByTestId('mobile-category-selector').click();
        await expect(page.getByTestId('mobile-category-list')).toBeVisible();
      });
      
      await test.step('Mobile editing experience', async () => {
        await page.getByTestId('save-page-button').click();
        
        // Edit page on mobile
        await page.getByTestId('mobile-edit-button').click();
        
        // Verify mobile editor
        await expect(page.getByTestId('mobile-markdown-editor')).toBeVisible();
        
        // Test touch interactions
        await page.getByTestId('mobile-toolbar-bold').tap();
        await expect(page.getByTestId('wiki-page-content')).toContainText('**');
      });
      
      await test.step('Mobile version history', async () => {
        await page.getByTestId('mobile-more-menu').click();
        await page.getByTestId('version-history-menu-item').click();
        
        // Verify mobile version history UI
        await expect(page.getByTestId('mobile-version-history')).toBeVisible();
        
        // Should be scrollable list on mobile
        const versionList = page.getByTestId('mobile-version-list');
        await expect(versionList).toBeVisible();
        await expect(versionList).toHaveCSS('overflow-y', 'auto');
      });
    });
    
    test('should handle touch gestures for collaborative features', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await wikiHelpers.createPageWithContent('Touch Test Page', 'Touch interaction test');
      
      await test.step('Touch-based category management', async () => {
        await page.getByTestId('mobile-edit-button').click();
        await page.getByTestId('mobile-category-manager').click();
        
        // Test touch category selection
        await page.getByTestId('category-badge-development').tap();
        await expect(page.getByTestId('category-badge-development')).toHaveClass(/selected/);
        
        // Test swipe to remove category
        await page.getByTestId('category-badge-development').swipeRight();
        await expect(page.getByTestId('category-badge-development')).not.toHaveClass(/selected/);
      });
      
      await test.step('Touch-based internal linking', async () => {
        // Double tap to select text for linking
        await page.getByTestId('wiki-page-content').dblclick();
        
        // Verify mobile link creation dialog
        await page.getByTestId('mobile-create-link-button').tap();
        await expect(page.getByTestId('mobile-link-dialog')).toBeVisible();
      });
    });
  });
  
  test.describe('Performance and UX', () => {
    test('should load pages quickly and smoothly', async ({ page }) => {
      await test.step('Measure page load performance', async () => {
        const startTime = Date.now();
        
        await wikiHelpers.navigateToWiki();
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      });
      
      await test.step('Measure category loading performance', async () => {
        await wikiHelpers.createNewPage();
        
        const startTime = Date.now();
        await page.getByTestId('wiki-category-manager').isVisible();
        const categoryLoadTime = Date.now() - startTime;
        
        expect(categoryLoadTime).toBeLessThan(500); // Categories should load within 500ms
      });
    });
    
    test('should handle large pages smoothly', async ({ page }) => {
      // Create a large page
      const largeContent = 'Large content section '.repeat(1000);
      await wikiHelpers.createPageWithContent('Large Page', largeContent);
      
      await test.step('Large page editing performance', async () => {
        await page.getByTestId('edit-page-button').click();
        
        const startTime = Date.now();
        await page.getByTestId('wiki-page-content').fill(largeContent + '\n\nAdded content');
        
        // Should remain responsive during editing
        const editTime = Date.now() - startTime;
        expect(editTime).toBeLessThan(1000);
      });
      
      await test.step('Large page version comparison', async () => {
        await page.getByTestId('save-page-button').click();
        await page.getByTestId('version-history-button').click();
        
        // Version history should load even for large pages
        await expect(page.getByTestId('version-list')).toBeVisible({ timeout: 5000 });
      });
    });
  });
});
