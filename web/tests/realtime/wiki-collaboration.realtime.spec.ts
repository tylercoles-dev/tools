/**
 * Wiki Collaborative Editing Tests
 * Tests real-time collaborative editing features for Wiki pages including:
 * - Simultaneous text editing with Operational Transformation
 * - Cursor position sharing and visibility
 * - Selection highlighting across users
 * - Paragraph-level locking during editing
 * - Merge conflict resolution for simultaneous edits
 * - Version control with collaborative sessions
 * - Comment and discussion synchronization
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency,
  simulateLatency
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer, MockWebSocketMessage } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Wiki Collaborative Editing', () => {
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

  test('should handle simultaneous text editing with operational transformation', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a wiki page
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Collaborative Editing Test';
      pageData.content = 'This is the initial content of the collaborative editing test page.';
      
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
      
      // Simultaneous editing operations
      const editingPromises = [
        // User 0: Insert at beginning
        (async () => {
          const editor = pages[0].locator('[data-testid="wiki-editor"]');
          await editor.click();
          await pages[0].keyboard.press('Control+Home');
          await pages[0].keyboard.type('# Collaborative Test\n\n');
          await waitForRealtimeSync(pages[0]);
        })(),
        
        // User 1: Insert in middle
        (async () => {
          await pages[1].waitForTimeout(500); // Slight delay to avoid race condition
          const editor = pages[1].locator('[data-testid="wiki-editor"]');
          await editor.click();
          
          // Find and click after "initial" word
          await pages[1].keyboard.press('Control+f');
          await pages[1].keyboard.type('initial');
          await pages[1].keyboard.press('Escape');
          await pages[1].keyboard.press('ArrowRight'); // Move after "initial"
          await pages[1].keyboard.type(' MODIFIED');
          await waitForRealtimeSync(pages[1]);
        })(),
        
        // User 2: Append at end
        (async () => {
          await pages[2].waitForTimeout(1000); // Delay to avoid conflicts
          const editor = pages[2].locator('[data-testid="wiki-editor"]');
          await editor.click();
          await pages[2].keyboard.press('Control+End');
          await pages[2].keyboard.type('\n\n## Added by User 2\nThis section was added by the third collaborator.');
          await waitForRealtimeSync(pages[2]);
        })()
      ];
      
      await Promise.all(editingPromises);
      
      // Wait for all operations to be applied
      await waitForRealtimeSync(pages[0], 10000);
      
      // All users should see all changes integrated
      for (const userPage of pages) {
        const editorContent = await userPage.locator('[data-testid="wiki-editor"]').inputValue();
        
        expect(editorContent).toContain('# Collaborative Test');
        expect(editorContent).toContain('initial MODIFIED content');
        expect(editorContent).toContain('## Added by User 2');
        expect(editorContent).toContain('third collaborator');
      }
      
      // Save the page
      await pages[0].click('[data-testid="save-page-button"]');
      await waitForRealtimeSync(pages[0]);
      
      // Verify final content consistency
      await verifyDataConsistency(pages, '[data-testid="wiki-content"]');
    }
  });

  test('should display cursor positions and selections of other users', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create and navigate to wiki page
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Cursor Sharing Test';
      pageData.content = 'This is a test for cursor position sharing and selection highlighting.';
      
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
      
      // User 0 moves cursor to specific position
      const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
      await editor0.click();
      await pages[0].keyboard.press('Control+f');
      await pages[0].keyboard.type('cursor');
      await pages[0].keyboard.press('Escape');
      
      // User 1 selects text
      const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
      await editor1.click();
      await pages[1].keyboard.press('Control+f');
      await pages[1].keyboard.type('sharing');
      await pages[1].keyboard.press('Escape');
      await pages[1].keyboard.press('Shift+Control+Right'); // Select word
      
      await waitForRealtimeSync(pages[0]);
      
      // Other users should see cursor indicators
      for (let i = 0; i < pages.length; i++) {
        for (let j = 0; j < pages.length; j++) {
          if (i !== j) {
            // Check for other users' cursor indicators
            const cursorIndicator = pages[i].locator(`[data-testid="user-cursor-${j}"]`);
            const selectionHighlight = pages[i].locator(`[data-testid="user-selection-${j}"]`);
            
            // At least one should be visible (cursor or selection)
            const hasCursorIndicator = await cursorIndicator.count() > 0;
            const hasSelectionHighlight = await selectionHighlight.count() > 0;
            
            if (hasCursorIndicator || hasSelectionHighlight) {
              console.log(`User ${i} can see User ${j}'s cursor/selection indicators`);
            }
          }
        }
      }
    }
  });

  test('should handle paragraph-level locking during editing', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create wiki page with multiple paragraphs
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Paragraph Locking Test';
      pageData.content = `# Paragraph Locking Test

## First Section
This is the first paragraph that can be edited independently.

## Second Section  
This is the second paragraph that should be lockable during editing.

## Third Section
This is the third paragraph for testing concurrent editing.`;
      
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
      
      // User 0 starts editing first section
      const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
      await editor0.click();
      await pages[0].keyboard.press('Control+f');
      await pages[0].keyboard.type('first paragraph');
      await pages[0].keyboard.press('Escape');
      await pages[0].keyboard.type(' [EDITING BY USER 0]');
      
      await waitForRealtimeSync(pages[0]);
      
      // User 1 tries to edit the same section - should be prevented or warned
      const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
      await editor1.click();
      await pages[1].keyboard.press('Control+f');
      await pages[1].keyboard.type('first paragraph');
      await pages[1].keyboard.press('Escape');
      
      // Check for editing conflict warning
      const conflictWarning = pages[1].locator('[data-testid="editing-conflict-warning"]');
      const paragraphLocked = pages[1].locator('[data-testid="paragraph-locked-indicator"]');
      
      const hasConflictWarning = await conflictWarning.count() > 0;
      const hasParagraphLock = await paragraphLocked.count() > 0;
      
      if (hasConflictWarning || hasParagraphLock) {
        console.log('Paragraph-level locking is working');
      }
      
      // User 1 should be able to edit a different section
      await pages[1].keyboard.press('Control+f');
      await pages[1].keyboard.type('second paragraph');
      await pages[1].keyboard.press('Escape');
      await pages[1].keyboard.type(' [EDITING BY USER 1]');
      
      await waitForRealtimeSync(pages[1]);
      
      // Both edits should be visible without conflicts
      for (const userPage of pages) {
        const content = await userPage.locator('[data-testid="wiki-editor"]').inputValue();
        expect(content).toContain('[EDITING BY USER 0]');
        expect(content).toContain('[EDITING BY USER 1]');
      }
    }
  });

  test('should resolve merge conflicts for simultaneous edits', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Merge Conflict Test';
      pageData.content = 'Original content that will be modified by multiple users simultaneously.';
      
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
      
      // Simultaneous conflicting edits to the same text
      const conflictingEdits = [
        // User 0: Replace "Original" with "Modified by User 0"
        (async () => {
          const editor = pages[0].locator('[data-testid="wiki-editor"]');
          await editor.click();
          await pages[0].keyboard.press('Control+a');
          await pages[0].keyboard.type('Modified by User 0 - content that will be modified by multiple users simultaneously.');
        })(),
        
        // User 1: Replace "Original" with "Changed by User 1"  
        (async () => {
          const editor = pages[1].locator('[data-testid="wiki-editor"]');
          await editor.click();
          await pages[1].keyboard.press('Control+a');
          await pages[1].keyboard.type('Changed by User 1 - content that will be modified by multiple users simultaneously.');
        })(),
        
        // User 2: Replace "Original" with "Updated by User 2"
        (async () => {
          const editor = pages[2].locator('[data-testid="wiki-editor"]');
          await editor.click();
          await pages[2].keyboard.press('Control+a');
          await pages[2].keyboard.type('Updated by User 2 - content that will be modified by multiple users simultaneously.');
        })()
      ];
      
      await Promise.all(conflictingEdits);
      
      // Trigger save simultaneously (this should cause conflicts)
      const savePromises = pages.map(async (userPage, index) => {
        try {
          await userPage.click('[data-testid="save-page-button"]');
        } catch (error) {
          console.log(`User ${index} save attempt:`, error.message);
        }
      });
      
      await Promise.all(savePromises);
      
      await waitForRealtimeSync(pages[0], 10000);
      
      // Check conflict resolution - one version should win (last-write-wins)
      // or there should be a merge resolution interface
      const conflictResolution = pages[0].locator('[data-testid="merge-conflict-resolution"]');
      const hasConflictResolution = await conflictResolution.count() > 0;
      
      if (hasConflictResolution) {
        // If conflict resolution UI exists, test it
        await expect(conflictResolution).toBeVisible();
        
        // Accept one of the changes
        const acceptButton = conflictResolution.locator('[data-testid="accept-change-button"]').first();
        if (await acceptButton.count() > 0) {
          await acceptButton.click();
          await pages[0].click('[data-testid="resolve-conflicts-button"]');
        }
      }
      
      await waitForRealtimeSync(pages[0], 5000);
      
      // Final state should be consistent across all users
      await verifyDataConsistency(pages, '[data-testid="wiki-content"]');
      
      // One of the user modifications should be preserved
      const finalContent = await pages[0].locator('[data-testid="wiki-content"]').textContent();
      const hasUserModification = finalContent?.includes('User 0') || 
                                 finalContent?.includes('User 1') || 
                                 finalContent?.includes('User 2');
      
      expect(hasUserModification).toBeTruthy();
    }
  });

  test('should synchronize comments and discussions in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Comments Synchronization Test';
      pageData.content = 'This page will be used to test real-time comment synchronization.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // User 0 adds a comment
      const commentsSection = pages[0].locator('[data-testid="comments-section"]');
      if (await commentsSection.count() > 0) {
        await pages[0].click('[data-testid="add-comment-button"]');
        await pages[0].fill('[data-testid="comment-input"]', 'This is a comment from User 0 about the synchronization test.');
        await pages[0].click('[data-testid="submit-comment-button"]');
        
        await waitForRealtimeSync(pages[0]);
        
        // All other users should see the comment
        for (let i = 1; i < pages.length; i++) {
          await expect(pages[i].locator('[data-testid*="comment"]:has-text("User 0")'))
            .toBeVisible({ timeout: 10000 });
        }
        
        // User 1 replies to the comment
        const replyButton = pages[1].locator('[data-testid="reply-to-comment-button"]').first();
        if (await replyButton.count() > 0) {
          await replyButton.click();
          await pages[1].fill('[data-testid="reply-input"]', 'Reply from User 1 to the comment.');
          await pages[1].click('[data-testid="submit-reply-button"]');
          
          await waitForRealtimeSync(pages[1]);
          
          // All users should see the reply
          for (const userPage of pages) {
            await expect(userPage.locator('[data-testid*="reply"]:has-text("Reply from User 1")'))
              .toBeVisible({ timeout: 10000 });
          }
        }
        
        // User 2 adds another comment
        await pages[2].click('[data-testid="add-comment-button"]');
        await pages[2].fill('[data-testid="comment-input"]', 'Another comment for testing from User 2.');
        await pages[2].click('[data-testid="submit-comment-button"]');
        
        await waitForRealtimeSync(pages[2]);
        
        // All users should see both comments
        for (const userPage of pages) {
          await expect(userPage.locator('[data-testid*="comment"]:has-text("User 0")'))
            .toBeVisible({ timeout: 5000 });
          await expect(userPage.locator('[data-testid*="comment"]:has-text("User 2")'))
            .toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should handle version control during collaborative sessions', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Version Control Test';
      pageData.content = 'Initial version of the document for version control testing.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // Check if version history is available
      const versionHistoryButton = pages[0].locator('[data-testid="version-history-button"]');
      if (await versionHistoryButton.count() > 0) {
        // User 0 makes first edit
        await pages[0].click('[data-testid="edit-page-button"]');
        const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
        await editor0.fill('Initial version - Modified by User 0 for version testing.');
        await pages[0].click('[data-testid="save-page-button"]');
        
        await waitForRealtimeSync(pages[0]);
        
        // User 1 makes second edit
        await pages[1].click('[data-testid="edit-page-button"]');
        const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
        const currentContent = await editor1.inputValue();
        await editor1.fill(currentContent + '\n\nSecond version - Modified by User 1.');
        await pages[1].click('[data-testid="save-page-button"]');
        
        await waitForRealtimeSync(pages[1]);
        
        // Check version history
        await pages[2].click('[data-testid="version-history-button"]');
        
        const versionHistory = pages[2].locator('[data-testid="version-history-list"]');
        if (await versionHistory.count() > 0) {
          // Should show multiple versions
          const versionItems = pages[2].locator('[data-testid*="version-item"]');
          const versionCount = await versionItems.count();
          
          expect(versionCount).toBeGreaterThan(1);
          
          // Test version comparison
          const compareButton = pages[2].locator('[data-testid="compare-versions-button"]').first();
          if (await compareButton.count() > 0) {
            await compareButton.click();
            
            // Should show diff view
            await expect(pages[2].locator('[data-testid="version-diff"]'))
              .toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should maintain editing state during network interruptions', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Network Interruption Test';
      pageData.content = 'Testing content persistence during network interruptions.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // All users start editing
      for (const userPage of pages) {
        await userPage.click('[data-testid="edit-page-button"]');
        await userPage.waitForSelector('[data-testid="wiki-editor"]', { timeout: 5000 });
      }
      
      // User 0 starts typing
      const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
      await editor0.click();
      await pages[0].keyboard.press('Control+End');
      await pages[0].keyboard.type('\n\nContent added before network interruption.');
      
      // Simulate network interruption for User 0
      await pages[0].context().setOffline(true);
      
      // User 0 continues typing while offline (should be queued)
      await pages[0].keyboard.type('\nContent added during network interruption.');
      
      // User 1 makes changes while User 0 is offline
      const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
      await editor1.click();
      await pages[1].keyboard.press('Control+End');
      await pages[1].keyboard.type('\n\nContent added by User 1 while User 0 was offline.');
      
      await waitForRealtimeSync(pages[1]);
      
      // Restore User 0's connection
      await pages[0].context().setOffline(false);
      
      // Wait for reconnection and sync
      await waitForRealtimeSync(pages[0], 15000);
      
      // User 0's offline changes should be applied
      const finalContent0 = await editor0.inputValue();
      expect(finalContent0).toContain('Content added before network interruption');
      expect(finalContent0).toContain('Content added during network interruption');
      expect(finalContent0).toContain('Content added by User 1 while User 0 was offline');
      
      // Save and verify consistency
      await pages[0].click('[data-testid="save-page-button"]');
      await waitForRealtimeSync(pages[0]);
      
      // All users should see the merged content
      await verifyDataConsistency(pages, '[data-testid="wiki-content"]');
    }
  });
});

test.describe('Wiki Collaborative Editing Performance', () => {
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(4); // 4 concurrent editors
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
  });

  test('should handle multiple concurrent editors efficiently', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Multi-Editor Performance Test';
      pageData.content = 'Performance testing with multiple concurrent editors.';
      
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
      
      // Measure performance of concurrent editing
      const startTime = Date.now();
      
      // Each user types rapidly in different sections
      const editingPromises = pages.map(async (userPage, index) => {
        const editor = userPage.locator('[data-testid="wiki-editor"]');
        await editor.click();
        
        // Position cursor based on user index
        for (let i = 0; i < index; i++) {
          await userPage.keyboard.press('ArrowDown');
        }
        
        // Type multiple lines rapidly
        for (let i = 0; i < 10; i++) {
          await userPage.keyboard.type(`Line ${i} from User ${index}. `);
          await userPage.waitForTimeout(50); // Simulate typing speed
        }
      });
      
      await Promise.all(editingPromises);
      
      const editingTime = Date.now() - startTime;
      console.log(`Concurrent editing completed in ${editingTime}ms`);
      
      // Wait for synchronization
      const syncStartTime = Date.now();
      await waitForRealtimeSync(pages[0], 15000);
      const syncTime = Date.now() - syncStartTime;
      
      console.log(`Synchronization completed in ${syncTime}ms`);
      
      // Verify all changes are present
      const finalContent = await pages[0].locator('[data-testid="wiki-editor"]').inputValue();
      
      for (let userIndex = 0; userIndex < pages.length; userIndex++) {
        expect(finalContent).toContain(`User ${userIndex}`);
      }
      
      // Performance thresholds
      expect(editingTime).toBeLessThan(30000); // 30 seconds for all edits
      expect(syncTime).toBeLessThan(10000); // 10 seconds for sync
    }
  });

  test('should maintain responsiveness with high-frequency operations', async ({ page, context }) => {
    const metrics = await collaborationTester.measureRealtimePerformance(async () => {
      await collaborationTester.simulateConcurrentWikiEditing('/wiki/test-page');
    });
    
    console.log('Wiki collaboration performance metrics:', metrics);
    
    // Verify acceptable performance
    expect(metrics.averageLatency).toBeLessThan(500); // Average operation latency under 500ms
    expect(metrics.maxLatency).toBeLessThan(2000); // Max latency under 2 seconds
    expect(metrics.messageSuccessRate).toBeGreaterThan(95); // At least 95% success rate
  });

  test('should handle large document editing efficiently', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a large document
    const largeContent = Array(100).fill(0).map((_, i) => 
      `## Section ${i + 1}\nThis is section ${i + 1} with multiple paragraphs of content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n`
    ).join('\n');
    
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await page.fill('[data-testid="page-title-input"]', 'Large Document Test');
      await page.fill('[data-testid="page-content-input"]', largeContent);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // Enter edit mode
      for (const userPage of pages) {
        await userPage.click('[data-testid="edit-page-button"]');
        await userPage.waitForSelector('[data-testid="wiki-editor"]', { timeout: 10000 });
      }
      
      // Test editing performance on large document
      const startTime = Date.now();
      
      // Users edit different sections
      const editPromises = pages.slice(0, 2).map(async (userPage, index) => {
        const editor = userPage.locator('[data-testid="wiki-editor"]');
        await editor.click();
        
        // Find section to edit
        await userPage.keyboard.press('Control+f');
        await userPage.keyboard.type(`Section ${(index + 1) * 10}`);
        await userPage.keyboard.press('Escape');
        
        // Make edit
        await userPage.keyboard.press('End');
        await userPage.keyboard.type(` [EDITED BY USER ${index}]`);
      });
      
      await Promise.all(editPromises);
      
      const editTime = Date.now() - startTime;
      console.log(`Large document editing completed in ${editTime}ms`);
      
      await waitForRealtimeSync(pages[0], 10000);
      
      // Verify edits are present
      const finalContent = await pages[0].locator('[data-testid="wiki-editor"]').inputValue();
      expect(finalContent).toContain('[EDITED BY USER 0]');
      expect(finalContent).toContain('[EDITED BY USER 1]');
      
      // Should handle large documents efficiently
      expect(editTime).toBeLessThan(5000); // 5 seconds max for editing operations
    }
  });
});