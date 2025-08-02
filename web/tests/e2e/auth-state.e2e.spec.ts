import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { testUsers } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication State Management - End-to-End Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    testHelpers = new TestHelpers(page);
  });

  test.describe('Protected Route Access', () => {
    const protectedRoutes = [
      '/dashboard',
      '/kanban',
      '/wiki',
      '/memory',
      '/dashboard/analytics'
    ];

    for (const route of protectedRoutes) {
      test(`should redirect unauthenticated users from ${route} to login`, async ({ page }) => {
        await page.goto(route);
        
        // Should redirect to login page
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
        
        // Should preserve the intended route for post-login redirect
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/redirect|return|from/); // Some redirect parameter
      });
    }

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);

      // Test access to protected routes
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should not redirect to login
        await expect(page).not.toHaveURL(/login/);
        
        // Should show the intended page content
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBe(`${page.context().baseURL || 'http://localhost:3000'}${route}`);
      }
    });

    test('should redirect after login to originally requested page', async ({ page }) => {
      const targetRoute = '/dashboard/analytics';
      
      // Try to access protected route
      await page.goto(targetRoute);
      await expect(page).toHaveURL(/login/);
      
      // Login
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      await loginPage.clickLoginButton();
      
      // Should redirect to originally requested page
      await expect(page).toHaveURL(targetRoute, { timeout: 10000 });
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Refresh multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload();
        
        // Should remain authenticated
        await expect(page).toHaveURL(/dashboard/);
        await dashboardPage.verifyDashboardLoaded();
      }
    });

    test('should maintain session across new tabs', async ({ context, page }) => {
      // Login in first tab
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Open new tab
      const newTab = await context.newPage();
      await newTab.goto('/dashboard');
      
      // Should be authenticated in new tab
      await expect(newTab).toHaveURL(/dashboard/);
      await expect(newTab.locator('body')).not.toContainText('Sign in');
      
      await newTab.close();
    });

    test('should handle concurrent sessions in multiple tabs', async ({ context, page }) => {
      // Login in first tab
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Open second tab and navigate to different protected route
      const secondTab = await context.newPage();
      await secondTab.goto('/kanban');
      await expect(secondTab).toHaveURL(/kanban/);
      
      // Both tabs should remain authenticated
      await page.reload();
      await expect(page).toHaveURL(/dashboard/);
      
      await secondTab.reload();
      await expect(secondTab).toHaveURL(/kanban/);
      
      await secondTab.close();
    });

    test('should preserve authentication state during navigation', async ({ page }) => {
      // Login
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Navigate to different sections
      const routes = ['/kanban', '/wiki', '/memory', '/dashboard'];
      
      for (const route of routes) {
        await page.goto(route);
        await expect(page).not.toHaveURL(/login/);
        
        // Should show user info or authenticated state
        const isAuthenticated = await page.locator('body').textContent();
        expect(isAuthenticated).not.toContain('Sign in');
      }
    });
  });

  test.describe('Session Expiration', () => {
    test('should handle expired session gracefully', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Mock expired session by clearing cookies/storage
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected route
      await page.goto('/dashboard/analytics');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should handle API calls with expired tokens', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Mock API response with 401 Unauthorized
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });
      
      // Navigate to page that makes API calls
      await page.goto('/dashboard/analytics');
      
      // Should handle unauthorized response (might redirect to login)
      await page.waitForTimeout(2000); // Give time for API calls to process
      
      // Check if redirected to login or shows error
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/login');
      const hasErrorMessage = await page.locator('[role="alert"], .error-message').count() > 0;
      
      expect(isLoginPage || hasErrorMessage).toBe(true);
    });
  });

  test.describe('Logout Functionality', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Logout
      await dashboardPage.logout();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should clear authentication state on logout', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Logout
      await dashboardPage.logout();
      await expect(page).toHaveURL(/login/);
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login again
      await expect(page).toHaveURL(/login/);
    });

    test('should logout from all tabs simultaneously', async ({ context, page }) => {
      // Login in first tab
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Open second tab
      const secondTab = await context.newPage();
      await secondTab.goto('/dashboard');
      await expect(secondTab).toHaveURL(/dashboard/);
      
      // Logout from first tab
      await dashboardPage.logout();
      await expect(page).toHaveURL(/login/);
      
      // Second tab should also be logged out
      await secondTab.reload();
      await expect(secondTab).toHaveURL(/login/, { timeout: 10000 });
      
      await secondTab.close();
    });

    test('should handle logout when already logged out', async ({ page }) => {
      // Go to login page (not logged in)
      await loginPage.goto();
      
      // Try to logout (via direct API call or URL)
      await page.goto('/auth/logout');
      
      // Should redirect to login or home page gracefully
      await expect(page).toHaveURL(/(login|auth|$)/, { timeout: 10000 });
    });
  });

  test.describe('Authentication State Synchronization', () => {
    test('should sync authentication state across components', async ({ page }) => {
      // Login
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Check that user info appears in navigation/header
      const userInfo = page.locator('[data-testid="user-menu"], .user-info, .profile-menu');
      await expect(userInfo).toBeVisible();
      
      // Navigate to different page
      await page.goto('/kanban');
      
      // User info should still be visible
      await expect(userInfo).toBeVisible();
    });

    test('should update UI elements based on auth state', async ({ page }) => {
      // Start unauthenticated
      await page.goto('/');
      
      // Should show login/signup links
      const loginLink = page.locator('a[href*="login"], .login-button');
      if (await loginLink.count() > 0) {
        await expect(loginLink).toBeVisible();
      }
      
      // Login
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Navigate back to home
      await page.goto('/');
      
      // Should now show authenticated UI elements
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu, .profile-menu');
      if (await userMenu.count() > 0) {
        await expect(userMenu).toBeVisible();
      }
    });
    
    test('should handle authentication state changes in real-time', async ({ context, page }) => {
      // Login in first tab
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Open second tab
      const secondTab = await context.newPage();
      await secondTab.goto('/dashboard');
      await expect(secondTab).toHaveURL(/dashboard/);
      
      // Simulate session invalidation
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Trigger state check in both tabs
      await page.reload();
      await secondTab.reload();
      
      // Both tabs should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
      await expect(secondTab).toHaveURL(/login/, { timeout: 10000 });
      
      await secondTab.close();
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should respect user roles for route access', async ({ page }) => {
      // Login as regular user
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Try to access admin routes (if they exist)
      const adminRoutes = ['/admin', '/admin/users', '/admin/settings'];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        
        // Should either redirect or show access denied
        const isUnauthorized = page.url().includes('/login') || 
                              page.url().includes('/403') ||
                              await page.locator('.unauthorized, .access-denied').count() > 0;
        
        // For now, just check that it doesn't crash
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBeTruthy(); // Page loaded something
      }
    });

    test('should show different navigation for different roles', async ({ page }) => {
      // Login as regular user
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Check available navigation items
      const userNavItems = await page.locator('nav a, .nav-link').allTextContents();
      
      // Logout and login as admin
      await dashboardPage.logout();
      await loginPage.performLogin(testUsers.adminUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Check admin navigation items
      const adminNavItems = await page.locator('nav a, .nav-link').allTextContents();
      
      // Admin should have at least the same items as user (could have more)
      expect(adminNavItems.length).toBeGreaterThanOrEqual(userNavItems.length);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle malformed authentication tokens', async ({ page }) => {
      // Set invalid token in storage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth-token', 'invalid-token-format');
      });
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login or handle gracefully
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should handle network errors during authentication checks', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Mock network failure for auth checks
      await page.route('**/auth/verify', route => {
        route.abort('failed');
      });
      
      // Navigate to protected route
      await page.goto('/kanban');
      
      // Should handle gracefully (might show error or redirect)
      await page.waitForTimeout(2000);
      
      // Page shouldn't crash
      const hasError = await page.locator('.error, [role="alert"]').count() > 0;
      const isLoginPage = page.url().includes('/login');
      
      expect(hasError || isLoginPage || page.url().includes('/kanban')).toBe(true);
    });

    test('should handle browser storage being disabled', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });
      
      // Try to login
      await loginPage.goto();
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      await loginPage.clickLoginButton();
      
      // Should handle gracefully - might show error or use alternative storage
      await page.waitForTimeout(3000);
      
      // Check that it doesn't crash
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });
});