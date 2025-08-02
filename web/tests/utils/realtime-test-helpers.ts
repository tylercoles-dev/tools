/**
 * Real-time collaboration test helpers and utilities
 */

import { Page, expect } from '@playwright/test';
import { MultiUserSimulator, MockWebSocketMessage, RealtimeMetricsCollector } from './websocket-mock';

export interface UserAction {
  type: 'click' | 'type' | 'drag' | 'wait' | 'custom';
  selector?: string;
  text?: string;
  delay?: number;
  fromSelector?: string;
  toSelector?: string;
  customAction?: (page: Page) => Promise<void>;
}

export interface CollaborationScenario {
  name: string;
  userCount: number;
  actions: UserAction[][];
  expectedOutcome: (pages: Page[]) => Promise<void>;
  timeout?: number;
}

export class RealtimeCollaborationTester {
  private simulator: MultiUserSimulator;
  private metricsCollector: RealtimeMetricsCollector;

  constructor(userCount: number = 2) {
    this.simulator = new MultiUserSimulator(userCount);
    this.metricsCollector = new RealtimeMetricsCollector();
  }

  async initialize(baseContext: any) {
    await this.simulator.initialize(baseContext);
    this.metricsCollector.setConcurrentUserCount(this.simulator.getAllPages().length);
  }

  async runCollaborationScenario(scenario: CollaborationScenario) {
    const pages = this.simulator.getAllPages();
    
    if (scenario.userCount !== pages.length) {
      throw new Error(`Scenario requires ${scenario.userCount} users, but ${pages.length} are available`);
    }

    console.log(`Running collaboration scenario: ${scenario.name}`);

    // Execute user actions concurrently
    const actionPromises = scenario.actions.map(async (userActions, userIndex) => {
      const page = pages[userIndex];
      
      for (const action of userActions) {
        await this.executeUserAction(page, action, userIndex);
      }
    });

    await Promise.all(actionPromises);

    // Verify expected outcome
    await scenario.expectedOutcome(pages);

    console.log(`Completed collaboration scenario: ${scenario.name}`);
  }

  private async executeUserAction(page: Page, action: UserAction, userIndex: number) {
    console.log(`User ${userIndex} executing action: ${action.type}`);

    switch (action.type) {
      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        }
        break;

      case 'type':
        if (action.selector && action.text) {
          await page.fill(action.selector, action.text);
        }
        break;

      case 'drag':
        if (action.fromSelector && action.toSelector) {
          await page.dragAndDrop(action.fromSelector, action.toSelector);
        }
        break;

      case 'wait':
        const delay = action.delay || 1000;
        await page.waitForTimeout(delay);
        break;

      case 'custom':
        if (action.customAction) {
          await action.customAction(page);
        }
        break;
    }

    // Add small delay between actions to simulate human behavior
    await page.waitForTimeout(100);
  }

  async simulateConcurrentKanbanEditing(boardUrl: string) {
    await this.simulator.navigateAllUsers(boardUrl);
    const pages = this.simulator.getAllPages();

    // Wait for board to load on all pages
    await Promise.all(pages.map(page => 
      page.waitForSelector('[data-testid*="kanban-board"]', { timeout: 10000 })
    ));

    const scenario: CollaborationScenario = {
      name: 'Concurrent Kanban Card Creation',
      userCount: pages.length,
      actions: pages.map((_, index) => [
        { type: 'click', selector: '[data-testid*="add-card-button"]' },
        { type: 'type', selector: '[data-testid="card-title-input"]', text: `Card by User ${index}` },
        { type: 'type', selector: '[data-testid="card-description-input"]', text: `Created by user ${index} in real-time test` },
        { type: 'click', selector: '[data-testid="create-card-button"]' },
        { type: 'wait', delay: 2000 } // Wait for real-time sync
      ]),
      expectedOutcome: async (pages: Page[]) => {
        // All users should see all created cards
        for (let userIndex = 0; userIndex < pages.length; userIndex++) {
          for (let cardIndex = 0; cardIndex < pages.length; cardIndex++) {
            const cardTitle = `Card by User ${cardIndex}`;
            await expect(pages[userIndex].locator(`[data-testid*="card"]:has-text("${cardTitle}")`))
              .toBeVisible({ timeout: 15000 });
          }
        }
      }
    };

    await this.runCollaborationScenario(scenario);
  }

  async simulateConcurrentWikiEditing(pageUrl: string) {
    await this.simulator.navigateAllUsers(pageUrl);
    const pages = this.simulator.getAllPages();

    const scenario: CollaborationScenario = {
      name: 'Concurrent Wiki Page Editing',
      userCount: pages.length,
      actions: [
        // User 0: Edit the beginning of the page
        [
          { type: 'click', selector: '[data-testid="edit-page-button"]' },
          { type: 'wait', delay: 500 },
          { 
            type: 'custom', 
            customAction: async (page) => {
              const editor = page.locator('[data-testid="wiki-editor"]');
              await editor.click();
              await page.keyboard.press('Control+Home'); // Go to beginning
              await page.keyboard.type('# EDIT BY USER 0\n\n');
            }
          },
          { type: 'wait', delay: 1000 }
        ],
        // User 1: Edit the end of the page
        [
          { type: 'wait', delay: 1000 }, // Wait for User 0 to start
          { type: 'click', selector: '[data-testid="edit-page-button"]' },
          { 
            type: 'custom', 
            customAction: async (page) => {
              const editor = page.locator('[data-testid="wiki-editor"]');
              await editor.click();
              await page.keyboard.press('Control+End'); // Go to end
              await page.keyboard.type('\n\n## Edit by User 1\nThis was added by the second user.');
            }
          },
          { type: 'wait', delay: 1000 }
        ]
      ],
      expectedOutcome: async (pages: Page[]) => {
        // Both edits should be visible to all users
        for (const page of pages) {
          await expect(page.locator('text=EDIT BY USER 0')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('text=Edit by User 1')).toBeVisible({ timeout: 10000 });
        }
      }
    };

    await this.runCollaborationScenario(scenario);
  }

  async testDragAndDropSynchronization(boardUrl: string) {
    await this.simulator.navigateAllUsers(boardUrl);
    const pages = this.simulator.getAllPages();

    // First, create a card to move
    const createCardScenario: CollaborationScenario = {
      name: 'Create card for drag test',
      userCount: 1,
      actions: [[
        { type: 'click', selector: '[data-testid*="add-card-button"]' },
        { type: 'type', selector: '[data-testid="card-title-input"]', text: 'Drag Test Card' },
        { type: 'click', selector: '[data-testid="create-card-button"]' },
        { type: 'wait', delay: 2000 }
      ]],
      expectedOutcome: async () => {} // No verification needed here
    };

    await this.runCollaborationScenario(createCardScenario);

    // Now test drag and drop synchronization
    const dragScenario: CollaborationScenario = {
      name: 'Drag and Drop Synchronization',
      userCount: 1, // Only one user performs the drag
      actions: [[
        {
          type: 'custom',
          customAction: async (page) => {
            const card = page.locator('[data-testid*="card"]:has-text("Drag Test Card")');
            const targetColumn = page.locator('[data-testid*="column"]').nth(1); // Second column
            
            await card.dragTo(targetColumn);
            await page.waitForTimeout(2000); // Wait for sync
          }
        }
      ]],
      expectedOutcome: async (pages: Page[]) => {
        // All users should see the card in the new position
        for (const page of pages) {
          const secondColumn = page.locator('[data-testid*="column"]').nth(1);
          await expect(secondColumn.locator('[data-testid*="card"]:has-text("Drag Test Card")'))
            .toBeVisible({ timeout: 10000 });
        }
      }
    };

    await this.runCollaborationScenario(dragScenario);
  }

  async testConflictResolution(boardUrl: string) {
    await this.simulator.navigateAllUsers(boardUrl);
    const pages = this.simulator.getAllPages();

    // Create a card that both users will try to edit simultaneously
    const page0 = pages[0];
    await page0.click('[data-testid*="add-card-button"]');
    await page0.fill('[data-testid="card-title-input"]', 'Conflict Test Card');
    await page0.click('[data-testid="create-card-button"]');
    await page0.waitForTimeout(2000);

    // Both users try to edit the same card simultaneously
    const conflictScenario: CollaborationScenario = {
      name: 'Simultaneous Card Edit Conflict',
      userCount: pages.length,
      actions: pages.map((_, index) => [
        { type: 'click', selector: '[data-testid*="card"]:has-text("Conflict Test Card")' },
        { type: 'click', selector: '[data-testid="edit-card-button"]' },
        { 
          type: 'type', 
          selector: '[data-testid="card-title-input"]', 
          text: `Modified by User ${index} - ${Date.now()}`
        },
        { type: 'click', selector: '[data-testid="save-card-button"]' },
        { type: 'wait', delay: 1000 }
      ]),
      expectedOutcome: async (pages: Page[]) => {
        // One of the edits should win (last-write-wins)
        // All users should see the same final state
        await page0.waitForTimeout(3000); // Allow time for conflict resolution
        
        const finalTitle0 = await pages[0].locator('[data-testid*="card"]').first().textContent();
        
        for (let i = 1; i < pages.length; i++) {
          const finalTitleI = await pages[i].locator('[data-testid*="card"]').first().textContent();
          expect(finalTitleI).toBe(finalTitle0);
        }
      }
    };

    await this.runCollaborationScenario(conflictScenario);
  }

  async testUserPresenceIndicators(url: string) {
    await this.simulator.navigateAllUsers(url);
    const pages = this.simulator.getAllPages();

    // Check that user presence indicators appear
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // Should see other users' presence indicators
      const expectedPresenceCount = pages.length - 1; // Exclude self
      
      if (expectedPresenceCount > 0) {
        await expect(page.locator('[data-testid*="user-presence"]'))
          .toHaveCount(expectedPresenceCount, { timeout: 10000 });
      }
    }
  }

  async testActivityFeedSynchronization() {
    const pages = this.simulator.getAllPages();
    
    // User 0 performs an action
    const page0 = pages[0];
    await page0.click('[data-testid="dashboard-link"]');
    
    // Simulate creating a board
    const boardCreationMessage: MockWebSocketMessage = {
      type: 'realtime_update',
      payload: {
        entity: 'kanban',
        action: 'created',
        id: 'test-board-123',
        data: {
          type: 'board',
          name: 'Test Activity Board',
          userId: 'user-0'
        }
      },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 9),
      userId: 'user-0'
    };

    await this.simulator.broadcastMessage(boardCreationMessage);

    // All users should see the activity in their feed
    for (const page of pages) {
      await expect(page.locator('[data-testid="activity-feed"]'))
        .toContainText('Test Activity Board', { timeout: 10000 });
    }
  }

  async measureRealtimePerformance(testFunction: () => Promise<void>) {
    this.metricsCollector.reset();
    this.metricsCollector.startConnectionTimer();

    const startTime = Date.now();
    await testFunction();
    const endTime = Date.now();

    const metrics = this.metricsCollector.calculateMetrics();
    
    return {
      ...metrics,
      totalTestTime: endTime - startTime,
      averageLatency: this.metricsCollector.getAverageLatency(),
      maxLatency: this.metricsCollector.getMaxLatency()
    };
  }

  getSimulator(): MultiUserSimulator {
    return this.simulator;
  }

  async cleanup() {
    await this.simulator.cleanup();
  }
}

export interface ConnectionTest {
  name: string;
  test: (page: Page) => Promise<void>;
  timeout?: number;
}

export const ConnectionTestSuite = {
  basicConnection: {
    name: 'Basic WebSocket Connection',
    test: async (page: Page) => {
      await page.goto('/dashboard');
      
      // Wait for connection to establish
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
  },

  authenticationHandshake: {
    name: 'WebSocket Authentication Handshake',
    test: async (page: Page) => {
      await page.goto('/dashboard');
      
      // Verify authentication token is sent
      const wsMessages = await page.evaluate(() => {
        return (window as any).mockWebSocketMessages || [];
      });
      
      const authMessage = wsMessages.find((msg: any) => msg.type === 'auth');
      expect(authMessage).toBeTruthy();
    }
  },

  heartbeat: {
    name: 'WebSocket Heartbeat Mechanism',
    test: async (page: Page) => {
      await page.goto('/dashboard');
      
      // Wait for connection
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Wait for heartbeat messages
      await page.waitForTimeout(35000); // Wait for at least one heartbeat cycle
      
      const wsMessages = await page.evaluate(() => {
        return (window as any).mockWebSocketMessages || [];
      });
      
      const heartbeatMessages = wsMessages.filter((msg: any) => msg.type === 'heartbeat');
      expect(heartbeatMessages.length).toBeGreaterThan(0);
    },
    timeout: 40000
  },

  reconnection: {
    name: 'Automatic Reconnection on Connection Loss',
    test: async (page: Page) => {
      await page.goto('/dashboard');
      
      // Wait for initial connection
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Simulate connection loss
      await page.context().setOffline(true);
      
      // Should show disconnected status
      await expect(page.locator('[data-testid="connection-status"][data-status="disconnected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should reconnect automatically
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 15000 });
    }
  },

  connectionPersistence: {
    name: 'Connection Persistence Across Page Navigation',
    test: async (page: Page) => {
      await page.goto('/dashboard');
      
      // Wait for connection
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Navigate to different pages
      await page.click('[data-testid="kanban-nav-link"]');
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 5000 });
      
      await page.click('[data-testid="wiki-nav-link"]');
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 5000 });
      
      await page.click('[data-testid="memory-nav-link"]');
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 5000 });
    }
  }
};

export async function waitForRealtimeSync(page: Page, timeoutMs: number = 5000) {
  // Wait for any pending real-time updates to process
  await page.waitForFunction(() => {
    // Check if there are any pending WebSocket messages
    const connection = (window as any).mockWebSocketConnection;
    return !connection || connection.readyState === WebSocket.OPEN;
  }, { timeout: timeoutMs });
  
  // Additional wait for UI updates
  await page.waitForTimeout(1000);
}

export async function verifyDataConsistency(pages: Page[], selector: string) {
  // Get content from all pages
  const contents = await Promise.all(
    pages.map(page => page.locator(selector).allTextContents())
  );
  
  // Verify all pages have the same content
  const firstPageContent = contents[0];
  for (let i = 1; i < contents.length; i++) {
    expect(contents[i]).toEqual(firstPageContent);
  }
}

export async function simulateLatency(page: Page, latencyMs: number) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: latencyMs,
    downloadThroughput: 1000000, // 1 Mbps
    uploadThroughput: 1000000,   // 1 Mbps
  });
}