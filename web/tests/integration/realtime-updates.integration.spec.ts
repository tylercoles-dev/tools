import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard-page';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Real-time Updates Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start from dashboard with authenticated user
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should establish WebSocket connection', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Wait for real-time connection to establish
    await dashboardPage.waitForRealtimeConnection();
    
    // Verify connection status
    const status = await dashboardPage.checkConnectionStatus();
    expect(status).toBe('connected');
    
    // Check connection indicator
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]')).toBeVisible();
  });

  test('should receive real-time board updates', async ({ page, context }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Navigate to kanban section
    await dashboardPage.navigateToKanban();
    
    // Create a board to work with
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Real-time Test Board';
      
      // Fill board creation form
      const modal = await page.locator('[data-testid="modal"], [role="dialog"]');
      if (await modal.count() > 0) {
        await page.fill('[data-testid="board-name-input"]', boardData.name);
        await page.fill('[data-testid="board-description-input"]', boardData.description);
        await page.click('[data-testid="create-board-submit"]');
        
        // Wait for board creation and navigation
        await page.waitForURL('**/kanban/**');
        const boardUrl = page.url();
        
        // Open second browser context to simulate another user
        const secondContext = await context.browser()?.newContext();
        if (secondContext) {
          const secondPage = await secondContext.newPage();
          
          // Load auth state for second user (in real scenario, this would be different user)
          await secondContext.storageState({ path: 'tests/fixtures/auth.json' });
          
          // Navigate to the same board
          await secondPage.goto(boardUrl);
          await secondPage.waitForLoadState('networkidle');
          
          // User 1 adds a column
          await page.click('[data-testid="add-column-button"]');
          await page.fill('[data-testid="column-name-input"]', 'Real-time Column');
          await page.click('[data-testid="create-column-button"]');
          
          // User 2 should see the new column via real-time update
          await secondPage.waitForSelector(`[data-testid*="column"]:has-text("Real-time Column")`, {
            timeout: 10000
          });
          
          // Verify both users see the same content
          const column1 = await page.locator(`[data-testid*="column"]:has-text("Real-time Column")`);
          const column2 = await secondPage.locator(`[data-testid*="column"]:has-text("Real-time Column")`);
          
          await expect(column1).toBeVisible();
          await expect(column2).toBeVisible();
          
          await secondContext.close();
        }
      }
    }
  });

  test('should handle connection recovery', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Establish connection
    await dashboardPage.waitForRealtimeConnection();
    let status = await dashboardPage.checkConnectionStatus();
    expect(status).toBe('connected');
    
    // Simulate network disconnection
    await page.context().setOffline(true);
    
    // Wait for disconnection to be detected
    await page.waitForFunction(() => {
      const statusEl = document.querySelector('[data-testid="connection-status"]');
      return statusEl?.getAttribute('data-status') === 'disconnected';
    }, { timeout: 15000 });
    
    status = await dashboardPage.checkConnectionStatus();
    expect(status).toBe('disconnected');
    
    // Restore connection
    await page.context().setOffline(false);
    
    // Wait for reconnection
    await page.waitForFunction(() => {
      const statusEl = document.querySelector('[data-testid="connection-status"]');
      return statusEl?.getAttribute('data-status') === 'connected';
    }, { timeout: 15000 });
    
    status = await dashboardPage.checkConnectionStatus();
    expect(status).toBe('connected');
  });

  test('should sync activity feed updates', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Ensure we're on dashboard with activity feed
    await dashboardPage.goto();
    
    const sections = await dashboardPage.checkDashboardSections();
    if (!sections.activityFeed) {
      test.skip('Activity feed not available');
    }
    
    // Get initial activity count
    const initialActivities = await dashboardPage.getActivityFeedItems();
    const initialCount = initialActivities.length;
    
    // Perform an action that should generate activity
    await dashboardPage.navigateToKanban();
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Activity Test Board';
      
      const modal = page.locator('[data-testid="modal"], [role="dialog"]');
      if (await modal.count() > 0) {
        await page.fill('[data-testid="board-name-input"]', boardData.name);
        await page.click('[data-testid="create-board-submit"]');
        
        // Wait for board creation
        await page.waitForURL('**/kanban/**');
        
        // Return to dashboard
        await dashboardPage.navigateToDashboard();
        
        // Wait for activity feed to update
        await dashboardPage.waitForActivityUpdate();
        
        // Check that new activity appeared
        const updatedActivities = await dashboardPage.getActivityFeedItems();
        expect(updatedActivities.length).toBeGreaterThan(initialCount);
        
        // Verify the activity mentions our board
        const hasNewBoardActivity = updatedActivities.some(activity => 
          activity.includes(boardData.name) || activity.includes('board')
        );
        expect(hasNewBoardActivity).toBeTruthy();
      }
    }
  });

  test('should handle real-time wiki page updates', async ({ page, context }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Navigate to wiki
    await dashboardPage.navigateToWiki();
    
    // Create a wiki page
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Real-time Wiki Test';
      
      const modal = page.locator('[data-testid="modal"], [role="dialog"]');
      if (await modal.count() > 0) {
        await page.fill('[data-testid="page-title-input"]', pageData.title);
        await page.fill('[data-testid="page-content-input"]', pageData.content);
        await page.click('[data-testid="create-page-submit"]');
        
        // Wait for page creation
        await page.waitForURL('**/wiki/**');
        const pageUrl = page.url();
        
        // Open second browser for collaborative editing
        const secondContext = await context.browser()?.newContext();
        if (secondContext) {
          const secondPage = await secondContext.newPage();
          await secondContext.storageState({ path: 'tests/fixtures/auth.json' });
          
          await secondPage.goto(pageUrl);
          await secondPage.waitForLoadState('networkidle');
          
          // User 1 edits the page
          const editButton = page.locator('[data-testid="edit-page-button"]');
          if (await editButton.count() > 0) {
            await editButton.click();
            
            const contentArea = page.locator('[data-testid="page-content-editor"]');
            await contentArea.fill(pageData.content + '\n\n## Real-time Update Test');
            
            const saveButton = page.locator('[data-testid="save-page-button"]');
            await saveButton.click();
            
            // User 2 should see the update
            await secondPage.waitForSelector('text=Real-time Update Test', { timeout: 10000 });
            
            // Verify both users see the updated content
            const content1 = await page.locator('[data-testid="page-content"]');
            const content2 = await secondPage.locator('[data-testid="page-content"]');
            
            await expect(content1).toContainText('Real-time Update Test');
            await expect(content2).toContainText('Real-time Update Test');
          }
          
          await secondContext.close();
        }
      }
    }
  });

  test('should handle concurrent user actions', async ({ page, context }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Create a test board for concurrent access
    await dashboardPage.navigateToKanban();
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Concurrent Test Board';
      
      const modal = page.locator('[data-testid="modal"], [role="dialog"]');
      if (await modal.count() > 0) {
        await page.fill('[data-testid="board-name-input"]', boardData.name);
        await page.click('[data-testid="create-board-submit"]');
        
        await page.waitForURL('**/kanban/**');
        const boardUrl = page.url();
        
        // Add initial columns
        for (const columnName of ['To Do', 'In Progress', 'Done']) {
          await page.click('[data-testid="add-column-button"]');
          await page.fill('[data-testid="column-name-input"]', columnName);
          await page.click('[data-testid="create-column-button"]');
        }
        
        // Open multiple browser contexts for concurrent users
        const contexts = await Promise.all([
          context.browser()?.newContext(),
          context.browser()?.newContext()
        ]);
        
        const pages = await Promise.all(
          contexts.filter(ctx => ctx).map(async (ctx) => {
            const p = await ctx!.newPage();
            await ctx!.storageState({ path: 'tests/fixtures/auth.json' });
            await p.goto(boardUrl);
            await p.waitForLoadState('networkidle');
            return p;
          })
        );
        
        if (pages.length >= 2) {
          // Concurrent actions: both users create cards at the same time
          const cardData1 = TestDataGenerator.generateCard();
          const cardData2 = TestDataGenerator.generateCard();
          
          cardData1.title = 'Concurrent Card 1';
          cardData2.title = 'Concurrent Card 2';
          
          // Create cards simultaneously
          await Promise.all([
            (async () => {
              const addCardBtn = pages[0].locator('[data-testid*="add-card-button"]').first();
              if (await addCardBtn.count() > 0) {
                await addCardBtn.click();
                await pages[0].fill('[data-testid="card-title-input"]', cardData1.title);
                await pages[0].click('[data-testid="create-card-button"]');
              }
            })(),
            (async () => {
              const addCardBtn = pages[1].locator('[data-testid*="add-card-button"]').first();
              if (await addCardBtn.count() > 0) {
                await addCardBtn.click();
                await pages[1].fill('[data-testid="card-title-input"]', cardData2.title);
                await pages[1].click('[data-testid="create-card-button"]');
              }
            })()
          ]);
          
          // Wait for real-time sync
          await page.waitForTimeout(2000);
          
          // All users should see both cards
          for (const userPage of [page, ...pages]) {
            await expect(userPage.locator(`[data-testid*="card"]:has-text("${cardData1.title}")`)).toBeVisible();
            await expect(userPage.locator(`[data-testid*="card"]:has-text("${cardData2.title}")`)).toBeVisible();
          }
        }
        
        // Cleanup
        await Promise.all(contexts.filter(ctx => ctx).map(ctx => ctx!.close()));
      }
    }
  });

  test('should maintain state during page refresh', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    // Establish connection and perform action
    await dashboardPage.navigateToKanban();
    await dashboardPage.waitForRealtimeConnection();
    
    // Store initial state
    const initialUrl = page.url();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should maintain connection and state
    await expect(page).toHaveURL(initialUrl);
    await dashboardPage.waitForRealtimeConnection();
    
    const status = await dashboardPage.checkConnectionStatus();
    expect(status).toBe('connected');
  });
});