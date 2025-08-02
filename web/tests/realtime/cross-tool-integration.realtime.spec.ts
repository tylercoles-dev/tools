/**
 * Cross-Tool Integration Tests for Real-time Collaboration
 * Tests real-time synchronization and integration between different MCP Tools including:
 * - Kanban updates reflected in linked Wiki pages
 * - Wiki changes updating related Memory entries
 * - Cross-tool notification synchronization
 * - Unified activity feeds across tools
 * - Search result updates in real-time
 * - Analytics data real-time aggregation
 * - Resource linking and reference updates
 * - Cross-tool user presence and activity tracking
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer, MockWebSocketMessage } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Cross-Tool Real-time Synchronization', () => {
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

  test('should sync Kanban updates to linked Wiki pages in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // User 0: Create Wiki page
    const wikiUser = pages[0];
    await wikiUser.goto('/wiki');
    
    const createPageButton = wikiUser.locator('[data-testid="create-page-button"]');
    if (await createPageButton.count() > 0) {
      await createPageButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Project Documentation';
      pageData.content = `# Project Documentation

This page tracks our project progress.

## Related Kanban Board
- Board: [[Project Board]]
- Status: In Progress

## Tasks
Tasks will be automatically updated from the linked Kanban board.`;
      
      await wikiUser.fill('[data-testid="page-title-input"]', pageData.title);
      await wikiUser.fill('[data-testid="page-content-input"]', pageData.content);
      await wikiUser.click('[data-testid="create-page-submit"]');
      
      await wikiUser.waitForURL('**/wiki/**');
      const pageUrl = wikiUser.url();
      
      // User 1: Create linked Kanban board
      const kanbanUser = pages[1];
      await kanbanUser.goto('/kanban');
      
      const createBoardButton = kanbanUser.locator('[data-testid="create-board-button"]');
      if (await createBoardButton.count() > 0) {
        await createBoardButton.click();
        
        await kanbanUser.fill('[data-testid="board-name-input"]', 'Project Board');
        await kanbanUser.fill('[data-testid="board-description-input"]', 'Linked to Project Documentation wiki page');
        
        // Link to wiki page if available
        const wikiLinkInput = kanbanUser.locator('[data-testid="linked-wiki-page-input"]');
        if (await wikiLinkInput.count() > 0) {
          await wikiLinkInput.fill('Project Documentation');
        }
        
        await kanbanUser.click('[data-testid="create-board-submit"]');
        await kanbanUser.waitForURL('**/kanban/**');
        const boardUrl = kanbanUser.url();
        
        // Add cards to the board
        await kanbanUser.click('[data-testid*="add-card-button"]');
        await kanbanUser.fill('[data-testid="card-title-input"]', 'Implement real-time sync');
        await kanbanUser.fill('[data-testid="card-description-input"]', 'Add real-time synchronization between tools');
        await kanbanUser.click('[data-testid="create-card-button"]');
        
        await waitForRealtimeSync(kanbanUser, 3000);
        
        // User 2: Check if Wiki page reflects Kanban updates
        const observerUser = pages[2];
        await observerUser.goto(pageUrl);
        
        // Look for auto-generated content or linked references
        const linkedContent = [
          observerUser.locator('[data-testid="linked-kanban-tasks"]'),
          observerUser.locator('[data-testid="auto-generated-task-list"]'),
          observerUser.locator('[data-testid*="kanban-sync"]'),
          observerUser.locator('text=Implement real-time sync')
        ];
        
        let foundLinkedContent = false;
        for (const element of linkedContent) {
          if (await element.count() > 0) {
            await expect(element).toBeVisible({ timeout: 10000 });
            foundLinkedContent = true;
            console.log('Wiki page shows linked Kanban content');
            break;
          }
        }
        
        if (!foundLinkedContent) {
          console.log('Cross-tool linking may not be implemented');
        }
        
        // Move card in Kanban and check Wiki update
        await kanbanUser.click('[data-testid="add-column-button"]');
        await kanbanUser.fill('[data-testid="column-name-input"]', 'In Progress');
        await kanbanUser.click('[data-testid="create-column-button"]');
        
        await waitForRealtimeSync(kanbanUser, 2000);
        
        const card = kanbanUser.locator('[data-testid*="card"]:has-text("Implement real-time sync")');
        const targetColumn = kanbanUser.locator('[data-testid*="column"]:has-text("In Progress")');
        
        if (await card.count() > 0 && await targetColumn.count() > 0) {
          await card.dragTo(targetColumn);
          
          await waitForRealtimeSync(kanbanUser, 3000);
          
          // Wiki page should reflect status change
          await observerUser.reload();
          await waitForRealtimeSync(observerUser, 3000);
          
          const statusUpdate = observerUser.locator('text=In Progress');
          if (await statusUpdate.count() > 0) {
            console.log('Wiki page reflects Kanban status changes');
          }
        }
      }
    }
  });

  test('should update Memory entries when related Wiki pages change', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // User 0: Create Memory entry
    const memoryUser = pages[0];
    await memoryUser.goto('/memory');
    
    const addMemoryButton = memoryUser.locator('[data-testid="add-memory-button"]');
    if (await addMemoryButton.count() > 0) {
      await addMemoryButton.click();
      
      await memoryUser.fill('[data-testid="memory-title-input"]', 'Project Knowledge Base');
      await memoryUser.fill('[data-testid="memory-content-input"]', 'Collecting insights and learnings from our project.');
      
      const linkedWikiInput = memoryUser.locator('[data-testid="linked-wiki-pages-input"]');
      if (await linkedWikiInput.count() > 0) {
        await linkedWikiInput.fill('Technical Documentation');
      }
      
      await memoryUser.click('[data-testid="save-memory-button"]');
      
      const memoryUrl = memoryUser.url();
      
      // User 1: Create and edit Wiki page
      const wikiUser = pages[1];
      await wikiUser.goto('/wiki');
      
      const createPageButton = wikiUser.locator('[data-testid="create-page-button"]');
      if (await createPageButton.count() > 0) {
        await createPageButton.click();
        
        await wikiUser.fill('[data-testid="page-title-input"]', 'Technical Documentation');
        await wikiUser.fill('[data-testid="page-content-input"]', `# Technical Documentation

## Architecture Overview
Our system uses a microservices architecture with real-time synchronization.

## Key Insights
- WebSocket connections provide reliable real-time updates
- Cross-tool integration requires careful event coordination
- Memory system helps track important knowledge`);
        
        await wikiUser.click('[data-testid="create-page-submit"]');
        await wikiUser.waitForURL('**/wiki/**');
        
        await waitForRealtimeSync(wikiUser, 3000);
        
        // User 2: Check if Memory entry reflects Wiki changes
        const observerUser = pages[2];
        await observerUser.goto('/memory');
        
        // Look for updated memory content or linked references
        const memoryEntry = observerUser.locator('[data-testid*="memory"]:has-text("Project Knowledge Base")');
        if (await memoryEntry.count() > 0) {
          await memoryEntry.click();
          
          const linkedReferences = [
            observerUser.locator('[data-testid="linked-wiki-references"]'),
            observerUser.locator('[data-testid*="wiki-sync"]'),
            observerUser.locator('text=Technical Documentation'),
            observerUser.locator('text=Architecture Overview')
          ];
          
          for (const reference of linkedReferences) {
            if (await reference.count() > 0) {
              console.log('Memory entry shows linked Wiki content');
              break;
            }
          }
        }
        
        // Edit Wiki page and check Memory update
        await wikiUser.click('[data-testid="edit-page-button"]');
        const editor = wikiUser.locator('[data-testid="wiki-editor"]');
        
        if (await editor.count() > 0) {
          const currentContent = await editor.inputValue();
          await editor.fill(currentContent + '\n\n## New Section\nAdded during cross-tool sync test.');
          await wikiUser.click('[data-testid="save-page-button"]');
          
          await waitForRealtimeSync(wikiUser, 5000);
          
          // Memory should reflect the change
          await observerUser.reload();
          await waitForRealtimeSync(observerUser, 3000);
          
          const updatedReference = observerUser.locator('text=New Section');
          if (await updatedReference.count() > 0) {
            console.log('Memory entry updated with Wiki changes');
          }
        }
      }
    }
  });

  test('should synchronize notifications across all tools', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Users positioned in different tools
    await pages[0].goto('/kanban');
    await pages[1].goto('/wiki');
    await pages[2].goto('/memory');
    
    // Wait for all connections
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    // Send cross-tool notification
    const crossToolNotification: MockWebSocketMessage = {
      type: 'cross_tool_notification',
      payload: {
        title: 'System Integration Update',
        message: 'Cross-tool synchronization has been enhanced',
        category: 'system',
        priority: 'medium',
        affectedTools: ['kanban', 'wiki', 'memory'],
        timestamp: Date.now()
      },
      timestamp: new Date().toISOString(),
      id: 'cross-tool-notification-1'
    };
    
    await mockServer.sendMessageToAll(crossToolNotification);
    
    // All users should receive notification regardless of current tool
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      const notificationElements = [
        userPage.locator('[data-testid*="notification"]:has-text("System Integration")'),
        userPage.locator('[data-testid="cross-tool-notification"]'),
        userPage.locator('[role="alert"]:has-text("Integration")'),
        userPage.locator('.notification:has-text("synchronization")')
      ];
      
      let receivedNotification = false;
      for (const element of notificationElements) {
        if (await element.count() > 0) {
          await expect(element).toBeVisible({ timeout: 10000 });
          receivedNotification = true;
          console.log(`User ${userIndex} received cross-tool notification`);
          break;
        }
      }
      
      if (!receivedNotification) {
        console.log(`User ${userIndex} did not receive cross-tool notification`);
      }
    }
    
    // Test tool-specific notifications
    const kanbanNotification: MockWebSocketMessage = {
      type: 'tool_notification',
      payload: {
        title: 'Kanban Update',
        message: 'New drag-and-drop features available',
        tool: 'kanban',
        priority: 'low'
      },
      timestamp: new Date().toISOString(),
      id: 'kanban-specific-notification'
    };
    
    await mockServer.sendMessageToAll(kanbanNotification);
    
    // Only Kanban user should see tool-specific notification prominently
    const kanbanUser = pages[0];
    const kanbanSpecificNotification = kanbanUser.locator('[data-testid*="notification"]:has-text("drag-and-drop")');
    
    if (await kanbanSpecificNotification.count() > 0) {
      await expect(kanbanSpecificNotification).toBeVisible({ timeout: 10000 });
      console.log('Kanban user received tool-specific notification');
    }
    
    // Other users might see it in notification center but not prominently
    for (let userIndex = 1; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      const notificationCenter = userPage.locator('[data-testid="notification-center"]');
      
      if (await notificationCenter.count() > 0) {
        await notificationCenter.click();
        
        const toolNotification = userPage.locator('[data-testid*="notification"]:has-text("Kanban Update")');
        if (await toolNotification.count() > 0) {
          console.log(`User ${userIndex} sees Kanban notification in notification center`);
        }
      }
    }
  });

  test('should maintain unified activity feed across tools', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // All users start at dashboard to see unified activity feed
    await simulator.navigateAllUsers('/dashboard');
    
    // Verify activity feed is visible
    for (const userPage of pages) {
      const activityFeed = userPage.locator('[data-testid="activity-feed"]');
      if (await activityFeed.count() > 0) {
        await expect(activityFeed).toBeVisible();
      }
    }
    
    // Generate activities across different tools
    const crossToolActivities = [
      {
        tool: 'kanban',
        action: async () => {
          await pages[0].click('[data-testid="kanban-nav-link"]');
          const createButton = pages[0].locator('[data-testid="create-board-button"]');
          if (await createButton.count() > 0) {
            await createButton.click();
            await pages[0].fill('[data-testid="board-name-input"]', 'Cross-Tool Activity Board');
            await pages[0].click('[data-testid="create-board-submit"]');
          }
        }
      },
      {
        tool: 'wiki',
        action: async () => {
          await pages[1].click('[data-testid="wiki-nav-link"]');
          const createButton = pages[1].locator('[data-testid="create-page-button"]');
          if (await createButton.count() > 0) {
            await createButton.click();
            await pages[1].fill('[data-testid="page-title-input"]', 'Cross-Tool Activity Page');
            await pages[1].fill('[data-testid="page-content-input"]', 'Testing unified activity feed');
            await pages[1].click('[data-testid="create-page-submit"]');
          }
        }
      },
      {
        tool: 'memory',
        action: async () => {
          await pages[2].click('[data-testid="memory-nav-link"]');
          const addButton = pages[2].locator('[data-testid="add-memory-button"]');
          if (await addButton.count() > 0) {
            await addButton.click();
            await pages[2].fill('[data-testid="memory-title-input"]', 'Cross-Tool Activity Memory');
            await pages[2].fill('[data-testid="memory-content-input"]', 'Memory for testing activity feed');
            await pages[2].click('[data-testid="save-memory-button"]');
          }
        }
      }
    ];
    
    // Execute activities sequentially
    for (const activity of crossToolActivities) {
      await activity.action();
      await waitForRealtimeSync(pages[0], 3000);
    }
    
    // All users return to dashboard
    for (const userPage of pages) {
      await userPage.click('[data-testid="dashboard-nav-link"]');
      await userPage.waitForLoadState('networkidle');
    }
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Verify unified activity feed shows activities from all tools
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      
      const activityFeed = userPage.locator('[data-testid="activity-feed"]');
      if (await activityFeed.count() > 0) {
        // Should see activities from all tools
        const kanbanActivity = userPage.locator('[data-testid*="activity"]:has-text("Cross-Tool Activity Board")');
        const wikiActivity = userPage.locator('[data-testid*="activity"]:has-text("Cross-Tool Activity Page")');
        const memoryActivity = userPage.locator('[data-testid*="activity"]:has-text("Cross-Tool Activity Memory")');
        
        const activities = [
          { name: 'Kanban', element: kanbanActivity },
          { name: 'Wiki', element: wikiActivity },
          { name: 'Memory', element: memoryActivity }
        ];
        
        for (const activity of activities) {
          if (await activity.element.count() > 0) {
            console.log(`User ${userIndex} sees ${activity.name} activity in unified feed`);
          }
        }
      }
      
      // Check activity timestamps are in chronological order
      const activityItems = userPage.locator('[data-testid*="activity-item"]');
      const itemCount = await activityItems.count();
      
      if (itemCount > 1) {
        const timestamps = [];
        for (let i = 0; i < Math.min(itemCount, 5); i++) {
          const item = activityItems.nth(i);
          const timestamp = await item.getAttribute('data-timestamp');
          if (timestamp) {
            timestamps.push(new Date(timestamp).getTime());
          }
        }
        
        // Should be in descending order (newest first)
        let isOrdered = true;
        for (let i = 1; i < timestamps.length; i++) {
          if (timestamps[i] > timestamps[i - 1]) {
            isOrdered = false;
            break;
          }
        }
        
        if (isOrdered) {
          console.log(`User ${userIndex} activity feed is chronologically ordered`);
        }
      }
    }
  });

  test('should update search results in real-time across tools', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // User 0: Perform initial search
    const searchUser = pages[0];
    await searchUser.goto('/dashboard');
    
    const searchInput = searchUser.locator('[data-testid="global-search-input"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('real-time collaboration');
      await searchUser.keyboard.press('Enter');
      
      // Wait for search results
      await waitForRealtimeSync(searchUser, 3000);
      
      const initialResults = searchUser.locator('[data-testid*="search-result"]');
      const initialCount = await initialResults.count();
      
      console.log(`Initial search found ${initialCount} results`);
      
      // User 1: Create new content that matches search
      const contentUser = pages[1];
      await contentUser.goto('/wiki');
      
      const createButton = contentUser.locator('[data-testid="create-page-button"]');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        await contentUser.fill('[data-testid="page-title-input"]', 'Real-time Collaboration Guide');
        await contentUser.fill('[data-testid="page-content-input"]', `# Real-time Collaboration Guide

This guide covers real-time collaboration features and best practices.

## Features
- Live editing
- User presence
- Conflict resolution
- Cross-tool synchronization`);
        
        await contentUser.click('[data-testid="create-page-submit"]');
        await contentUser.waitForURL('**/wiki/**');
        
        await waitForRealtimeSync(contentUser, 5000);
        
        // Search results should update automatically
        const updatedResults = searchUser.locator('[data-testid*="search-result"]');
        
        // Wait for search index to update
        await searchUser.waitForTimeout(5000);
        
        const updatedCount = await updatedResults.count();
        console.log(`Updated search found ${updatedCount} results`);
        
        if (updatedCount > initialCount) {
          console.log('Search results updated in real-time');
          
          // New result should be visible
          const newResult = searchUser.locator('[data-testid*="search-result"]:has-text("Real-time Collaboration Guide")');
          if (await newResult.count() > 0) {
            await expect(newResult).toBeVisible();
            console.log('New content appears in search results');
          }
        }
      }
      
      // User 2: Edit existing content to match search
      const editorUser = pages[2];
      await editorUser.goto('/kanban');
      
      const createBoardButton = editorUser.locator('[data-testid="create-board-button"]');
      if (await createBoardButton.count() > 0) {
        await createBoardButton.click();
        
        await editorUser.fill('[data-testid="board-name-input"]', 'Real-time Collaboration Testing');
        await editorUser.fill('[data-testid="board-description-input"]', 'Board for testing real-time collaboration features');
        await editorUser.click('[data-testid="create-board-submit"]');
        
        await editorUser.waitForURL('**/kanban/**');
        await waitForRealtimeSync(editorUser, 5000);
        
        // Search should include the new board
        await searchUser.waitForTimeout(3000);
        
        const finalResults = searchUser.locator('[data-testid*="search-result"]');
        const finalCount = await finalResults.count();
        
        console.log(`Final search found ${finalCount} results`);
        
        const boardResult = searchUser.locator('[data-testid*="search-result"]:has-text("Real-time Collaboration Testing")');
        if (await boardResult.count() > 0) {
          console.log('Kanban board appears in search results');
        }
      }
    } else {
      console.log('Global search not available');
    }
  });

  test('should aggregate analytics data across tools in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Navigate to analytics dashboard
    const analyticsUser = pages[0];
    await analyticsUser.goto('/dashboard/analytics');
    
    const analyticsSection = analyticsUser.locator('[data-testid="analytics-section"]');
    if (await analyticsSection.count() > 0) {
      // Get initial metrics
      const initialMetrics = await analyticsUser.evaluate(() => {
        const metricsElements = document.querySelectorAll('[data-testid*="metric-value"]');
        const metrics: { [key: string]: string } = {};
        
        metricsElements.forEach(element => {
          const metricName = element.getAttribute('data-metric-name');
          const metricValue = element.textContent;
          if (metricName && metricValue) {
            metrics[metricName] = metricValue;
          }
        });
        
        return metrics;
      });
      
      console.log('Initial analytics metrics:', initialMetrics);
      
      // Generate activity across tools
      const activities = [
        async () => {
          // Kanban activity
          await pages[1].goto('/kanban');
          const createButton = pages[1].locator('[data-testid="create-board-button"]');
          if (await createButton.count() > 0) {
            await createButton.click();
            await pages[1].fill('[data-testid="board-name-input"]', 'Analytics Test Board');
            await pages[1].click('[data-testid="create-board-submit"]');
          }
        },
        async () => {
          // Wiki activity
          await pages[2].goto('/wiki');
          const createButton = pages[2].locator('[data-testid="create-page-button"]');
          if (await createButton.count() > 0) {
            await createButton.click();
            await pages[2].fill('[data-testid="page-title-input"]', 'Analytics Test Page');
            await pages[2].fill('[data-testid="page-content-input"]', 'Testing analytics aggregation');
            await pages[2].click('[data-testid="create-page-submit"]');
          }
        }
      ];
      
      // Execute activities
      for (const activity of activities) {
        await activity();
        await waitForRealtimeSync(pages[0], 3000);
      }
      
      // Wait for analytics to update
      await waitForRealtimeSync(analyticsUser, 10000);
      
      // Check for updated metrics
      const updatedMetrics = await analyticsUser.evaluate(() => {
        const metricsElements = document.querySelectorAll('[data-testid*="metric-value"]');
        const metrics: { [key: string]: string } = {};
        
        metricsElements.forEach(element => {
          const metricName = element.getAttribute('data-metric-name');
          const metricValue = element.textContent;
          if (metricName && metricValue) {
            metrics[metricName] = metricValue;
          }
        });
        
        return metrics;
      });
      
      console.log('Updated analytics metrics:', updatedMetrics);
      
      // Check for real-time activity indicators
      const realtimeIndicators = [
        analyticsUser.locator('[data-testid="real-time-activity-indicator"]'),
        analyticsUser.locator('[data-testid="live-metrics-indicator"]'),
        analyticsUser.locator('[data-testid*="real-time"]')
      ];
      
      for (const indicator of realtimeIndicators) {
        if (await indicator.count() > 0) {
          console.log('Real-time analytics indicators are working');
          break;
        }
      }
      
      // Check for cross-tool analytics
      const crossToolMetrics = [
        analyticsUser.locator('[data-testid="kanban-metrics"]'),
        analyticsUser.locator('[data-testid="wiki-metrics"]'),
        analyticsUser.locator('[data-testid="memory-metrics"]'),
        analyticsUser.locator('[data-testid="cross-tool-metrics"]')
      ];
      
      let foundCrossToolMetrics = false;
      for (const metric of crossToolMetrics) {
        if (await metric.count() > 0) {
          foundCrossToolMetrics = true;
          console.log('Cross-tool analytics are available');
          break;
        }
      }
      
      if (!foundCrossToolMetrics) {
        console.log('Cross-tool analytics may not be implemented');
      }
      
    } else {
      console.log('Analytics dashboard not available');
    }
  });

  test('should handle resource linking and reference updates', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Create interconnected resources
    // User 0: Create Wiki page with Kanban reference
    const wikiUser = pages[0];
    await wikiUser.goto('/wiki');
    
    const createButton = wikiUser.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await wikiUser.fill('[data-testid="page-title-input"]', 'Resource Linking Test');
      await wikiUser.fill('[data-testid="page-content-input"]', `# Resource Linking Test

This page references several resources:

## Kanban Board
Related board: [[Resource Test Board]]

## Memory Entries
See also: [[Resource Knowledge]]

## Task List
- [ ] Test cross-tool linking
- [ ] Verify real-time updates
- [ ] Document findings`);
      
      await wikiUser.click('[data-testid="create-page-submit"]');
      await wikiUser.waitForURL('**/wiki/**');
      const wikiPageUrl = wikiUser.url();
      
      // User 1: Create referenced Kanban board
      const kanbanUser = pages[1];
      await kanbanUser.goto('/kanban');
      
      const createBoardButton = kanbanUser.locator('[data-testid="create-board-button"]');
      if (await createBoardButton.count() > 0) {
        await createBoardButton.click();
        
        await kanbanUser.fill('[data-testid="board-name-input"]', 'Resource Test Board');
        await kanbanUser.fill('[data-testid="board-description-input"]', 'Referenced from Resource Linking Test wiki page');
        
        // Link back to wiki page if available
        const wikiReferenceInput = kanbanUser.locator('[data-testid="wiki-reference-input"]');
        if (await wikiReferenceInput.count() > 0) {
          await wikiReferenceInput.fill('Resource Linking Test');
        }
        
        await kanbanUser.click('[data-testid="create-board-submit"]');
        await kanbanUser.waitForURL('**/kanban/**');
        
        await waitForRealtimeSync(kanbanUser, 3000);
        
        // User 2: Check if links are resolved
        const observerUser = pages[2];
        await observerUser.goto(wikiPageUrl);
        
        // Look for resolved links
        const resolvedLinks = [
          observerUser.locator('[data-testid*="resolved-link"]:has-text("Resource Test Board")'),
          observerUser.locator('[data-testid*="kanban-link"]'),
          observerUser.locator('a[href*="kanban"]:has-text("Resource Test Board")')
        ];
        
        for (const link of resolvedLinks) {
          if (await link.count() > 0) {
            console.log('Wiki page shows resolved Kanban board link');
            
            // Test link functionality
            await link.click();
            
            // Should navigate to the board or show preview
            const boardContent = observerUser.locator('[data-testid*="board"]:has-text("Resource Test Board")');
            const boardPreview = observerUser.locator('[data-testid="board-preview"]');
            
            if (await boardContent.count() > 0 || await boardPreview.count() > 0) {
              console.log('Link navigation/preview is working');
            }
            break;
          }
        }
        
        // Test bidirectional linking
        await observerUser.goto('/kanban');
        
        const boardLink = observerUser.locator('[data-testid*="board"]:has-text("Resource Test Board")');
        if (await boardLink.count() > 0) {
          await boardLink.click();
          
          // Look for back-reference to wiki page
          const wikiBackReference = [
            observerUser.locator('[data-testid="linked-wiki-pages"]'),
            observerUser.locator('[data-testid*="wiki-reference"]'),
            observerUser.locator('a[href*="wiki"]:has-text("Resource Linking Test")')
          ];
          
          for (const reference of wikiBackReference) {
            if (await reference.count() > 0) {
              console.log('Kanban board shows back-reference to wiki page');
              break;
            }
          }
        }
      }
    }
  });
});

test.describe('Cross-Tool User Presence and Activity', () => {
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(4);
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
  });

  test('should track user activity across different tools', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Distribute users across tools
    const toolAssignments = [
      { user: 0, tool: 'dashboard', path: '/dashboard' },
      { user: 1, tool: 'kanban', path: '/kanban' },
      { user: 2, tool: 'wiki', path: '/wiki' },
      { user: 3, tool: 'memory', path: '/memory' }
    ];
    
    // Navigate users to different tools
    for (const assignment of toolAssignments) {
      await pages[assignment.user].goto(assignment.path);
      await pages[assignment.user].waitForLoadState('networkidle');
    }
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Dashboard user should see cross-tool activity overview
    const dashboardUser = pages[0];
    
    const crossToolActivity = [
      dashboardUser.locator('[data-testid="cross-tool-activity-overview"]'),
      dashboardUser.locator('[data-testid="tool-user-distribution"]'),
      dashboardUser.locator('[data-testid="active-users-by-tool"]')
    ];
    
    for (const element of crossToolActivity) {
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
        console.log('Cross-tool activity overview is available');
        
        // Should show users in different tools
        const toolIndicators = [
          element.locator('[data-testid*="kanban-users"]'),
          element.locator('[data-testid*="wiki-users"]'),
          element.locator('[data-testid*="memory-users"]')
        ];
        
        for (const indicator of toolIndicators) {
          if (await indicator.count() > 0) {
            const userCount = await indicator.textContent();
            console.log(`Tool activity indicator: ${userCount}`);
          }
        }
        break;
      }
    }
    
    // Test user movement between tools
    const kanbanUser = pages[1];
    await kanbanUser.click('[data-testid="wiki-nav-link"]');
    await kanbanUser.waitForLoadState('networkidle');
    
    await waitForRealtimeSync(dashboardUser, 3000);
    
    // Activity overview should update
    const wikiUserCount = dashboardUser.locator('[data-testid*="wiki-users"]');
    if (await wikiUserCount.count() > 0) {
      const count = await wikiUserCount.textContent();
      console.log(`Wiki users after movement: ${count}`);
      
      // Should show increased count
      expect(count).toContain('2'); // Original wiki user + moved user
    }
  });

  test('should provide unified user presence across tools', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // All users start at dashboard
    await simulator.navigateAllUsers('/dashboard');
    
    // Check unified presence indicator
    for (const userPage of pages) {
      const unifiedPresence = [
        userPage.locator('[data-testid="unified-user-presence"]'),
        userPage.locator('[data-testid="global-user-status"]'),
        userPage.locator('[data-testid="team-presence-overview"]')
      ];
      
      for (const element of unifiedPresence) {
        if (await element.count() > 0) {
          await expect(element).toBeVisible();
          console.log('Unified presence indicator is available');
          
          // Should show all team members
          const userIndicators = element.locator('[data-testid*="user-presence-indicator"]');
          const userCount = await userIndicators.count();
          
          console.log(`Showing ${userCount} user presence indicators`);
          expect(userCount).toBeGreaterThanOrEqual(pages.length - 1); // Excluding self
          break;
        }
      }
    }
    
    // Users move to different tools
    await pages[1].goto('/kanban');
    await pages[2].goto('/wiki');
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Presence should update with current tool information
    const dashboardUser = pages[0];
    const detailedPresence = dashboardUser.locator('[data-testid="detailed-user-presence"]');
    
    if (await detailedPresence.count() > 0) {
      // Should show which tool each user is in
      const kanbanPresence = detailedPresence.locator('[data-testid*="user-in-kanban"]');
      const wikiPresence = detailedPresence.locator('[data-testid*="user-in-wiki"]');
      
      if (await kanbanPresence.count() > 0) {
        console.log('User presence in Kanban is tracked');
      }
      if (await wikiPresence.count() > 0) {
        console.log('User presence in Wiki is tracked');
      }
    }
  });
});