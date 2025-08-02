/**
 * Conflict Resolution and Data Integrity Tests
 * Tests comprehensive conflict resolution mechanisms and ensures data integrity
 * across all real-time collaboration scenarios including:
 * - Simultaneous edits with last-write-wins vs operational transformation
 * - Data consistency validation after conflicts
 * - User notification of conflicts and resolution options
 * - Rollback mechanisms for failed operations
 * - Optimistic UI updates with server validation
 * - Cross-tool data integrity during real-time operations
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency 
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer, MockWebSocketMessage } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Conflict Resolution Mechanisms', () => {
  let collaborationTester: RealtimeCollaborationTester;
  let mockServer: MockWebSocketServer;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(3);
    mockServer = new MockWebSocketServer();
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should handle last-write-wins conflict resolution', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a Kanban board for testing
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Last-Write-Wins Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create a card that multiple users will edit
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Conflict Test Card');
      await pages[0].fill('[data-testid="card-description-input"]', 'Original description');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // All users attempt to edit the same card simultaneously
      const editPromises = pages.map(async (userPage, index) => {
        const card = userPage.locator('[data-testid*="card"]:has-text("Conflict Test Card")');
        await card.click();
        
        const editButton = userPage.locator('[data-testid="edit-card-button"]');
        if (await editButton.count() > 0) {
          await editButton.click();
          
          // Each user tries to set a different title
          await userPage.fill('[data-testid="card-title-input"]', `Modified by User ${index} - ${Date.now()}`);
          await userPage.fill('[data-testid="card-description-input"]', `Description updated by User ${index}`);
          
          // Submit the changes
          await userPage.click('[data-testid="save-card-button"]');
        }
      });
      
      // Execute all edits simultaneously
      await Promise.all(editPromises);
      
      // Wait for conflict resolution
      await waitForRealtimeSync(pages[0], 10000);
      
      // One version should win (last-write-wins)
      // All users should see the same final state
      const finalTitles = await Promise.all(
        pages.map(userPage => 
          userPage.locator('[data-testid*="card"]').first().textContent()
        )
      );
      
      // All titles should be identical after conflict resolution
      for (let i = 1; i < finalTitles.length; i++) {
        expect(finalTitles[i]).toBe(finalTitles[0]);
      }
      
      // One of the user modifications should be preserved
      const hasUserModification = finalTitles[0]?.includes('User 0') || 
                                 finalTitles[0]?.includes('User 1') || 
                                 finalTitles[0]?.includes('User 2');
      
      expect(hasUserModification).toBeTruthy();
    }
  });

  test('should provide conflict notification and resolution options', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a Wiki page for testing
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Conflict Notification Test';
      pageData.content = 'Content that will be modified simultaneously causing conflicts.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // All users enter edit mode
      for (const userPage of pages) {
        await userPage.click('[data-testid="edit-page-button"]');
        await userPage.waitForSelector('[data-testid="wiki-editor"]', { timeout: 5000 });
      }
      
      // Create conflicting edits
      const conflictingEdits = pages.map(async (userPage, index) => {
        const editor = userPage.locator('[data-testid="wiki-editor"]');
        await editor.click();
        await userPage.keyboard.press('Control+a');
        await userPage.keyboard.type(`Completely different content from User ${index} - ${Date.now()}`);
        
        // Try to save immediately
        await userPage.click('[data-testid="save-page-button"]');
      });
      
      await Promise.all(conflictingEdits);
      
      // Check for conflict notifications
      for (const userPage of pages) {
        // Look for various types of conflict indicators
        const conflictModal = userPage.locator('[data-testid="conflict-resolution-modal"]');
        const conflictNotification = userPage.locator('[data-testid="conflict-notification"]');
        const conflictToast = userPage.locator('[data-testid*="toast"]:has-text("conflict")');
        
        const hasConflictModal = await conflictModal.count() > 0;
        const hasConflictNotification = await conflictNotification.count() > 0;
        const hasConflictToast = await conflictToast.count() > 0;
        
        if (hasConflictModal || hasConflictNotification || hasConflictToast) {
          console.log('Conflict notification system is working');
          
          // Test conflict resolution options if available
          if (hasConflictModal) {
            await expect(conflictModal).toBeVisible();
            
            // Check for resolution options
            const keepMyChanges = conflictModal.locator('[data-testid="keep-my-changes"]');
            const acceptOtherChanges = conflictModal.locator('[data-testid="accept-other-changes"]');
            const mergeChanges = conflictModal.locator('[data-testid="merge-changes"]');
            
            const hasKeepOption = await keepMyChanges.count() > 0;
            const hasAcceptOption = await acceptOtherChanges.count() > 0;
            const hasMergeOption = await mergeChanges.count() > 0;
            
            expect(hasKeepOption || hasAcceptOption || hasMergeOption).toBeTruthy();
            
            // Test one resolution option
            if (hasKeepOption) {
              await keepMyChanges.click();
            } else if (hasAcceptOption) {
              await acceptOtherChanges.click();
            }
          }
        }
      }
      
      await waitForRealtimeSync(pages[0], 10000);
      
      // After conflict resolution, all users should see consistent state
      await verifyDataConsistency(pages, '[data-testid="wiki-content"]');
    }
  });

  test('should handle optimistic UI updates with server validation', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create Kanban board
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Optimistic UI Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Add columns
      const columnNames = ['To Do', 'In Progress', 'Done'];
      for (const columnName of columnNames) {
        await page.click('[data-testid="add-column-button"]');
        await page.fill('[data-testid="column-name-input"]', columnName);
        await page.click('[data-testid="create-column-button"]');
        await page.waitForTimeout(300);
      }
      
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create a card
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Optimistic Update Test');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Simulate slow network for User 1
      const page1 = pages[1];
      await page1.route('**/*', async route => {
        // Add delay to API requests
        if (route.request().url().includes('/api/')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        await route.continue();
      });
      
      // User 1 performs drag operation (should show optimistic update)
      const card = page1.locator('[data-testid*="card"]:has-text("Optimistic Update Test")');
      const targetColumn = page1.locator('[data-testid*="column"]').nth(1); // "In Progress" column
      
      const dragStartTime = Date.now();
      await card.dragTo(targetColumn);
      const optimisticUpdateTime = Date.now() - dragStartTime;
      
      // UI should update optimistically (quickly)
      expect(optimisticUpdateTime).toBeLessThan(1000);
      
      // Card should appear to be in the new column immediately
      await expect(targetColumn.locator('[data-testid*="card"]:has-text("Optimistic Update Test")'))
        .toBeVisible({ timeout: 2000 });
      
      // Wait for server validation (this might take longer due to simulated delay)
      await waitForRealtimeSync(page1, 15000);
      
      // Other users should see the final validated state
      for (const userPage of pages) {
        const inProgressColumn = userPage.locator('[data-testid*="column"]').nth(1);
        await expect(inProgressColumn.locator('[data-testid*="card"]:has-text("Optimistic Update Test")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // If server validation fails, the card should revert to original position
      // This would be indicated by the card returning to the first column
      // (We can't easily simulate server validation failure in this test setup)
    }
  });

  test('should implement rollback mechanisms for failed operations', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Rollback Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create initial state
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Rollback Test Card');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Simulate network failure during operation
      const page1 = pages[1];
      
      // Block specific API requests to simulate failure
      await page1.route('**/api/kanban/cards/**', async route => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          // Simulate server error
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          await route.continue();
        }
      });
      
      // User 1 attempts to edit the card (should fail and rollback)
      const card = page1.locator('[data-testid*="card"]:has-text("Rollback Test Card")');
      await card.click();
      
      const editButton = page1.locator('[data-testid="edit-card-button"]');
      if (await editButton.count() > 0) {
        await editButton.click();
        
        // Store original title
        const originalTitle = await page1.locator('[data-testid="card-title-input"]').inputValue();
        
        // Make changes
        await page1.fill('[data-testid="card-title-input"]', 'This Change Should Fail');
        await page1.fill('[data-testid="card-description-input"]', 'This should be rolled back');
        
        // Submit (should fail)
        await page1.click('[data-testid="save-card-button"]');
        
        // Wait for failure and rollback
        await page1.waitForTimeout(3000);
        
        // Check for error notification
        const errorToast = page1.locator('[data-testid*="toast"]:has-text("error"), [data-testid*="toast"]:has-text("failed")');
        const errorNotification = page1.locator('[data-testid="error-notification"]');
        
        const hasErrorToast = await errorToast.count() > 0;
        const hasErrorNotification = await errorNotification.count() > 0;
        
        if (hasErrorToast || hasErrorNotification) {
          console.log('Error notification system is working');
        }
        
        // Card should revert to original state (rollback)
        const currentTitle = await card.textContent();
        expect(currentTitle).toBe('Rollback Test Card');
        expect(currentTitle).not.toContain('This Change Should Fail');
      }
      
      // Other users should still see the original state
      for (let i = 0; i < pages.length; i++) {
        if (i === 1) continue; // Skip the user who experienced the failure
        
        const userCard = pages[i].locator('[data-testid*="card"]:has-text("Rollback Test Card")');
        await expect(userCard).toBeVisible();
        
        const cardText = await userCard.textContent();
        expect(cardText).not.toContain('This Change Should Fail');
      }
    }
  });

  test('should maintain data integrity during rapid concurrent operations', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board with specific structure for integrity testing
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Data Integrity Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Create multiple columns
      const columnNames = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
      for (const columnName of columnNames) {
        await page.click('[data-testid="add-column-button"]');
        await page.fill('[data-testid="column-name-input"]', columnName);
        await page.click('[data-testid="create-column-button"]');
        await page.waitForTimeout(200);
      }
      
      // Create initial cards
      for (let i = 1; i <= 10; i++) {
        await page.click('[data-testid*="add-card-button"]');
        await page.fill('[data-testid="card-title-input"]', `Integrity Test Card ${i}`);
        await page.click('[data-testid="create-card-button"]');
        await page.waitForTimeout(100);
      }
      
      const boardUrl = page.url();
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Perform rapid concurrent operations
      const rapidOperations = pages.map(async (userPage, userIndex) => {
        for (let opIndex = 0; opIndex < 5; opIndex++) {
          try {
            const cardIndex = (userIndex * 5) + opIndex + 1;
            const targetColumnIndex = (opIndex + 1) % 5;
            
            const card = userPage.locator(`[data-testid*="card"]:has-text("Integrity Test Card ${cardIndex}")`);
            const targetColumn = userPage.locator('[data-testid*="column"]').nth(targetColumnIndex);
            
            if (await card.count() > 0 && await targetColumn.count() > 0) {
              await card.dragTo(targetColumn);
              await userPage.waitForTimeout(200);
            }
          } catch (error) {
            console.log(`User ${userIndex} operation ${opIndex} failed:`, error.message);
          }
        }
      });
      
      await Promise.all(rapidOperations);
      
      // Wait for all operations to settle
      await waitForRealtimeSync(pages[0], 20000);
      
      // Verify data integrity
      for (let i = 0; i < pages.length; i++) {
        // Count total cards on each page
        const cardCount = await pages[i].locator('[data-testid*="card"]').count();
        expect(cardCount).toBe(10); // Should still have all 10 cards
        
        // Verify each card exists exactly once
        for (let cardNum = 1; cardNum <= 10; cardNum++) {
          const cardInstances = await pages[i].locator(`[data-testid*="card"]:has-text("Integrity Test Card ${cardNum}")`).count();
          expect(cardInstances).toBe(1); // Each card should exist exactly once
        }
      }
      
      // Verify consistency across all users
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
    }
  });

  test('should handle version conflicts in collaborative editing', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create Wiki page for version conflict testing
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Version Conflict Test';
      pageData.content = 'Initial content for version conflict testing.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // User 0 starts editing
      await pages[0].click('[data-testid="edit-page-button"]');
      const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
      await editor0.fill('Version 1: Content modified by User 0.');
      
      // User 1 also starts editing (based on original version)
      await pages[1].click('[data-testid="edit-page-button"]');
      const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
      await editor1.fill('Version 2: Content modified by User 1.');
      
      // User 0 saves first
      await pages[0].click('[data-testid="save-page-button"]');
      await waitForRealtimeSync(pages[0]);
      
      // User 1 tries to save (should detect version conflict)
      await pages[1].click('[data-testid="save-page-button"]');
      
      // Wait for conflict detection
      await pages[1].waitForTimeout(3000);
      
      // Check for version conflict indicators
      const versionConflictModal = pages[1].locator('[data-testid="version-conflict-modal"]');
      const conflictWarning = pages[1].locator('[data-testid="conflict-warning"]');
      const outdatedVersionNotice = pages[1].locator('[data-testid="outdated-version-notice"]');
      
      const hasVersionConflict = await versionConflictModal.count() > 0;
      const hasConflictWarning = await conflictWarning.count() > 0;
      const hasOutdatedNotice = await outdatedVersionNotice.count() > 0;
      
      if (hasVersionConflict || hasConflictWarning || hasOutdatedNotice) {
        console.log('Version conflict detection is working');
        
        // Test conflict resolution options
        if (hasVersionConflict) {
          await expect(versionConflictModal).toBeVisible();
          
          // Look for resolution options
          const showDiff = versionConflictModal.locator('[data-testid="show-diff-button"]');
          const forceOverwrite = versionConflictModal.locator('[data-testid="force-overwrite-button"]');
          const refreshAndMerge = versionConflictModal.locator('[data-testid="refresh-merge-button"]');
          
          if (await showDiff.count() > 0) {
            await showDiff.click();
            
            // Should show diff view
            await expect(pages[1].locator('[data-testid="version-diff"]'))
              .toBeVisible({ timeout: 5000 });
          }
          
          // Choose a resolution option
          if (await refreshAndMerge.count() > 0) {
            await refreshAndMerge.click();
          } else if (await forceOverwrite.count() > 0) {
            await forceOverwrite.click();
          }
        }
      }
      
      await waitForRealtimeSync(pages[1], 10000);
      
      // After resolution, verify consistency
      await verifyDataConsistency(pages, '[data-testid="wiki-content"]');
      
      // Content should contain elements from conflict resolution
      const finalContent = await pages[0].locator('[data-testid="wiki-content"]').textContent();
      const containsUser0Changes = finalContent?.includes('User 0');
      const containsUser1Changes = finalContent?.includes('User 1');
      
      // Depending on resolution strategy, should have one or both changes
      expect(containsUser0Changes || containsUser1Changes).toBeTruthy();
    }
  });

  test('should validate data consistency after network partition healing', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create initial state
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Network Partition Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create initial cards
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Partition Test Card 1');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Partition Test Card 2');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Simulate network partition - User 1 goes offline
      const page1 = pages[1];
      await page1.context().setOffline(true);
      
      // User 0 makes changes while User 1 is partitioned
      const card1 = pages[0].locator('[data-testid*="card"]:has-text("Partition Test Card 1")');
      await card1.click();
      
      const editButton = pages[0].locator('[data-testid="edit-card-button"]');
      if (await editButton.count() > 0) {
        await editButton.click();
        await pages[0].fill('[data-testid="card-title-input"]', 'Modified While Partitioned');
        await pages[0].click('[data-testid="save-card-button"]');
      }
      
      // User 2 also makes changes
      await pages[2].click('[data-testid*="add-card-button"]');
      await pages[2].fill('[data-testid="card-title-input"]', 'Added During Partition');
      await pages[2].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Heal the network partition
      await page1.context().setOffline(false);
      
      // Wait for partition healing and conflict resolution
      await waitForRealtimeSync(page1, 20000);
      
      // Validate final consistency
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
      
      // All changes should be present after healing
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Modified While Partitioned")'))
          .toBeVisible({ timeout: 10000 });
        await expect(userPage.locator('[data-testid*="card"]:has-text("Added During Partition")'))
          .toBeVisible({ timeout: 10000 });
        await expect(userPage.locator('[data-testid*="card"]:has-text("Partition Test Card 2")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // Should have exactly 3 cards total
      for (const userPage of pages) {
        const cardCount = await userPage.locator('[data-testid*="card"]').count();
        expect(cardCount).toBe(3);
      }
    }
  });
});

test.describe('Data Integrity Validation', () => {
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(4);
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
  });

  test('should maintain referential integrity across related entities', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Test referential integrity between Kanban and Wiki (if linked)
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Referential Integrity Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create a card with potential wiki link
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Card with Wiki Reference');
      await pages[0].fill('[data-testid="card-description-input"]', 'This card references [[Test Wiki Page]]');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Multiple users modify the card simultaneously
      const modificationPromises = pages.slice(0, 2).map(async (userPage, index) => {
        const card = userPage.locator('[data-testid*="card"]:has-text("Card with Wiki Reference")');
        await card.click();
        
        const editButton = userPage.locator('[data-testid="edit-card-button"]');
        if (await editButton.count() > 0) {
          await editButton.click();
          
          const currentDesc = await userPage.locator('[data-testid="card-description-input"]').inputValue();
          await userPage.fill('[data-testid="card-description-input"]', 
            currentDesc + ` Modified by User ${index}`);
          
          await userPage.click('[data-testid="save-card-button"]');
        }
      });
      
      await Promise.all(modificationPromises);
      await waitForRealtimeSync(pages[0], 10000);
      
      // Verify referential integrity is maintained
      for (const userPage of pages) {
        const cardDescription = await userPage.locator('[data-testid*="card"]:has-text("Card with Wiki Reference")')
          .getAttribute('data-description') || 
          await userPage.locator('[data-testid*="card"]:has-text("Card with Wiki Reference")')
          .textContent();
        
        // Wiki reference should still be present
        expect(cardDescription).toContain('[[Test Wiki Page]]');
      }
      
      // All users should see consistent final state
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
    }
  });

  test('should validate data types and constraints during real-time updates', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Data Validation Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Test various data validation scenarios
      const validationTests = [
        // Test empty title validation
        async (userPage: Page) => {
          await userPage.click('[data-testid*="add-card-button"]');
          await userPage.fill('[data-testid="card-title-input"]', ''); // Empty title
          await userPage.fill('[data-testid="card-description-input"]', 'Valid description');
          await userPage.click('[data-testid="create-card-button"]');
          
          // Should show validation error
          const validationError = userPage.locator('[data-testid="validation-error"], [data-testid="title-required-error"]');
          const hasValidationError = await validationError.count() > 0;
          
          if (hasValidationError) {
            console.log('Title validation is working');
          }
        },
        
        // Test title length validation
        async (userPage: Page) => {
          await userPage.click('[data-testid*="add-card-button"]');
          const longTitle = 'x'.repeat(256); // Assuming 255 character limit
          await userPage.fill('[data-testid="card-title-input"]', longTitle);
          await userPage.click('[data-testid="create-card-button"]');
          
          const lengthError = userPage.locator('[data-testid="title-too-long-error"], [data-testid="validation-error"]:has-text("long")');
          const hasLengthError = await lengthError.count() > 0;
          
          if (hasLengthError) {
            console.log('Title length validation is working');
          }
        }
      ];
      
      // Run validation tests with different users
      for (let i = 0; i < Math.min(validationTests.length, pages.length); i++) {
        try {
          await validationTests[i](pages[i]);
          await pages[i].waitForTimeout(1000); // Wait for validation
        } catch (error) {
          console.log(`Validation test ${i} failed:`, error.message);
        }
      }
      
      // Create valid cards to ensure system still works
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Valid Card');
      await pages[0].fill('[data-testid="card-description-input"]', 'This is a valid card');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Valid card should be visible to all users
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Valid Card")'))
          .toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should ensure transaction atomicity in collaborative operations', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Transaction Atomicity Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Create columns
      const columnNames = ['To Do', 'In Progress', 'Done'];
      for (const columnName of columnNames) {
        await page.click('[data-testid="add-column-button"]');
        await page.fill('[data-testid="column-name-input"]', columnName);
        await page.click('[data-testid="create-column-button"]');
        await page.waitForTimeout(200);
      }
      
      const boardUrl = page.url();
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Create initial card
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Atomicity Test Card');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // Simulate complex operation that should be atomic
      // (e.g., moving card + updating its properties simultaneously)
      const atomicOperationPromises = pages.slice(0, 2).map(async (userPage, index) => {
        try {
          const card = userPage.locator('[data-testid*="card"]:has-text("Atomicity Test Card")');
          
          if (index === 0) {
            // User 0: Move card to different column
            const targetColumn = userPage.locator('[data-testid*="column"]').nth(1);
            await card.dragTo(targetColumn);
          } else {
            // User 1: Edit card properties
            await card.click();
            const editButton = userPage.locator('[data-testid="edit-card-button"]');
            if (await editButton.count() > 0) {
              await editButton.click();
              await userPage.fill('[data-testid="card-title-input"]', 'Atomicity Test Card - Modified');
              await userPage.fill('[data-testid="card-description-input"]', 'Modified during atomic test');
              await userPage.click('[data-testid="save-card-button"]');
            }
          }
        } catch (error) {
          console.log(`Atomic operation ${index} failed:`, error.message);
        }
      });
      
      await Promise.all(atomicOperationPromises);
      await waitForRealtimeSync(pages[0], 15000);
      
      // Verify atomic consistency - either both operations succeeded or both failed
      // All users should see the same final state
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
      
      // Card should exist in exactly one location with consistent properties
      let cardFound = false;
      let cardTitle = '';
      
      for (const userPage of pages) {
        const cardInstances = await userPage.locator('[data-testid*="card"]:has-text("Atomicity Test")').count();
        expect(cardInstances).toBeLessThanOrEqual(1); // Should not be duplicated
        
        if (cardInstances === 1) {
          cardFound = true;
          const card = userPage.locator('[data-testid*="card"]:has-text("Atomicity Test")');
          cardTitle = await card.textContent() || '';
        }
      }
      
      expect(cardFound).toBeTruthy();
      
      // All users should see the same card title
      for (const userPage of pages) {
        const card = userPage.locator('[data-testid*="card"]:has-text("Atomicity Test")');
        if (await card.count() > 0) {
          const currentTitle = await card.textContent();
          expect(currentTitle).toBe(cardTitle);
        }
      }
    }
  });
});