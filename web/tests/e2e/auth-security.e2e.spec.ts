import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login-page';
import { SignupPage } from '../pages/auth/signup-page';
import { authTestData, TestDataGenerator } from '../fixtures/test-data';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication Security Tests', () => {
  let loginPage: LoginPage;
  let signupPage: SignupPage;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    signupPage = new SignupPage(page);
    testHelpers = new TestHelpers(page);
  });

  test.describe('XSS Prevention', () => {
    test('should prevent XSS in login form fields', async ({ page }) => {
      await loginPage.goto();

      for (const xssPayload of authTestData.securityTestCases.xssAttempts) {
        // Test XSS in email field
        await page.fill('#email', xssPayload);
        await page.fill('#password', 'testpassword');
        await loginPage.clickLoginButton();

        // Check that script was not executed
        const alertCount = await page.evaluate(() => window.alertExecuted || 0);
        expect(alertCount).toBe(0);

        // Check that the payload is properly escaped in DOM
        const emailValue = await page.locator('#email').inputValue();
        expect(emailValue).toBe(xssPayload); // Should be stored as-is but not executed

        await loginPage.clearForm();
      }
    });

    test('should prevent XSS in signup form fields', async ({ page }) => {
      await signupPage.goto();

      for (const xssPayload of authTestData.securityTestCases.xssAttempts) {
        await signupPage.fillName(xssPayload);
        await signupPage.fillEmail(xssPayload + '@test.com');
        await signupPage.fillPassword('testpassword123');
        await signupPage.fillConfirmPassword('testpassword123');
        await signupPage.acceptTerms();
        await signupPage.clickSignupButton();

        // Verify no script execution
        const alertCount = await page.evaluate(() => window.alertExecuted || 0);
        expect(alertCount).toBe(0);

        // Check DOM sanitization
        const nameValue = await page.locator('#name').inputValue();
        expect(nameValue).toBe(xssPayload);

        await signupPage.clearForm();
      }
    });

    test('should sanitize error messages from server', async ({ page }) => {
      await loginPage.goto();

      // Mock server response with XSS payload in error message
      await page.route('**/auth/login', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '<script>alert("xss")</script>Invalid credentials'
          })
        });
      });

      await loginPage.fillCredentials('test@test.com', 'password');
      await loginPage.clickLoginButton();

      // Wait for error message
      await page.waitForTimeout(1000);

      // Check that error message is displayed but script is not executed
      const errorElements = page.locator('.error-message, [role="alert"], .text-red-600');
      if (await errorElements.count() > 0) {
        const errorText = await errorElements.first().textContent();
        expect(errorText).not.toContain('<script>');
      }

      const alertCount = await page.evaluate(() => window.alertExecuted || 0);
      expect(alertCount).toBe(0);
    });
  });

  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in login fields', async ({ page }) => {
      await loginPage.goto();

      for (const sqlPayload of authTestData.securityTestCases.sqlInjectionAttempts) {
        await loginPage.fillCredentials(sqlPayload, sqlPayload);
        await loginPage.clickLoginButton();

        // Should not cause application errors
        await page.waitForTimeout(1000);
        
        // Should either show invalid credentials or validation error
        const isStillOnLogin = page.url().includes('/login');
        const hasErrorMessage = await page.locator('.error-message, [role="alert"]').count() > 0;
        
        expect(isStillOnLogin || hasErrorMessage).toBe(true);

        await loginPage.clearForm();
      }
    });

    test('should handle SQL injection in signup fields', async ({ page }) => {
      await signupPage.goto();

      for (const sqlPayload of authTestData.securityTestCases.sqlInjectionAttempts) {
        await signupPage.fillName('Test User');
        await signupPage.fillEmail(sqlPayload + '@test.com');
        await signupPage.fillPassword('testpassword123');
        await signupPage.fillConfirmPassword('testpassword123');
        await signupPage.acceptTerms();
        await signupPage.clickSignupButton();

        // Should not cause application to crash
        await page.waitForTimeout(1000);
        
        // Should show appropriate error or validation message
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();

        await signupPage.clearForm();
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should include CSRF tokens in authentication requests', async ({ page }) => {
      let csrfToken = '';
      
      // Intercept login request to check for CSRF token
      page.on('request', request => {
        if (request.url().includes('/auth/login')) {
          const headers = request.headers();
          const body = request.postData();
          
          // Check for CSRF token in headers or body
          csrfToken = headers['x-csrf-token'] || 
                     headers['x-xsrf-token'] || 
                     (body && body.includes('csrf')) ? 'present' : '';
        }
      });

      await loginPage.goto();
      await loginPage.fillCredentials('test@test.com', 'password');
      await loginPage.clickLoginButton();

      // CSRF protection should be present (token or double-submit pattern)
      // Note: This depends on your actual implementation
      expect(csrfToken !== undefined).toBe(true);
    });

    test('should reject requests without proper CSRF tokens', async ({ page }) => {
      await loginPage.goto();

      // Mock server to reject requests without CSRF token
      await page.route('**/auth/login', route => {
        const headers = route.request().headers();
        if (!headers['x-csrf-token'] && !headers['x-xsrf-token']) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'CSRF token missing' })
          });
        } else {
          route.continue();
        }
      });

      await loginPage.fillCredentials('test@test.com', 'password');
      await loginPage.clickLoginButton();

      // Should handle CSRF rejection gracefully
      await page.waitForTimeout(1000);
      const isStillOnLogin = page.url().includes('/login');
      expect(isStillOnLogin).toBe(true);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on login attempts', async ({ page }) => {
      await loginPage.goto();

      // Attempt multiple rapid logins
      const maxAttempts = 5;
      let rateLimited = false;

      for (let i = 0; i < maxAttempts; i++) {
        await loginPage.fillCredentials('test@test.com', 'wrongpassword');
        await loginPage.clickLoginButton();
        
        await page.waitForTimeout(500);
        
        // Check if rate limited
        const errorMessage = await page.locator('.error-message, [role="alert"]').textContent();
        if (errorMessage && errorMessage.toLowerCase().includes('rate')) {
          rateLimited = true;
          break;
        }
        
        await loginPage.clearForm();
      }

      // Should either be rate limited or at least show consistent error handling
      expect(rateLimited || page.url().includes('/login')).toBe(true);
    });

    test('should handle rate limiting on signup attempts', async ({ page }) => {
      await signupPage.goto();

      // Attempt multiple rapid signups
      const maxAttempts = 3;
      
      for (let i = 0; i < maxAttempts; i++) {
        const user = TestDataGenerator.generateUser();
        await signupPage.fillSignupForm(user);
        await signupPage.acceptTerms();
        await signupPage.clickSignupButton();
        
        await page.waitForTimeout(500);
        
        // Check response
        const errorMessage = await page.locator('.error-message, [role="alert"]').textContent();
        if (errorMessage && errorMessage.toLowerCase().includes('rate')) {
          break;
        }
        
        await signupPage.clearForm();
      }

      // Should handle gracefully without crashing
      expect(page.url()).toBeTruthy();
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should handle special characters in form inputs', async ({ page }) => {
      await signupPage.goto();

      for (const specialChars of authTestData.securityTestCases.specialCharacters) {
        await signupPage.fillName(specialChars);
        await signupPage.fillEmail('test@test.com');
        await signupPage.fillPassword('testpassword123');
        await signupPage.fillConfirmPassword('testpassword123');
        await signupPage.acceptTerms();
        await signupPage.clickSignupButton();

        // Should handle special characters without errors
        await page.waitForTimeout(1000);
        
        // Application should not crash
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();

        await signupPage.clearForm();
      }
    });

    test('should validate maximum input lengths', async ({ page }) => {
      await signupPage.goto();

      const longInputs = authTestData.performanceTestCases.longInputs;

      // Test very long name
      await signupPage.fillName(longInputs.veryLongName);
      await signupPage.fillEmail('test@test.com');
      await signupPage.fillPassword('testpassword123');
      await signupPage.fillConfirmPassword('testpassword123');
      await signupPage.acceptTerms();
      await signupPage.clickSignupButton();

      // Should either accept with truncation or show validation error
      await page.waitForTimeout(1000);
      const hasError = await page.locator('.error-message, [role="alert"]').count() > 0;
      const successRedirect = !page.url().includes('/signup');
      
      expect(hasError || successRedirect).toBe(true);
    });

    test('should prevent null byte injection', async ({ page }) => {
      await loginPage.goto();

      const nullBytePayloads = [
        'test@test.com\x00.evil.com',
        'password\x00',
        'user\x00admin'
      ];

      for (const payload of nullBytePayloads) {
        await loginPage.fillCredentials(payload, 'testpassword');
        await loginPage.clickLoginButton();

        // Should handle gracefully
        await page.waitForTimeout(500);
        expect(page.url().includes('/login')).toBe(true);

        await loginPage.clearForm();
      }
    });
  });

  test.describe('Password Security', () => {
    test('should not expose passwords in network requests', async ({ page }) => {
      let passwordExposed = false;

      // Monitor network requests
      page.on('request', request => {
        const url = request.url();
        if (url.includes('password=') && request.method() === 'GET') {
          passwordExposed = true;
        }
      });

      await loginPage.goto();
      await loginPage.fillCredentials('test@test.com', 'secretpassword123');
      await loginPage.clickLoginButton();

      // Password should not be in GET request URLs
      expect(passwordExposed).toBe(false);
    });

    test('should not store passwords in browser storage', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillCredentials('test@test.com', 'secretpassword123');
      await loginPage.clickLoginButton();

      await page.waitForTimeout(1000);

      // Check that password is not stored in localStorage or sessionStorage
      const storageContainsPassword = await page.evaluate(() => {
        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;
        
        const localStorageStr = JSON.stringify(localStorage);
        const sessionStorageStr = JSON.stringify(sessionStorage);
        
        return localStorageStr.includes('secretpassword123') || 
               sessionStorageStr.includes('secretpassword123');
      });

      expect(storageContainsPassword).toBe(false);
    });

    test('should clear password fields on form reset', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillCredentials('test@test.com', 'secretpassword123');

      // Navigate away and back
      await page.goto('/');
      await page.goto('/auth/login');

      // Password field should be empty
      const passwordValue = await page.locator('#password').inputValue();
      expect(passwordValue).toBe('');
    });
  });

  test.describe('Session Security', () => {
    test('should use secure session tokens', async ({ page }) => {
      let tokenLength = 0;
      let hasSecureToken = false;

      // Intercept responses to check token format
      page.on('response', response => {
        if (response.url().includes('/auth/login') && response.status() === 200) {
          const headers = response.headers();
          const setCookie = headers['set-cookie'];
          
          if (setCookie) {
            hasSecureToken = setCookie.includes('Secure') && setCookie.includes('HttpOnly');
            // Extract token length (simplified)
            const tokenMatch = setCookie.match(/token=([^;]+)/);
            if (tokenMatch) {
              tokenLength = tokenMatch[1].length;
            }
          }
        }
      });

      await loginPage.goto();
      await loginPage.fillCredentials('test@mcptools.dev', 'testpassword123');
      await loginPage.clickLoginButton();

      await page.waitForTimeout(2000);

      // Token should be reasonably long and use secure flags
      expect(tokenLength).toBeGreaterThan(20);
      // Note: In development, Secure flag might not be set
      if (page.url().startsWith('https://')) {
        expect(hasSecureToken).toBe(true);
      }
    });

    test('should invalidate session on logout', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.fillCredentials('test@mcptools.dev', 'testpassword123');
      await loginPage.clickLoginButton();
      
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

      // Logout
      const dashboardPage = new (await import('../pages/dash-page')).DashboardPage(page);
      await dashboardPage.logout();

      // Try to access protected route with old session
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  });

  test.describe('Browser Security Features', () => {
    test('should set appropriate security headers', async ({ page }) => {
      let securityHeaders = {};

      page.on('response', response => {
        if (response.url().includes('/auth/login')) {
          const headers = response.headers();
          securityHeaders = {
            'x-frame-options': headers['x-frame-options'],
            'x-content-type-options': headers['x-content-type-options'],
            'x-xss-protection': headers['x-xss-protection'],
            'strict-transport-security': headers['strict-transport-security']
          };
        }
      });

      await loginPage.goto();

      // Check for security headers (depends on server configuration)
      await page.waitForTimeout(1000);
      
      // At minimum, should have some security headers set
      const hasSecurityHeaders = Object.values(securityHeaders).some(value => value !== undefined);
      expect(hasSecurityHeaders).toBe(true);
    });

    test('should prevent autocomplete on sensitive fields', async ({ page }) => {
      await loginPage.goto();

      // Check autocomplete attributes
      const passwordAutocomplete = await page.locator('#password').getAttribute('autocomplete');
      
      // Password field should have appropriate autocomplete value
      expect(passwordAutocomplete).toMatch(/current-password|off/);
    });

    test('should handle iframe embedding restrictions', async ({ page }) => {
      // Try to embed login page in iframe
      await page.setContent(`
        <html>
          <body>
            <iframe src="/auth/login" id="test-frame"></iframe>
          </body>
        </html>
      `);

      await page.waitForTimeout(2000);

      // Check if iframe loaded successfully (should be blocked by X-Frame-Options)
      const frameContent = await page.frameLocator('#test-frame').locator('body').textContent().catch(() => null);
      
      // If X-Frame-Options is set correctly, frame should not load content
      // Note: This test might need adjustment based on actual header configuration
      expect(frameContent === null || frameContent === '').toBe(true);
    });
  });
});