import { test, expect, devices } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { SignupPage } from '../pages/auth/signup-page';
import { testUsers, TestDataGenerator } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

// Mobile device configurations for testing
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S8', device: devices['Galaxy S8'] },
  { name: 'iPad', device: devices['iPad'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

// Custom mobile viewports for edge cases
const customViewports = [
  { name: 'Small Phone', width: 320, height: 568 }, // iPhone SE (1st gen)
  { name: 'Large Phone', width: 414, height: 896 }, // iPhone XS Max
  { name: 'Tablet Portrait', width: 768, height: 1024 }, // iPad
  { name: 'Tablet Landscape', width: 1024, height: 768 }, // iPad Landscape
  { name: 'Small Tablet', width: 600, height: 800 }, // Small tablet
];

test.describe('Mobile Authentication Tests', () => {
  let loginPage: LoginPage;
  let signupPage: SignupPage;
  let testHelpers: TestHelpers;

  // Test across multiple mobile devices
  for (const { name, device } of mobileDevices) {
    test.describe(`${name} Device Tests`, () => {
      test.use({ ...device });

      test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        signupPage = new SignupPage(page);
        testHelpers = new TestHelpers(page);
      });

      test('should display login form correctly on mobile', async ({ page }) => {
        await loginPage.goto();

        // Check that essential elements are visible and properly sized
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check that form elements are properly sized for touch
        const submitButton = page.locator('button[type="submit"]');
        const buttonBox = await submitButton.boundingBox();
        
        if (buttonBox) {
          // WCAG recommends minimum 44x44 pixels for touch targets
          expect(buttonBox.width).toBeGreaterThanOrEqual(44);
          expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        }

        // Check that text is readable
        const heading = page.locator('h1, h2').first();
        const headingStyles = await heading.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight
          };
        });

        // Font size should be at least 16px for mobile readability
        const fontSize = parseInt(headingStyles.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(16);
      });

      test('should handle mobile login interaction', async ({ page }) => {
        await loginPage.goto();

        // Test touch interactions
        await page.tap('#email');
        await page.fill('#email', testUsers.validUser.email);
        
        await page.tap('#password');
        await page.fill('#password', testUsers.validUser.password);
        
        await page.tap('button[type="submit"]');

        // Should successfully attempt login
        await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
      });

      test('should display signup form correctly on mobile', async ({ page }) => {
        await signupPage.goto();

        // Check form visibility and layout
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('#name')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();
        await expect(page.locator('#terms')).toBeVisible();

        // Check that form doesn't overflow viewport
        const form = page.locator('form');
        const formBox = await form.boundingBox();
        const viewport = page.viewportSize();
        
        if (formBox && viewport) {
          expect(formBox.width).toBeLessThanOrEqual(viewport.width);
        }
      });

      test('should handle mobile signup interaction', async ({ page }) => {
        await signupPage.goto();

        const newUser = TestDataGenerator.generateUser();

        // Test touch interactions
        await page.tap('#name');
        await page.fill('#name', `${newUser.firstName} ${newUser.lastName}`);
        
        await page.tap('#email');
        await page.fill('#email', newUser.email);
        
        await page.tap('#password');
        await page.fill('#password', newUser.password);
        
        await page.tap('#confirmPassword');
        await page.fill('#confirmPassword', newUser.password);
        
        await page.tap('#terms');
        await page.tap('button[type="submit"]');

        // Should attempt signup
        await page.waitForTimeout(2000);
        expect(page.url()).toBeTruthy();
      });

      test('should handle virtual keyboard properly', async ({ page }) => {
        await loginPage.goto();

        // Focus on email field - this should bring up virtual keyboard
        await page.tap('#email');
        await expect(page.locator('#email')).toBeFocused();

        // Check that the form is still accessible with virtual keyboard
        await page.fill('#email', 'test@example.com');
        
        // Move to password field
        await page.tap('#password');
        await expect(page.locator('#password')).toBeFocused();
        
        await page.fill('#password', 'testpassword');

        // Submit button should still be accessible
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();
        
        const isClickable = await submitButton.isEnabled();
        expect(isClickable).toBe(true);
      });

      test('should show appropriate mobile validation errors', async ({ page }) => {
        await loginPage.goto();

        // Try invalid email
        await page.tap('#email');
        await page.fill('#email', 'invalid-email');
        await page.tap('#password'); // Move focus to trigger validation

        // Check for validation feedback
        const hasValidationError = await page.locator('[role="alert"], .error-message, .text-red-600').count() > 0 ||
                                   await page.locator('#email').getAttribute('aria-invalid') === 'true';
        
        expect(hasValidationError).toBe(true);
      });
    });
  }

  // Test custom viewports for edge cases
  for (const viewport of customViewports) {
    test.describe(`${viewport.name} Viewport Tests`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        loginPage = new LoginPage(page);
        signupPage = new SignupPage(page);
        testHelpers = new TestHelpers(page);
      });

      test('should adapt login form to viewport size', async ({ page }) => {
        await loginPage.goto();

        // Form should be visible and usable
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check that form fits within viewport
        const form = page.locator('form');
        const formBox = await form.boundingBox();
        
        if (formBox) {
          expect(formBox.width).toBeLessThanOrEqual(viewport.width + 50); // 50px tolerance for padding
          expect(formBox.x).toBeGreaterThanOrEqual(-25); // Not too far off-screen
        }
      });

      test('should handle signup form on small screens', async ({ page }) => {
        await signupPage.goto();

        // All form elements should be accessible
        const formElements = ['#name', '#email', '#password', '#confirmPassword', '#terms', 'button[type="submit"]'];
        
        for (const selector of formElements) {
          await expect(page.locator(selector)).toBeVisible();
          
          // Element should be clickable
          const element = page.locator(selector);
          const box = await element.boundingBox();
          
          if (box) {
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
          }
        }
      });

      test('should maintain usability when scrolling is required', async ({ page }) => {
        await signupPage.goto();

        // If form is taller than viewport, check scrolling behavior
        const form = page.locator('form');
        const formBox = await form.boundingBox();
        
        if (formBox && formBox.height > viewport.height) {
          // Should be able to scroll to see all form elements
          await page.locator('#name').scrollIntoViewIfNeeded();
          await expect(page.locator('#name')).toBeVisible();
          
          await page.locator('button[type="submit"]').scrollIntoViewIfNeeded();
          await expect(page.locator('button[type="submit"]')).toBeVisible();
        }
      });
    });
  }

  test.describe('Mobile UX and Interactions', () => {
    test.use(devices['iPhone 12']);

    test.beforeEach(async ({ page }) => {
      loginPage = new LoginPage(page);
      signupPage = new SignupPage(page);
      testHelpers = new TestHelpers(page);
    });

    test('should handle touch gestures appropriately', async ({ page }) => {
      await loginPage.goto();

      // Test tap interactions
      await page.tap('#email');
      await expect(page.locator('#email')).toBeFocused();

      // Test double tap (should not cause issues)
      await page.tap('#email');
      await page.tap('#email');
      await expect(page.locator('#email')).toBeFocused();

      // Test swipe gestures don't interfere with form
      const emailField = page.locator('#email');
      await emailField.hover();
      
      // Simulate swipe by mouse drag
      await page.mouse.move(200, 300);
      await page.mouse.down();
      await page.mouse.move(200, 250);
      await page.mouse.up();

      // Form should still be functional
      await page.fill('#email', 'test@example.com');
      const value = await page.locator('#email').inputValue();
      expect(value).toBe('test@example.com');
    });

    test('should show appropriate mobile loading states', async ({ page }) => {
      await loginPage.goto();
      
      await page.fill('#email', testUsers.validUser.email);
      await page.fill('#password', testUsers.validUser.password);
      
      await page.tap('button[type="submit"]');

      // Should show loading state
      const button = page.locator('button[type="submit"]');
      const buttonText = await button.textContent();
      
      expect(buttonText?.toLowerCase()).toContain('signing');
    });

    test('should handle mobile navigation properly', async ({ page }) => {
      await loginPage.goto();

      // Test navigation to signup
      await page.tap('a[href="/auth/signup"]');
      await expect(page).toHaveURL(/signup/);

      // Test back navigation
      await page.goBack();
      await expect(page).toHaveURL(/login/);

      // Form should still be functional after navigation
      await page.fill('#email', 'test@example.com');
      const value = await page.locator('#email').inputValue();
      expect(value).toBe('test@example.com');
    });

    test('should display mobile-appropriate error messages', async ({ page }) => {
      await loginPage.goto();

      await page.fill('#email', 'invalid@test.com');
      await page.fill('#password', 'wrongpassword');
      await page.tap('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Error message should be visible and readable on mobile
      const errorElements = page.locator('[role="alert"], .error-message, .text-red-600, .toast');
      if (await errorElements.count() > 0) {
        const errorElement = errorElements.first();
        await expect(errorElement).toBeVisible();
        
        // Error should not be cut off
        const errorBox = await errorElement.boundingBox();
        const viewport = page.viewportSize();
        
        if (errorBox && viewport) {
          expect(errorBox.x + errorBox.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      await loginPage.goto();

      // Portrait mode first
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('form')).toBeVisible();
      
      await page.fill('#email', 'test@example.com');
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Form should still be visible and functional
      await expect(page.locator('form')).toBeVisible();
      
      // Data should be preserved
      const emailValue = await page.locator('#email').inputValue();
      expect(emailValue).toBe('test@example.com');
      
      // Should be able to continue interaction
      await page.fill('#password', 'testpassword');
      const passwordValue = await page.locator('#password').inputValue();
      expect(passwordValue).toBe('testpassword');
    });

    test('should support mobile password manager integration', async ({ page }) => {
      await loginPage.goto();

      // Check that fields have appropriate autocomplete attributes
      const emailAutocomplete = await page.locator('#email').getAttribute('autocomplete');
      const passwordAutocomplete = await page.locator('#password').getAttribute('autocomplete');

      expect(emailAutocomplete).toMatch(/email|username/i);
      expect(passwordAutocomplete).toMatch(/current-password|password/i);

      // Fields should be properly labeled for password managers
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
    });

    test('should maintain performance on mobile devices', async ({ page }) => {
      const startTime = Date.now();
      
      await loginPage.goto();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load reasonably quickly on mobile
      expect(loadTime).toBeLessThan(10000); // 10 seconds max for mobile

      // Interactions should be responsive
      const interactionStart = Date.now();
      await page.tap('#email');
      await page.fill('#email', 'test@example.com');
      const interactionTime = Date.now() - interactionStart;
      
      expect(interactionTime).toBeLessThan(1000); // 1 second for basic interaction
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.use(devices['iPhone 12']);

    test.beforeEach(async ({ page }) => {
      loginPage = new LoginPage(page);
      signupPage = new SignupPage(page);
    });

    test('should maintain touch target sizes for accessibility', async ({ page }) => {
      await loginPage.goto();

      const touchTargets = ['button[type="submit"]', '#remember', 'a[href="/auth/signup"]'];
      
      for (const selector of touchTargets) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          const box = await element.boundingBox();
          
          if (box) {
            // WCAG AAA recommends 44x44 pixels minimum
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('should support screen reader navigation on mobile', async ({ page }) => {
      await loginPage.goto();

      // Check for proper headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);

      // Check for proper form labels
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();

      // Check for proper button labeling
      const submitButton = page.locator('button[type="submit"]');
      const buttonText = await submitButton.textContent();
      expect(buttonText).toBeTruthy();
      expect(buttonText?.length).toBeGreaterThan(2);
    });

    test('should provide adequate color contrast on mobile', async ({ page }) => {
      await loginPage.goto();

      // This is a simplified test - in practice, you'd use automated accessibility tools
      const textElements = ['h1, h2', 'label', 'button[type="submit"]'];
      
      for (const selector of textElements) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor
            };
          });

          // Basic check that text color differs from background
          expect(styles.color).not.toBe(styles.backgroundColor);
        }
      }
    });
  });
});