import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../pages';
import { testUsers, TestDataGenerator } from '../fixtures/test-data';

test.describe('End-to-End User Workflows', () => {
  test.describe.configure({ mode: 'serial' });

  test('complete new user onboarding workflow', async ({ page }) => {
    const newUser = TestDataGenerator.generateUser();
    
    // 1. User visits login page and goes to signup
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.goToSignup();
    
    // 2. User completes signup
    const signupPage = await import('../pages/auth/signup-page').then(m => new m.SignupPage(page));
    await signupPage.fillSignupForm(newUser);
    await signupPage.acceptTerms();
    await signupPage.clickSignupButton();
    
    // 3. User should be redirected or see success
    await signupPage.waitForSuccessfulSignup();
    
    // 4. If redirected to login, user logs in
    if (page.url().includes('login')) {
      await loginPage.loginWithCredentials(newUser.email, newUser.password);
    }
    
    // 5. User should reach dashboard
    const dashboardPage = new DashboardPage(page);
    await expect(page).toHaveURL(/dashboard/);
    await dashboardPage.verifyDashboardLoaded();
    
    // 6. User can see welcome message
    const welcomeMessage = await dashboardPage.getWelcomeMessage();
    expect(welcomeMessage).toBeTruthy();
  });

  test('authenticated user daily workflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. User starts at dashboard
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 2. Check connection status
    await dashboardPage.waitForRealtimeConnection();
    const connectionStatus = await dashboardPage.checkConnectionStatus();
    expect(['connected', 'connecting']).toContain(connectionStatus);
    
    // 3. User navigates to kanban boards
    await dashboardPage.navigateToKanban();
    await expect(page).toHaveURL(/kanban/);
    
    // 4. User creates a new board (if create button exists)
    const createButton = page.locator('[data-testid="create-board-button"], [data-testid="new-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Handle modal or navigation
      const isModal = await page.locator('[data-testid="modal"], [role="dialog"]').count() > 0;
      if (isModal) {
        const boardData = TestDataGenerator.generateBoard();
        await page.fill('[data-testid="board-name-input"], [name="name"]', boardData.name);
        await page.fill('[data-testid="board-description-input"], [name="description"]', boardData.description);
        await page.click('[data-testid="create-board-submit"], [data-testid="save-button"]');
      }
      
      // Wait for board creation
      await page.waitForLoadState('networkidle');
    }
    
    // 5. User navigates to wiki
    await dashboardPage.navigateToWiki();
    await expect(page).toHaveURL(/wiki/);
    
    // 6. User creates a new wiki page (if create button exists)
    const createPageButton = page.locator('[data-testid="create-page-button"], [data-testid="new-page-button"]');
    if (await createPageButton.count() > 0) {
      await createPageButton.click();
      
      const isModal = await page.locator('[data-testid="modal"], [role="dialog"]').count() > 0;
      if (isModal) {
        const pageData = TestDataGenerator.generateWikiPage();
        await page.fill('[data-testid="page-title-input"], [name="title"]', pageData.title);
        await page.fill('[data-testid="page-content-input"], [name="content"]', pageData.content);
        await page.click('[data-testid="create-page-submit"], [data-testid="save-button"]');
      }
      
      await page.waitForLoadState('networkidle');
    }
    
    // 7. User returns to dashboard
    await dashboardPage.navigateToDashboard();
    await expect(page).toHaveURL(/dashboard/);
    
    // 8. Dashboard should show updated recent items
    await dashboardPage.waitForLoadingToFinish();
  });

  test('cross-platform collaboration workflow', async ({ page, context }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. User A logs in and creates content
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 2. Create a board that can be shared
    await dashboardPage.navigateToKanban();
    const createButton = page.locator('[data-testid="create-board-button"], [data-testid="new-board-button"]');
    
    let boardUrl = '';
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Collaboration Test Board';
      
      const isModal = await page.locator('[data-testid="modal"], [role="dialog"]').count() > 0;
      if (isModal) {
        await page.fill('[data-testid="board-name-input"], [name="name"]', boardData.name);
        await page.fill('[data-testid="board-description-input"], [name="description"]', boardData.description);
        await page.click('[data-testid="create-board-submit"], [data-testid="save-button"]');
        
        // Wait for navigation to the board
        await page.waitForURL('**/kanban/**');
        boardUrl = page.url();
      }
    }
    
    // 3. If we have a board URL, test real-time updates
    if (boardUrl) {
      // Create a new browser context (simulating another user)
      const newContext = await context.browser()?.newContext();
      if (newContext) {
        const newPage = await newContext.newPage();
        
        // User B logs in and visits the same board
        const loginPage = new LoginPage(newPage);
        await loginPage.goto();
        await loginPage.loginWithCredentials(testUsers.validUser.email, testUsers.validUser.password);
        
        await newPage.goto(boardUrl);
        await newPage.waitForLoadState('networkidle');
        
        // Both users should see the same board
        const title1 = await page.locator('[data-testid="board-title"], h1').textContent();
        const title2 = await newPage.locator('[data-testid="board-title"], h1').textContent();
        
        expect(title1).toBe(title2);
        
        await newContext.close();
      }
    }
  });

  test('error handling and recovery workflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. Start with normal workflow
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 2. Test network interruption
    await page.context().setOffline(true);
    
    // 3. Try to navigate (should handle gracefully)
    await page.click('[data-testid="nav-kanban"], [href*="kanban"]');
    
    // 4. Should show some indication of network issue or cached content
    await page.waitForLoadState('load');
    
    // 5. Restore network
    await page.context().setOffline(false);
    
    // 6. Application should recover
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 7. Should be functional again
    await expect(page.locator('body')).toBeVisible();
    await dashboardPage.verifyDashboardLoaded();
  });

  test('comprehensive search workflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. Start at dashboard
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 2. Test dashboard search if available
    const searchInput = page.locator('[data-testid="search-input"], [data-testid="dashboard-search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      // 3. Perform search
      await dashboardPage.searchFromDashboard('test');
      
      // 4. Should show results or navigate to search page
      await page.waitForLoadState('networkidle');
      
      // 5. Clear search
      await dashboardPage.clearSearch('[data-testid="search-input"], [data-testid="dashboard-search"]');
    }
    
    // 6. Test search in different sections
    const sections = ['/kanban', '/wiki', '/memory'];
    
    for (const section of sections) {
      await page.goto(section);
      await page.waitForLoadState('networkidle');
      
      const sectionSearch = page.locator('[data-testid="search-input"], input[placeholder*="search" i]').first();
      
      if (await sectionSearch.count() > 0) {
        await sectionSearch.fill('test query');
        await sectionSearch.press('Enter');
        await page.waitForLoadState('networkidle');
        
        // Clear search
        await sectionSearch.clear();
        await sectionSearch.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('accessibility workflow with keyboard navigation', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. Load dashboard
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 2. Test keyboard navigation
    await dashboardPage.testKeyboardNavigation();
    
    // 3. Navigate using keyboard
    await page.keyboard.press('Tab'); // Focus first interactive element
    await page.keyboard.press('Enter'); // Activate it
    
    // 4. Should handle keyboard interaction
    await page.waitForLoadState('networkidle');
    
    // 5. Test escape key functionality
    await page.keyboard.press('Escape');
    
    // 6. Test other sections with keyboard
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    
    // Tab through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Small delay for focus to settle
    }
    
    // Should be able to navigate without issues
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('mobile responsive workflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // 1. Set mobile viewport
    await dashboardPage.setMobileViewport();
    
    // 2. Load dashboard
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
    
    // 3. Test mobile layout
    await dashboardPage.testMobileLayout();
    
    // 4. Test navigation on mobile
    const sections = ['/kanban', '/wiki', '/memory'];
    
    for (const section of sections) {
      await page.goto(section);
      await page.waitForLoadState('networkidle');
      
      // Should be visible and functional on mobile
      await expect(page.locator('main, [data-testid*="page"]')).toBeVisible();
    }
    
    // 5. Test tablet layout
    await dashboardPage.testTabletLayout();
    
    // 6. Return to desktop
    await dashboardPage.setDesktopViewport();
    
    // Should adapt to different screen sizes
    await page.goto('/dashboard');
    await dashboardPage.verifyDashboardLoaded();
  });
});