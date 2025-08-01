import { Page, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestUser } from '../../fixtures/test-data';

/**
 * Page Object for the Signup page
 */
export class SignupPage extends BasePage {
  private readonly selectors = {
    form: '[data-testid="signup-form"]',
    firstNameInput: '[data-testid="first-name-input"]',
    lastNameInput: '[data-testid="last-name-input"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    confirmPasswordInput: '[data-testid="confirm-password-input"]',
    termsCheckbox: '[data-testid="terms-checkbox"]',
    signupButton: '[data-testid="signup-button"]',
    loginLink: '[data-testid="login-link"]',
    errorMessage: '[data-testid="signup-error"]',
    successMessage: '[data-testid="signup-success"]',
    loadingSpinner: '[data-testid="signup-loading"]',
    passwordStrengthIndicator: '[data-testid="password-strength"]'
  };

  constructor(page: Page) {
    super(page);
  }

  protected getPath(): string {
    return '/auth/signup';
  }

  protected async waitForPageSpecificElement(): Promise<void> {
    await expect(this.page.locator(this.selectors.form)).toBeVisible();
  }

  /**
   * Fill in all signup form fields
   */
  async fillSignupForm(user: TestUser): Promise<void> {
    await this.page.fill(this.selectors.firstNameInput, user.firstName);
    await this.page.fill(this.selectors.lastNameInput, user.lastName);
    await this.page.fill(this.selectors.emailInput, user.email);
    await this.page.fill(this.selectors.passwordInput, user.password);
    await this.page.fill(this.selectors.confirmPasswordInput, user.password);
  }

  /**
   * Fill individual form fields
   */
  async fillFirstName(firstName: string): Promise<void> {
    await this.page.fill(this.selectors.firstNameInput, firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.page.fill(this.selectors.lastNameInput, lastName);
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.fill(this.selectors.emailInput, email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.page.fill(this.selectors.confirmPasswordInput, confirmPassword);
  }

  /**
   * Accept terms and conditions
   */
  async acceptTerms(): Promise<void> {
    await this.page.check(this.selectors.termsCheckbox);
  }

  /**
   * Check if terms are accepted
   */
  async areTermsAccepted(): Promise<boolean> {
    return await this.page.isChecked(this.selectors.termsCheckbox);
  }

  /**
   * Click signup button
   */
  async clickSignupButton(): Promise<void> {
    await this.page.click(this.selectors.signupButton);
  }

  /**
   * Navigate to login page
   */
  async goToLogin(): Promise<void> {
    await this.page.click(this.selectors.loginLink);
    await this.page.waitForURL('**/auth/login**');
  }

  /**
   * Perform complete signup flow
   */
  async signup(user: TestUser): Promise<void> {
    await this.fillSignupForm(user);
    await this.acceptTerms();
    await this.clickSignupButton();
  }

  /**
   * Get signup error message
   */
  async getSignupError(): Promise<string> {
    const errorElement = this.page.locator(this.selectors.errorMessage);
    await expect(errorElement).toBeVisible();
    return await errorElement.textContent() || '';
  }

  /**
   * Get signup success message
   */
  async getSuccessMessage(): Promise<string> {
    const successElement = this.page.locator(this.selectors.successMessage);
    await expect(successElement).toBeVisible();
    return await successElement.textContent() || '';
  }

  /**
   * Check if signup is in progress
   */
  async isSignupInProgress(): Promise<boolean> {
    return await this.page.locator(this.selectors.loadingSpinner).count() > 0;
  }

  /**
   * Check if signup button is disabled
   */
  async isSignupButtonDisabled(): Promise<boolean> {
    return await this.page.isDisabled(this.selectors.signupButton);
  }

  /**
   * Get field validation error
   */
  async getFieldError(field: 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword'): Promise<string> {
    const fieldSelectorMap = {
      firstName: this.selectors.firstNameInput,
      lastName: this.selectors.lastNameInput,
      email: this.selectors.emailInput,
      password: this.selectors.passwordInput,
      confirmPassword: this.selectors.confirmPasswordInput
    };

    const fieldSelector = fieldSelectorMap[field];
    const errorSelector = `${fieldSelector} + [data-testid*="error"]`;
    
    const errorElement = this.page.locator(errorSelector);
    
    if (await errorElement.count() > 0) {
      return await errorElement.textContent() || '';
    }

    return '';
  }

  /**
   * Check form validation state
   */
  async getFormValidationState(): Promise<{
    firstNameValid: boolean;
    lastNameValid: boolean;
    emailValid: boolean;
    passwordValid: boolean;
    confirmPasswordValid: boolean;
    termsAccepted: boolean;
    formValid: boolean;
  }> {
    const firstNameValid = !(await this.page.locator(`${this.selectors.firstNameInput}[aria-invalid="true"]`).count() > 0);
    const lastNameValid = !(await this.page.locator(`${this.selectors.lastNameInput}[aria-invalid="true"]`).count() > 0);
    const emailValid = !(await this.page.locator(`${this.selectors.emailInput}[aria-invalid="true"]`).count() > 0);
    const passwordValid = !(await this.page.locator(`${this.selectors.passwordInput}[aria-invalid="true"]`).count() > 0);
    const confirmPasswordValid = !(await this.page.locator(`${this.selectors.confirmPasswordInput}[aria-invalid="true"]`).count() > 0);
    const termsAccepted = await this.areTermsAccepted();
    const formValid = !await this.isSignupButtonDisabled();

    return {
      firstNameValid,
      lastNameValid,
      emailValid,
      passwordValid,
      confirmPasswordValid,
      termsAccepted,
      formValid
    };
  }

  /**
   * Get password strength indication
   */
  async getPasswordStrength(): Promise<string> {
    const strengthElement = this.page.locator(this.selectors.passwordStrengthIndicator);
    
    if (await strengthElement.count() > 0) {
      return await strengthElement.textContent() || '';
    }

    return '';
  }

  /**
   * Test password confirmation matching
   */
  async testPasswordMismatch(): Promise<void> {
    await this.fillPassword('password123');
    await this.fillConfirmPassword('differentpassword');
    await this.page.locator(this.selectors.confirmPasswordInput).blur();
    
    await expect(this.page.locator(this.selectors.confirmPasswordInput)).toHaveAttribute('aria-invalid', 'true');
  }

  /**
   * Test email format validation
   */
  async testInvalidEmailFormat(): Promise<void> {
    await this.fillEmail('invalid-email-format');
    await this.page.locator(this.selectors.emailInput).blur();
    
    await expect(this.page.locator(this.selectors.emailInput)).toHaveAttribute('aria-invalid', 'true');
  }

  /**
   * Test password strength requirements
   */
  async testWeakPassword(): Promise<void> {
    await this.fillPassword('123');
    await this.page.locator(this.selectors.passwordInput).blur();
    
    const strength = await this.getPasswordStrength();
    expect(strength.toLowerCase()).toContain('weak');
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Tab through all form fields
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.firstNameInput)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.lastNameInput)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.emailInput)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.passwordInput)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.confirmPasswordInput)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.termsCheckbox)).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(this.selectors.signupButton)).toBeFocused();
  }

  /**
   * Test form submission with Enter key
   */
  async submitWithEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  /**
   * Clear the entire form
   */
  async clearForm(): Promise<void> {
    await this.page.fill(this.selectors.firstNameInput, '');
    await this.page.fill(this.selectors.lastNameInput, '');
    await this.page.fill(this.selectors.emailInput, '');
    await this.page.fill(this.selectors.passwordInput, '');
    await this.page.fill(this.selectors.confirmPasswordInput, '');
    await this.page.uncheck(this.selectors.termsCheckbox);
  }

  /**
   * Wait for successful signup (redirect or success message)
   */
  async waitForSuccessfulSignup(): Promise<void> {
    try {
      // Either success message appears
      await expect(this.page.locator(this.selectors.successMessage)).toBeVisible({ timeout: 5000 });
    } catch {
      // Or redirect to login/dashboard
      await this.page.waitForURL('**/auth/login**', { timeout: 5000 });
    }
  }

  /**
   * Perform complete signup and wait for success
   */
  async performSignup(user: TestUser): Promise<void> {
    await this.signup(user);
    await this.waitForSuccessfulSignup();
  }

  /**
   * Check accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check all inputs have proper labels
    const labels = ['first-name', 'last-name', 'email', 'password', 'confirm-password'];
    
    for (const label of labels) {
      await expect(this.page.locator(`label[for="${label}"]`)).toBeVisible();
    }

    // Check password input type
    await expect(this.page.locator(this.selectors.passwordInput)).toHaveAttribute('type', 'password');
    await expect(this.page.locator(this.selectors.confirmPasswordInput)).toHaveAttribute('type', 'password');

    // Check email input type
    await expect(this.page.locator(this.selectors.emailInput)).toHaveAttribute('type', 'email');

    // Check required attributes
    await expect(this.page.locator(this.selectors.emailInput)).toHaveAttribute('required');
    await expect(this.page.locator(this.selectors.passwordInput)).toHaveAttribute('required');
  }

  /**
   * Test signup with existing email
   */
  async testExistingEmail(existingEmail: string): Promise<void> {
    const newUser: TestUser = {
      firstName: 'Test',
      lastName: 'User',
      email: existingEmail,
      password: 'testpassword123'
    };

    await this.signup(newUser);
    await expect(this.page.locator(this.selectors.errorMessage)).toBeVisible();
    
    const errorText = await this.getSignupError();
    expect(errorText.toLowerCase()).toContain('email');
  }
}