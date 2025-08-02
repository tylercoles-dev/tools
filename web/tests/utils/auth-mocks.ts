import { Page, Route, Request } from '@playwright/test';
import { testUsers, authTestData } from '../fixtures/test-data';

/**
 * Authentication API mocking utilities for testing error scenarios and edge cases
 */
export class AuthMocks {
  constructor(private page: Page) {}

  /**
   * Mock successful login response
   */
  async mockSuccessfulLogin(user = testUsers.validUser) {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '123',
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'user'
          },
          token: 'mock-jwt-token-' + Date.now(),
          message: 'Login successful'
        }),
        headers: {
          'Set-Cookie': 'auth-token=mock-token; HttpOnly; Secure; SameSite=Strict'
        }
      });
    });
  }

  /**
   * Mock login failure with invalid credentials
   */
  async mockInvalidCredentials() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect.'
        })
      });
    });
  }

  /**
   * Mock account locked due to too many failed attempts
   */
  async mockAccountLocked() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 423,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Account locked',
          message: 'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
          lockoutExpires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        })
      });
    });
  }

  /**
   * Mock rate limiting response
   */
  async mockRateLimited() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Rate limited',
          message: 'Too many requests. Please wait before trying again.',
          retryAfter: 60
        }),
        headers: {
          'Retry-After': '60'
        }
      });
    });
  }

  /**
   * Mock server error
   */
  async mockServerError() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          message: 'Something went wrong on our end. Please try again later.'
        })
      });
    });
  }

  /**
   * Mock network timeout
   */
  async mockNetworkTimeout() {
    await this.page.route('**/auth/login', (route: Route) => {
      // Simulate network timeout by not responding
      setTimeout(() => {
        route.abort('timedout');
      }, 30000);
    });
  }

  /**
   * Mock network failure
   */
  async mockNetworkFailure() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.abort('failed');
    });
  }

  /**
   * Mock successful signup response
   */
  async mockSuccessfulSignup() {
    await this.page.route('**/auth/signup', (route: Route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Account created successfully. Please check your email to verify your account.',
          user: {
            id: 'new-user-' + Date.now(),
            email: 'new@test.com',
            name: 'New User',
            emailVerified: false
          }
        })
      });
    });
  }

  /**
   * Mock signup failure - email already exists
   */
  async mockEmailAlreadyExists() {
    await this.page.route('**/auth/signup', (route: Route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Email already registered',
          message: 'An account with this email address already exists.',
          field: 'email'
        })
      });
    });
  }

  /**
   * Mock signup validation errors
   */
  async mockSignupValidationErrors() {
    await this.page.route('**/auth/signup', (route: Route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Validation failed',
          message: 'Please correct the following errors:',
          errors: {
            name: ['Name must be at least 2 characters long'],
            email: ['Please enter a valid email address'],
            password: ['Password must be at least 8 characters long and contain both letters and numbers']
          }
        })
      });
    });
  }

  /**
   * Mock password too weak error
   */
  async mockWeakPassword() {
    await this.page.route('**/auth/signup', (route: Route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Password too weak',
          message: 'Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters.',
          field: 'password',
          passwordStrength: {
            score: 1,
            feedback: [
              'Add more characters',
              'Use a mix of letters, numbers, and symbols',
              'Avoid common passwords'
            ]
          }
        })
      });
    });
  }

  /**
   * Mock logout success
   */
  async mockSuccessfulLogout() {
    await this.page.route('**/auth/logout', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        }),
        headers: {
          'Set-Cookie': 'auth-token=; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      });
    });
  }

  /**
   * Mock session verification - valid token
   */
  async mockValidSession(user = testUsers.validUser) {
    await this.page.route('**/auth/verify', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '123',
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'user',
            emailVerified: true
          },
          valid: true
        })
      });
    });
  }

  /**
   * Mock session verification - expired token
   */
  async mockExpiredSession() {
    await this.page.route('**/auth/verify', (route: Route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
          valid: false
        })
      });
    });
  }

  /**
   * Mock session verification - invalid token
   */
  async mockInvalidSession() {
    await this.page.route('**/auth/verify', (route: Route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid token',
          message: 'Authentication token is invalid',
          valid: false
        })
      });
    });
  }

  /**
   * Mock password reset request
   */
  async mockPasswordResetRequest() {
    await this.page.route('**/auth/forgot-password', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'If an account with this email exists, you will receive password reset instructions.'
        })
      });
    });
  }

  /**
   * Mock email verification success
   */
  async mockEmailVerificationSuccess() {
    await this.page.route('**/auth/verify-email', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Email verified successfully'
        })
      });
    });
  }

  /**
   * Mock dynamic responses based on request content
   */
  async mockDynamicLoginResponses() {
    await this.page.route('**/auth/login', async (route: Route) => {
      const request = route.request();
      const postData = request.postData();
      
      if (!postData) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Bad request',
            message: 'Request body is required'
          })
        });
        return;
      }

      let credentials;
      try {
        credentials = JSON.parse(postData);
      } catch {
        // Handle form data
        const formData = new URLSearchParams(postData);
        credentials = {
          email: formData.get('email'),
          password: formData.get('password')
        };
      }

      // Route based on credentials
      if (credentials.email === testUsers.validUser.email && credentials.password === testUsers.validUser.password) {
        await this.mockSuccessfulLogin(testUsers.validUser);
        return;
      }

      if (credentials.email === testUsers.adminUser.email && credentials.password === testUsers.adminUser.password) {
        await this.mockSuccessfulLogin(testUsers.adminUser);
        return;
      }

      if (credentials.email === 'locked@test.com') {
        await this.mockAccountLocked();
        return;
      }

      if (credentials.email === 'ratelimited@test.com') {
        await this.mockRateLimited();
        return;
      }

      // Default to invalid credentials
      await this.mockInvalidCredentials();
    });
  }

  /**
   * Mock slow network responses
   */
  async mockSlowNetworkResponse(delayMs: number = 5000) {
    await this.page.route('**/auth/**', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
  }

  /**
   * Mock intermittent network failures
   */
  async mockIntermittentFailures(failureRate: number = 0.3) {
    await this.page.route('**/auth/**', (route: Route) => {
      if (Math.random() < failureRate) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
  }

  /**
   * Mock maintenance mode
   */
  async mockMaintenanceMode() {
    await this.page.route('**/auth/**', (route: Route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Service unavailable',
          message: 'The service is temporarily unavailable due to maintenance. Please try again later.',
          maintenanceWindow: {
            start: new Date().toISOString(),
            estimatedEnd: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        }),
        headers: {
          'Retry-After': '7200'
        }
      });
    });
  }

  /**
   * Clear all authentication route mocks
   */
  async clearMocks() {
    await this.page.unroute('**/auth/**');
  }

  /**
   * Mock CSRF token endpoint
   */
  async mockCSRFToken() {
    await this.page.route('**/csrf-token', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-csrf-token-' + Date.now()
        })
      });
    });
  }

  /**
   * Mock 2FA challenge (if implemented)
   */
  async mockTwoFactorChallenge() {
    await this.page.route('**/auth/login', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          requiresTwoFactor: true,
          challengeId: 'mock-challenge-' + Date.now(),
          message: 'Please enter the verification code from your authenticator app.'
        })
      });
    });
  }

  /**
   * Mock successful 2FA verification
   */
  async mockTwoFactorSuccess() {
    await this.page.route('**/auth/verify-2fa', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '123',
            email: testUsers.validUser.email,
            name: `${testUsers.validUser.firstName} ${testUsers.validUser.lastName}`,
            role: 'user'
          },
          token: 'mock-jwt-token-2fa-' + Date.now(),
          message: 'Login successful'
        })
      });
    });
  }
}

/**
 * Helper function to set up common authentication mocks for tests
 */
export async function setupBasicAuthMocks(page: Page) {
  const authMocks = new AuthMocks(page);
  
  // Set up default successful responses
  await authMocks.mockSuccessfulLogin();
  await authMocks.mockSuccessfulSignup();
  await authMocks.mockSuccessfulLogout();
  await authMocks.mockValidSession();
  
  return authMocks;
}

/**
 * Helper function to set up error scenario mocks for tests
 */
export async function setupErrorAuthMocks(page: Page) {
  const authMocks = new AuthMocks(page);
  
  // Set up various error responses
  await authMocks.mockInvalidCredentials();
  await authMocks.mockEmailAlreadyExists();
  await authMocks.mockSignupValidationErrors();
  
  return authMocks;
}

/**
 * Mock different network conditions for testing
 */
export class NetworkConditionMocks {
  constructor(private page: Page) {}

  /**
   * Simulate slow 3G connection
   */
  async simulateSlow3G() {
    await this.page.route('**/auth/**', async (route: Route) => {
      // Add 1-3 second delay to simulate slow connection
      const delay = 1000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      route.continue();
    });
  }

  /**
   * Simulate offline mode
   */
  async simulateOffline() {
    await this.page.route('**/auth/**', (route: Route) => {
      route.abort('failed');
    });
  }

  /**
   * Simulate flaky connection
   */
  async simulateFlakyConnection(failureRate: number = 0.2) {
    await this.page.route('**/auth/**', async (route: Route) => {
      if (Math.random() < failureRate) {
        const delay = Math.random() * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        route.abort('timedout');
      } else {
        route.continue();
      }
    });
  }

  /**
   * Clear network condition mocks
   */
  async clearNetworkMocks() {
    await this.page.unroute('**/auth/**');
  }
}