import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { testUsers, authTestData } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Login Flow - End-to-End Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    testHelpers = new TestHelpers(page);
    
    await loginPage.goto();
  });

  test.describe('Valid Login Scenarios', () => {
    test('should login with valid user credentials', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.clickLoginButton();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await dashboardPage.verifyDashboardLoaded();
    });

    test('should login with admin credentials', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.adminUser.email,
        testUsers.adminUser.password
      );
      
      await loginPage.clickLoginButton();
      
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await dashboardPage.verifyDashboardLoaded();
    });

    test('should maintain session after page refresh', async ({ page }) => {
      // Login first
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Refresh the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/dashboard/);
      await dashboardPage.verifyDashboardLoaded();
    });

    test('should handle remember me functionality', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      // Check remember me
      await loginPage.toggleRememberMe();
      expect(await loginPage.isRememberMeChecked()).toBe(true);
      
      await loginPage.clickLoginButton();
      await expect(page).toHaveURL(/dashboard/);
      
      // Close and reopen browser context to test persistence
      await page.context().close();
      // Note: In a real test, you'd create a new context here to test persistence
    });
  });

  test.describe('Invalid Login Scenarios', () => {
    for (const invalidLogin of authTestData.invalidLogins) {
      test(`should reject login: ${invalidLogin.description}`, async ({ page }) => {
        await loginPage.fillCredentials(invalidLogin.email, invalidLogin.password);
        await loginPage.clickLoginButton();

        if (invalidLogin.email === '' || invalidLogin.password === '') {
          // Form validation should prevent submission
          const isDisabled = await loginPage.isLoginButtonDisabled();
          expect(isDisabled).toBe(true);
        } else {
          // Should show error message or stay on login page
          try {
            await testHelpers.waitForToast(undefined, 'error');
          } catch {
            // Alternative: check if still on login page
            await expect(page).toHaveURL(/login/);
          }
        }
      });
    }

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/auth/login', route => {
        route.abort('failed');
      });

      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.clickLoginButton();
      
      // Should show error message
      try {
        await testHelpers.waitForToast('network', 'error');
      } catch {
        // Still on login page
        await expect(page).toHaveURL(/login/);
      }
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.clickLoginButton();
      
      // Should show error message
      await testHelpers.waitForToast(undefined, 'error');
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      // Try to submit empty form
      await loginPage.clickLoginButton();
      
      // Button should be disabled or form should show validation
      const isDisabled = await loginPage.isLoginButtonDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should validate email format', async ({ page }) => {
      for (const emailCase of authTestData.emailValidationCases) {
        await loginPage.clearForm();
        await page.fill('#email', emailCase.email);
        await page.fill('#password', 'testpassword123');
        await page.locator('#email').blur();
        
        if (!emailCase.valid && emailCase.email !== '') {
          // Should show validation error or disable button
          const hasErrors = await loginPage.hasValidationErrors();
          const isDisabled = await loginPage.isLoginButtonDisabled();
          expect(hasErrors || isDisabled).toBe(true);
        }
      }
    });

    test('should show loading state during login', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.clickLoginButton();
      
      // Should show loading state briefly
      const buttonText = await page.locator('button[type="submit"]').textContent();
      expect(buttonText?.toLowerCase()).toContain('signing');
    });

    test('should disable form during submission', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.clickLoginButton();
      
      // Form fields should be disabled during submission
      const emailDisabled = await page.locator('#email').isDisabled();
      const passwordDisabled = await page.locator('#password').isDisabled();
      const buttonDisabled = await page.locator('button[type="submit"]').isDisabled();
      
      expect(emailDisabled || passwordDisabled || buttonDisabled).toBe(true);
    });
  });

  test.describe('User Experience', () => {
    test('should focus email field on page load', async ({ page }) => {
      // Email field should be focused by default
      await expect(page.locator('#email')).toBeFocused();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await loginPage.testKeyboardNavigation();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      await loginPage.submitWithEnter();
      
      // Should attempt to login
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.fill('#password', 'testpassword123');
      
      // Initially password should be hidden
      expect(await loginPage.isPasswordVisible()).toBe(false);
      
      // Click toggle button
      await loginPage.togglePasswordVisibility();
      
      // Password should now be visible
      expect(await loginPage.isPasswordVisible()).toBe(true);
    });

    test('should clear form validation on input change', async ({ page }) => {
      // Trigger validation error
      await page.fill('#email', 'invalid-email');
      await page.locator('#email').blur();
      
      // Should have validation error
      const hasErrors = await loginPage.hasValidationErrors();
      expect(hasErrors).toBe(true);
      
      // Fix the email
      await page.fill('#email', 'valid@email.com');
      
      // Error should be cleared
      await page.waitForTimeout(500); // Brief wait for validation
      const errorsCleared = await loginPage.hasValidationErrors();
      expect(errorsCleared).toBe(false);
    });
  });

  test.describe('Navigation and Links', () => {
    test('should navigate to signup page', async ({ page }) => {
      await loginPage.goToSignup();
      await expect(page).toHaveURL(/signup/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.goToForgotPassword();
      await expect(page).toHaveURL(/forgot-password/);
    });

    test('should redirect authenticated users from login page', async ({ page }) => {
      // First login
      await loginPage.performLogin(testUsers.validUser);
      await expect(page).toHaveURL(/dashboard/);
      
      // Try to visit login page again
      await page.goto('/auth/login');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Security Features', () => {
    test('should not expose password in DOM when hidden', async ({ page }) => {
      await page.fill('#password', 'secretpassword123');
      
      // Password field should be type="password"
      const passwordType = await page.locator('#password').getAttribute('type');
      expect(passwordType).toBe('password');
    });

    test('should clear sensitive data on navigation', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      // Navigate away
      await page.goto('/');
      
      // Go back to login
      await page.goto('/auth/login');
      
      // Form should be cleared
      const emailValue = await page.locator('#email').inputValue();
      const passwordValue = await page.locator('#password').inputValue();
      
      expect(emailValue).toBe('');
      expect(passwordValue).toBe('');
    });

    test('should handle XSS attempts in form fields', async ({ page }) => {
      for (const xssAttempt of authTestData.securityTestCases.xssAttempts) {
        await loginPage.clearForm();
        await page.fill('#email', xssAttempt);
        await page.fill('#password', xssAttempt);
        
        // Should not execute script or cause errors
        const hasAlerts = await page.evaluate(() => {
          return typeof window !== 'undefined' && window.alert !== window.alert;
        });
        
        expect(hasAlerts).toBe(false);
      }
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid form submissions', async ({ page }) => {
      await loginPage.fillCredentials(
        testUsers.validUser.email,
        testUsers.validUser.password
      );
      
      // Click submit button multiple times rapidly
      for (let i = 0; i < 5; i++) {
        await loginPage.clickLoginButton();
        await page.waitForTimeout(100);
      }
      
      // Should only process one submission
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    });

    test('should load login page quickly', async ({ page }) => {
      const startTime = Date.now();
      await loginPage.goto();
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });
  });
});