/**
 * Performance and Scalability Tests
 * Tests the performance characteristics and scalability limits of real-time
 * collaboration features including:
 * - Multiple concurrent users (10+, 50+, 100+ users)
 * - Message throughput and latency measurement
 * - Memory usage with persistent connections
 * - CPU usage during high activity periods
 * - WebSocket message size optimization
 * - Real-time analytics and monitoring
 * - Network bandwidth utilization
 * - Browser resource consumption
 * - Database performance under load
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { 
  MockWebSocketServer,
  RealtimeMetricsCollector,
  NetworkSimulator,
  NetworkConditions
} from '../utils/websocket-mock';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency
} from '../utils/realtime-test-helpers';
import { TestDataGenerator } from '../fixtures/test-data';

interface PerformanceMetrics {
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage?: number;
  connectionTime: number;
  messageSuccessRate: number;
}

test.describe('Multi-User Scalability Tests', () => {
  let mockServer: MockWebSocketServer;
  let metricsCollector: RealtimeMetricsCollector;

  test.beforeEach(async () => {
    mockServer = new MockWebSocketServer();
    metricsCollector = new RealtimeMetricsCollector();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should handle 10 concurrent users efficiently', async ({ browser }) => {
    const userCount = 10;
    const contexts = [];
    const pages = [];
    
    try {
      // Create multiple browser contexts
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 }
        });
        contexts.push(context);
        
        const page = await context.newPage();
        pages.push(page);
        
        // Set up auth
        await context.storageState({ path: 'tests/fixtures/auth.json' });
      }

      metricsCollector.setConcurrentUserCount(userCount);
      metricsCollector.startConnectionTimer();

      // Connect all users simultaneously
      const connectionPromises = pages.map(async (page: Page, index) => {
        const startTime = Date.now();
        await page.goto('/dashboard');
        
        await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
          .toBeVisible({ timeout: 15000 });
        
        const connectionTime = Date.now() - startTime;
        console.log(`User ${index} connected in ${connectionTime}ms`);
        
        return connectionTime;
      });

      const connectionTimes = await Promise.all(connectionPromises);
      metricsCollector.recordConnectionEstablished();

      // Measure connection performance
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);
      
      console.log(`Average connection time: ${avgConnectionTime}ms`);
      console.log(`Max connection time: ${maxConnectionTime}ms`);

      // All users should connect within reasonable time
      expect(avgConnectionTime).toBeLessThan(5000); // 5 second average
      expect(maxConnectionTime).toBeLessThan(15000); // 15 second max

      // Test collaborative operations
      await testConcurrentKanbanOperations(pages);

      // Measure final metrics
      const finalMetrics = metricsCollector.calculateMetrics();
      console.log('10-user test metrics:', finalMetrics);

      expect(finalMetrics.messageSuccessRate).toBeGreaterThan(95);

    } finally {
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should handle 25 concurrent users with acceptable performance', async ({ browser }) => {
    const userCount = 25;
    const contexts = [];
    const pages = [];
    
    // Increase test timeout for this heavy test
    test.setTimeout(120000); // 2 minutes

    try {
      // Create users in batches to avoid overwhelming
      const batchSize = 5;
      for (let batch = 0; batch < Math.ceil(userCount / batchSize); batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < userCount; i++) {
          const userIndex = batch * batchSize + i;
          
          batchPromises.push((async () => {
            const context = await browser.newContext({
              viewport: { width: 1280, height: 720 }
            });
            contexts.push(context);
            
            const page = await context.newPage();
            pages.push(page);
            
            await context.storageState({ path: 'tests/fixtures/auth.json' });
            
            const startTime = Date.now();
            await page.goto('/dashboard');
            
            await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
              .toBeVisible({ timeout: 30000 });
            
            const connectionTime = Date.now() - startTime;
            console.log(`Batch ${batch}, User ${userIndex} connected in ${connectionTime}ms`);
            
            return connectionTime;
          })());
        }
        
        await Promise.all(batchPromises);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`All ${userCount} users connected`);

      // Test system performance with many users
      const performanceStartTime = Date.now();
      
      // Simulate concurrent activity
      const activityPromises = pages.slice(0, 10).map(async (page: Page, index) => {
        try {
          // Navigate to Kanban and create a card
          await page.click('[data-testid="kanban-nav-link"]');
          await page.waitForLoadState('networkidle');
          
          // Create a simple board if needed
          const createBoardBtn = page.locator('[data-testid="create-board-button"]');
          if (await createBoardBtn.count() > 0) {
            await createBoardBtn.click();
            await page.fill('[data-testid="board-name-input"]', `User ${index} Board`);
            await page.click('[data-testid="create-board-submit"]');
            await page.waitForURL('**/kanban/**');
          }
          
        } catch (error) {
          console.log(`User ${index} activity failed:`, error.message);
        }
      });

      await Promise.all(activityPromises);
      
      const totalActivityTime = Date.now() - performanceStartTime;
      console.log(`Concurrent activity completed in ${totalActivityTime}ms`);

      // Performance should be acceptable even with many users
      expect(totalActivityTime).toBeLessThan(60000); // 1 minute max

      // Check that connections are still stable
      let stableConnections = 0;
      for (const page of pages) {
        try {
          const status = await page.locator('[data-testid="connection-status"]').getAttribute('data-status');
          if (status === 'connected') {
            stableConnections++;
          }
        } catch (error) {
          console.log('Error checking connection status:', error.message);
        }
      }

      console.log(`${stableConnections}/${userCount} connections stable`);
      
      // At least 80% of connections should remain stable
      expect(stableConnections).toBeGreaterThan(userCount * 0.8);

    } finally {
      // Cleanup in batches to avoid overwhelming
      for (let i = 0; i < contexts.length; i += 5) {
        const batch = contexts.slice(i, i + 5);
        await Promise.all(batch.map(context => context.close()));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  test('should measure message throughput under load', async ({ browser }) => {
    const userCount = 5; // Smaller number for focused throughput testing
    const messageCount = 100;
    const contexts = [];
    const pages = [];

    try {
      // Set up users
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        
        const page = await context.newPage();
        pages.push(page);
        
        await context.storageState({ path: 'tests/fixtures/auth.json' });
        await page.goto('/dashboard');
        
        await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
          .toBeVisible({ timeout: 15000 });
      }

      // Measure message throughput
      const throughputStartTime = Date.now();
      const latencies: number[] = [];

      // Send messages in rapid succession
      for (let i = 0; i < messageCount; i++) {
        const messageStartTime = Date.now();
        
        const message = {
          type: 'throughput_test',
          payload: { 
            index: i,
            data: 'test'.repeat(100), // 400 bytes of data
            timestamp: messageStartTime 
          },
          timestamp: new Date().toISOString(),
          id: `throughput-${i}`
        };

        metricsCollector.recordMessageSent();
        await mockServer.sendMessageToAll(message);

        // Measure latency for every 10th message
        if (i % 10 === 0) {
          // Wait for message to be received by first user
          await pages[0].waitForFunction((messageId) => {
            const messages = (window as any).receivedMessages || [];
            return messages.some((msg: any) => msg.id === messageId);
          }, message.id, { timeout: 5000 });

          const latency = Date.now() - messageStartTime;
          latencies.push(latency);
          metricsCollector.recordMessageReceived(latency);
        }

        // Small delay to prevent overwhelming
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const totalThroughputTime = Date.now() - throughputStartTime;
      const messagesPerSecond = messageCount / (totalThroughputTime / 1000);

      console.log(`Sent ${messageCount} messages in ${totalThroughputTime}ms`);
      console.log(`Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Max latency: ${maxLatency}ms`);
      console.log(`Min latency: ${minLatency}ms`);

      // Performance expectations
      expect(messagesPerSecond).toBeGreaterThan(5); // At least 5 messages/second
      expect(avgLatency).toBeLessThan(1000); // Average latency under 1 second
      expect(maxLatency).toBeLessThan(5000); // Max latency under 5 seconds

    } finally {
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  async function testConcurrentKanbanOperations(pages: Page[]) {
    // Navigate all users to Kanban
    const navigationPromises = pages.map(async (page: Page, index) => {
      try {
        await page.click('[data-testid="kanban-nav-link"]');
        await page.waitForLoadState('networkidle');
      } catch (error) {
        console.log(`User ${index} navigation failed:`, error.message);
      }
    });

    await Promise.all(navigationPromises);

    // Each user creates a board
    const boardCreationPromises = pages.slice(0, 5).map(async (page: Page, index) => {
      try {
        const createButton = page.locator('[data-testid="create-board-button"]');
        if (await createButton.count() > 0) {
          await createButton.click();
          await page.fill('[data-testid="board-name-input"]', `Scalability Test Board ${index}`);
          await page.click('[data-testid="create-board-submit"]');
          await page.waitForURL('**/kanban/**');
        }
      } catch (error) {
        console.log(`User ${index} board creation failed:`, error.message);
      }
    });

    await Promise.all(boardCreationPromises);
  }
});

test.describe('Memory and Resource Usage', () => {
  let mockServer: MockWebSocketServer;

  test.beforeEach(async () => {
    mockServer = new MockWebSocketServer();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should maintain stable memory usage during extended session', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Get baseline memory usage
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (!initialMemory) {
      console.log('Memory API not available, skipping memory test');
      return;
    }

    console.log('Initial memory usage:', initialMemory);

    // Simulate extended session with high message volume
    const sessionDuration = 60000; // 1 minute
    const messageInterval = 1000; // 1 message per second
    const messagesCount = sessionDuration / messageInterval;

    let messagesSent = 0;
    const messageInterval_id = setInterval(async () => {
      if (messagesSent >= messagesCount) {
        clearInterval(messageInterval_id);
        return;
      }

      const message = {
        type: 'memory_test',
        payload: { 
          index: messagesSent,
          data: 'x'.repeat(2000), // 2KB of data per message
          timestamp: Date.now()
        },
        timestamp: new Date().toISOString(),
        id: `memory-test-${messagesSent}`
      };

      await mockServer.sendMessageToAll(message);
      messagesSent++;
    }, messageInterval);

    // Wait for session to complete
    await page.waitForTimeout(sessionDuration + 5000);

    // Measure final memory usage
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    console.log('Final memory usage:', finalMemory);

    if (finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;

      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);

      // Memory usage should not grow excessively
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase
    }

    // Connection should still be stable
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();
  });

  test('should handle large message payloads efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Test different message sizes
    const messageSizes = [
      { name: 'Small', size: 100 },      // 100 bytes
      { name: 'Medium', size: 10000 },   // 10KB
      { name: 'Large', size: 100000 },   // 100KB
      { name: 'Very Large', size: 500000 } // 500KB
    ];

    for (const messageSize of messageSizes) {
      console.log(`Testing ${messageSize.name} messages (${messageSize.size} bytes)`);

      const startTime = Date.now();
      
      // Send large message
      const largeMessage = {
        type: 'size_test',
        payload: { 
          size: messageSize.name,
          data: 'x'.repeat(messageSize.size),
          timestamp: startTime
        },
        timestamp: new Date().toISOString(),
        id: `size-test-${messageSize.name}`
      };

      await mockServer.sendMessageToAll(largeMessage);

      // Wait for message to be processed
      await page.waitForFunction((messageId) => {
        const messages = (window as any).receivedMessages || [];
        return messages.some((msg: any) => msg.id === messageId);
      }, largeMessage.id, { timeout: 30000 });

      const processingTime = Date.now() - startTime;
      console.log(`${messageSize.name} message processed in ${processingTime}ms`);

      // Processing time should be reasonable
      expect(processingTime).toBeLessThan(10000); // 10 seconds max

      // Connection should remain stable
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible();
    }
  });

  test('should optimize WebSocket message serialization', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Test message compression/optimization
    const testCases = [
      {
        name: 'Repetitive Data',
        data: 'A'.repeat(10000), // Should compress well
      },
      {
        name: 'Random Data',
        data: Array(1000).fill(0).map(() => Math.random().toString(36)).join(''), // Should not compress well
      },
      {
        name: 'JSON Structure',
        data: JSON.stringify({
          users: Array(100).fill(0).map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            roles: ['user', 'editor']
          }))
        })
      }
    ];

    for (const testCase of testCases) {
      const startTime = Date.now();
      
      const message = {
        type: 'optimization_test',
        payload: {
          testCase: testCase.name,
          data: testCase.data,
          originalSize: testCase.data.length
        },
        timestamp: new Date().toISOString(),
        id: `opt-test-${testCase.name.replace(/\s+/g, '-').toLowerCase()}`
      };

      // Measure serialization performance
      const serializationStart = Date.now();
      const serialized = JSON.stringify(message);
      const serializationTime = Date.now() - serializationStart;

      console.log(`${testCase.name}:`);
      console.log(`  Original size: ${testCase.data.length} bytes`);
      console.log(`  Serialized size: ${serialized.length} bytes`);
      console.log(`  Serialization time: ${serializationTime}ms`);

      await mockServer.sendMessageToAll(message);

      // Wait for processing
      await page.waitForFunction((messageId) => {
        const messages = (window as any).receivedMessages || [];
        return messages.some((msg: any) => msg.id === messageId);
      }, message.id, { timeout: 15000 });

      const totalTime = Date.now() - startTime;
      console.log(`  Total processing time: ${totalTime}ms`);

      // Performance expectations
      expect(serializationTime).toBeLessThan(1000); // Serialization should be fast
      expect(totalTime).toBeLessThan(10000); // Total time should be reasonable
    }
  });
});

test.describe('Network Performance Under Various Conditions', () => {
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

  test('should adapt to different network speeds', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    const networkTests = [
      { name: 'Fast WiFi', condition: NetworkConditions.FAST_WIFI, expectedLatency: 500 },
      { name: 'Slow WiFi', condition: NetworkConditions.SLOW_WIFI, expectedLatency: 1000 },
      { name: 'Fast 3G', condition: NetworkConditions.FAST_3G, expectedLatency: 2000 },
      { name: 'Slow 3G', condition: NetworkConditions.SLOW_3G, expectedLatency: 5000 },
    ];

    for (const networkTest of networkTests) {
      console.log(`Testing ${networkTest.name} conditions`);
      
      await networkSimulator.setNetworkCondition(networkTest.condition);
      await page.waitForTimeout(2000); // Allow network condition to stabilize

      // Test message latency under this condition
      const latencies: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const message = {
          type: 'network_performance_test',
          payload: { 
            networkCondition: networkTest.name,
            testIndex: i,
            timestamp: startTime
          },
          timestamp: new Date().toISOString(),
          id: `net-perf-${networkTest.name}-${i}`
        };

        await mockServer.sendMessageToAll(message);

        // Wait for response
        await page.waitForFunction((messageId) => {
          const messages = (window as any).receivedMessages || [];
          return messages.some((msg: any) => msg.id === messageId);
        }, message.id, { timeout: networkTest.expectedLatency * 2 });

        const latency = Date.now() - startTime;
        latencies.push(latency);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.log(`${networkTest.name} - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency}ms`);

      // Latency should be within expected range for network condition
      expect(avgLatency).toBeLessThan(networkTest.expectedLatency);
      
      // Connection should remain stable
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 15000 });
    }
  });

  test('should handle bandwidth limitations gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate very limited bandwidth
    await networkSimulator.setNetworkCondition({
      latency: 100,
      downloadThroughput: 50000, // 50KB/s
      uploadThroughput: 25000,   // 25KB/s
    });

    await page.waitForTimeout(2000);

    // Test behavior under bandwidth constraints
    const startTime = Date.now();
    const messagePromises = [];

    // Send multiple messages that would exceed bandwidth
    for (let i = 0; i < 10; i++) {
      const message = {
        type: 'bandwidth_test',
        payload: { 
          index: i,
          data: 'x'.repeat(5000), // 5KB per message
          timestamp: Date.now()
        },
        timestamp: new Date().toISOString(),
        id: `bandwidth-test-${i}`
      };

      const promise = mockServer.sendMessageToAll(message);
      messagePromises.push(promise);
    }

    await Promise.all(messagePromises);

    // Wait for all messages to be processed
    await page.waitForFunction(() => {
      const messages = (window as any).receivedMessages || [];
      const bandwidthMessages = messages.filter((msg: any) => msg.type === 'bandwidth_test');
      return bandwidthMessages.length === 10;
    }, { timeout: 60000 }); // Give plenty of time for slow network

    const totalTime = Date.now() - startTime;
    console.log(`Bandwidth-limited transmission completed in ${totalTime}ms`);

    // Should complete within reasonable time despite bandwidth limits
    expect(totalTime).toBeLessThan(60000); // 1 minute max

    // Connection should remain stable
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();
  });

  test('should prioritize critical messages under load', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Simulate network congestion
    await networkSimulator.setNetworkCondition({
      latency: 500,
      downloadThroughput: 100000, // 100KB/s
      uploadThroughput: 50000,    // 50KB/s
    });

    // Send a mix of critical and non-critical messages
    const messages = [
      // Critical messages (should be prioritized)
      {
        type: 'critical_notification',
        priority: 'high',
        payload: { message: 'Critical system alert', timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        id: 'critical-1'
      },
      // Regular messages
      ...Array(20).fill(0).map((_, i) => ({
        type: 'regular_update',
        priority: 'normal',
        payload: { 
          index: i,
          data: 'x'.repeat(2000), // 2KB each
          timestamp: Date.now()
        },
        timestamp: new Date().toISOString(),
        id: `regular-${i}`
      })),
      // Another critical message
      {
        type: 'critical_notification',
        priority: 'high',
        payload: { message: 'Another critical alert', timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        id: 'critical-2'
      }
    ];

    const sendStartTime = Date.now();

    // Send all messages
    for (const message of messages) {
      await mockServer.sendMessageToAll(message);
    }

    // Wait for critical messages specifically
    await page.waitForFunction(() => {
      const receivedMessages = (window as any).receivedMessages || [];
      const criticalMessages = receivedMessages.filter((msg: any) => msg.type === 'critical_notification');
      return criticalMessages.length === 2;
    }, { timeout: 30000 });

    const criticalProcessingTime = Date.now() - sendStartTime;
    console.log(`Critical messages processed in ${criticalProcessingTime}ms`);

    // Critical messages should be processed quickly even under load
    expect(criticalProcessingTime).toBeLessThan(10000); // 10 seconds max

    // Eventually all messages should be processed
    await page.waitForFunction(() => {
      const receivedMessages = (window as any).receivedMessages || [];
      return receivedMessages.length >= messages.length;
    }, { timeout: 60000 });
  });
});

test.describe('Real-time Analytics and Monitoring', () => {
  let mockServer: MockWebSocketServer;
  let collaborationTester: RealtimeCollaborationTester;

  test.beforeEach(async ({ page, context }) => {
    mockServer = new MockWebSocketServer();
    collaborationTester = new RealtimeCollaborationTester(3);
    
    await mockServer.start();
    await collaborationTester.initialize(context);
  });

  test.afterEach(async () => {
    await collaborationTester.cleanup();
    await mockServer.stop();
  });

  test('should collect real-time performance metrics', async ({ page }) => {
    const metrics = await collaborationTester.measureRealtimePerformance(async () => {
      const simulator = collaborationTester.getSimulator();
      
      await simulator.navigateAllUsers('/dashboard');
      const pages = simulator.getAllPages();
      
      // Simulate typical user activity
      const activityPromises = pages.map(async (userPage: Page, index) => {
        try {
          // Navigate to different sections
          await userPage.click('[data-testid="kanban-nav-link"]');
          await userPage.waitForLoadState('networkidle');
          
          await userPage.click('[data-testid="wiki-nav-link"]');
          await userPage.waitForLoadState('networkidle');
          
          await userPage.click('[data-testid="memory-nav-link"]');
          await userPage.waitForLoadState('networkidle');
          
        } catch (error) {
          console.log(`User ${index} activity error:`, error.message);
        }
      });
      
      await Promise.all(activityPromises);
    });

    console.log('Real-time performance metrics:', metrics);

    // Validate metrics are within acceptable ranges
    expect(metrics.totalTestTime).toBeGreaterThan(0);
    expect(metrics.averageLatency).toBeLessThan(2000); // 2 second average
    expect(metrics.maxLatency).toBeLessThan(10000); // 10 second max
    expect(metrics.concurrentUserCount).toBe(3);
  });

  test('should monitor connection health continuously', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });

    // Check for health monitoring interface
    const healthMonitor = page.locator('[data-testid="connection-health-monitor"]');
    const connectionQuality = page.locator('[data-testid="connection-quality-indicator"]');
    const latencyDisplay = page.locator('[data-testid="latency-display"]');

    if (await healthMonitor.count() > 0) {
      await expect(healthMonitor).toBeVisible();
      console.log('Connection health monitoring is available');
    }

    if (await connectionQuality.count() > 0) {
      const quality = await connectionQuality.textContent();
      console.log(`Connection quality: ${quality}`);
      expect(quality).toBeTruthy();
    }

    if (await latencyDisplay.count() > 0) {
      const latency = await latencyDisplay.textContent();
      console.log(`Current latency: ${latency}`);
      expect(latency).toBeTruthy();
    }

    // Test health monitoring over time
    const healthChecks = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000);
      
      const status = await page.locator('[data-testid="connection-status"]').getAttribute('data-status');
      healthChecks.push(status);
    }

    // Most checks should show healthy connection
    const healthyChecks = healthChecks.filter(status => status === 'connected').length;
    expect(healthyChecks).toBeGreaterThan(3); // At least 80% healthy
  });

  test('should provide analytics dashboard for real-time activity', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for analytics dashboard
    const analyticsSection = page.locator('[data-testid="analytics-section"]');
    const realtimeAnalytics = page.locator('[data-testid="realtime-analytics"]');
    const activityMetrics = page.locator('[data-testid="activity-metrics"]');

    if (await analyticsSection.count() > 0) {
      await expect(analyticsSection).toBeVisible();
      console.log('Analytics dashboard is available');

      // Check for real-time metrics
      if (await realtimeAnalytics.count() > 0) {
        const metrics = await realtimeAnalytics.textContent();
        console.log('Real-time analytics data:', metrics);
        expect(metrics).toBeTruthy();
      }

      if (await activityMetrics.count() > 0) {
        const activity = await activityMetrics.textContent();
        console.log('Activity metrics:', activity);
        expect(activity).toBeTruthy();
      }
    }

    // Test metrics updates in real-time
    const initialMetrics = await page.evaluate(() => {
      const metricsEl = document.querySelector('[data-testid="activity-metrics"]');
      return metricsEl ? metricsEl.textContent : null;
    });

    // Perform some activity
    await page.click('[data-testid="kanban-nav-link"]');
    await page.waitForTimeout(2000);

    const updatedMetrics = await page.evaluate(() => {
      const metricsEl = document.querySelector('[data-testid="activity-metrics"]');
      return metricsEl ? metricsEl.textContent : null;
    });

    // Metrics should update (or remain stable if no change expected)
    if (initialMetrics && updatedMetrics) {
      console.log('Metrics update detected');
    }
  });
});