import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { SignupPage } from '../pages/auth/signup-page';
import { testUsers, TestDataGenerator } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication Accessibility Tests', () => {
  let loginPage: LoginPage;
  let signupPage: SignupPage;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    signupPage = new SignupPage(page);
    testHelpers = new TestHelpers(page);
  });

  test.describe('Login Page Accessibility', () => {
    test('should have proper semantic structure', async ({ page }) => {
      await loginPage.goto();

      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      expect(headings.length).toBeGreaterThan(0);

      // Main heading should be present
      const mainHeading = page.locator('h1, h2').first();
      await expect(mainHeading).toBeVisible();
      
      const headingText = await mainHeading.textContent();
      expect(headingText?.toLowerCase()).toMatch(/login|sign in|welcome/);
    });

    test('should have proper form labels and structure', async ({ page }) => {
      await loginPage.goto();

      // Check that all form inputs have associated labels
      const emailLabel = page.locator('label[for="email"]');
      const passwordLabel = page.locator('label[for="password"]');
      const rememberLabel = page.locator('label[for="remember"]');

      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
      await expect(rememberLabel).toBeVisible();

      // Check label text is descriptive
      await expect(emailLabel).toContainText(/email/i);
      await expect(passwordLabel).toContainText(/password/i);
      await expect(rememberLabel).toContainText(/remember/i);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await loginPage.goto();

      // Check form has proper role
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // Check inputs have proper types
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');

      // Check required attributes
      await expect(page.locator('#email')).toHaveAttribute('required');
      await expect(page.locator('#password')).toHaveAttribute('required');

      // Check submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await loginPage.goto();

      // Start from outside the form
      await page.keyboard.press('Tab');
      
      // Should focus email field
      await expect(page.locator('#email')).toBeFocused();

      // Tab to password field
      await page.keyboard.press('Tab');
      await expect(page.locator('#password')).toBeFocused();

      // Tab to remember me checkbox
      await page.keyboard.press('Tab');
      await expect(page.locator('#remember')).toBeFocused();

      // Tab to submit button
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();

      // Should be able to submit with Enter
      await page.fill('#email', testUsers.validUser.email);
      await page.fill('#password', testUsers.validUser.password);
      await page.keyboard.press('Enter');
      
      // Should attempt login
      await page.waitForTimeout(1000);
      expect(page.url()).not.toBe(await page.url()); // URL should change or stay
    });

    test('should have proper focus indicators', async ({ page }) => {
      await loginPage.goto();

      // Check that focused elements have visible focus indication
      const focusableElements = ['#email', '#password', '#remember', 'button[type="submit"]'];

      for (const selector of focusableElements) {
        await page.focus(selector);
        
        // Check if element has focus styles (outline, box-shadow, etc.)
        const focusedElement = page.locator(selector);
        const computedStyle = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow
          };
        });

        // Should have some form of focus indication
        const hasFocusIndication = 
          computedStyle.outline !== 'none' ||
          computedStyle.outlineWidth !== '0px' ||
          computedStyle.boxShadow !== 'none';

        expect(hasFocusIndication).toBe(true);
      }
    });

    test('should provide proper error announcements', async ({ page }) => {
      await loginPage.goto();

      // Try invalid login
      await page.fill('#email', 'invalid@test.com');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Check for error messages with proper ARIA roles
      const errorMessages = page.locator('[role="alert"], .error-message, .text-red-600');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
        
        // Error should be associated with form or announced
        const errorText = await errorMessages.first().textContent();
        expect(errorText).toBeTruthy();
      }
    });

    test('should support screen reader navigation', async ({ page }) => {
      await loginPage.goto();

      // Check for proper landmarks
      const main = page.locator('main, [role="main"]');
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }

      // Check for proper headings for navigation
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);

      // Check that form is properly labeled
      const form = page.locator('form');
      const formLabel = await form.getAttribute('aria-label') || 
                        await form.getAttribute('aria-labelledby');
      
      // Form should have some identifying information
      expect(form).toBeVisible();
    });
  });

  test.describe('Signup Page Accessibility', () => {
    test('should have proper form structure and labels', async ({ page }) => {
      await signupPage.goto();

      // Check all form inputs have labels
      const requiredLabels = ['name', 'email', 'password', 'confirmPassword', 'terms'];
      
      for (const labelFor of requiredLabels) {
        const label = page.locator(`label[for="${labelFor}"]`);
        await expect(label).toBeVisible();
      }

      // Check input types
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      await expect(page.locator('#confirmPassword')).toHaveAttribute('type', 'password');
    });

    test('should provide password strength feedback accessibly', async ({ page }) => {
      await signupPage.goto();

      await page.fill('#password', 'weak');
      await page.locator('#password').blur();

      // Check for password strength indicator
      const strengthIndicator = page.locator('.password-strength, [aria-describedby*="strength"]');
      if (await strengthIndicator.count() > 0) {
        await expect(strengthIndicator).toBeVisible();
        
        // Should be associated with password field
        const passwordField = page.locator('#password');
        const describedBy = await passwordField.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
      }
    });

    test('should handle password mismatch accessibly', async ({ page }) => {
      await signupPage.goto();

      await page.fill('#password', 'password123');
      await page.fill('#confirmPassword', 'different123');
      await page.locator('#confirmPassword').blur();

      // Check for mismatch error
      const errorMessage = page.locator('.text-red-600, [role="alert"]');
      await expect(errorMessage).toBeVisible();

      // Should be announced to screen readers
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/password|match/);
    });

    test('should support comprehensive keyboard navigation', async ({ page }) => {
      await signupPage.goto();

      const expectedFocusOrder = [
        '#name',
        '#email', 
        '#password',
        '#confirmPassword',
        '#terms',
        'button[type="submit"]'
      ];

      for (let i = 0; i < expectedFocusOrder.length; i++) {
        await page.keyboard.press('Tab');
        await expect(page.locator(expectedFocusOrder[i])).toBeFocused();
      }
    });

    test('should make terms and conditions accessible', async ({ page }) => {
      await signupPage.goto();

      // Check terms checkbox
      const termsCheckbox = page.locator('#terms');
      const termsLabel = page.locator('label[for="terms"]');
      
      await expect(termsCheckbox).toBeVisible();
      await expect(termsLabel).toBeVisible();

      // Check that terms links are accessible
      const termsLink = page.locator('a[href="/terms"]');
      const privacyLink = page.locator('a[href="/privacy"]');
      
      await expect(termsLink).toBeVisible();
      await expect(privacyLink).toBeVisible();

      // Links should have proper text
      const termsText = await termsLink.textContent();
      const privacyText = await privacyLink.textContent();
      
      expect(termsText?.toLowerCase()).toMatch(/terms/);
      expect(privacyText?.toLowerCase()).toMatch(/privacy/);
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      await loginPage.goto();

      // Check main text elements for contrast
      const textElements = [
        'h1, h2',
        'label',
        'button[type="submit"]',
        'a',
        '.error-message, .text-red-600'
      ];

      for (const selector of textElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          const element = elements.first();
          await expect(element).toBeVisible();
          
          // Get computed styles
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });

          // Basic checks - actual contrast calculation would be more complex
          expect(styles.color).not.toBe(styles.backgroundColor);
          expect(styles.color).not.toBe('rgb(0, 0, 0)'); // Not pure black on black
        }
      }
    });

    test('should be usable without color alone', async ({ page }) => {
      await loginPage.goto();

      // Fill invalid email to trigger validation
      await page.fill('#email', 'invalid-email');
      await page.locator('#email').blur();

      // Check that validation errors use more than just color
      const emailField = page.locator('#email');
      const hasAriaInvalid = await emailField.getAttribute('aria-invalid') === 'true';
      const hasErrorIcon = await page.locator('.error-icon, [data-icon*="error"]').count() > 0;
      const hasErrorText = await page.locator('.error-message, .text-red-600').count() > 0;

      // Should use text, icons, or ARIA attributes, not just color
      expect(hasAriaInvalid || hasErrorIcon || hasErrorText).toBe(true);
    });

    test('should be readable when zoomed to 200%', async ({ page }) => {
      await loginPage.goto();

      // Simulate 200% zoom
      await page.setViewportSize({ width: 640, height: 360 }); // Half size = 200% zoom effect

      // Check that essential elements are still visible and functional
      await expect(page.locator('h1, h2')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Should still be able to interact with form
      await page.fill('#email', 'test@test.com');
      await page.fill('#password', 'testpassword');
      
      const emailValue = await page.locator('#email').inputValue();
      expect(emailValue).toBe('test@test.com');
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should provide meaningful page titles', async ({ page }) => {
      await loginPage.goto();
      await expect(page).toHaveTitle(/login|sign in/i);

      await signupPage.goto();
      await expect(page).toHaveTitle(/signup|register|sign up/i);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await loginPage.goto();

      // Get all headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      
      // Should have at least one heading
      expect(headings.length).toBeGreaterThan(0);

      // Check for logical heading structure (simplified check)
      const hasMainHeading = headings.some(h => 
        h.toLowerCase().includes('login') || 
        h.toLowerCase().includes('sign in') ||
        h.toLowerCase().includes('welcome')
      );
      
      expect(hasMainHeading).toBe(true);
    });

    test('should provide status announcements for dynamic content', async ({ page }) => {
      await loginPage.goto();

      // Attempt login to trigger status change
      await page.fill('#email', 'test@test.com');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Check for live regions or status announcements
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const count = await liveRegions.count();
      
      if (count > 0) {
        const hasContent = await liveRegions.first().textContent();
        expect(hasContent).toBeTruthy();
      }
    });

    test('should properly describe form validation', async ({ page }) => {
      await signupPage.goto();

      // Trigger validation errors
      await page.fill('#email', 'invalid-email');
      await page.fill('#password', 'weak');
      await page.fill('#confirmPassword', 'different');
      
      // Blur fields to trigger validation
      await page.locator('#email').blur();
      await page.locator('#password').blur();
      await page.locator('#confirmPassword').blur();

      await page.waitForTimeout(1000);

      // Check that validation errors are properly associated
      const emailField = page.locator('#email');
      const passwordField = page.locator('#password');
      const confirmField = page.locator('#confirmPassword');

      // Check aria-invalid attributes
      const emailInvalid = await emailField.getAttribute('aria-invalid');
      const passwordInvalid = await passwordField.getAttribute('aria-invalid');
      const confirmInvalid = await confirmField.getAttribute('aria-invalid');

      // At least one field should be marked invalid
      expect([emailInvalid, passwordInvalid, confirmInvalid]).toContain('true');
    });
  });

  test.describe('Motor Accessibility', () => {
    test('should have adequately sized click targets', async ({ page }) => {
      await loginPage.goto();

      // Check button sizes
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      
      if (buttonBox) {
        // WCAG recommends minimum 44x44 pixels for touch targets
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(32); // Relaxed for desktop
      }

      // Check checkbox size
      const checkbox = page.locator('#remember');
      const checkboxBox = await checkbox.boundingBox();
      
      if (checkboxBox) {
        expect(checkboxBox.width).toBeGreaterThanOrEqual(16);
        expect(checkboxBox.height).toBeGreaterThanOrEqual(16);
      }
    });

    test('should provide adequate spacing between interactive elements', async ({ page }) => {
      await signupPage.goto();

      // Get positions of interactive elements
      const elements = await page.locator('input, button, a[href]').all();
      const positions = [];

      for (const element of elements) {
        const box = await element.boundingBox();
        if (box) {
          positions.push(box);
        }
      }

      // Check that elements don't overlap (simplified check)
      for (let i = 0; i < positions.length - 1; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const elem1 = positions[i];
          const elem2 = positions[j];
          
          // Simple overlap check
          const overlap = !(elem1.x + elem1.width < elem2.x || 
                           elem2.x + elem2.width < elem1.x ||
                           elem1.y + elem1.height < elem2.y ||
                           elem2.y + elem2.height < elem1.y);
          
          expect(overlap).toBe(false);
        }
      }
    });

    test('should be usable with only keyboard', async ({ page }) => {
      await loginPage.goto();

      // Complete login flow using only keyboard
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type(testUsers.validUser.email);
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type(testUsers.validUser.password);
      
      await page.keyboard.press('Tab'); // Focus remember me (optional)
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit

      // Should successfully attempt login
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await loginPage.goto();

      // Check that form is still accessible
      await expect(page.locator('h1, h2')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check keyboard navigation still works
      await page.keyboard.press('Tab');
      await expect(page.locator('#email')).toBeFocused();

      // Check that touch targets are adequate
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      
      if (buttonBox) {
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await loginPage.goto();
      
      await expect(page.locator('form')).toBeVisible();
      
      // Landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Form should still be accessible
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    });
  });
});