import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

/**
 * Global setup that runs once before all tests
 * Sets up authentication state, test data, and environment preparation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log(`📍 Navigating to ${baseURL}`);
    await page.goto(baseURL!);
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Check if we can reach the login page
    await page.goto(`${baseURL}/auth/login`);
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
    
    // Perform login to set up authenticated state
    console.log('🔐 Setting up authenticated user state...');
    
    // Use test credentials (you'll need to adjust these based on your auth system)
    await page.fill('[data-testid="email-input"]', 'test@mcptools.dev');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 });
    
    // Save authenticated state
    const authStateDir = path.dirname(storageState as string);
    await page.context().storageState({ path: storageState as string });
    
    console.log(`✅ Authenticated state saved to ${storageState}`);
    
    // Set up test data if needed
    await setupTestData(page);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    
    // For development, we might want to continue even if auth fails
    if (process.env.NODE_ENV !== 'ci') {
      console.warn('⚠️  Continuing without authentication for development...');
      // Save empty state for unauthenticated tests
      await page.context().storageState({ path: storageState as string });
    } else {
      throw error;
    }
  }
  
  await browser.close();
  console.log('✅ Global setup completed');
}

/**
 * Set up test data that tests will rely on
 */
async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  try {
    // Create a test kanban board
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    
    // Check if test board already exists
    const existingBoard = await page.locator('[data-testid*="test-board"]').first();
    if (await existingBoard.count() === 0) {
      // Create new test board
      await page.click('[data-testid="create-board-button"]');
      await page.fill('[data-testid="board-name-input"]', 'E2E Test Board');
      await page.fill('[data-testid="board-description-input"]', 'Board for automated testing');
      await page.click('[data-testid="create-board-submit"]');
      await page.waitForURL('**/kanban/**');
    }
    
    // Create a test wiki page
    await page.goto('/wiki');
    await page.waitForLoadState('networkidle');
    
    const existingPage = await page.locator('[data-testid*="test-wiki"]').first();
    if (await existingPage.count() === 0) {
      // Create new test wiki page
      await page.click('[data-testid="create-page-button"]');
      await page.fill('[data-testid="page-title-input"]', 'E2E Test Wiki Page');
      await page.fill('[data-testid="page-content-input"]', '# Test Content\n\nThis is a test wiki page for E2E testing.');
      await page.click('[data-testid="create-page-submit"]');
      await page.waitForURL('**/wiki/**');
    }
    
    console.log('✅ Test data setup completed');
  } catch (error) {
    console.warn('⚠️  Test data setup failed, tests may need to create their own data:', error);
  }
}

export default globalSetup;