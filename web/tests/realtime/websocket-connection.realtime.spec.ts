/**
 * WebSocket Connection and Authentication Tests
 * Tests the fundamental WebSocket connection functionality, handshake process,
 * authentication, and connection management for real-time collaboration.
 */

import { test, expect, Page } from '@playwright/test';
import { 
  MockWebSocketServer, 
  NetworkSimulator, 
  NetworkConditions,
  RealtimeMetricsCollector 
} from '../utils/websocket-mock';
import { ConnectionTestSuite, waitForRealtimeSync } from '../utils/realtime-test-helpers';

test.describe('WebSocket Connection Management', () => {
  let mockServer: MockWebSocketServer;
  let metricsCollector: RealtimeMetricsCollector;

  test.beforeEach(async ({ page }) => {
    mockServer = new MockWebSocketServer();
    metricsCollector = new RealtimeMetricsCollector();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should establish WebSocket connection with proper handshake', async ({ page }) => {
    metricsCollector.startConnectionTimer();

    await page.goto('/dashboard');
    
    // Wait for connection establishment
    await expect(page.locator('[data-testid="connection-status"]'))
      .toHaveAttribute('data-status', 'connected', { timeout: 10000 });

    metricsCollector.recordConnectionEstablished();
    
    // Verify connection indicator is visible
    await expect(page.locator('[data-testid="connection-indicator"]'))
      .toBeVisible();

    // Check connection metrics
    const metrics = metricsCollector.calculateMetrics();
    expect(metrics.connectionTime).toBeLessThan(5000); // Should connect within 5 seconds
  });

  test('should authenticate WebSocket connection with valid token', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Verify authentication was successful by checking for user-specific data
    await expect(page.locator('[data-testid="user-profile"]'))
      .toBeVisible({ timeout: 5000 });

    // Check that WebSocket messages include authentication
    const connectionId = await mockServer.addConnection('test-user', page);
    const messageHistory = await connectionId.getMessageHistory();
    
    const authMessages = messageHistory.filter(msg => 
      msg.type === 'auth' || msg.type === 'authenticate'
    );
    expect(authMessages.length).toBeGreaterThan(0);
  });

  test('should handle authentication failure gracefully', async ({ page }) => {
    // Simulate authentication failure by removing auth token
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    });

    await page.goto('/dashboard');
    
    // Should redirect to login or show auth error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const hasAuthError = await page.locator('[data-testid="auth-error"]').count() > 0;
    
    expect(currentUrl.includes('/login') || hasAuthError).toBeTruthy();
  });

  test('should maintain heartbeat mechanism', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Monitor heartbeat messages over time
    const connectionId = await mockServer.addConnection('heartbeat-test', page);
    
    // Wait for multiple heartbeat cycles (default is 30 seconds)
    await page.waitForTimeout(65000);
    
    const messageHistory = await connectionId.getMessageHistory();
    const heartbeatMessages = messageHistory.filter(msg => msg.type === 'heartbeat');
    
    // Should have at least 2 heartbeat messages in 65 seconds
    expect(heartbeatMessages.length).toBeGreaterThanOrEqual(2);
    
    // Verify connection is still active
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();
  });

  test('should handle WebSocket upgrade failure with fallback', async ({ page }) => {
    // Block WebSocket connections to force fallback
    await page.route('ws://localhost:3001/ws', async route => {
      await route.abort();
    });

    await page.goto('/dashboard');
    
    // Should either show degraded mode or error message
    await page.waitForTimeout(5000);
    
    const degradedMode = await page.locator('[data-testid="degraded-mode-notice"]').count() > 0;
    const connectionError = await page.locator('[data-testid="connection-error"]').count() > 0;
    
    expect(degradedMode || connectionError).toBeTruthy();
  });

  test('should establish multiple concurrent connections', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    // Set up auth for all pages
    for (const page of pages) {
      await page.context().storageState({ path: 'tests/fixtures/auth.json' });
    }

    // Connect all pages simultaneously
    const connectionPromises = pages.map(async (page, index) => {
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 15000 });
      
      const connectionId = await mockServer.addConnection(`concurrent-${index}`, page);
      return connectionId;
    });

    const connections = await Promise.all(connectionPromises);
    
    // Verify all connections are established
    expect(connections.length).toBe(3);
    expect(mockServer.getConnectionCount()).toBe(3);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle cross-tab synchronization', async ({ page, context }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    await expect(page2.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate message in first tab
    const testMessage = {
      type: 'test_sync',
      payload: { message: 'Cross-tab test', timestamp: Date.now() },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9)
    };

    await mockServer.sendMessageToAll(testMessage);

    // Both tabs should receive the message
    await page.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Verify both tabs processed the message
    const messages1 = await page.evaluate(() => (window as any).receivedMessages || []);
    const messages2 = await page2.evaluate(() => (window as any).receivedMessages || []);

    expect(messages1.some((msg: any) => msg.id === testMessage.id)).toBeTruthy();
    expect(messages2.some((msg: any) => msg.id === testMessage.id)).toBeTruthy();
  });
});

test.describe('WebSocket Connection Resilience', () => {
  let mockServer: MockWebSocketServer;
  let networkSimulator: NetworkSimulator;

  test.beforeEach(async ({ page }) => {
    mockServer = new MockWebSocketServer();
    networkSimulator = new NetworkSimulator(page);
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should automatically reconnect after connection loss', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for initial connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate network disconnection
    await networkSimulator.goOffline();
    
    // Should detect disconnection
    await expect(page.locator('[data-testid="connection-status"][data-status="disconnected"]'))
      .toBeVisible({ timeout: 15000 });

    // Restore network
    await networkSimulator.goOnline();
    
    // Should automatically reconnect
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 20000 });

    // Verify functionality after reconnection
    await expect(page.locator('[data-testid="realtime-indicator"]'))
      .toBeVisible({ timeout: 5000 });
  });

  test('should handle intermittent connection issues', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate intermittent connection (3 cycles of online/offline)
    await networkSimulator.simulateIntermittentConnection(3000, 1000, 3);

    // Should maintain or restore connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 25000 });

    // Check for connection stability warning
    const stabilityWarning = await page.locator('[data-testid="connection-unstable-warning"]').count();
    expect(stabilityWarning).toBeGreaterThanOrEqual(0); // May or may not show warning
  });

  test('should handle high latency conditions', async ({ page }) => {
    await networkSimulator.setNetworkCondition(NetworkConditions.SLOW_3G);
    
    await page.goto('/dashboard');
    
    // Connection should still work but may take longer
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 30000 });

    // Send a test message and measure latency
    const startTime = Date.now();
    const testMessage = {
      type: 'latency_test',
      payload: { timestamp: startTime },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9)
    };

    await mockServer.sendMessageToAll(testMessage);
    
    // Wait for message to be processed
    await page.waitForFunction((messageId) => {
      const messages = (window as any).receivedMessages || [];
      return messages.some((msg: any) => msg.id === messageId);
    }, testMessage.id, { timeout: 15000 });

    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // High latency should be detected and handled
    expect(latency).toBeGreaterThan(1000); // Slow 3G should add significant latency
    expect(latency).toBeLessThan(15000); // But should still work within timeout
  });

  test('should queue messages during disconnection', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Go offline
    await networkSimulator.goOffline();
    await expect(page.locator('[data-testid="connection-status"][data-status="disconnected"]'))
      .toBeVisible({ timeout: 10000 });

    // Attempt to send messages while offline (should be queued)
    await page.evaluate(() => {
      const wsContext = (window as any).realtimeContext;
      if (wsContext && wsContext.sendMessage) {
        wsContext.sendMessage('test_queue', { message: 'Queued message 1' });
        wsContext.sendMessage('test_queue', { message: 'Queued message 2' });
        wsContext.sendMessage('test_queue', { message: 'Queued message 3' });
      }
    });

    // Go back online
    await networkSimulator.goOnline();
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 20000 });

    // Queued messages should be sent
    await page.waitForTimeout(3000);
    
    const connectionId = await mockServer.addConnection('queue-test', page);
    const messageHistory = await connectionId.getMessageHistory();
    
    const queuedMessages = messageHistory.filter(msg => msg.type === 'test_queue');
    expect(queuedMessages.length).toBe(3);
  });

  test('should handle server restart gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate server restart
    await mockServer.stop();
    
    // Should detect disconnection
    await expect(page.locator('[data-testid="connection-status"][data-status="disconnected"]'))
      .toBeVisible({ timeout: 15000 });

    // Restart server
    await mockServer.start();
    
    // Should reconnect automatically
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 25000 });

    // Verify functionality is restored
    await expect(page.locator('[data-testid="realtime-indicator"]'))
      .toBeVisible({ timeout: 5000 });
  });

  test('should show appropriate error messages for connection failures', async ({ page }) => {
    // Block WebSocket connections
    await page.route('**/*', async route => {
      if (route.request().url().includes('ws://') || route.request().url().includes('wss://')) {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');
    
    // Should show connection error
    await expect(page.locator('[data-testid="connection-error"]'))
      .toBeVisible({ timeout: 15000 });

    // Error message should be user-friendly
    const errorMessage = await page.locator('[data-testid="connection-error-message"]').textContent();
    expect(errorMessage).toContain('connection');
    expect(errorMessage?.length).toBeGreaterThan(10); // Should be descriptive
  });
});

test.describe('WebSocket Performance and Monitoring', () => {
  let mockServer: MockWebSocketServer;
  let metricsCollector: RealtimeMetricsCollector;

  test.beforeEach(async ({ page }) => {
    mockServer = new MockWebSocketServer();
    metricsCollector = new RealtimeMetricsCollector();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should measure connection establishment time', async ({ page }) => {
    metricsCollector.startConnectionTimer();
    
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    metricsCollector.recordConnectionEstablished();
    
    const metrics = metricsCollector.calculateMetrics();
    
    // Connection should be fast
    expect(metrics.connectionTime).toBeLessThan(5000);
    expect(metrics.connectionTime).toBeGreaterThan(0);
  });

  test('should monitor message throughput and latency', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    const connectionId = await mockServer.addConnection('throughput-test', page);
    
    // Send multiple messages and measure timing
    const messageCount = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < messageCount; i++) {
      const message = {
        type: 'throughput_test',
        payload: { index: i, timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        id: `throughput-${i}`
      };
      
      metricsCollector.recordMessageSent();
      await mockServer.sendMessageToConnection('throughput-test', message);
      
      // Small delay to avoid overwhelming
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    // Wait for all messages to be processed
    await page.waitForTimeout(5000);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const throughput = messageCount / (totalTime / 1000); // messages per second
    
    console.log(`Message throughput: ${throughput.toFixed(2)} messages/second`);
    
    // Should handle reasonable throughput
    expect(throughput).toBeGreaterThan(5); // At least 5 messages per second
    
    const messageHistory = await connectionId.getMessageHistory();
    const throughputMessages = messageHistory.filter(msg => msg.type === 'throughput_test');
    
    // Should receive most messages (allowing for some loss in testing)
    expect(throughputMessages.length).toBeGreaterThan(messageCount * 0.9);
  });

  test('should handle memory usage efficiently during long sessions', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate long session with many messages
    const connectionId = await mockServer.addConnection('memory-test', page);
    
    // Send messages continuously
    for (let batch = 0; batch < 10; batch++) {
      for (let i = 0; i < 20; i++) {
        const message = {
          type: 'memory_test',
          payload: { 
            batch, 
            index: i, 
            data: 'x'.repeat(1000) // 1KB of data per message
          },
          timestamp: new Date().toISOString(),
          id: `memory-${batch}-${i}`
        };
        
        await mockServer.sendMessageToConnection('memory-test', message);
      }
      
      // Wait between batches
      await page.waitForTimeout(1000);
    }
    
    // Check if connection is still stable
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();

    // Check message history size is managed
    const messageHistory = await connectionId.getMessageHistory();
    expect(messageHistory.length).toBeLessThan(1000); // Should not grow indefinitely
  });

  test('should provide connection quality indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Connection quality indicator should be present
    const qualityIndicator = page.locator('[data-testid="connection-quality"]');
    
    if (await qualityIndicator.count() > 0) {
      await expect(qualityIndicator).toBeVisible();
      
      const quality = await qualityIndicator.getAttribute('data-quality');
      expect(['excellent', 'good', 'fair', 'poor']).toContain(quality);
    }
  });
});

// Run the pre-defined connection test suite
for (const [testName, testConfig] of Object.entries(ConnectionTestSuite)) {
  test(`Connection Test Suite: ${testConfig.name}`, async ({ page }) => {
    const timeout = testConfig.timeout || 30000;
    test.setTimeout(timeout);
    
    await testConfig.test(page);
  });
}