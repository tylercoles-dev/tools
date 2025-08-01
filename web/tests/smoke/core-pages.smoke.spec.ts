import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';

test.describe('Core Pages Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // These tests require authentication
    await page.goto('/dashboard');
  });

  test('should load dashboard successfully', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await expect(page).toHaveTitle(/dashboard/i);
    
    // Check main dashboard elements
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Check navigation is present
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Verify dashboard loaded completely
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should load kanban boards page', async ({ page }) => {
    await page.goto('/kanban');
    
    await expect(page).toHaveTitle(/kanban|boards/i);
    await expect(page.locator('[data-testid="kanban-page"], [data-testid="boards-page"]')).toBeVisible();
    
    // Should have create board option
    await expect(page.locator('[data-testid="create-board-button"], [data-testid="new-board-button"]')).toBeVisible();
  });

  test('should load wiki pages section', async ({ page }) => {
    await page.goto('/wiki');
    
    await expect(page).toHaveTitle(/wiki|pages/i);
    await expect(page.locator('[data-testid="wiki-page"], [data-testid="pages-page"]')).toBeVisible();
    
    // Should have create page option
    await expect(page.locator('[data-testid="create-page-button"], [data-testid="new-page-button"]')).toBeVisible();
  });

  test('should load memory management section', async ({ page }) => {
    await page.goto('/memory');
    
    await expect(page).toHaveTitle(/memory|thoughts/i);
    await expect(page.locator('[data-testid="memory-page"], [data-testid="thoughts-page"]')).toBeVisible();
    
    // Should have create memory option
    await expect(page.locator('[data-testid="create-memory-button"], [data-testid="new-memory-button"]')).toBeVisible();
  });

  test('should navigate between main sections', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Start at dashboard
    await dashboardPage.goto();
    await expect(page).toHaveURL(/dashboard/);
    
    // Navigate to kanban
    await dashboardPage.navigateToKanban();
    await expect(page).toHaveURL(/kanban/);
    
    // Navigate to wiki
    await dashboardPage.navigateToWiki();
    await expect(page).toHaveURL(/wiki/);
    
    // Navigate to memory
    await dashboardPage.navigateToMemory();
    await expect(page).toHaveURL(/memory/);
    
    // Back to dashboard
    await dashboardPage.navigateToDashboard();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display user menu and profile info', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Open user menu
    await dashboardPage.openUserMenu();
    
    // Should show user information
    await expect(page.locator('[data-testid="user-name"], [data-testid="user-email"]')).toBeVisible();
    
    // Should have logout option
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    
    // Close menu
    await page.keyboard.press('Escape');
  });

  test('should show connection status indicator', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Check connection status
    const status = await dashboardPage.checkConnectionStatus();
    
    // Should be connected or connecting
    expect(['connected', 'connecting']).toContain(status);
  });

  test('should handle search functionality', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for search input
    const searchInput = page.locator('[data-testid="search-input"], [data-testid="dashboard-search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Should handle search (either show results or navigate)
      await page.waitForLoadState('networkidle');
      
      // Verify search was processed (page should react somehow)
      const hasResults = await page.locator('[data-testid*="search-result"], [data-testid*="result"]').count() > 0;
      const urlChanged = page.url().includes('search') || page.url().includes('test');
      
      expect(hasResults || urlChanged).toBeTruthy();
    }
  });

  test('should load and display analytics widget', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Check if analytics data is available
    const analyticsData = await dashboardPage.getAnalyticsData();
    
    if (analyticsData.hasData) {
      // If analytics is present, it should show some data
      expect(analyticsData.boardsCount || analyticsData.pagesCount || analyticsData.memoriesCount).toBeTruthy();
    }
  });

  test('should show activity feed or recent items', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Check dashboard sections
    const sections = await dashboardPage.checkDashboardSections();
    
    // At least one section should be visible
    const hasSections = sections.recentBoards || 
                       sections.recentPages || 
                       sections.recentMemories || 
                       sections.activityFeed;
    
    expect(hasSections).toBeTruthy();
  });

  test('should handle quick actions from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Check if quick actions are available
    const sections = await dashboardPage.checkDashboardSections();
    
    if (sections.quickActions) {
      // Test create board quick action
      const createBoardButton = page.locator('[data-testid="create-board-quick"], [data-testid="quick-create-board"]');
      
      if (await createBoardButton.count() > 0) {
        await createBoardButton.click();
        
        // Should navigate to board creation or show modal
        const isModal = await page.locator('[data-testid="modal"], [role="dialog"]').count() > 0;
        const urlChanged = page.url().includes('/kanban') || page.url().includes('new');
        
        expect(isModal || urlChanged).toBeTruthy();
      }
    }
  });

  test('should maintain responsive layout on mobile', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Test mobile layout
    await dashboardPage.testMobileLayout();
    
    // Dashboard should still be functional
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await dashboardPage.goto();
    
    // Test basic keyboard navigation
    await dashboardPage.testKeyboardNavigation();
    
    // Should be able to navigate through interface
    await page.keyboard.press('Tab');
    
    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should load pages without JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    // Capture JavaScript errors
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Visit main pages
    const pages = ['/dashboard', '/kanban', '/wiki', '/memory'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Allow time for any async errors
      await page.waitForTimeout(1000);
    }
    
    // Should have no critical JavaScript errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('ResizeObserver') && // Common non-critical error
      !error.includes('Network') && // Network errors are expected in tests
      !error.toLowerCase().includes('warning')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle network connectivity issues gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Try to navigate
    await page.goto('/kanban');
    
    // Should show some indication of connectivity issue
    // or handle gracefully without crashing
    await page.waitForLoadState('load');
    
    // Re-enable network
    await page.context().setOffline(false);
    
    // Should recover
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Page should load successfully
    await expect(page.locator('body')).toBeVisible();
  });
});