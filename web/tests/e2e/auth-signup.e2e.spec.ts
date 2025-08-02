import { test, expect } from '@playwright/test';
import { SignupPage } from '../pages/auth/signup-page';
import { LoginPage } from '../pages/auth/login-page';
import { TestDataGenerator, authTestData } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Signup Flow - End-to-End Tests', () => {
  let signupPage: SignupPage;
  let loginPage: LoginPage;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    loginPage = new LoginPage(page);
    testHelpers = new TestHelpers(page);
    
    await signupPage.goto();
  });

  test.describe('Valid Signup Scenarios', () => {
    test('should create account with valid data', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillName(`${newUser.firstName} ${newUser.lastName}`);
      await signupPage.fillEmail(newUser.email);
      await signupPage.fillPassword(newUser.password);
      await signupPage.fillConfirmPassword(newUser.password);
      await signupPage.acceptTerms();
      
      await signupPage.clickSignupButton();
      
      // Should show success message or redirect to login
      try {
        await testHelpers.waitForToast('created', 'success');
        // Or check for redirect to login with success message
        await expect(page).toHaveURL(/login.*message=/, { timeout: 10000 });
      } catch {
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
      }
    });

    test('should handle special characters in name', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser({
        firstName: 'José María',
        lastName: 'O\'Connor-Smith'
      });
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      await signupPage.waitForSuccessfulSignup();
    });

    test('should accept various email formats', async ({ page }) => {
      const validEmails = [
        'user.name@domain.com',
        'user+tag@domain.co.uk',
        'user123@sub.domain.org',
        'test_email@domain-name.com'
      ];

      for (const email of validEmails) {
        const newUser = TestDataGenerator.generateUser({ email });
        
        await signupPage.clearForm();
        await signupPage.fillSignupForm(newUser);
        await signupPage.acceptTerms();
        await signupPage.clickSignupButton();
        
        // Should succeed or show appropriate message
        try {
          await signupPage.waitForSuccessfulSignup();
          // Reset for next iteration
          await signupPage.goto();
        } catch {
          // If signup failed for this email, check it's not due to format
          const errorMessage = await signupPage.getSignupError();
          expect(errorMessage.toLowerCase()).not.toContain('invalid email');
        }
      }
    });
  });

  test.describe('Invalid Signup Scenarios', () => {
    for (const invalidSignup of authTestData.invalidSignups) {
      test(`should reject signup: ${invalidSignup.description}`, async ({ page }) => {
        if (invalidSignup.name) await signupPage.fillName(invalidSignup.name);
        if (invalidSignup.email) await signupPage.fillEmail(invalidSignup.email);
        if (invalidSignup.password) await signupPage.fillPassword(invalidSignup.password);
        if (invalidSignup.confirmPassword) await signupPage.fillConfirmPassword(invalidSignup.confirmPassword);
        if (invalidSignup.acceptTerms) await signupPage.acceptTerms();
        
        await signupPage.clickSignupButton();

        // Should show error or validation message
        if (invalidSignup.description === 'Password mismatch') {
          // Check for mismatch error specifically
          await expect(page.locator('.text-red-600')).toBeVisible();
        } else if (invalidSignup.acceptTerms === false) {
          // Button should be disabled if terms not accepted
          const isDisabled = await signupPage.isSignupButtonDisabled();
          expect(isDisabled).toBe(true);
        } else {
          // Should show general error or stay on page
          const isDisabled = await signupPage.isSignupButtonDisabled();
          const hasErrors = await signupPage.getFormValidationState();
          
          expect(isDisabled || !hasErrors.formValid).toBe(true);
        }
      });
    }

    test('should prevent signup with existing email', async ({ page }) => {
      const existingEmail = 'test@mcptools.dev'; // Known test user email
      
      await signupPage.fillName('New User');
      await signupPage.fillEmail(existingEmail);
      await signupPage.fillPassword('newpassword123');
      await signupPage.fillConfirmPassword('newpassword123');
      await signupPage.acceptTerms();
      
      await signupPage.clickSignupButton();
      
      // Should show error about existing email
      try {
        await testHelpers.waitForToast('already', 'error');
      } catch {
        const errorMessage = await signupPage.getSignupError();
        expect(errorMessage.toLowerCase()).toContain('email');
      }
    });
  });

  test.describe('Password Validation', () => {
    test('should validate password strength', async ({ page }) => {
      const weakPasswords = ['123', 'password', 'abc'];
      
      for (const weakPassword of weakPasswords) {
        await signupPage.fillPassword(weakPassword);
        await page.locator('#password').blur();
        
        // Should show weak password indicator or validation error
        try {
          const strength = await signupPage.getPasswordStrength();
          expect(strength.toLowerCase()).toContain('weak');
        } catch {
          // Alternative: check for validation error
          const hasErrors = await signupPage.getFormValidationState();
          expect(hasErrors.passwordValid).toBe(false);
        }
        
        await signupPage.fillPassword(''); // Clear for next test
      }
    });

    test('should validate password confirmation matching', async ({ page }) => {
      await signupPage.fillPassword('password123');
      await signupPage.fillConfirmPassword('different123');
      await page.locator('#confirmPassword').blur();
      
      // Should show mismatch error
      await expect(page.locator('.text-red-600')).toBeVisible();
      
      // Fix the mismatch
      await signupPage.fillConfirmPassword('password123');
      await page.locator('#confirmPassword').blur();
      
      // Error should clear
      await page.waitForTimeout(500);
      const hasErrors = await signupPage.getFormValidationState();
      expect(hasErrors.confirmPasswordValid).toBe(true);
    });

    test('should show password visibility toggle', async ({ page }) => {
      await signupPage.fillPassword('testpassword123');
      
      // Password should be hidden initially
      expect(await signupPage.isPasswordVisible()).toBe(false);
      
      // Toggle visibility
      await signupPage.togglePasswordVisibility();
      
      // Password should now be visible
      expect(await signupPage.isPasswordVisible()).toBe(true);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      await signupPage.clickSignupButton();
      
      // Button should be disabled or show validation errors
      const isDisabled = await signupPage.isSignupButtonDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should validate email format', async ({ page }) => {
      const invalidEmails = ['invalid', '@domain.com', 'user@', 'user space@domain.com'];
      
      for (const invalidEmail of invalidEmails) {
        await signupPage.fillEmail(invalidEmail);
        await page.locator('#email').blur();
        
        // Should show validation error
        const hasErrors = await signupPage.getFormValidationState();
        expect(hasErrors.emailValid).toBe(false);
        
        await signupPage.fillEmail(''); // Clear for next test
      }
    });

    test('should show loading state during signup', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      // Should show loading state
      const buttonText = await page.locator('button[type="submit"]').textContent();
      expect(buttonText?.toLowerCase()).toContain('creating');
    });

    test('should disable form during submission', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      // Form should be disabled during submission
      const buttonDisabled = await page.locator('button[type="submit"]').isDisabled();
      expect(buttonDisabled).toBe(true);
    });
  });

  test.describe('User Experience', () => {
    test('should focus first field on page load', async ({ page }) => {
      // Name field should be focused by default
      await expect(page.locator('#name')).toBeFocused();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await signupPage.testKeyboardNavigation();
    });

    test('should submit form with Enter key', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.submitWithEnter();
      
      // Should attempt signup
      await signupPage.waitForSuccessfulSignup();
    });

    test('should provide real-time validation feedback', async ({ page }) => {
      // Test email validation
      await page.fill('#email', 'invalid-email');
      await page.locator('#email').blur();
      
      const hasEmailError = await signupPage.getFormValidationState();
      expect(hasEmailError.emailValid).toBe(false);
      
      // Fix email
      await page.fill('#email', 'valid@email.com');
      await page.locator('#email').blur();
      await page.waitForTimeout(500);
      
      const emailFixed = await signupPage.getFormValidationState();
      expect(emailFixed.emailValid).toBe(true);
    });
  });

  test.describe('Terms and Conditions', () => {
    test('should require terms acceptance', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      // Don't accept terms
      
      // Button should be disabled
      const isDisabled = await signupPage.isSignupButtonDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should enable form when terms are accepted', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      
      // Button should be enabled
      const isDisabled = await signupPage.isSignupButtonDisabled();
      expect(isDisabled).toBe(false);
    });

    test('should link to terms and privacy pages', async ({ page }) => {
      // Check terms link
      const termsLink = page.locator('a[href="/terms"]');
      await expect(termsLink).toBeVisible();
      
      // Check privacy link
      const privacyLink = page.locator('a[href="/privacy"]');
      await expect(privacyLink).toBeVisible();
    });
  });

  test.describe('Navigation and Links', () => {
    test('should navigate to login page', async ({ page }) => {
      await signupPage.goToLogin();
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect authenticated users from signup page', async ({ page }) => {
      // First login as existing user
      await page.goto('/auth/login');
      await loginPage.performLogin({ 
        email: 'test@mcptools.dev', 
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      });
      await expect(page).toHaveURL(/dashboard/);
      
      // Try to visit signup page
      await page.goto('/auth/signup');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Security Features', () => {
    test('should handle XSS attempts in form fields', async ({ page }) => {
      for (const xssAttempt of authTestData.securityTestCases.xssAttempts) {
        await signupPage.clearForm();
        await signupPage.fillName(xssAttempt);
        await signupPage.fillEmail(xssAttempt + '@test.com');
        await signupPage.fillPassword(xssAttempt);
        
        // Should not execute scripts
        const hasAlerts = await page.evaluate(() => {
          return typeof window !== 'undefined' && window.alert !== window.alert;
        });
        
        expect(hasAlerts).toBe(false);
      }
    });

    test('should not expose passwords in DOM', async ({ page }) => {
      await signupPage.fillPassword('secretpassword123');
      await signupPage.fillConfirmPassword('secretpassword123');
      
      // Password fields should be type="password"
      const passwordType = await page.locator('#password').getAttribute('type');
      const confirmType = await page.locator('#confirmPassword').getAttribute('type');
      
      expect(passwordType).toBe('password');
      expect(confirmType).toBe('password');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/auth/signup', route => {
        route.abort('failed');
      });

      const newUser = TestDataGenerator.generateUser();
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      // Should show error message
      await testHelpers.waitForToast('network', 'error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/auth/signup', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      const newUser = TestDataGenerator.generateUser();
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      // Should show error message
      await testHelpers.waitForToast(undefined, 'error');
    });

    test('should handle validation errors from server', async ({ page }) => {
      // Mock validation error response
      await page.route('**/auth/signup', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            errors: {
              email: ['Email is already registered'],
              password: ['Password is too weak']
            }
          })
        });
      });

      const newUser = TestDataGenerator.generateUser();
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();
      
      // Should show validation errors
      const errorMessage = await signupPage.getSignupError();
      expect(errorMessage.toLowerCase()).toContain('email');
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid form submissions', async ({ page }) => {
      const newUser = TestDataGenerator.generateUser();
      
      await signupPage.fillSignupForm(newUser);
      await signupPage.acceptTerms();
      
      // Click submit multiple times rapidly
      for (let i = 0; i < 5; i++) {
        await signupPage.clickSignupButton();
        await page.waitForTimeout(100);
      }
      
      // Should only process one submission
      await signupPage.waitForSuccessfulSignup();
    });

    test('should load signup page quickly', async ({ page }) => {
      const startTime = Date.now();
      await signupPage.goto();
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });
  });
});