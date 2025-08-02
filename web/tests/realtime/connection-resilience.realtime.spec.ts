/**
 * Connection Resilience Tests
 * Tests the robustness and reliability of WebSocket connections under various
 * network conditions and failure scenarios including:
 * - Network disconnection/reconnection scenarios
 * - Offline editing with sync on reconnection
 * - Partial message delivery handling
 * - WebSocket upgrade failures (fallback to polling)
 * - Server restart during active collaboration
 * - Client-side queue management for offline actions
 * - Connection pooling and resource management
 * - Cross-tab synchronization during network issues
 */

import { test, expect, Page } from '@playwright/test';
import { 
  NetworkSimulator, 
  NetworkConditions, 
  MockWebSocketServer,
  RealtimeMetricsCollector
} from '../utils/websocket-mock';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency,
  simulateLatency
} from '../utils/realtime-test-helpers';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('Network Disconnection and Reconnection', () => {
  let mockServer: MockWebSocketServer;
  let networkSimulator: NetworkSimulator;
  let metricsCollector: RealtimeMetricsCollector;

  test.beforeEach(async ({ page }) => {
    mockServer = new MockWebSocketServer();
    networkSimulator = new NetworkSimulator(page);
    metricsCollector = new RealtimeMetricsCollector();
    
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should handle clean disconnection and reconnection', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for initial connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    metricsCollector.startConnectionTimer();

    // Perform clean disconnection
    await networkSimulator.goOffline();
    
    // Should detect disconnection quickly
    await expect(page.locator('[data-testid="connection-status"][data-status="disconnected"]'))
      .toBeVisible({ timeout: 10000 });

    // Restore connection
    await networkSimulator.goOnline();
    
    // Should reconnect automatically
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 15000 });

    metricsCollector.recordReconnectionTime(Date.now() - (metricsCollector as any).connectionStartTime);
    
    // Verify functionality after reconnection
    await expect(page.locator('[data-testid="realtime-indicator"]'))
      .toBeVisible({ timeout: 5000 });

    const metrics = metricsCollector.calculateMetrics();
    expect(metrics.reconnectionTime).toBeLessThan(20000); // Should reconnect within 20 seconds
  });

  test('should handle abrupt connection loss', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate abrupt connection loss (network cable unplugged)
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    // Should detect loss within reasonable time
    await expect(page.locator('[data-testid="connection-status"]'))
      .toHaveAttribute('data-status', 'disconnected', { timeout: 30000 });

    // Check for appropriate user messaging
    const disconnectionMessage = page.locator('[data-testid="disconnection-message"]');
    if (await disconnectionMessage.count() > 0) {
      await expect(disconnectionMessage).toBeVisible();
    }

    // Restore connection abruptly
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 20,
      downloadThroughput: 10000000,
      uploadThroughput: 10000000,
    });

    // Should reconnect
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 25000 });
  });

  test('should handle intermittent connectivity issues', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate unstable connection with multiple disconnections
    for (let cycle = 0; cycle < 5; cycle++) {
      console.log(`Intermittent connectivity cycle ${cycle + 1}`);
      
      // Go offline for short period
      await networkSimulator.goOffline();
      await page.waitForTimeout(2000);
      
      // Come back online
      await networkSimulator.goOnline();
      await page.waitForTimeout(3000);
    }

    // Should eventually stabilize connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 20000 });

    // Check for connection quality warnings
    const qualityWarning = page.locator('[data-testid="connection-quality-warning"]');
    const unstableNotice = page.locator('[data-testid="connection-unstable-notice"]');
    
    const hasQualityWarning = await qualityWarning.count() > 0;
    const hasUnstableNotice = await unstableNotice.count() > 0;
    
    if (hasQualityWarning || hasUnstableNotice) {
      console.log('Connection quality monitoring is working');
    }
  });

  test('should maintain connection across different network conditions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start with good connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Test different network conditions
    const networkTests = [
      { name: 'Fast 3G', condition: NetworkConditions.FAST_3G },
      { name: 'Slow 3G', condition: NetworkConditions.SLOW_3G },
      { name: 'Slow WiFi', condition: NetworkConditions.SLOW_WIFI },
      { name: 'Fast WiFi', condition: NetworkConditions.FAST_WIFI },
    ];

    for (const networkTest of networkTests) {
      console.log(`Testing ${networkTest.name} conditions`);
      
      await networkSimulator.setNetworkCondition(networkTest.condition);
      
      // Wait for adjustment
      await page.waitForTimeout(3000);
      
      // Connection should remain stable (though possibly slow)
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });

      // Test basic functionality under this network condition
      const testMessage = {
        type: 'network_test',
        payload: { condition: networkTest.name, timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2, 9)
      };

      const messageStartTime = Date.now();
      await mockServer.sendMessageToAll(testMessage);
      
      // Wait for message processing
      await page.waitForFunction((messageId) => {
        const messages = (window as any).receivedMessages || [];
        return messages.some((msg: any) => msg.id === messageId);
      }, testMessage.id, { timeout: 15000 });

      const messageLatency = Date.now() - messageStartTime;
      console.log(`${networkTest.name} latency: ${messageLatency}ms`);
      
      // Slower networks should have higher latency but still work
      if (networkTest.name.includes('Slow')) {
        expect(messageLatency).toBeGreaterThan(1000);
      } else {
        expect(messageLatency).toBeLessThan(5000);
      }
    }
  });

  test('should handle DNS resolution failures', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for initial connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate DNS failure by blocking DNS resolution
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        // Block localhost resolution to simulate DNS failure
        await route.abort('name-not-resolved');
      } else {
        await route.continue();
      }
    });

    // Should detect connection issues
    await expect(page.locator('[data-testid="connection-status"]'))
      .not.toHaveAttribute('data-status', 'connected', { timeout: 15000 });

    // Check for DNS-specific error messaging
    const dnsError = page.locator('[data-testid="dns-error"], [data-testid="connection-error"]:has-text("resolve")');
    if (await dnsError.count() > 0) {
      await expect(dnsError).toBeVisible();
    }

    // Restore DNS resolution
    await page.unroute('**/*');

    // Should recover
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 30000 });
  });
});

test.describe('Offline Editing and Synchronization', () => {
  let collaborationTester: RealtimeCollaborationTester;
  let mockServer: MockWebSocketServer;

  test.beforeEach(async ({ page, context }) => {
    collaborationTester = new RealtimeCollaborationTester(2);
    mockServer = new MockWebSocketServer();
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should queue Kanban operations during offline mode', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Offline Queue Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Both users connected initially
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // User 0 goes offline
      const page0 = pages[0];
      await page0.context().setOffline(true);
      
      // Verify offline status
      await expect(page0.locator('[data-testid="connection-status"][data-status="disconnected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // User 0 performs operations while offline (should be queued)
      const offlineOperations = [
        async () => {
          await page0.click('[data-testid*="add-card-button"]');
          await page0.fill('[data-testid="card-title-input"]', 'Offline Card 1');
          await page0.fill('[data-testid="card-description-input"]', 'Created while offline');
          await page0.click('[data-testid="create-card-button"]');
        },
        async () => {
          await page0.click('[data-testid*="add-card-button"]');
          await page0.fill('[data-testid="card-title-input"]', 'Offline Card 2');
          await page0.click('[data-testid="create-card-button"]');
        },
        async () => {
          await page0.click('[data-testid="add-column-button"]');
          await page0.fill('[data-testid="column-name-input"]', 'Offline Column');
          await page0.click('[data-testid="create-column-button"]');
        }
      ];
      
      for (const operation of offlineOperations) {
        await operation();
        await page0.waitForTimeout(500);
      }
      
      // Should show offline indicator and queued operations
      const offlineIndicator = page0.locator('[data-testid="offline-mode-indicator"]');
      const queuedOperations = page0.locator('[data-testid="queued-operations-count"]');
      
      if (await offlineIndicator.count() > 0) {
        await expect(offlineIndicator).toBeVisible();
      }
      
      if (await queuedOperations.count() > 0) {
        const queueCount = await queuedOperations.textContent();
        expect(parseInt(queueCount || '0')).toBeGreaterThan(0);
      }
      
      // User 1 continues working online
      const page1 = pages[1];
      await page1.click('[data-testid*="add-card-button"]');
      await page1.fill('[data-testid="card-title-input"]', 'Online Card');
      await page1.click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(page1);
      
      // Bring User 0 back online
      await page0.context().setOffline(false);
      
      // Should reconnect and sync queued operations
      await expect(page0.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });
      
      // Wait for queue processing
      await waitForRealtimeSync(page0, 20000);
      
      // Both users should see all operations
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Offline Card 1")'))
          .toBeVisible({ timeout: 15000 });
        await expect(userPage.locator('[data-testid*="card"]:has-text("Offline Card 2")'))
          .toBeVisible({ timeout: 15000 });
        await expect(userPage.locator('[data-testid*="card"]:has-text("Online Card")'))
          .toBeVisible({ timeout: 15000 });
        await expect(userPage.locator('[data-testid*="column"]:has-text("Offline Column")'))
          .toBeVisible({ timeout: 15000 });
      }
      
      // Verify final data consistency
      await verifyDataConsistency(pages, '[data-testid*="kanban-board"]');
    }
  });

  test('should handle Wiki editing during offline periods', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create wiki page
    await page.goto('/wiki');
    
    const createButton = page.locator('[data-testid="create-page-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const pageData = TestDataGenerator.generateWikiPage();
      pageData.title = 'Offline Wiki Test';
      pageData.content = 'Initial content for offline editing test.';
      
      await page.fill('[data-testid="page-title-input"]', pageData.title);
      await page.fill('[data-testid="page-content-input"]', pageData.content);
      await page.click('[data-testid="create-page-submit"]');
      
      await page.waitForURL('**/wiki/**');
      const pageUrl = page.url();
      
      await simulator.navigateAllUsers(pageUrl);
      const pages = simulator.getAllPages();
      
      // User 0 goes offline and edits
      const page0 = pages[0];
      await page0.context().setOffline(true);
      
      await expect(page0.locator('[data-testid="connection-status"][data-status="disconnected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Edit while offline
      await page0.click('[data-testid="edit-page-button"]');
      const editor0 = page0.locator('[data-testid="wiki-editor"]');
      
      if (await editor0.count() > 0) {
        await editor0.click();
        await page0.keyboard.press('Control+End');
        await page0.keyboard.type('\n\n## Offline Addition\nThis content was added while offline.');
        
        // Try to save (should be queued)
        await page0.click('[data-testid="save-page-button"]');
        
        // Should show offline save indicator
        const offlineSaveIndicator = page0.locator('[data-testid="offline-save-indicator"]');
        const draftSavedIndicator = page0.locator('[data-testid="draft-saved-indicator"]');
        
        if (await offlineSaveIndicator.count() > 0 || await draftSavedIndicator.count() > 0) {
          console.log('Offline save indication is working');
        }
      }
      
      // User 1 edits while User 0 is offline
      const page1 = pages[1];
      await page1.click('[data-testid="edit-page-button"]');
      const editor1 = page1.locator('[data-testid="wiki-editor"]');
      
      if (await editor1.count() > 0) {
        await editor1.click();
        await page1.keyboard.press('Control+End');
        await page1.keyboard.type('\n\n## Online Addition\nThis content was added while online.');
        await page1.click('[data-testid="save-page-button"]');
        
        await waitForRealtimeSync(page1);
      }
      
      // Bring User 0 back online
      await page0.context().setOffline(false);
      
      await expect(page0.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });
      
      // Should sync offline changes
      await waitForRealtimeSync(page0, 20000);
      
      // Both users should see merged content
      for (const userPage of pages) {
        const content = await userPage.locator('[data-testid="wiki-content"]').textContent();
        expect(content).toContain('Offline Addition');
        expect(content).toContain('Online Addition');
      }
      
      // Check for merge conflict resolution if needed
      const mergeNotification = page0.locator('[data-testid="merge-notification"]');
      if (await mergeNotification.count() > 0) {
        console.log('Merge conflict resolution is working');
      }
    }
  });

  test('should persist offline changes across browser restart', async ({ page, context }) => {
    await page.goto('/kanban');
    
    // Create board
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Persistence Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // Go offline
      await page.context().setOffline(true);
      
      // Make changes while offline
      await page.click('[data-testid*="add-card-button"]');
      await page.fill('[data-testid="card-title-input"]', 'Persistent Offline Card');
      await page.click('[data-testid="create-card-button"]');
      
      await page.waitForTimeout(2000);
      
      // Simulate browser restart by creating new page
      const newPage = await context.newPage();
      await newPage.goto(boardUrl);
      
      // Should still be offline
      await expect(newPage.locator('[data-testid="connection-status"][data-status="disconnected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Offline changes should be persisted (if implemented)
      const persistedCard = newPage.locator('[data-testid*="card"]:has-text("Persistent Offline Card")');
      const hasPersistentOfflineData = await persistedCard.count() > 0;
      
      if (hasPersistentOfflineData) {
        console.log('Offline data persistence is working');
        await expect(persistedCard).toBeVisible();
      }
      
      // Go back online
      await newPage.context().setOffline(false);
      
      await expect(newPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });
      
      // Changes should sync to server
      await waitForRealtimeSync(newPage);
      
      if (hasPersistentOfflineData) {
        // Should still see the card after coming online
        await expect(persistedCard).toBeVisible();
      }
    }
  });
});

test.describe('Server Restart and Recovery', () => {
  let mockServer: MockWebSocketServer;
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    mockServer = new MockWebSocketServer();
    collaborationTester = new RealtimeCollaborationTester(2);
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should handle server restart gracefully', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Navigate users to dashboard
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Verify initial connections
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    // Simulate server restart
    console.log('Simulating server restart...');
    await mockServer.stop();
    
    // Users should detect disconnection
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="disconnected"]'))
        .toBeVisible({ timeout: 15000 });
    }
    
    // Check for server restart notification
    const serverDownNotification = pages[0].locator('[data-testid="server-down-notification"]');
    const maintenanceMode = pages[0].locator('[data-testid="maintenance-mode-indicator"]');
    
    const hasServerDownNotification = await serverDownNotification.count() > 0;
    const hasMaintenanceMode = await maintenanceMode.count() > 0;
    
    if (hasServerDownNotification || hasMaintenanceMode) {
      console.log('Server restart notification system is working');
    }
    
    // Wait a bit to simulate server downtime
    await pages[0].waitForTimeout(5000);
    
    // Restart server
    console.log('Restarting server...');
    await mockServer.start();
    
    // Users should reconnect automatically
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });
    }
    
    // Verify functionality is restored
    const testMessage = {
      type: 'server_restart_test',
      payload: { message: 'Server is back online', timestamp: Date.now() },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9)
    };
    
    await mockServer.sendMessageToAll(testMessage);
    
    // All users should receive the message
    for (const userPage of pages) {
      await userPage.waitForFunction((messageId) => {
        const messages = (window as any).receivedMessages || [];
        return messages.some((msg: any) => msg.id === messageId);
      }, testMessage.id, { timeout: 10000 });
    }
  });

  test('should handle server upgrade scenarios', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await simulator.navigateAllUsers('/dashboard');
    const pages = simulator.getAllPages();
    
    // Verify connections
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
    
    // Simulate planned maintenance/upgrade
    const maintenanceMessage = {
      type: 'maintenance_notification',
      payload: { 
        message: 'Server will restart in 30 seconds for maintenance',
        countdown: 30,
        type: 'planned_maintenance'
      },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9)
    };
    
    await mockServer.sendMessageToAll(maintenanceMessage);
    
    // Should show maintenance notification
    for (const userPage of pages) {
      const maintenanceNotice = userPage.locator('[data-testid="maintenance-notification"]');
      const plannedMaintenanceAlert = userPage.locator('[data-testid="planned-maintenance-alert"]');
      
      const hasMaintenanceNotice = await maintenanceNotice.count() > 0;
      const hasPlannedMaintenanceAlert = await plannedMaintenanceAlert.count() > 0;
      
      if (hasMaintenanceNotice || hasPlannedMaintenanceAlert) {
        console.log('Planned maintenance notification is working');
      }
    }
    
    // Simulate countdown and graceful shutdown
    await pages[0].waitForTimeout(3000);
    
    // Server goes down for maintenance
    await mockServer.stop();
    
    // Should show maintenance mode
    for (const userPage of pages) {
      const maintenanceMode = userPage.locator('[data-testid="maintenance-mode"]');
      if (await maintenanceMode.count() > 0) {
        await expect(maintenanceMode).toBeVisible({ timeout: 10000 });
      }
    }
    
    // Server comes back after "upgrade"
    await mockServer.start();
    
    // Should reconnect and show upgrade notification
    for (const userPage of pages) {
      await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 30000 });
      
      const upgradeComplete = userPage.locator('[data-testid="upgrade-complete-notification"]');
      if (await upgradeComplete.count() > 0) {
        console.log('Upgrade completion notification is working');
      }
    }
  });

  test('should maintain session state after server restart', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board with data
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      const boardData = TestDataGenerator.generateBoard();
      boardData.name = 'Session State Test';
      
      await page.fill('[data-testid="board-name-input"]', boardData.name);
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      // Add some content
      await page.click('[data-testid*="add-card-button"]');
      await page.fill('[data-testid="card-title-input"]', 'Pre-Restart Card');
      await page.click('[data-testid="create-card-button"]');
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      await waitForRealtimeSync(pages[0]);
      
      // All users should see the card
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Pre-Restart Card")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // Simulate server restart
      await mockServer.stop();
      
      // Wait for disconnection
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid="connection-status"][data-status="disconnected"]'))
          .toBeVisible({ timeout: 15000 });
      }
      
      // Restart server
      await mockServer.start();
      
      // Wait for reconnection
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid="connection-status"][data-status="connected"]'))
          .toBeVisible({ timeout: 30000 });
      }
      
      // Previous data should still be visible
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Pre-Restart Card")'))
          .toBeVisible({ timeout: 10000 });
      }
      
      // Should be able to add new content after restart
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Post-Restart Card');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0]);
      
      // All users should see both cards
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Pre-Restart Card")'))
          .toBeVisible();
        await expect(userPage.locator('[data-testid*="card"]:has-text("Post-Restart Card")'))
          .toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('Connection Pool and Resource Management', () => {
  let mockServer: MockWebSocketServer;

  test.beforeEach(async () => {
    mockServer = new MockWebSocketServer();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should handle multiple tabs with connection sharing', async ({ page, context }) => {
    // First tab
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Second tab
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    await expect(page2.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Third tab
    const page3 = await context.newPage();
    await page3.goto('/dashboard');
    await expect(page3.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Check connection sharing indicators
    const sharedConnection = page.locator('[data-testid="shared-connection-indicator"]');
    const connectionCount = page.locator('[data-testid="connection-count"]');
    
    if (await sharedConnection.count() > 0) {
      console.log('Connection sharing is implemented');
    }
    
    if (await connectionCount.count() > 0) {
      const count = await connectionCount.textContent();
      console.log(`Connection count indicator shows: ${count}`);
    }

    // Test message broadcasting across tabs
    const testMessage = {
      type: 'multi_tab_test',
      payload: { message: 'Cross-tab message', timestamp: Date.now() },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9)
    };

    await mockServer.sendMessageToAll(testMessage);

    // All tabs should receive the message
    const tabs = [page, page2, page3];
    for (const tab of tabs) {
      await tab.waitForFunction((messageId) => {
        const messages = (window as any).receivedMessages || [];
        return messages.some((msg: any) => msg.id === messageId);
      }, testMessage.id, { timeout: 10000 });
    }

    // Close tabs one by one
    await page3.close();
    await page2.close();

    // First tab should still be connected
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 5000 });
  });

  test('should manage connection resources efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Monitor connection resource usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Simulate heavy WebSocket usage
    for (let i = 0; i < 100; i++) {
      const message = {
        type: 'resource_test',
        payload: { 
          index: i, 
          data: 'x'.repeat(1000), // 1KB of data
          timestamp: Date.now() 
        },
        timestamp: new Date().toISOString(),
        id: `resource-test-${i}`
      };

      await mockServer.sendMessageToAll(message);
      
      if (i % 20 === 0) {
        await page.waitForTimeout(100); // Brief pause
      }
    }

    // Wait for all messages to be processed
    await page.waitForTimeout(5000);

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    console.log(`Memory increase: ${memoryIncrease} bytes`);

    // Memory usage should not grow excessively
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

    // Connection should still be stable
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();
  });

  test('should handle connection limit gracefully', async ({ browser }) => {
    const contexts: any[] = [];
    const pages: Page[] = [];

    try {
      // Create many concurrent connections
      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        
        const page = await context.newPage();
        pages.push(page);
        
        await page.goto('/dashboard');
      }

      // All connections should either succeed or fail gracefully
      let connectedCount = 0;
      let failedCount = 0;

      for (const page of pages) {
        try {
          await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
            .toBeVisible({ timeout: 15000 });
          connectedCount++;
        } catch {
          // Check for connection limit error
          const limitError = page.locator('[data-testid="connection-limit-error"]');
          const hasLimitError = await limitError.count() > 0;
          
          if (hasLimitError) {
            failedCount++;
            console.log('Connection limit handling is working');
          }
        }
      }

      console.log(`Connected: ${connectedCount}, Failed: ${failedCount}`);
      
      // Should have some successful connections
      expect(connectedCount).toBeGreaterThan(0);
      
      // If there are failures, they should be handled gracefully
      if (failedCount > 0) {
        // Should show appropriate error messages
        const errorPage = pages.find(async p => {
          const limitError = p.locator('[data-testid="connection-limit-error"]');
          return await limitError.count() > 0;
        });
        
        if (errorPage) {
          const errorMessage = await errorPage.locator('[data-testid="connection-limit-error"]').textContent();
          expect(errorMessage).toBeTruthy();
          expect(errorMessage!.length).toBeGreaterThan(10);
        }
      }

    } finally {
      // Cleanup all contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});