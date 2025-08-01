import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown that runs once after all tests
 * Cleans up test data, artifacts, and performs environment cleanup
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  const { baseURL } = config.projects[0].use;
  
  try {
    // Clean up test data
    await cleanupTestData(baseURL);
    
    // Clean up old test artifacts (keep last 5 runs)
    await cleanupTestArtifacts();
    
    // Cleanup auth state files
    await cleanupAuthState();
    
    console.log('✅ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't fail the entire test run due to cleanup issues
  }
}

/**
 * Clean up test data that was created during tests
 */
async function cleanupTestData(baseURL: string | undefined) {
  if (!baseURL) return;
  
  console.log('🗑️  Cleaning up test data...');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Try to load auth state if available
    const authStatePath = path.join(__dirname, '../fixtures/auth.json');
    if (fs.existsSync(authStatePath)) {
      await context.storageState({ path: authStatePath });
    }
    
    await page.goto(baseURL);
    
    // Clean up test kanban boards
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    
    const testBoards = await page.locator('[data-testid*="test-board"]');
    const boardCount = await testBoards.count();
    
    for (let i = 0; i < boardCount; i++) {
      try {
        await testBoards.nth(i).click();
        await page.click('[data-testid="board-settings-button"]');
        await page.click('[data-testid="delete-board-button"]');
        await page.click('[data-testid="confirm-delete-button"]');
        await page.waitForURL('**/kanban');
      } catch (error) {
        console.warn(`Failed to delete test board ${i}:`, error);
      }
    }
    
    // Clean up test wiki pages
    await page.goto('/wiki');
    await page.waitForLoadState('networkidle');
    
    const testPages = await page.locator('[data-testid*="test-wiki"]');
    const pageCount = await testPages.count();
    
    for (let i = 0; i < pageCount; i++) {
      try {
        await testPages.nth(i).click();
        await page.click('[data-testid="page-settings-button"]');
        await page.click('[data-testid="delete-page-button"]');
        await page.click('[data-testid="confirm-delete-button"]');
        await page.waitForURL('**/wiki');
      } catch (error) {
        console.warn(`Failed to delete test page ${i}:`, error);
      }
    }
    
    await browser.close();
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.warn('⚠️  Test data cleanup failed:', error);
  }
}

/**
 * Clean up old test artifacts to prevent disk space issues
 */
async function cleanupTestArtifacts() {
  console.log('🧹 Cleaning up old test artifacts...');
  
  try {
    const testResultsDir = path.join(__dirname, '../../test-results');
    const playwrightReportDir = path.join(__dirname, '../../playwright-report');
    
    // Clean up old test-results (keep last 5 runs)
    if (fs.existsSync(testResultsDir)) {
      const entries = fs.readdirSync(testResultsDir, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(testResultsDir, entry.name),
          mtime: fs.statSync(path.join(testResultsDir, entry.name)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Keep only the 5 most recent directories
      const toDelete = directories.slice(5);
      for (const dir of toDelete) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`Deleted old test results: ${dir.name}`);
      }
    }
    
    // Clean up old playwright reports (keep last 3)
    if (fs.existsSync(playwrightReportDir)) {
      const reportEntries = fs.readdirSync(playwrightReportDir, { withFileTypes: true });
      const reportDirs = reportEntries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(playwrightReportDir, entry.name),
          mtime: fs.statSync(path.join(playwrightReportDir, entry.name)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      const toDeleteReports = reportDirs.slice(3);
      for (const dir of toDeleteReports) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`Deleted old report: ${dir.name}`);
      }
    }
    
    console.log('✅ Test artifacts cleanup completed');
  } catch (error) {
    console.warn('⚠️  Test artifacts cleanup failed:', error);
  }
}

/**
 * Clean up authentication state files
 */
async function cleanupAuthState() {
  console.log('🔐 Cleaning up auth state...');
  
  try {
    const authStatePath = path.join(__dirname, '../fixtures/auth.json');
    
    // Don't delete auth state in development to speed up subsequent runs
    if (process.env.CI && fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log('✅ Auth state cleaned up');
    }
  } catch (error) {
    console.warn('⚠️  Auth state cleanup failed:', error);
  }
}

export default globalTeardown;