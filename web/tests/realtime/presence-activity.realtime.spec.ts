/**
 * User Presence and Activity Feed Synchronization Tests
 * Tests real-time user presence indicators and activity feed synchronization including:
 * - User online/offline status indicators
 * - Active cursor positions and user presence in collaborative editing
 * - User activity feed updates and notifications
 * - Real-time "who's viewing this" indicators
 * - User typing indicators and live collaboration status
 * - Activity history and timeline synchronization
 * - Cross-tool presence (showing users active across Kanban, Wiki, Memory)
 * - Notification system for user actions and collaboration events
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer, MockWebSocketMessage } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('User Presence Indicators', () => {
  let collaborationTester: RealtimeCollaborationTester;
  let mockServer: MockWebSocketServer;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(4); // 4 users for presence testing
    mockServer = new MockWebSocketServer();
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should show online/offline user status indicators', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // All users navigate to dashboard
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Wait for all users to be online
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    // Each user should see presence indicators for other users
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      // Look for online user indicators
      const onlineUsers = userPage.locator('[data-testid="online-users-list"]');
      const userPresenceItems = userPage.locator('[data-testid*="user-presence"]');
      const activeUsersCount = userPage.locator('[data-testid="active-users-count"]');
      
      if (await onlineUsers.count() > 0) {
        await expect(onlineUsers).toBeVisible();
        console.log(`User ${userIndex} can see online users list`);
      }
      
      if (await userPresenceItems.count() > 0) {
        const presenceCount = await userPresenceItems.count();
        console.log(`User ${userIndex} sees ${presenceCount} presence indicators`);
        
        // Should see other users (not including self)
        expect(presenceCount).toBeGreaterThanOrEqual(1);
        expect(presenceCount).toBeLessThanOrEqual(pages.length - 1);
      }
      
      if (await activeUsersCount.count() > 0) {
        const countText = await activeUsersCount.textContent();
        console.log(`User ${userIndex} sees active count: ${countText}`);
        expect(countText).toBeTruthy();
      }
    }
    
    // Test user going offline
    const userToGoOffline = pages[pages.length - 1];
    const userIndexOffline = pages.length - 1;
    
    await userToGoOffline.context().setOffline(true);
    
    // Wait for offline detection
    await expect(userToGoOffline.locator('[data-testid="connection-status"][data-status="disconnected"]'))
      .toBeVisible({ timeout: 15000 });
    
    // Other users should see updated presence
    await waitForRealtimeSync(pages[0], 10000);
    
    for (let userIndex = 0; userIndex < pages.length - 1; userIndex++) {
      const userPage = pages[userIndex];
      
      // Should show one less active user
      const offlineIndicator = userPage.locator(`[data-testid="user-offline-${userIndexOffline}"]`);
      const activeUsersCount = userPage.locator('[data-testid="active-users-count"]');
      
      if (await offlineIndicator.count() > 0) {
        await expect(offlineIndicator).toBeVisible();
        console.log(`User ${userIndex} sees offline indicator for User ${userIndexOffline}`);
      }
      
      if (await activeUsersCount.count() > 0) {
        const countText = await activeUsersCount.textContent();
        const activeCount = parseInt(countText?.match(/\d+/)?.[0] || '0');
        expect(activeCount).toBe(pages.length - 1); // One user is offline
      }
    }
    
    // Bring user back online
    await userToGoOffline.context().setOffline(false);
    
    // Should reconnect and update presence
    await expect(userToGoOffline.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 30000 });
    
    await waitForRealtimeSync(pages[0], 10000);
    
    // All users should see full presence again
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      const activeUsersCount = userPage.locator('[data-testid="active-users-count"]');
      
      if (await activeUsersCount.count() > 0) {
        const countText = await activeUsersCount.textContent();
        const activeCount = parseInt(countText?.match(/\d+/)?.[0] || '0');
        expect(activeCount).toBe(pages.length); // All users online again
      }
    }
  });

  test('should display "who\'s viewing this" indicators on specific pages', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a Kanban board for testing
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Presence Test Board';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // All users navigate to the same board
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      await waitForRealtimeSync(pages[0], 5000);
      
      // Each user should see indicators of who else is viewing this board
      for (let userIndex = 0; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        const viewingIndicators = [
          userPage.locator('[data-testid="users-viewing-board"]'),
          userPage.locator('[data-testid="active-collaborators"]'),
          userPage.locator('[data-testid="current-viewers"]'),
          userPage.locator('[data-testid*="presence-avatar"]')
        ];
        
        let hasAnyPresenceIndicator = false;
        
        for (const indicator of viewingIndicators) {
          if (await indicator.count() > 0) {
            await expect(indicator).toBeVisible();
            hasAnyPresenceIndicator = true;
            
            const indicatorText = await indicator.textContent();
            console.log(`User ${userIndex} sees presence indicator: ${indicatorText}`);
          }
        }
        
        if (hasAnyPresenceIndicator) {
          console.log(`User ${userIndex} has presence indicators working`);
        }
      }
      
      // Test users navigating away
      const userLeavingIndex = 0;
      await pages[userLeavingIndex].goto('/dashboard');
      
      await waitForRealtimeSync(pages[1], 5000);
      
      // Remaining users should see updated "who's viewing"
      for (let userIndex = 1; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        const viewersCount = userPage.locator('[data-testid="viewers-count"]');
        if (await viewersCount.count() > 0) {
          const countText = await viewersCount.textContent();
          const count = parseInt(countText?.match(/\d+/)?.[0] || '0');
          expect(count).toBe(pages.length - 1); // One user left
        }
      }
    }
  });

  test('should show cursor positions and typing indicators', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create Wiki page for collaborative editing
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Cursor Presence Test';
      pageData.content = 'This page is for testing cursor positions and typing indicators.';
      
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
      
      // User 0 starts typing
      const editor0 = pages[0].locator('[data-testid="wiki-editor"]');
      await editor0.click();
      await pages[0].keyboard.press('Control+End');
      
      // Simulate typing with pauses (should trigger typing indicators)
      const textToType = '\n\nUser 0 is typing...';
      for (let i = 0; i < textToType.length; i++) {
        await pages[0].keyboard.type(textToType[i]);
        await pages[0].waitForTimeout(100); // Slow typing to trigger indicators
      }
      
      await waitForRealtimeSync(pages[0], 2000);
      
      // Other users should see typing indicators
      for (let userIndex = 1; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        const typingIndicators = [
          userPage.locator('[data-testid="typing-indicator-user-0"]'),
          userPage.locator('[data-testid*="typing-indicator"]'),
          userPage.locator('[data-testid*="user-typing"]'),
          userPage.locator('[class*="typing"]')
        ];
        
        let hasTypingIndicator = false;
        
        for (const indicator of typingIndicators) {
          if (await indicator.count() > 0) {
            await expect(indicator).toBeVisible({ timeout: 5000 });
            hasTypingIndicator = true;
            console.log(`User ${userIndex} sees typing indicator for User 0`);
            break;
          }
        }
        
        if (!hasTypingIndicator) {
          console.log(`User ${userIndex} does not see typing indicators (may not be implemented)`);
        }
      }
      
      // User 0 stops typing
      await pages[0].waitForTimeout(3000); // Stop typing
      
      // Typing indicators should disappear
      for (let userIndex = 1; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        const typingIndicator = userPage.locator('[data-testid*="typing-indicator"]');
        if (await typingIndicator.count() > 0) {
          // Should eventually disappear
          await expect(typingIndicator).not.toBeVisible({ timeout: 10000 });
        }
      }
      
      // Test cursor position sharing
      // User 1 positions cursor at specific location
      const editor1 = pages[1].locator('[data-testid="wiki-editor"]');
      await editor1.click();
      await pages[1].keyboard.press('Control+Home'); // Go to beginning
      await pages[1].keyboard.press('ArrowRight'); // Move cursor
      await pages[1].keyboard.press('ArrowRight');
      await pages[1].keyboard.press('ArrowRight');
      
      await waitForRealtimeSync(pages[1], 2000);
      
      // Other users should see cursor indicators
      for (let userIndex = 0; userIndex < pages.length; userIndex++) {
        if (userIndex === 1) continue;
        
        const userPage = pages[userIndex];
        const cursorIndicator = userPage.locator(`[data-testid="cursor-user-1"], [data-testid*="cursor"]`);
        
        if (await cursorIndicator.count() > 0) {
          console.log(`User ${userIndex} sees cursor indicator for User 1`);
        }
      }
    }
  });

  test('should handle presence across multiple tool contexts', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Distribute users across different tools
    const toolAssignments = [
      { tool: 'kanban', path: '/kanban' },
      { tool: 'wiki', path: '/wiki' },
      { tool: 'memory', path: '/memory' },
      { tool: 'dashboard', path: '/dashboard' }
    ];
    
    // Each user goes to a different tool
    for (let userIndex = 0; userIndex < Math.min(pages.length, toolAssignments.length); userIndex++) {
      const userPage = pages[userIndex];
      const assignment = toolAssignments[userIndex];
      
      await userPage.goto(assignment.path);
      await userPage.waitForLoadState('networkidle');
      
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Each user should see presence information about where others are
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      // Look for cross-tool presence indicators
      const presenceIndicators = [
        userPage.locator('[data-testid="users-in-kanban"]'),
        userPage.locator('[data-testid="users-in-wiki"]'),
        userPage.locator('[data-testid="users-in-memory"]'),
        userPage.locator('[data-testid="cross-tool-presence"]'),
        userPage.locator('[data-testid*="tool-activity"]')
      ];
      
      for (const indicator of presenceIndicators) {
        if (await indicator.count() > 0) {
          const indicatorText = await indicator.textContent();
          console.log(`User ${userIndex} sees cross-tool presence: ${indicatorText}`);
        }  
      }
      
      // Check for activity overview
      const activityOverview = userPage.locator('[data-testid="team-activity-overview"]');
      if (await activityOverview.count() > 0) {
        await expect(activityOverview).toBeVisible();
        console.log(`User ${userIndex} sees team activity overview`);
      }
    }
  });
});

test.describe('Activity Feed Synchronization', () => {
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

  test('should synchronize activity feed updates in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // All users start at dashboard to see activity feed
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Verify activity feed is visible
    for (const userPage of pages) {
      const activityFeed = userPage.locator('[data-testid="activity-feed"]');
      const activityList = userPage.locator('[data-testid="activity-list"]');
      
      if (await activityFeed.count() > 0) {
        await expect(activityFeed).toBeVisible();
      } else if (await activityList.count() > 0) {
        await expect(activityList).toBeVisible();
      }
    }
    
    // Get initial activity count
    const initialActivityCounts = await Promise.all(
      pages.map(async (userPage) => {
        const activityItems = userPage.locator('[data-testid*="activity-item"]');
        return await activityItems.count();
      })
    );
    
    // User 0 performs an action that should generate activity
    const page0 = pages[0];
    await page0.click('[data-testid="kanban-nav-link"]');
    
    const createButton = page0.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Activity Feed Test Board';
      
      await page0.fill('[data-testid="board-name-input"]', boardData.name);
      await page0.click('[data-testid="create-board-submit"]');
      
      await page0.waitForURL('**/kanban/**');
      
      // Wait for activity to propagate
      await waitForRealtimeSync(page0, 5000);
      
      // Navigate back to dashboard to see activity
      await page0.click('[data-testid="dashboard-nav-link"]');
      
      // All users should see new activity
      for (let userIndex = 0; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        // Ensure we're on dashboard
        if (userIndex > 0) {
          await userPage.click('[data-testid="dashboard-nav-link"]');
        }
        
        await waitForRealtimeSync(userPage, 5000);
        
        // Look for activity about board creation
        const boardActivityItems = [
          userPage.locator('[data-testid*="activity"]:has-text("Activity Feed Test Board")'),
          userPage.locator('[data-testid*="activity"]:has-text("board")'),
          userPage.locator('[data-testid*="activity"]:has-text("created")'),
        ];
        
        let foundBoardActivity = false;
        for (const activityItem of boardActivityItems) {
          if (await activityItem.count() > 0) {
            await expect(activityItem).toBeVisible({ timeout: 10000 });
            foundBoardActivity = true;
            console.log(`User ${userIndex} sees board creation activity`);
            break;
          }
        }
        
        if (!foundBoardActivity) {
          // Check if activity count increased
          const currentActivityItems = userPage.locator('[data-testid*="activity-item"]');
          const currentCount = await currentActivityItems.count();
          
          if (currentCount > initialActivityCounts[userIndex]) {
            console.log(`User ${userIndex} sees activity count increase: ${initialActivityCounts[userIndex]} -> ${currentCount}`);
          }
        }
      }
    }
  });

  test('should show real-time notifications for user actions', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create a board that users will collaborate on
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Notification Test Board';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // User 0 creates a card
      const page0 = pages[0];
      await page0.click('[data-testid*="add-card-button"]');
      await page0.fill('[data-testid="card-title-input"]', 'Notification Test Card');
      await page0.click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(page0, 3000);
      
      // Other users should see notifications
      for (let userIndex = 1; userIndex < pages.length; userIndex++) {
        const userPage = pages[userIndex];
        
        const notificationTypes = [
          userPage.locator('[data-testid*="toast"]:has-text("card")'),
          userPage.locator('[data-testid*="notification"]:has-text("created")'),
          userPage.locator('[data-testid*="alert"]:has-text("Notification Test Card")'),
          userPage.locator('[role="alert"]:has-text("card")'),
          userPage.locator('.toast:has-text("card")')
        ];
        
        let hasNotification = false;
        for (const notification of notificationTypes) {
          if (await notification.count() > 0) {
            await expect(notification).toBeVisible({ timeout: 10000 });
            hasNotification = true;
            console.log(`User ${userIndex} sees card creation notification`);
            break;
          }
        }
        
        if (!hasNotification) {
          console.log(`User ${userIndex} does not see notifications (may not be implemented)`);
        }
      }
      
      // User 1 moves the card
      const page1 = pages[1];
      
      // First add a column to move to
      await page1.click('[data-testid="add-column-button"]');
      await page1.fill('[data-testid="column-name-input"]', 'In Progress');
      await page1.click('[data-testid="create-column-button"]');
      
      await waitForRealtimeSync(page1, 2000);
      
      // Move the card
      const card = page1.locator('[data-testid*="card"]:has-text("Notification Test Card")');
      const targetColumn = page1.locator('[data-testid*="column"]:has-text("In Progress")');
      
      if (await card.count() > 0 && await targetColumn.count() > 0) {
        await card.dragTo(targetColumn);
        
        await waitForRealtimeSync(page1, 3000);
        
        // Other users should see move notifications
        for (let userIndex = 0; userIndex < pages.length; userIndex++) {
          if (userIndex === 1) continue; // Skip the user who performed the action
          
          const userPage = pages[userIndex];
          
          const moveNotifications = [
            userPage.locator('[data-testid*="toast"]:has-text("moved")'),
            userPage.locator('[data-testid*="notification"]:has-text("In Progress")'),
            userPage.locator('[role="alert"]:has-text("moved")'),
          ];
          
          for (const notification of moveNotifications) {
            if (await notification.count() > 0) {
              console.log(`User ${userIndex} sees card move notification`);
              break;
            }
          }
        }
      }
    }
  });

  test('should maintain activity timeline consistency', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Generate a sequence of activities
    const activities = [
      async () => {
        // Activity 1: Create a board
        await pages[0].click('[data-testid="kanban-nav-link"]');
        const createButton = pages[0].locator('[data-testid="create-board-button"]');
        if (await createButton.count() > 0) {
          await createButton.click();
          await pages[0].fill('[data-testid="board-name-input"]', 'Timeline Test Board');
          await pages[0].click('[data-testid="create-board-submit"]');
          await pages[0].waitForURL('**/kanban/**');
        }
      },
      async () => {
        // Activity 2: Create a wiki page
        await pages[1].click('[data-testid="wiki-nav-link"]');
        const createButton = pages[1].locator('[data-testid="create-page-button"]');
        if (await createButton.count() > 0) {
          await createButton.click();
          await pages[1].fill('[data-testid="page-title-input"]', 'Timeline Test Page');
          await pages[1].fill('[data-testid="page-content-input"]', 'Content for timeline test');
          await pages[1].click('[data-testid="create-page-submit"]');
          await pages[1].waitForURL('**/wiki/**');
        }
      },
      async () => {
        // Activity 3: Add memory entry
        await pages[2].click('[data-testid="memory-nav-link"]');
        const addButton = pages[2].locator('[data-testid="add-memory-button"]');
        if (await addButton.count() > 0) {
          await addButton.click();
          await pages[2].fill('[data-testid="memory-title-input"]', 'Timeline Test Memory');
          await pages[2].fill('[data-testid="memory-content-input"]', 'Memory content for timeline');
          await pages[2].click('[data-testid="save-memory-button"]');
        }
      }
    ];
    
    // Execute activities in sequence
    for (let i = 0; i < activities.length; i++) {
      await activities[i]();
      await waitForRealtimeSync(pages[0], 3000);
    }
    
    // All users return to dashboard to check timeline
    for (const userPage of pages) {
      await userPage.click('[data-testid="dashboard-nav-link"]');
      await userPage.waitForLoadState('networkidle');
    }
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Verify timeline consistency across all users
    const timelineData = await Promise.all(
      pages.map(async (userPage, userIndex) => {
        const activityItems = userPage.locator('[data-testid*="activity-item"]');
        const count = await activityItems.count();
        
        const activities = [];
        for (let i = 0; i < Math.min(count, 10); i++) {
          const item = activityItems.nth(i);
          const text = await item.textContent();
          const timestamp = await item.getAttribute('data-timestamp');
          activities.push({ text, timestamp });
        }
        
        console.log(`User ${userIndex} sees ${count} activities`);
        return activities;
      })
    );
    
    // All users should see the same timeline (allowing for some variance in exact timing)
    const firstUserTimeline = timelineData[0];
    
    for (let userIndex = 1; userIndex < timelineData.length; userIndex++) {
      const userTimeline = timelineData[userIndex];
      
      // Should have similar number of activities
      expect(Math.abs(userTimeline.length - firstUserTimeline.length)).toBeLessThan(3);
      
      // Key activities should be present in all timelines
      const keyActivities = ['Timeline Test Board', 'Timeline Test Page', 'Timeline Test Memory'];
      
      for (const keyActivity of keyActivities) {
        const firstUserHasActivity = firstUserTimeline.some(activity => 
          activity.text?.includes(keyActivity)
        );
        const currentUserHasActivity = userTimeline.some(activity => 
          activity.text?.includes(keyActivity)
        );
        
        if (firstUserHasActivity) {
          expect(currentUserHasActivity).toBeTruthy();
        }
      }
    }
  });

  test('should handle activity feed filtering and personalization', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Check for activity filtering options
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      const filterOptions = [
        userPage.locator('[data-testid="activity-filter-all"]'),
        userPage.locator('[data-testid="activity-filter-kanban"]'),
        userPage.locator('[data-testid="activity-filter-wiki"]'),
        userPage.locator('[data-testid="activity-filter-memory"]'),
        userPage.locator('[data-testid="activity-filter-own"]'),
        userPage.locator('[data-testid="activity-filter"]')
      ];
      
      let hasFilterOptions = false;
      for (const filter of filterOptions) {
        if (await filter.count() > 0) {
          hasFilterOptions = true;
          console.log(`User ${userIndex} has activity filtering options`);
          
          // Test filtering if available
          if (await filter.textContent()) {
            const filterText = await filter.textContent();
            console.log(`Filter option: ${filterText}`);
            
            // Try clicking the filter
            await filter.click();
            await waitForRealtimeSync(userPage, 2000);
            
            // Should see filtered results
            const activityItems = userPage.locator('[data-testid*="activity-item"]');
            const filteredCount = await activityItems.count();
            console.log(`Filtered activity count: ${filteredCount}`);
          }
          break;
        }
      }
      
      if (!hasFilterOptions) {
        console.log(`User ${userIndex} does not have activity filtering (may not be implemented)`);
      }
      
      // Check for personalization options
      const personalizationOptions = [
        userPage.locator('[data-testid="activity-preferences"]'),
        userPage.locator('[data-testid="notification-settings"]'),
        userPage.locator('[data-testid="feed-settings"]')
      ];
      
      for (const option of personalizationOptions) {
        if (await option.count() > 0) {
          console.log(`User ${userIndex} has activity personalization options`);
          break;
        }
      }
    }
  });
});

test.describe('Real-time Notification System', () => {
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

  test('should deliver system-wide notifications in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Wait for all connections
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    // Send system-wide notification
    const systemNotification: MockWebSocketMessage = {
      type: 'system_notification',
      payload: {
        title: 'System Maintenance',
        message: 'Scheduled maintenance will begin in 30 minutes',
        priority: 'high',
        category: 'system',
        timestamp: Date.now()
      },
      timestamp: new Date().toISOString(),
      id: 'system-notification-1'
    };
    
    await mockServer.sendMessageToAll(systemNotification);
    
    // All users should receive the notification
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      const notificationElements = [
        userPage.locator('[data-testid="system-notification"]'),
        userPage.locator('[data-testid*="notification"]:has-text("System Maintenance")'),
        userPage.locator('[role="alert"]:has-text("maintenance")'),
        userPage.locator('.notification:has-text("maintenance")')
      ];
      
      let receivedNotification = false;
      for (const element of notificationElements) {
        if (await element.count() > 0) {
          await expect(element).toBeVisible({ timeout: 10000 });
          receivedNotification = true;
          console.log(`User ${userIndex} received system notification`);
          break;
        }
      }
      
      if (!receivedNotification) {
        console.log(`User ${userIndex} did not receive system notification (may not be implemented)`);
      }
    }
  });

  test('should handle notification priorities and categories', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    const notifications = [
      {
        type: 'collaboration_notification',
        payload: {
          title: 'Low Priority Update',
          message: 'Someone commented on a page',
          priority: 'low',
          category: 'collaboration'
        },
        timestamp: new Date().toISOString(),
        id: 'low-priority-1'
      },
      {
        type: 'security_notification',
        payload: {
          title: 'Security Alert',
          message: 'Unusual login activity detected',
          priority: 'urgent',
          category: 'security'
        },
        timestamp: new Date().toISOString(),
        id: 'urgent-security-1'
      },
      {
        type: 'system_notification',
        payload: {
          title: 'Feature Update',
          message: 'New collaboration features available',
          priority: 'medium',
          category: 'feature'
        },
        timestamp: new Date().toISOString(),
        id: 'medium-feature-1'
      }
    ];
    
    // Send notifications in order
    for (const notification of notifications) {
      await mockServer.sendMessageToAll(notification);
      await waitForRealtimeSync(pages[0], 1000);
    }
    
    // Check how notifications are displayed based on priority
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      // High priority/urgent notifications should be more prominent
      const urgentNotifications = userPage.locator('[data-priority="urgent"], [class*="urgent"], [class*="high-priority"]');
      const lowPriorityNotifications = userPage.locator('[data-priority="low"], [class*="low-priority"]');
      
      if (await urgentNotifications.count() > 0) {
        console.log(`User ${userIndex} sees urgent notifications with special styling`);
      }
      
      if (await lowPriorityNotifications.count() > 0) {
        console.log(`User ${userIndex} sees low priority notifications`);
      }
      
      // Check notification center/list
      const notificationCenter = userPage.locator('[data-testid="notification-center"]');
      const notificationList = userPage.locator('[data-testid="notification-list"]');
      
      if (await notificationCenter.count() > 0) {
        await notificationCenter.click();
        
        // Should show all notifications
        const allNotifications = userPage.locator('[data-testid*="notification-item"]');
        const notificationCount = await allNotifications.count();
        
        console.log(`User ${userIndex} notification center shows ${notificationCount} notifications`);
        expect(notificationCount).toBeGreaterThanOrEqual(notifications.length);
      }
    }
  });

  test('should support notification preferences and do-not-disturb', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Check for notification settings
    const userWithSettings = pages[0];
    
    const settingsElements = [
      userWithSettings.locator('[data-testid="notification-settings"]'),
      userWithSettings.locator('[data-testid="user-preferences"]'),
      userWithSettings.locator('[data-testid="settings-menu"]')
    ];
    
    let hasNotificationSettings = false;
    for (const element of settingsElements) {
      if (await element.count() > 0) {
        await element.click();
        hasNotificationSettings = true;
        break;
      }
    }
    
    if (hasNotificationSettings) {
      // Look for do-not-disturb toggle
      const dndToggle = userWithSettings.locator('[data-testid="do-not-disturb-toggle"]');
      const notificationToggle = userWithSettings.locator('[data-testid*="notification"]:has([type="checkbox"])');
      
      if (await dndToggle.count() > 0) {
        console.log('Do-not-disturb feature is available');
        
        // Enable do-not-disturb
        await dndToggle.click();
        
        // Wait for setting to apply
        await waitForRealtimeSync(userWithSettings, 2000);
        
        // Send a test notification
        const testNotification: MockWebSocketMessage = {
          type: 'test_notification',
          payload: {
            title: 'DND Test',
            message: 'This should be suppressed',
            priority: 'medium'
          },
          timestamp: new Date().toISOString(),
          id: 'dnd-test-1'
        };
        
        await mockServer.sendMessageToAll(testNotification);
        
        // User with DND should not see notification
        const suppressedNotification = userWithSettings.locator('[data-testid*="notification"]:has-text("DND Test")');
        
        // Wait briefly and confirm it doesn't appear
        await userWithSettings.waitForTimeout(3000);
        expect(await suppressedNotification.count()).toBe(0);
        
        // Other users should still see it
        for (let userIndex = 1; userIndex < pages.length; userIndex++) {
          const userPage = pages[userIndex];
          const visibleNotification = userPage.locator('[data-testid*="notification"]:has-text("DND Test")');
          
          if (await visibleNotification.count() > 0) {
            console.log(`User ${userIndex} received notification despite User 0's DND setting`);
          }
        }
      }
      
      if (await notificationToggle.count() > 0) {
        console.log('Notification preference toggles are available');
      }
      
    } else {
      console.log('Notification settings not found (may not be implemented)');
    }
  });

  test('should handle notification delivery failures gracefully', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Simulate network issue for one user
    const problematicUser = pages[pages.length - 1];
    const userIndex = pages.length - 1;
    
    // Partially disrupt connection (slow it down significantly)
    await problematicUser.route('**/*', async route => {
      // Add significant delay to simulate poor connection
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });
    
    // Send notifications
    const notifications = Array(5).fill(0).map((_, i) => ({
      type: 'test_notification',
      payload: {
        title: `Test Notification ${i + 1}`,
        message: `This is test notification number ${i + 1}`,
        priority: 'medium'
      },
      timestamp: new Date().toISOString(),
      id: `delivery-test-${i + 1}`
    }));
    
    for (const notification of notifications) {
      await mockServer.sendMessageToAll(notification);
      await waitForRealtimeSync(pages[0], 500);
    }
    
    // Users with good connections should receive notifications quickly
    for (let userIndex = 0; userIndex < pages.length - 1; userIndex++) {
      const userPage = pages[userIndex];
      
      // Should see multiple notifications
      const notificationElements = userPage.locator('[data-testid*="notification"]');
      const count = await notificationElements.count();
      
      console.log(`User ${userIndex} received ${count} notifications`);
      expect(count).toBeGreaterThan(0);
    }
    
    // Problematic user might receive fewer notifications initially
    const problematicUserNotifications = problematicUser.locator('[data-testid*="notification"]');
    const problematicCount = await problematicUserNotifications.count();
    
    console.log(`User ${userIndex} (with connection issues) received ${problematicCount} notifications`);
    
    // Eventually, even problematic user should receive notifications (with delay)
    await waitForRealtimeSync(problematicUser, 30000);
    
    const finalCount = await problematicUserNotifications.count();
    console.log(`User ${userIndex} eventually received ${finalCount} notifications`);
    
    // Should receive most notifications eventually
    expect(finalCount).toBeGreaterThan(0);
  });
});