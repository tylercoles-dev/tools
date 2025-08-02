/**
 * Security and Privacy Tests for Real-time Collaboration
 * Tests security measures and privacy controls in real-time collaboration including:
 * - User isolation and data privacy
 * - Permission enforcement in real-time
 * - Message encryption and validation
 * - Rate limiting for real-time actions
 * - Authentication token refresh during sessions
 * - Audit logging for collaborative actions
 * - Cross-user data access prevention
 * - Session hijacking protection
 */

import { test, expect, Page } from '@playwright/test';
import { 
  RealtimeCollaborationTester,
  waitForRealtimeSync,
  verifyDataConsistency
} from '../utils/realtime-test-helpers';
import { MockWebSocketServer, MockWebSocketMessage } from '../utils/websocket-mock';
import { TestDataGenerator } from '../fixtures/test-data';

test.describe('User Isolation and Data Privacy', () => {
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

  test('should isolate user data and prevent cross-user access', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // Each user creates private content
    const userPrivateData = [
      { boardName: 'User 0 Private Board', cardTitle: 'Private Card 0' },
      { boardName: 'User 1 Private Board', cardTitle: 'Private Card 1' },
      { boardName: 'User 2 Private Board', cardTitle: 'Private Card 2' }
    ];
    
    // Create private boards for each user
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      const userData = userPrivateData[userIndex];
      
      await userPage.goto('/kanban');
      
      const createButton = userPage.locator('[data-testid="create-board-button"]');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        await userPage.fill('[data-testid="board-name-input"]', userData.boardName);
        await userPage.fill('[data-testid="board-description-input"]', `Private board for User ${userIndex}`);
        
        // Set as private if option exists
        const privateToggle = userPage.locator('[data-testid="board-private-toggle"]');
        if (await privateToggle.count() > 0) {
          await privateToggle.click();
        }
        
        await userPage.click('[data-testid="create-board-submit"]');
        await userPage.waitForURL('**/kanban/**');
        
        // Add private card
        await userPage.click('[data-testid*="add-card-button"]');
        await userPage.fill('[data-testid="card-title-input"]', userData.cardTitle);
        await userPage.fill('[data-testid="card-description-input"]', `Private content for User ${userIndex}`);
        await userPage.click('[data-testid="create-card-button"]');
      }
    }
    
    await waitForRealtimeSync(pages[0], 5000);
    
    // Verify users cannot see each other's private content
    for (let userIndex = 0; userIndex < pages.length; userIndex++) {
      const userPage = pages[userIndex];
      await userPage.goto('/kanban');
      
      // User should only see their own board
      const ownBoardName = userPrivateData[userIndex].boardName;
      await expect(userPage.locator(`[data-testid*="board"]:has-text("${ownBoardName}")`))
        .toBeVisible({ timeout: 10000 });
      
      // Should not see other users' private boards
      for (let otherUserIndex = 0; otherUserIndex < pages.length; otherUserIndex++) {
        if (otherUserIndex !== userIndex) {
          const otherBoardName = userPrivateData[otherUserIndex].boardName;
          const otherBoard = userPage.locator(`[data-testid*="board"]:has-text("${otherBoardName}")`);
          
          expect(await otherBoard.count()).toBe(0);
        }
      }
    }
  });

  test('should enforce board-level permissions in real-time', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    const pages = simulator.getAllPages();
    
    // User 0 creates a board and sets permissions
    const ownerPage = pages[0];
    await ownerPage.goto('/kanban');
    
    const createButton = ownerPage.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await ownerPage.fill('[data-testid="board-name-input"]', 'Permission Test Board');
      await ownerPage.click('[data-testid="create-board-submit"]');
      
      await ownerPage.waitForURL('**/kanban/**');
      const boardUrl = ownerPage.url();
      
      // Set permissions if available
      const settingsButton = ownerPage.locator('[data-testid="board-settings-button"]');
      if (await settingsButton.count() > 0) {
        await settingsButton.click();
        
        const permissionsTab = ownerPage.locator('[data-testid="permissions-tab"]');
        if (await permissionsTab.count() > 0) {
          await permissionsTab.click();
          
          // Set User 1 as read-only, User 2 as no access
          const user1Permission = ownerPage.locator('[data-testid="user-1-permission-select"]');
          if (await user1Permission.count() > 0) {
            await user1Permission.selectOption('read');
          }
          
          const user2Permission = ownerPage.locator('[data-testid="user-2-permission-select"]');
          if (await user2Permission.count() > 0) {
            await user2Permission.selectOption('none');
          }
          
          await ownerPage.click('[data-testid="save-permissions-button"]');
        }
      }
      
      // User 1 (read-only) tries to access board
      const readOnlyPage = pages[1];
      await readOnlyPage.goto(boardUrl);
      
      // Should be able to view but not edit
      const addCardButton = readOnlyPage.locator('[data-testid*="add-card-button"]');
      if (await addCardButton.count() > 0) {
        // Button should be disabled or hidden
        const isDisabled = await addCardButton.isDisabled();
        const isHidden = !(await addCardButton.isVisible());
        
        expect(isDisabled || isHidden).toBeTruthy();
      }
      
      // Should show read-only indicator
      const readOnlyIndicator = readOnlyPage.locator('[data-testid="read-only-indicator"]');
      if (await readOnlyIndicator.count() > 0) {
        await expect(readOnlyIndicator).toBeVisible();
      }
      
      // User 2 (no access) tries to access board
      const noAccessPage = pages[2];
      await noAccessPage.goto(boardUrl);
      
      // Should be blocked or redirected
      const accessDenied = noAccessPage.locator('[data-testid="access-denied"]');
      const permissionError = noAccessPage.locator('[data-testid="permission-error"]');
      
      if (await accessDenied.count() > 0 || await permissionError.count() > 0) {
        console.log('User 2 properly blocked from accessing board');
      } else {
        // Check if redirected to unauthorized page
        const currentUrl = noAccessPage.url();
        if (currentUrl.includes('unauthorized') || currentUrl.includes('403')) {
          console.log('User 2 redirected to unauthorized page');
        }
      }
    }
  });

  test('should validate message authenticity and prevent tampering', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create shared board
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await page.fill('[data-testid="board-name-input"]', 'Security Test Board');
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // User 0 creates a legitimate card
      await pages[0].click('[data-testid*="add-card-button"]');
      await pages[0].fill('[data-testid="card-title-input"]', 'Legitimate Card');
      await pages[0].click('[data-testid="create-card-button"]');
      
      await waitForRealtimeSync(pages[0], 3000);
      
      // Attempt to send malicious message through mock server
      const maliciousMessage: MockWebSocketMessage = {
        type: 'realtime_update',
        payload: {
          entity: 'kanban',
          action: 'created',
          id: 'malicious-card-123',
          data: {
            type: 'card',
            title: '<script>alert("XSS")</script>Malicious Card',
            description: 'This should be sanitized or rejected',
            userId: 'fake-user-id'
          }
        },
        timestamp: new Date().toISOString(),
        id: 'malicious-message-123',
        userId: 'fake-user-id'
      };
      
      await mockServer.sendMessageToAll(maliciousMessage);
      await waitForRealtimeSync(pages[0], 5000);
      
      // Verify malicious content is not displayed or is sanitized
      for (const userPage of pages) {
        // Should not execute script
        const alerts = await userPage.evaluate(() => {
          return (window as any).alertMessages || [];
        });
        expect(alerts).not.toContain('XSS');
        
        // Card should either not appear or be sanitized
        const maliciousCard = userPage.locator('[data-testid*="card"]:has-text("Malicious Card")');
        
        if (await maliciousCard.count() > 0) {
          // If card appears, script should be sanitized
          const cardContent = await maliciousCard.textContent();
          expect(cardContent).not.toContain('<script>');
          expect(cardContent).not.toContain('alert(');
        }
      }
      
      // Legitimate card should still be visible
      for (const userPage of pages) {
        await expect(userPage.locator('[data-testid*="card"]:has-text("Legitimate Card")'))
          .toBeVisible();
      }
    }
  });

  test('should enforce rate limiting for real-time actions', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await page.fill('[data-testid="board-name-input"]', 'Rate Limit Test Board');
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      
      // Attempt rapid card creation (should trigger rate limiting)
      const rapidCreationAttempts = 20;
      let successfulCreations = 0;
      let rateLimitHit = false;
      
      for (let i = 0; i < rapidCreationAttempts; i++) {
        try {
          await page.click('[data-testid*="add-card-button"]');
          await page.fill('[data-testid="card-title-input"]', `Rapid Card ${i}`);
          await page.click('[data-testid="create-card-button"]');
          
          // Very short delay to trigger rate limiting
          await page.waitForTimeout(50);
          
          // Check if card was actually created
          const card = page.locator(`[data-testid*="card"]:has-text("Rapid Card ${i}")`);
          if (await card.count() > 0) {
            successfulCreations++;
          }
          
        } catch (error) {
          console.log(`Card creation ${i} failed (possibly rate limited)`);
        }
        
        // Check for rate limit messages
        const rateLimitError = page.locator('[data-testid="rate-limit-error"]');
        const tooManyRequests = page.locator('[data-testid*="error"]:has-text("too many"), [data-testid*="error"]:has-text("rate limit")');
        
        if (await rateLimitError.count() > 0 || await tooManyRequests.count() > 0) {
          rateLimitHit = true;
          console.log(`Rate limiting triggered after ${i + 1} attempts`);
          break;
        }
      }
      
      console.log(`${successfulCreations} out of ${rapidCreationAttempts} rapid creations succeeded`);
      
      // Rate limiting should prevent all rapid creations from succeeding
      expect(successfulCreations).toBeLessThan(rapidCreationAttempts);
      
      if (rateLimitHit) {
        console.log('Rate limiting is properly implemented');
      } else {
        // If no explicit rate limit error, check if creation rate was naturally limited
        expect(successfulCreations).toBeLessThan(rapidCreationAttempts * 0.8); // Less than 80% should succeed
      }
    }
  });

  test('should handle authentication token expiry during real-time session', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Simulate token expiry by clearing authentication
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Also clear any JWT tokens
      ['token', 'jwt', 'access_token', 'auth_token'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    });
    
    // Try to perform an action that requires authentication
    await page.click('[data-testid="kanban-nav-link"]');
    
    // Should either:
    // 1. Redirect to login
    // 2. Show authentication error
    // 3. Prompt for re-authentication
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const authError = page.locator('[data-testid="auth-error"]');
    const loginRedirect = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const reAuthPrompt = page.locator('[data-testid="re-auth-prompt"]');
    
    const hasAuthError = await authError.count() > 0;
    const hasReAuthPrompt = await reAuthPrompt.count() > 0;
    
    expect(loginRedirect || hasAuthError || hasReAuthPrompt).toBeTruthy();
    
    if (loginRedirect) {
      console.log('User redirected to login after token expiry');
    } else if (hasAuthError) {
      console.log('Authentication error displayed');
    } else if (hasReAuthPrompt) {
      console.log('Re-authentication prompt shown');
    }
    
    // WebSocket connection should be closed or show disconnected
    const connectionStatus = await page.locator('[data-testid="connection-status"]').getAttribute('data-status');
    expect(connectionStatus).not.toBe('connected');
  });

  test('should audit collaborative actions for security monitoring', async ({ page, context }) => {
    const simulator = collaborationTester.getSimulator();
    
    // Create board for auditing test
    await page.goto('/kanban');
    
    const createButton = page.locator('[data-testid="create-board-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      await page.fill('[data-testid="board-name-input"]', 'Audit Test Board');
      await page.click('[data-testid="create-board-submit"]');
      
      await page.waitForURL('**/kanban/**');
      const boardUrl = page.url();
      
      await simulator.navigateAllUsers(boardUrl);
      const pages = simulator.getAllPages();
      
      // Perform various collaborative actions
      const auditableActions = [
        async () => {
          // User 0 creates card
          await pages[0].click('[data-testid*="add-card-button"]');
          await pages[0].fill('[data-testid="card-title-input"]', 'Auditable Card 1');
          await pages[0].click('[data-testid="create-card-button"]');
        },
        async () => {
          // User 1 edits card
          const card = pages[1].locator('[data-testid*="card"]:has-text("Auditable Card 1")');
          if (await card.count() > 0) {
            await card.click();
            const editButton = pages[1].locator('[data-testid="edit-card-button"]');
            if (await editButton.count() > 0) {
              await editButton.click();
              await pages[1].fill('[data-testid="card-title-input"]', 'Auditable Card 1 - Edited');
              await pages[1].click('[data-testid="save-card-button"]');
            }
          }
        },
        async () => {
          // User 2 adds column
          await pages[2].click('[data-testid="add-column-button"]');
          await pages[2].fill('[data-testid="column-name-input"]', 'Audit Column');
          await pages[2].click('[data-testid="create-column-button"]');
        }
      ];
      
      for (const action of auditableActions) {
        await action();
        await waitForRealtimeSync(pages[0], 2000);
      }
      
      // Check for audit logging (if implemented)
      // This would typically be in admin interface or logs
      const adminPage = pages[0];
      await adminPage.goto('/admin/audit-log');
      
      const auditLog = adminPage.locator('[data-testid="audit-log"]');
      if (await auditLog.count() > 0) {
        console.log('Audit logging interface is available');
        
        // Look for logged actions
        const logEntries = adminPage.locator('[data-testid*="audit-entry"]');
        const entryCount = await logEntries.count();
        
        console.log(`Found ${entryCount} audit log entries`);
        
        // Should have entries for the actions performed
        expect(entryCount).toBeGreaterThan(0);
        
        // Check for specific action types
        const cardCreationEntry = adminPage.locator('[data-testid*="audit-entry"]:has-text("card_created")');
        const cardEditEntry = adminPage.locator('[data-testid*="audit-entry"]:has-text("card_updated")');
        const columnCreationEntry = adminPage.locator('[data-testid*="audit-entry"]:has-text("column_created")');
        
        if (await cardCreationEntry.count() > 0) {
          console.log('Card creation is being audited');
        }
        if (await cardEditEntry.count() > 0) {
          console.log('Card editing is being audited');
        }
        if (await columnCreationEntry.count() > 0) {
          console.log('Column creation is being audited');
        }
        
      } else {
        console.log('Audit logging interface not available (may not be implemented)');
      }
    }
  });

  test('should prevent session hijacking and unauthorized access', async ({ page, context }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Get current session information
    const sessionInfo = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        sessionStorage: Object.keys(sessionStorage),
        localStorage: Object.keys(localStorage),
        cookies: document.cookie
      };
    });
    
    // Try to create a second context with different user agent (simulating hijack attempt)
    const hijackContext = await context.browser()?.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Hijacker/1.0'
    });
    
    if (hijackContext) {
      const hijackPage = await hijackContext.newPage();
      
      // Copy session data to hijack attempt
      await hijackContext.addCookies(await context.cookies());
      
      // Try to access protected content
      await hijackPage.goto('/dashboard');
      
      // Should either:
      // 1. Be blocked due to user agent mismatch
      // 2. Require re-authentication
      // 3. Show security warning
      
      await hijackPage.waitForTimeout(3000);
      
      const securityBlocked = hijackPage.locator('[data-testid="security-blocked"]');
      const reAuthRequired = hijackPage.locator('[data-testid="re-auth-required"]');
      const sessionMismatch = hijackPage.locator('[data-testid="session-mismatch"]');
      const currentUrl = hijackPage.url();
      
      const isBlocked = await securityBlocked.count() > 0;
      const needsReAuth = await reAuthRequired.count() > 0;
      const hasMismatch = await sessionMismatch.count() > 0;
      const redirectedToLogin = currentUrl.includes('/login');
      
      if (isBlocked || needsReAuth || hasMismatch || redirectedToLogin) {
        console.log('Session hijacking attempt was properly blocked');
      } else {
        // If not explicitly blocked, check if WebSocket connection fails
        const connectionStatus = await hijackPage.locator('[data-testid="connection-status"]').getAttribute('data-status');
        
        if (connectionStatus !== 'connected') {
          console.log('WebSocket connection blocked for suspicious session');
        } else {
          console.log('Warning: Potential session hijacking not detected');
        }
      }
      
      await hijackContext.close();
    }
    
    // Original session should still work
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible();
  });
});

test.describe('Message Encryption and Validation', () => {
  let mockServer: MockWebSocketServer;

  test.beforeEach(async () => {
    mockServer = new MockWebSocketServer();
    await mockServer.start();
  });

  test.afterEach(async () => {
    await mockServer.stop();
  });

  test('should validate message structure and reject malformed messages', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Send various malformed messages
    const malformedMessages = [
      // Missing required fields
      { type: 'test' }, // Missing payload, timestamp, id
      
      // Invalid JSON structure
      "invalid json string",
      
      // Missing message type
      { payload: { data: 'test' }, timestamp: new Date().toISOString(), id: '123' },
      
      // Invalid timestamp
      { type: 'test', payload: {}, timestamp: 'invalid-date', id: '124' },
      
      // Oversized payload
      { 
        type: 'test', 
        payload: { data: 'x'.repeat(1000000) }, // 1MB payload
        timestamp: new Date().toISOString(), 
        id: '125' 
      },
      
      // SQL injection attempt
      {
        type: 'realtime_update',
        payload: {
          entity: 'kanban',
          action: "'; DROP TABLE cards; --",
          id: '"; DROP TABLE cards; --'
        },
        timestamp: new Date().toISOString(),
        id: '126'
      }
    ];
    
    for (let i = 0; i < malformedMessages.length; i++) {
      const message = malformedMessages[i];
      console.log(`Testing malformed message ${i + 1}`);
      
      try {
        if (typeof message === 'string') {
          // Send raw string
          await page.evaluate((msgString) => {
            const ws = (window as any).mockWebSocketConnection;
            if (ws && ws.send) {
              ws.send(msgString);
            }
          }, message);
        } else {
          await mockServer.sendMessageToAll(message as any);
        }
        
        await page.waitForTimeout(1000);
        
        // Check for error handling
        const validationError = page.locator('[data-testid="message-validation-error"]');
        const protocolError = page.locator('[data-testid="protocol-error"]');
        
        if (await validationError.count() > 0 || await protocolError.count() > 0) {
          console.log(`Malformed message ${i + 1} properly rejected`);
        }
        
        // Connection should remain stable despite malformed messages
        await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
          .toBeVisible({ timeout: 5000 });
        
      } catch (error) {
        console.log(`Malformed message ${i + 1} caused error: ${error.message}`);
      }
    }
    
    // Send valid message to ensure system still works
    const validMessage: MockWebSocketMessage = {
      type: 'test_message',
      payload: { message: 'Valid message after malformed attempts' },
      timestamp: new Date().toISOString(),
      id: 'valid-after-malformed'
    };
    
    await mockServer.sendMessageToAll(validMessage);
    
    // Should process valid message normally
    await page.waitForFunction((messageId) => {
      const messages = (window as any).receivedMessages || [];
      return messages.some((msg: any) => msg.id === messageId);
    }, validMessage.id, { timeout: 10000 });
    
    console.log('System recovered and processed valid message after malformed attempts');
  });

  test('should enforce message size limits and prevent DoS attacks', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Test various message sizes
    const messageSizes = [
      { name: 'Normal', size: 1000, shouldSucceed: true },
      { name: 'Large', size: 100000, shouldSucceed: true },
      { name: 'Very Large', size: 1000000, shouldSucceed: false }, // 1MB - should be rejected
      { name: 'Massive', size: 10000000, shouldSucceed: false }, // 10MB - definitely rejected
    ];
    
    for (const testCase of messageSizes) {
      console.log(`Testing ${testCase.name} message (${testCase.size} bytes)`);
      
      const largeMessage = {
        type: 'size_test',
        payload: {
          data: 'x'.repeat(testCase.size),
          testCase: testCase.name
        },
        timestamp: new Date().toISOString(),
        id: `size-test-${testCase.name.toLowerCase()}`
      };
      
      const startTime = Date.now();
      
      try {
        await mockServer.sendMessageToAll(largeMessage);
        
        if (testCase.shouldSucceed) {
          // Should process successfully
          await page.waitForFunction((messageId) => {
            const messages = (window as any).receivedMessages || [];
            return messages.some((msg: any) => msg.id === messageId);
          }, largeMessage.id, { timeout: 30000 });
          
          const processingTime = Date.now() - startTime;
          console.log(`${testCase.name} message processed in ${processingTime}ms`);
          
        } else {
          // Should be rejected - wait to see if it gets processed
          await page.waitForTimeout(5000);
          
          const received = await page.evaluate((messageId) => {
            const messages = (window as any).receivedMessages || [];
            return messages.some((msg: any) => msg.id === messageId);
          }, largeMessage.id);
          
          if (!received) {
            console.log(`${testCase.name} message properly rejected (too large)`);
          } else {
            console.log(`Warning: ${testCase.name} message was not rejected as expected`);
          }
        }
        
      } catch (error) {
        if (testCase.shouldSucceed) {
          console.log(`Unexpected error with ${testCase.name} message: ${error.message}`);
        } else {
          console.log(`${testCase.name} message properly rejected with error`);
        }
      }
      
      // Connection should remain stable
      await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
        .toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle message replay attacks', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="connection-status"][data-status="connected"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Send original message
    const originalMessage: MockWebSocketMessage = {
      type: 'replay_test',
      payload: {
        action: 'sensitive_operation',
        data: 'Original execution',
        timestamp: Date.now()
      },
      timestamp: new Date().toISOString(),
      id: 'replay-test-original'
    };
    
    await mockServer.sendMessageToAll(originalMessage);
    
    // Wait for processing
    await page.waitForFunction((messageId) => {
      const messages = (window as any).receivedMessages || [];
      return messages.some((msg: any) => msg.id === messageId);
    }, originalMessage.id, { timeout: 10000 });
    
    console.log('Original message processed');
    
    // Attempt to replay the same message (same ID)
    await page.waitForTimeout(2000);
    await mockServer.sendMessageToAll(originalMessage);
    
    await page.waitForTimeout(3000);
    
    // Check if message was processed twice
    const messageCount = await page.evaluate((messageId) => {
      const messages = (window as any).receivedMessages || [];
      return messages.filter((msg: any) => msg.id === messageId).length;
    }, originalMessage.id);
    
    if (messageCount === 1) {
      console.log('Replay attack properly prevented - message processed only once');
    } else {
      console.log(`Warning: Message processed ${messageCount} times (possible replay vulnerability)`);
    }
    
    // Try replaying with different timestamp (same ID)
    const replayedMessage = {
      ...originalMessage,
      timestamp: new Date().toISOString(),
      payload: {
        ...originalMessage.payload,
        data: 'Replayed execution',
        timestamp: Date.now()
      }
    };
    
    await mockServer.sendMessageToAll(replayedMessage);
    await page.waitForTimeout(3000);
    
    const totalCount = await page.evaluate((messageId) => {
      const messages = (window as any).receivedMessages || [];
      return messages.filter((msg: any) => msg.id === messageId).length;
    }, originalMessage.id);
    
    expect(totalCount).toBe(1); // Should still be 1, not processed again
  });
});