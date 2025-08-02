import { Page, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestUser } from '../../fixtures/test-data';

/**
 * Page Object for the Login page
 */
export class LoginPage extends BasePage {
  // Page-specific selectors - updated to match actual React component structure
  private readonly selectors = {
    form: 'form',
    emailInput: '#email',
    passwordInput: '#password',
    loginButton: 'button[type="submit"]',
    signupLink: 'a[href="/auth/signup"]',
    forgotPasswordLink: 'a[href="/auth/forgot-password"]',
    rememberMeCheckbox: '#remember',
    errorMessage: '[role="alert"], .error-message, .text-red-600',
    loadingSpinner: '.loading, [data-loading="true"]',
    passwordToggle: 'button[type="button"]',
    cardTitle: 'h1, h2'
  };

  constructor(page: Page) {
    super(page);
  }

  protected getPath(): string {
    return '/auth/login';
  }

  protected async waitForPageSpecificElement(): Promise<void> {
    await expect(this.page.locator(this.selectors.form)).toBeVisible();
    await expect(this.page.locator(this.selectors.emailInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.passwordInput)).toBeVisible();
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string): Promise<void> {
    await this.page.fill(this.selectors.emailInput, email);
    await this.page.fill(this.selectors.passwordInput, password);
  }

  /**
   * Perform login with user credentials
   */
  async login(user: TestUser): Promise<void> {
    await this.fillCredentials(user.email, user.password);
    await this.clickLoginButton();
  }

  /**
   * Perform login with email and password strings
   */
  async loginWithCredentials(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.clickLoginButton();
  }

  /**
   * Click the login button
   */
  async clickLoginButton(): Promise<void> {
    await this.page.click(this.selectors.loginButton);
  }

  /**
   * Navigate to signup page
   */
  async goToSignup(): Promise<void> {
    await this.page.click(this.selectors.signupLink);
    await this.page.waitForURL('**/auth/signup**');
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.page.click(this.selectors.forgotPasswordLink);
    await this.page.waitForURL('**/auth/forgot-password**');
  }

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe(): Promise<void> {
    await this.page.check(this.selectors.rememberMeCheckbox);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.page.click(this.selectors.passwordToggle);
  }

  /**
   * Check if password is visible
   */
  async isPasswordVisible(): Promise<boolean> {
    const passwordType = await this.page.locator(this.selectors.passwordInput).getAttribute('type');
    return passwordType === 'text';
  }

  /**
   * Check if remember me is checked
   */
  async isRememberMeChecked(): Promise<boolean> {
    return await this.page.isChecked(this.selectors.rememberMeCheckbox);
  }

  /**
   * Get login error message
   */
  async getLoginError(): Promise<string> {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    await expect(errorElement).toBeVisible();
    return await errorElement.textContent() || '';
  }

  /**
   * Check if login form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    // Check for validation attributes or error messages
    const emailInvalid = await this.page.locator(this.selectors.emailInput).getAttribute('aria-invalid') === 'true';
    const passwordInvalid = await this.page.locator(this.selectors.passwordInput).getAttribute('aria-invalid') === 'true';
    const hasErrorMessages = await this.page.locator(this.selectors.errorMessage).count() > 0;
    
    return emailInvalid || passwordInvalid || hasErrorMessages;
  }

  /**
   * Get field validation error message
   */
  async getFieldError(field: 'email' | 'password'): Promise<string> {
    const fieldSelector = field === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    
    // Try multiple ways to find error messages
    const selectors = [
      `${fieldSelector} + .error-message`,
      `${fieldSelector} + .text-red-600`,
      `${fieldSelector}[aria-describedby] ~ [role="alert"]`,
      '.error-message',
      this.selectors.errorMessage
    ];
    
    for (const selector of selectors) {
      const errorElement = this.page.locator(selector);
      if (await errorElement.count() > 0) {
        const text = await errorElement.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    }
    
    return '';
  }

  /**
   * Check if login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.page.isDisabled(this.selectors.loginButton);
  }

  /**
   * Check if login is in progress
   */
  async isLoginInProgress(): Promise<boolean> {
    return await this.page.locator(this.selectors.loadingSpinner).count() > 0;
  }

  /**
   * Wait for successful login (redirect to dashboard)
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 });
  }

  /**
   * Perform complete login flow and wait for success
   */
  async performLogin(user: TestUser): Promise<void> {
    await this.login(user);
    await this.waitForSuccessfulLogin();
  }

  /**
   * Clear login form
   */
  async clearForm(): Promise<void> {
    await this.page.fill(this.selectors.emailInput, '');
    await this.page.fill(this.selectors.passwordInput, '');
  }

  /**
   * Check form validation states
   */
  async getFormValidationState(): Promise<{
    emailValid: boolean;
    passwordValid: boolean;
    formValid: boolean;
  }> {
    const emailValid = await this.page.locator(this.selectors.emailInput).getAttribute('aria-invalid') !== 'true';
    const passwordValid = await this.page.locator(this.selectors.passwordInput).getAttribute('aria-invalid') !== 'true';
    const formValid = !await this.isLoginButtonDisabled();

    return {
      emailValid,
      passwordValid,
      formValid
    };
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Tab to email field
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.emailInput)).toBeFocused();

    // Tab to password field
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.passwordInput)).toBeFocused();

    // Tab to remember me checkbox
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.rememberMeCheckbox)).toBeFocused();

    // Tab to login button
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.loginButton)).toBeFocused();
  }

  /**
   * Submit form using Enter key
   */
  async submitWithEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  /**
   * Check accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check form has proper labels
    await expect(this.page.locator('label[for="email"]')).toBeVisible();
    await expect(this.page.locator('label[for="password"]')).toBeVisible();

    // Check inputs have proper ARIA attributes
    await expect(this.page.locator(this.selectors.emailInput)).toHaveAttribute('type', 'email');
    await expect(this.page.locator(this.selectors.passwordInput)).toHaveAttribute('type', 'password');

    // Check button has proper type
    await expect(this.page.locator(this.selectors.loginButton)).toHaveAttribute('type', 'submit');
  }

  /**
   * Test different login scenarios
   */
  async testInvalidCredentials(): Promise<void> {
    await this.loginWithCredentials('invalid@test.com', 'wrongpassword');
    
    // Wait for either error message or toast notification
    try {
      await expect(this.page.locator(this.selectors.errorMessage)).toBeVisible({ timeout: 5000 });
    } catch {
      // Alternative: check for toast notifications
      await expect(this.page.locator('.toast, [data-sonner-toast]')).toBeVisible({ timeout: 5000 });
    }
  }

  async testEmptyCredentials(): Promise<void> {
    await this.clickLoginButton();
    await expect(this.isLoginButtonDisabled()).resolves.toBe(true);
  }

  async testValidEmailFormat(): Promise<void> {
    await this.page.fill(this.selectors.emailInput, 'invalid-email');
    await this.page.locator(this.selectors.emailInput).blur(); // Trigger validation
    
    // Check for browser validation or aria-invalid attribute
    const isInvalid = await this.page.locator(this.selectors.emailInput).getAttribute('aria-invalid') === 'true' ||
                     await this.page.locator(this.selectors.emailInput).evaluate(el => !(el as HTMLInputElement).validity.valid);
    
    expect(isInvalid).toBeTruthy();
  }
}