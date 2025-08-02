import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { SignupPage } from '../pages/auth/signup-page';
import { DashboardPage } from '../pages/dashboard-page';
import { testUsers, TestDataGenerator } from '../fixtures/test-data';

test.describe('Authentication Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should load login page successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await expect(page).toHaveTitle(/login|sign/i);
    
    // Check essential elements are present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check navigation links
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible();
  });

  test('should load signup page successfully', async ({ page }) => {
    const signupPage = new SignupPage(page);
    
    await signupPage.goto();
    await expect(page).toHaveTitle(/signup|register|sign up|create/i);
    
    // Check essential form elements
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate between login and signup pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const signupPage = new SignupPage(page);
    
    // Start at login page
    await loginPage.goto();
    await expect(page).toHaveURL(/login/);
    
    // Navigate to signup
    await loginPage.goToSignup();
    await expect(page).toHaveURL(/signup/);
    
    // Navigate back to login
    await signupPage.goToLogin();
    await expect(page).toHaveURL(/login/);
  });

  test('should validate required fields on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    
    // Try to submit empty form
    await loginPage.clickLoginButton();
    
    // Should show validation errors or disable button
    const isDisabled = await loginPage.isLoginButtonDisabled();
    const hasErrors = await loginPage.hasValidationErrors();
    
    expect(isDisabled || hasErrors).toBeTruthy();
  });

  test('should validate required fields on signup', async ({ page }) => {
    const signupPage = new SignupPage(page);
    
    await signupPage.goto();
    
    // Try to submit empty form
    await signupPage.clickSignupButton();
    
    // Should show validation errors or disable button
    const isDisabled = await signupPage.isSignupButtonDisabled();
    const validationState = await signupPage.getFormValidationState();
    
    expect(isDisabled || !validationState.formValid).toBeTruthy();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    
    // Try invalid credentials
    await loginPage.loginWithCredentials('invalid@test.com', 'wrongpassword');
    
    // Should show error message or toast
    try {
      await expect(page.locator('[role="alert"], .error-message, .text-red-600, .toast')).toBeVisible({ timeout: 5000 });
    } catch {
      // Alternative: check if we're still on login page (didn't redirect)
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should perform successful login flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    await loginPage.goto();
    
    // Login with valid credentials
    await loginPage.loginWithCredentials(
      testUsers.validUser.email,
      testUsers.validUser.password
    );
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    
    // Dashboard should load successfully
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should handle signup flow for new user', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const newUser = TestDataGenerator.generateUser();
    
    await signupPage.goto();
    
    // Fill and submit signup form
    await signupPage.fillSignupForm(newUser);
    await signupPage.acceptTerms();
    await signupPage.clickSignupButton();
    
    // Should either show success message or redirect
    try {
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible({ timeout: 5000 });
    } catch {
      // Or redirect to login/dashboard
      await expect(page).toHaveURL(/(login|dashboard)/, { timeout: 5000 });
    }
  });

  test('should validate email format', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    
    // Enter invalid email format
    await page.fill('#email', 'invalid-email');
    await page.locator('#email').blur(); // Trigger validation
    
    // Should show validation error or browser validation
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.getAttribute('aria-invalid') === 'true' ||
                     await emailInput.evaluate(el => !(el as HTMLInputElement).validity.valid);
    
    expect(isInvalid).toBe(true);
  });

  test('should validate password requirements on signup', async ({ page }) => {
    const signupPage = new SignupPage(page);
    
    await signupPage.goto();
    
    // Test weak password
    await page.fill('#password', '123');
    await page.locator('#password').blur();
    
    // Should show password strength indicator or validation error
    try {
      const strength = await signupPage.getPasswordStrength();
      expect(strength.toLowerCase()).toContain('weak');
    } catch {
      // Alternative: check for validation error or button disabled
      const isDisabled = await signupPage.isSignupButtonDisabled();
      expect(isDisabled).toBe(true);
    }
  });

  test('should validate password confirmation matching', async ({ page }) => {
    const signupPage = new SignupPage(page);
    
    await signupPage.goto();
    
    // Enter mismatched passwords
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'different123');
    await page.locator('#confirmPassword').blur();
    
    // Should show validation error
    await expect(page.locator('.text-red-600')).toBeVisible();
  });

  test('should handle logout functionality', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.loginWithCredentials(
      testUsers.validUser.email,
      testUsers.validUser.password
    );
    
    await expect(page).toHaveURL(/dashboard/);
    
    // Logout
    await dashboardPage.logout();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/login/);
  });

  test('should remember user session across page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    // Login and get to dashboard
    await loginPage.goto();
    await loginPage.loginWithCredentials(
      testUsers.validUser.email,
      testUsers.validUser.password
    );
    
    await expect(page).toHaveURL(/dashboard/);
    
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/dashboard/);
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should handle keyboard navigation on login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    
    // Test keyboard navigation
    await loginPage.testKeyboardNavigation();
    
    // Test form submission with Enter
    await page.fill('#email', testUsers.validUser.email);
    await page.fill('#password', testUsers.validUser.password);
    await loginPage.submitWithEnter();
    
    // Should attempt login
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});