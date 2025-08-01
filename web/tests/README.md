# MCP Tools Web Client - Playwright Testing Framework

This directory contains a comprehensive Playwright testing framework for the MCP Tools web client. The framework follows best practices for maintainable, reliable, and scalable automated testing.

## 📁 Directory Structure

```
tests/
├── e2e/                    # End-to-end tests (complete user workflows)
├── smoke/                  # Fast, essential tests for core functionality
├── regression/             # Tests protecting against previously fixed bugs
├── integration/            # Tests validating subsystem interactions
├── visual/                 # Screenshot comparison tests
├── accessibility/          # Automated a11y tests
├── api/                   # Direct API endpoint tests
├── setup/                 # Global setup and teardown scripts
├── fixtures/              # Test data and configuration files
├── pages/                 # Page Object Model implementations
├── utils/                 # Test utilities and helper functions
└── README.md             # This documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MCP Tools web application running locally
- API Gateway running (for full integration tests)

### Installation

```bash
# Install dependencies (from web/ directory)
npm install

# Install Playwright browsers
npm run test:install
```

### Basic Usage

```bash
# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug tests
npm run test:debug
```

## 🎯 Test Categories

### Smoke Tests (`tests/smoke/`)
Fast, essential tests ensuring core functionality works:
- Authentication flows
- Page loading
- Navigation
- Critical user paths

```bash
npm run test:smoke
```

### End-to-End Tests (`tests/e2e/`)
Complete user workflows testing:
- New user onboarding
- Cross-platform collaboration
- Content creation workflows
- Error handling and recovery

```bash
npm run test:e2e
```

### Regression Tests (`tests/regression/`)
Protect against previously fixed bugs:
- Bug reproduction scenarios
- Edge case handling
- Data integrity validation

```bash
npm run test:regression
```

### Integration Tests (`tests/integration/`)
Validate interactions between components:
- Form-to-API-to-database flows
- Real-time updates
- WebSocket connections
- Cross-component communication

```bash
npm run test:integration
```

### Visual Tests (`tests/visual/`)
Screenshot comparison for UI consistency:
- Component rendering
- Layout verification
- Responsive design validation

```bash
npm run test:visual
```

### Accessibility Tests (`tests/accessibility/`)
Automated accessibility validation:
- WCAG compliance
- Keyboard navigation
- Screen reader compatibility
- Focus management

```bash
npm run test:accessibility
```

### API Tests (`tests/api/`)
Direct backend endpoint validation:
- REST API testing
- Authentication validation
- Data validation
- Error response handling

```bash
npm run test:api
```

## 🏗️ Architecture

### Page Object Model

The framework uses the Page Object Model pattern for maintainable tests:

```typescript
// Example usage
import { LoginPage, DashboardPage } from '../pages';

test('user login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  
  await loginPage.goto();
  await loginPage.loginWithCredentials(user.email, user.password);
  await dashboardPage.verifyDashboardLoaded();
});
```

### Test Utilities

Comprehensive helper functions for common operations:

```typescript
import { TestHelpers, testData } from '../utils/test-helpers';

test('form handling example', async ({ page }) => {
  const helpers = new TestHelpers(page);
  
  await helpers.fillAndSubmitForm('form', testData.validUser);
  await helpers.waitForToast('Success!');
});
```

### Test Data Management

Centralized test data with generators:

```typescript
import { TestDataGenerator, testUsers } from '../fixtures/test-data';

// Use predefined data
const user = testUsers.validUser;

// Generate dynamic data
const newUser = TestDataGenerator.generateUser();
const board = TestDataGenerator.generateBoard({ name: 'Custom Board' });
```

## 🔧 Configuration

### Environment Variables

```bash
# Test environment configuration
BASE_URL=http://localhost:3000        # Web app URL
API_URL=http://localhost:3001         # API Gateway URL
NODE_ENV=test                         # Environment
CI=true                              # CI mode flag

# Feature flags
VISUAL_TESTS=true                    # Enable visual testing
A11Y_TESTS=true                      # Enable accessibility testing
PERF_TESTS=true                      # Enable performance testing

# Test credentials
TEST_USER_EMAIL=test@mcptools.dev
TEST_USER_PASSWORD=testpassword123
```

### Browser Configuration

The framework supports multiple browsers and devices:

```bash
# Specific browsers
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Mobile devices
npm run test:mobile

# Authenticated vs unauthenticated tests
npm run test:auth
npm run test:unauth
```

## 📊 Reporting

### HTML Reports

```bash
# Generate and view HTML report
npm run test:report
```

### CI/CD Reports

```bash
# Generate CI-friendly reports (JUnit, JSON)
npm run test:ci
```

### Test Traces

```bash
# View test traces for debugging
npm run test:trace
```

## 🛠️ Development Workflow

### Writing Tests

1. **Choose the right test type** based on what you're testing
2. **Use Page Objects** for UI interactions
3. **Leverage test helpers** for common operations
4. **Follow naming conventions**: `feature.testtype.spec.ts`

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { PageObject } from '../pages';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    const pageObject = new PageObject(page);
    
    // Act
    await pageObject.performAction();
    
    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for elements** explicitly using Playwright's auto-waiting
3. **Keep tests independent** - each test should work in isolation
4. **Use meaningful test names** that describe the expected behavior
5. **Group related tests** using `test.describe()`
6. **Clean up test data** to prevent test pollution

### Debugging

```bash
# Debug specific test
npm run test:debug -- --grep "test name"

# Run with browser UI
npm run test:headed

# Generate code from interactions
npm run test:codegen
```

## 🔄 Continuous Integration

### GitHub Actions

The framework includes comprehensive CI/CD configuration:

- **Multi-browser testing** across Chromium, Firefox, WebKit
- **Parallel execution** for faster feedback
- **Test result artifacts** and reports
- **Visual regression detection**
- **Accessibility validation**

### Local CI Simulation

```bash
# Run tests as they would in CI
npm run test:ci

# Run with multiple workers
npm run test:parallel

# Run in serial mode (for debugging)
npm run test:serial
```

## 📝 Test Data Management

### Static Test Data

Predefined test data in `fixtures/test-data.ts`:

```typescript
export const testUsers = {
  validUser: { email: 'test@example.com', password: 'password123' },
  adminUser: { email: 'admin@example.com', password: 'admin123' }
};
```

### Dynamic Test Data

Generate unique test data to avoid conflicts:

```typescript
const user = TestDataGenerator.generateUser();
const board = TestDataGenerator.generateBoard();
```

### Test Data Cleanup

Automatic cleanup prevents test pollution:

```typescript
test.afterEach(async ({ page }) => {
  const helpers = new TestHelpers(page);
  await helpers.cleanupTestData();
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Flaky tests**: Use proper waits and selectors
2. **Authentication failures**: Check test credentials
3. **Timeout errors**: Increase timeout or optimize tests
4. **Element not found**: Verify data-testid attributes exist

### Debugging Tips

1. **Use headed mode** to see what's happening
2. **Add screenshots** at failure points
3. **Check network requests** for API issues
4. **Verify test data** setup and cleanup

### Getting Help

1. Check test logs and traces
2. Review HTML reports for detailed information
3. Use browser developer tools in headed mode
4. Consult Playwright documentation

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Best Practices](https://playwright.dev/docs/pom)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

## 🤝 Contributing

When adding new tests:

1. Follow the existing directory structure
2. Use appropriate test categories
3. Implement Page Objects for new pages
4. Add test data to fixtures
5. Update this documentation if needed
6. Ensure tests pass in CI

## 📋 Test Checklist

Before committing new tests:

- [ ] Tests are categorized correctly
- [ ] Page Objects are implemented
- [ ] Test data is managed properly
- [ ] Tests are independent and cleanup after themselves
- [ ] Tests follow naming conventions
- [ ] Tests pass locally and in CI
- [ ] Documentation is updated if needed