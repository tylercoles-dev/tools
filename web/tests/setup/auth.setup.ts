import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../fixtures/auth.json');

/**
 * Setup test that creates authenticated state for other tests
 * This runs once before all other tests that depend on authentication
 */
setup('authenticate user', async ({ page }) => {
  console.log('🔐 Setting up authentication for test suite...');
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Wait for login form to be visible
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  
  // Fill in credentials
  // Note: In real scenarios, use environment variables for test credentials
  await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@mcptools.dev');
  await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
  
  // Click login button
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful redirect to dashboard
  await page.waitForURL('**/dashboard**');
  
  // Verify we're logged in by checking for user-specific elements
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup completed');
});

/**
 * Setup test for creating test data
 */
setup('create test data', async ({ page }) => {
  console.log('📊 Creating test data...');
  
  // This test depends on authentication, so it will use the auth state
  await page.goto('/dashboard');
  
  // Create test kanban board if it doesn't exist
  await page.goto('/kanban');
  await page.waitForLoadState('networkidle');
  
  // Check if test board exists
  const testBoardExists = await page.locator('[data-testid="board-e2e-test-board"]').count() > 0;
  
  if (!testBoardExists) {
    // Create new test board
    await page.click('[data-testid="create-board-button"]');
    await page.fill('[data-testid="board-name-input"]', 'E2E Test Board');
    await page.fill('[data-testid="board-description-input"]', 'Automated testing board - do not delete');
    await page.click('[data-testid="create-board-submit"]');
    
    // Wait for board creation and navigation
    await page.waitForURL('**/kanban/**');
    await expect(page.locator('[data-testid="board-title"]')).toContainText('E2E Test Board');
    
    // Add some test columns and cards
    await page.click('[data-testid="add-column-button"]');
    await page.fill('[data-testid="column-name-input"]', 'Test ToDo');
    await page.click('[data-testid="create-column-button"]');
    
    await page.click('[data-testid="add-column-button"]');
    await page.fill('[data-testid="column-name-input"]', 'Test In Progress');
    await page.click('[data-testid="create-column-button"]');
    
    await page.click('[data-testid="add-column-button"]');
    await page.fill('[data-testid="column-name-input"]', 'Test Done');
    await page.click('[data-testid="create-column-button"]');
    
    // Add a test card
    await page.locator('[data-testid="column-test-todo"] [data-testid="add-card-button"]').click();
    await page.fill('[data-testid="card-title-input"]', 'Test Card for E2E');
    await page.fill('[data-testid="card-description-input"]', 'This card is used for automated testing');
    await page.click('[data-testid="create-card-button"]');
  }
  
  // Create test wiki page if it doesn't exist
  await page.goto('/wiki');
  await page.waitForLoadState('networkidle');
  
  const testPageExists = await page.locator('[data-testid="page-e2e-test-page"]').count() > 0;
  
  if (!testPageExists) {
    // Create new test page
    await page.click('[data-testid="create-page-button"]');
    await page.fill('[data-testid="page-title-input"]', 'E2E Test Page');
    await page.fill('[data-testid="page-slug-input"]', 'e2e-test-page');
    await page.fill('[data-testid="page-content-input"]', `# E2E Test Page

This page is used for automated testing. Please do not delete.

## Features to Test
- [ ] Page editing
- [ ] Page navigation
- [ ] Search functionality
- [ ] Comments

## Test Data
This page contains test data for various scenarios.`);
    
    await page.click('[data-testid="create-page-submit"]');
    await page.waitForURL('**/wiki/**');
    await expect(page.locator('[data-testid="page-title"]')).toContainText('E2E Test Page');
  }
  
  console.log('✅ Test data creation completed');
});