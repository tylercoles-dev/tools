/**
 * Comprehensive Regression Tests
 * 
 * Ensures all existing functionality continues to work after new feature implementations:
 * - Core kanban board operations (drag-drop, card CRUD, board management)
 * - Basic wiki functionality (page creation, editing, navigation)
 * - Memory system core features (creation, search, retrieval)
 * - User authentication and authorization
 * - Real-time WebSocket connections
 * - API endpoint compatibility
 * - Database schema compatibility
 * - Performance characteristics remain stable
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { WikiTestHelpers } from '../utils/wiki-test-helpers';
import { KanbanTestHelpers } from '../utils/kanban-test-helpers';
import { RealtimeTestHelpers } from '../utils/realtime-test-helpers';
import { TestClient } from '../../tests/src/utils/test-client';

test.describe('Comprehensive Regression Tests', () => {
  let wikiHelpers: WikiTestHelpers;
  let kanbanHelpers: KanbanTestHelpers;
  let realtimeHelpers: RealtimeTestHelpers;
  let apiClient: TestClient;
  
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  
  test.beforeAll(async () => {
    apiClient = new TestClient(BASE_URL);
    await apiClient.authenticate({
      userId: 'regression-test-user',
      email: 'regression@example.com'
    });
  });
  
  test.beforeEach(async ({ page, context }) => {
    wikiHelpers = new WikiTestHelpers(page);
    kanbanHelpers = new KanbanTestHelpers(page);
    realtimeHelpers = new RealtimeTestHelpers(page, context);
    
    // Ensure clean authentication state
    await page.goto('/');
    await wikiHelpers.ensureAuthenticated();
  });
  
  test.describe('Core Kanban Functionality Regression', () => {
    let testBoardId: string;
    
    test.beforeEach(async ({ page }) => {
      await kanbanHelpers.navigateToKanban();
      testBoardId = await kanbanHelpers.createTestBoard('Regression Test Board');
    });
    
    test.afterEach(async ({ page }) => {
      if (testBoardId) {
        await kanbanHelpers.deleteBoard(testBoardId);
      }
    });
    
    test('basic board operations should work as before', async ({ page }) => {
      await test.step('Board creation and navigation', async () => {
        // Verify board was created and is accessible
        await expect(page.getByTestId(`board-${testBoardId}`)).toBeVisible();
        
        // Navigate to board
        await kanbanHelpers.navigateToBoard(testBoardId);
        await expect(page.getByTestId('kanban-board-view')).toBeVisible();
        
        // Verify default columns exist
        await expect(page.getByTestId('column-todo')).toBeVisible();
        await expect(page.getByTestId('column-in-progress')).toBeVisible();
        await expect(page.getByTestId('column-done')).toBeVisible();
      });
      
      await test.step('Board settings and customization', async () => {
        await page.getByTestId('board-settings-button').click();
        
        // Verify settings dialog opens
        await expect(page.getByTestId('board-settings-dialog')).toBeVisible();
        
        // Test board name change
        const nameInput = page.getByTestId('board-name-input');
        await nameInput.fill('Updated Regression Test Board');
        await page.getByTestId('save-board-settings').click();
        
        // Verify name was updated
        await expect(page.getByTestId('board-title')).toContainText('Updated Regression Test Board');
      });
    });
    
    test('card CRUD operations should work correctly', async ({ page }) => {
      await kanbanHelpers.navigateToBoard(testBoardId);
      
      let cardId: string;
      
      await test.step('Card creation', async () => {
        // Create card using existing functionality
        await page.getByTestId('add-card-button-todo').click();
        
        const titleInput = page.getByTestId('card-title-input');
        await titleInput.fill('Regression Test Card');
        
        const descriptionInput = page.getByTestId('card-description-input');
        await descriptionInput.fill('This card tests that basic CRUD operations still work');
        
        await page.getByTestId('create-card-button').click();
        
        // Verify card appears in board
        const cardElement = page.getByTestId('card-regression-test-card');
        await expect(cardElement).toBeVisible();
        
        // Extract card ID from data attribute or API
        cardId = await cardElement.getAttribute('data-card-id') || 'test-card-id';
      });
      
      await test.step('Card editing', async () => {
        // Open card for editing
        await page.getByTestId('card-regression-test-card').click();
        await expect(page.getByTestId('card-detail-modal')).toBeVisible();
        
        // Edit card title
        await page.getByTestId('edit-card-button').click();
        const titleInput = page.getByTestId('card-title-input');
        await titleInput.fill('Updated Regression Test Card');
        
        // Add labels/tags
        await page.getByTestId('add-label-button').click();
        await page.getByTestId('label-regression').click();
        
        // Save changes
        await page.getByTestId('save-card-button').click();
        
        // Verify changes
        await expect(page.getByTestId('card-title')).toContainText('Updated Regression Test Card');
        await expect(page.getByTestId('card-label-regression')).toBeVisible();
      });
      
      await test.step('Card assignment and priority', async () => {
        // Assign card to user
        await page.getByTestId('assign-user-button').click();
        await page.getByTestId('user-option-current-user').click();
        
        // Set priority
        await page.getByTestId('priority-dropdown').click();
        await page.getByTestId('priority-high').click();
        
        // Verify assignments
        await expect(page.getByTestId('card-assignee')).toBeVisible();
        await expect(page.getByTestId('card-priority-high')).toBeVisible();
      });
      
      await test.step('Card deletion', async () => {
        // Delete card
        await page.getByTestId('delete-card-button').click();
        await page.getByTestId('confirm-delete-button').click();
        
        // Verify card is removed
        await expect(page.getByTestId('card-detail-modal')).not.toBeVisible();
        await expect(page.getByTestId('card-regression-test-card')).not.toBeVisible();
      });
    });
    
    test('drag and drop functionality should work', async ({ page }) => {
      await kanbanHelpers.navigateToBoard(testBoardId);
      
      // Create test cards
      const cardId1 = await kanbanHelpers.createCard(testBoardId, {
        title: 'Drag Test Card 1',
        column: 'todo'
      });
      
      const cardId2 = await kanbanHelpers.createCard(testBoardId, {
        title: 'Drag Test Card 2',
        column: 'todo'
      });
      
      await test.step('Drag card between columns', async () => {
        const card1 = page.getByTestId(`card-${cardId1}`);
        const inProgressColumn = page.getByTestId('column-in-progress');
        
        // Perform drag and drop
        await card1.dragTo(inProgressColumn);
        
        // Verify card moved to new column
        await expect(inProgressColumn.getByTestId(`card-${cardId1}`)).toBeVisible();
        await expect(page.getByTestId('column-todo').getByTestId(`card-${cardId1}`)).not.toBeVisible();
      });
      
      await test.step('Reorder cards within column', async () => {
        const card1 = page.getByTestId(`card-${cardId1}`);
        const card2 = page.getByTestId(`card-${cardId2}`);
        
        // Get initial positions
        const card1Box = await card1.boundingBox();
        const card2Box = await card2.boundingBox();
        
        // Drag to reorder (assuming card2 is below card1)
        if (card1Box && card2Box && card1Box.y < card2Box.y) {
          await card1.dragTo(card2, { targetPosition: { x: 0, y: 50 } });
          
          // Verify order changed
          const newCard1Box = await card1.boundingBox();
          const newCard2Box = await card2.boundingBox();
          
          expect(newCard1Box?.y).toBeGreaterThan(newCard2Box?.y || 0);
        }
      });
    });
    
    test('board collaboration features should work', async ({ context, page }) => {
      await kanbanHelpers.navigateToBoard(testBoardId);
      
      // Create second user context
      const secondContext = await context.browser()!.newContext();
      const secondPage = await secondContext.newPage();
      const secondUserHelpers = new KanbanTestHelpers(secondPage);
      
      await test.step('Real-time board updates', async () => {
        // Second user joins the board
        await secondUserHelpers.navigateToKanban();
        await secondUserHelpers.ensureAuthenticated('second-user@example.com');
        await secondUserHelpers.navigateToBoard(testBoardId);
        
        // First user creates a card
        const cardId = await kanbanHelpers.createCard(testBoardId, {
          title: 'Collaboration Test Card',
          column: 'todo'
        });
        
        // Second user should see the card
        await expect(secondPage.getByTestId(`card-${cardId}`)).toBeVisible({ timeout: 5000 });
        
        // Second user moves the card
        await secondUserHelpers.moveCard(cardId, 'todo', 'in_progress');
        
        // First user should see the move
        await expect(page.getByTestId('column-in-progress').getByTestId(`card-${cardId}`)).toBeVisible({ timeout: 5000 });
      });
      
      await secondContext.close();
    });
  });
  
  test.describe('Core Wiki Functionality Regression', () => {
    let testPageIds: number[] = [];
    
    test.afterEach(async () => {
      // Cleanup test pages
      for (const pageId of testPageIds) {
        try {
          await apiClient.delete(`/api/v1/wiki/pages/${pageId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      testPageIds = [];
    });
    
    test('basic wiki operations should work as before', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      
      await test.step('Page creation', async () => {
        await page.getByTestId('create-page-button').click();
        
        // Fill basic page information
        await page.getByTestId('wiki-page-title').fill('Regression Test Page');
        await page.getByTestId('wiki-page-content').fill('This is a test page for regression testing. It should work exactly as before.');
        
        // Save page
        await page.getByTestId('save-page-button').click();
        
        // Verify page was created
        await expect(page.getByTestId('page-title')).toContainText('Regression Test Page');
        await expect(page.getByTestId('page-content')).toContainText('This is a test page');
        
        // Store page ID for cleanup
        const pageId = await page.getAttribute('[data-page-id]', 'data-page-id');
        if (pageId) {
          testPageIds.push(parseInt(pageId));
        }
      });
      
      await test.step('Page editing', async () => {
        await page.getByTestId('edit-page-button').click();
        
        // Verify edit mode
        await expect(page.getByTestId('wiki-page-content')).toBeEditable();
        
        // Make changes
        await page.getByTestId('wiki-page-content').fill('Updated content for regression testing.');
        await page.getByTestId('save-page-button').click();
        
        // Verify changes saved
        await expect(page.getByTestId('page-content')).toContainText('Updated content for regression testing');
      });
      
      await test.step('Page navigation', async () => {
        // Navigate back to wiki home
        await page.getByTestId('wiki-home-link').click();
        
        // Verify page appears in listing
        await expect(page.getByTestId('page-list')).toContainText('Regression Test Page');
        
        // Click to navigate back to page
        await page.getByTestId('page-link-regression-test-page').click();
        await expect(page.getByTestId('page-title')).toContainText('Regression Test Page');
      });
    });
    
    test('wiki search functionality should work', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      
      // Create searchable content
      await wikiHelpers.createPageWithContent('Searchable Page', 'This page contains unique searchable content about elephants and their habitats.');
      
      await test.step('Basic text search', async () => {
        // Use search functionality
        await page.getByTestId('wiki-search-input').fill('elephants');
        await page.getByTestId('search-button').click();
        
        // Verify search results
        await expect(page.getByTestId('search-results')).toBeVisible();
        await expect(page.getByTestId('search-results')).toContainText('Searchable Page');
      });
      
      await test.step('Search result navigation', async () => {
        // Click on search result
        await page.getByTestId('search-result-searchable-page').click();
        
        // Verify navigation to correct page
        await expect(page.getByTestId('page-title')).toContainText('Searchable Page');
        await expect(page.getByTestId('page-content')).toContainText('elephants');
      });
    });
    
    test('markdown rendering should work correctly', async ({ page }) => {
      await wikiHelpers.navigateToWiki();
      
      const markdownContent = `# Markdown Test Page

This page tests markdown rendering:

## Features

- **Bold text**
- *Italic text*
- [Link to example](https://example.com)
- \`inline code\`

\`\`\`javascript
// Code block
function test() {
  return "Hello World";
}
\`\`\`

> This is a blockquote

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
      
      await test.step('Markdown content creation', async () => {
        await wikiHelpers.createPageWithContent('Markdown Test', markdownContent);
        
        // Switch to preview mode
        await page.getByTestId('preview-mode-button').click();
      });
      
      await test.step('Markdown rendering verification', async () => {
        // Verify various markdown elements are rendered
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Markdown Test Page');
        await expect(page.getByRole('heading', { level: 2 })).toContainText('Features');
        
        // Verify formatted text
        await expect(page.locator('strong')).toContainText('Bold text');
        await expect(page.locator('em')).toContainText('Italic text');
        
        // Verify code elements
        await expect(page.locator('code')).toContainText('inline code');
        await expect(page.locator('pre code')).toContainText('function test()');
        
        // Verify table
        await expect(page.locator('table')).toBeVisible();
        await expect(page.locator('th')).toContainText('Column 1');
        
        // Verify blockquote
        await expect(page.locator('blockquote')).toContainText('This is a blockquote');
        
        // Verify links
        await expect(page.locator('a[href="https://example.com"]')).toContainText('Link to example');
      });
    });
  });
  
  test.describe('Core Memory System Regression', () => {
    let testMemoryIds: string[] = [];
    
    test.afterEach(async () => {
      // Cleanup test memories
      for (const memoryId of testMemoryIds) {
        try {
          await apiClient.delete(`/api/v1/memories/${memoryId}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      testMemoryIds = [];
    });
    
    test('memory creation and retrieval should work', async ({ page }) => {
      await test.step('Memory creation via API', async () => {
        const response = await apiClient.post('/api/v1/memories', {
          content: 'Regression test memory about machine learning algorithms and their applications in natural language processing.',
          context: {
            userId: 'regression-test-user',
            project: 'regression-testing',
            source: 'manual-test'
          },
          concepts: ['machine-learning', 'nlp', 'algorithms', 'regression-test'],
          importance: 4
        });
        
        expect(response.status).toBe(201);
        
        const memory = response.data.data;
        testMemoryIds.push(memory.id);
        
        expect(memory).toHaveProperty('id');
        expect(memory).toHaveProperty('content');
        expect(memory.content).toContain('machine learning algorithms');
        expect(memory.concepts).toContain('machine-learning');
      });
      
      await test.step('Memory retrieval and search', async () => {
        // Search for the created memory
        const searchResponse = await apiClient.get('/api/v1/memories/search', {
          params: {
            q: 'machine learning',
            limit: 10
          }
        });
        
        expect(searchResponse.status).toBe(200);
        
        const searchResults = searchResponse.data.data;
        expect(searchResults.memories).toBeDefined();
        expect(searchResults.memories.length).toBeGreaterThan(0);
        
        // Verify our memory is in the results
        const foundMemory = searchResults.memories.find(m => 
          testMemoryIds.includes(m.id)
        );
        expect(foundMemory).toBeDefined();
      });
      
      await test.step('Memory retrieval by ID', async () => {
        const memoryId = testMemoryIds[0];
        const response = await apiClient.get(`/api/v1/memories/${memoryId}`);
        
        expect(response.status).toBe(200);
        
        const memory = response.data.data;
        expect(memory.id).toBe(memoryId);
        expect(memory.content).toContain('machine learning algorithms');
      });
    });
    
    test('memory relationships should work', async ({ page }) => {
      // Create related memories
      const memory1Response = await apiClient.post('/api/v1/memories', {
        content: 'First memory about neural networks and deep learning architectures.',
        context: { userId: 'regression-test-user' },
        concepts: ['neural-networks', 'deep-learning']
      });
      
      const memory2Response = await apiClient.post('/api/v1/memories', {
        content: 'Second memory about convolutional neural networks and image processing.',
        context: { userId: 'regression-test-user' },
        concepts: ['cnn', 'image-processing', 'neural-networks']
      });
      
      const memory1Id = memory1Response.data.data.id;
      const memory2Id = memory2Response.data.data.id;
      testMemoryIds.push(memory1Id, memory2Id);
      
      await test.step('Create memory connection', async () => {
        const connectionResponse = await apiClient.post('/api/v1/memories/connections', {
          source_id: memory1Id,
          target_id: memory2Id,
          relationship_type: 'semantic_similarity',
          strength: 0.8,
          metadata: {
            reason: 'Both about neural networks',
            created_by: 'regression-test'
          }
        });
        
        expect(connectionResponse.status).toBe(201);
        
        const connection = connectionResponse.data.data;
        expect(connection).toHaveProperty('source_id', memory1Id);
        expect(connection).toHaveProperty('target_id', memory2Id);
        expect(connection).toHaveProperty('relationship_type', 'semantic_similarity');
      });
      
      await test.step('Retrieve related memories', async () => {
        const relatedResponse = await apiClient.get(`/api/v1/memories/${memory1Id}/related`);
        
        expect(relatedResponse.status).toBe(200);
        
        const relatedData = relatedResponse.data.data;
        expect(relatedData.related_memories).toBeDefined();
        expect(relatedData.related_memories.length).toBeGreaterThan(0);
        
        // Verify the connection exists
        const relatedMemory = relatedData.related_memories.find(
          rm => rm.memory_id === memory2Id
        );
        expect(relatedMemory).toBeDefined();
        expect(relatedMemory.relationship_type).toBe('semantic_similarity');
      });
    });
  });
  
  test.describe('Authentication and Authorization Regression', () => {
    test('user authentication should work correctly', async ({ page, context }) => {
      await test.step('Login flow', async () => {
        // Start with clean context
        await context.clearCookies();
        await page.goto('/auth/login');
        
        // Fill login form
        await page.getByTestId('email-input').fill('regression@example.com');
        await page.getByTestId('password-input').fill('test-password');
        await page.getByTestId('login-button').click();
        
        // Verify successful login
        await expect(page).toHaveURL('/');
        await expect(page.getByTestId('user-profile')).toBeVisible();
      });
      
      await test.step('Protected route access', async () => {
        // Navigate to protected routes
        await page.goto('/kanban');
        await expect(page.getByTestId('kanban-boards-list')).toBeVisible();
        
        await page.goto('/wiki');
        await expect(page.getByTestId('wiki-pages-list')).toBeVisible();
        
        await page.goto('/memory');
        await expect(page.getByTestId('memory-dashboard')).toBeVisible();
      });
      
      await test.step('Logout flow', async () => {
        await page.getByTestId('user-menu').click();
        await page.getByTestId('logout-button').click();
        
        // Verify logout
        await expect(page).toHaveURL('/auth/login');
        
        // Try to access protected route
        await page.goto('/kanban');
        await expect(page).toHaveURL('/auth/login');
      });
    });
    
    test('user permissions should be enforced', async ({ page, context }) => {
      // Test with standard user permissions
      await wikiHelpers.ensureAuthenticated('standard-user@example.com');
      
      await test.step('Standard user permissions', async () => {
        // Should be able to create own content
        await wikiHelpers.navigateToWiki();
        await expect(page.getByTestId('create-page-button')).toBeVisible();
        
        // Should not have admin functions
        await expect(page.getByTestId('admin-panel')).not.toBeVisible();
        await expect(page.getByTestId('user-management')).not.toBeVisible();
      });
    });
  });
  
  test.describe('Real-time Features Regression', () => {
    test('WebSocket connections should work', async ({ context, page }) => {
      let wsConnected = false;
      let messagesReceived = 0;
      
      await test.step('WebSocket connection establishment', async () => {
        // Monitor WebSocket connections
        page.on('websocket', ws => {
          wsConnected = true;
          
          ws.on('framereceived', event => {
            messagesReceived++;
          });
        });
        
        // Navigate to page that uses WebSocket
        await kanbanHelpers.navigateToKanban();
        
        // Wait for WebSocket connection
        await page.waitForTimeout(2000);
        expect(wsConnected).toBe(true);
      });
      
      await test.step('Real-time updates', async () => {
        const boardId = await kanbanHelpers.createTestBoard('WebSocket Test Board');
        await kanbanHelpers.navigateToBoard(boardId);
        
        const initialMessageCount = messagesReceived;
        
        // Create a card (should trigger WebSocket message)
        await kanbanHelpers.createCard(boardId, {
          title: 'WebSocket Test Card',
          column: 'todo'
        });
        
        // Wait for WebSocket message
        await page.waitForTimeout(1000);
        
        // Should have received at least one message
        expect(messagesReceived).toBeGreaterThan(initialMessageCount);
        
        // Cleanup
        await kanbanHelpers.deleteBoard(boardId);
      });
    });
  });
  
  test.describe('API Compatibility Regression', () => {
    test('existing API endpoints should work unchanged', async () => {
      await test.step('Health endpoint', async () => {
        const response = await apiClient.get('/health');
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
      });
      
      await test.step('Kanban API endpoints', async () => {
        // Test board creation
        const boardResponse = await apiClient.post('/api/v1/kanban/boards', {
          name: 'API Regression Test Board',
          description: 'Testing API compatibility'
        });
        
        expect(boardResponse.status).toBe(201);
        const boardId = boardResponse.data.data.id;
        
        // Test board retrieval
        const getBoardResponse = await apiClient.get(`/api/v1/kanban/boards/${boardId}`);
        expect(getBoardResponse.status).toBe(200);
        expect(getBoardResponse.data.data.name).toBe('API Regression Test Board');
        
        // Test card creation
        const cardResponse = await apiClient.post('/api/v1/kanban/cards', {
          title: 'API Test Card',
          description: 'Testing card API',
          board_id: boardId,
          column: 'todo'
        });
        
        expect(cardResponse.status).toBe(201);
        const cardId = cardResponse.data.data.id;
        
        // Test card retrieval
        const getCardResponse = await apiClient.get(`/api/v1/kanban/cards/${cardId}`);
        expect(getCardResponse.status).toBe(200);
        expect(getCardResponse.data.data.title).toBe('API Test Card');
        
        // Cleanup
        await apiClient.delete(`/api/v1/kanban/cards/${cardId}`);
        await apiClient.delete(`/api/v1/kanban/boards/${boardId}`);
      });
      
      await test.step('Wiki API endpoints', async () => {
        // Test page creation
        const pageResponse = await apiClient.post('/api/v1/wiki/pages', {
          title: 'API Test Page',
          content: 'Testing wiki API compatibility'
        });
        
        expect(pageResponse.status).toBe(201);
        const pageId = pageResponse.data.data.id;
        
        // Test page retrieval
        const getPageResponse = await apiClient.get(`/api/v1/wiki/pages/${pageId}`);
        expect(getPageResponse.status).toBe(200);
        expect(getPageResponse.data.data.title).toBe('API Test Page');
        
        // Test page update
        const updateResponse = await apiClient.put(`/api/v1/wiki/pages/${pageId}`, {
          title: 'Updated API Test Page',
          content: 'Updated content'
        });
        
        expect(updateResponse.status).toBe(200);
        
        // Cleanup
        await apiClient.delete(`/api/v1/wiki/pages/${pageId}`);
      });
    });
    
    test('API response formats should remain consistent', async () => {
      await test.step('Standard response format', async () => {
        const response = await apiClient.get('/api/v1/kanban/boards');
        
        expect(response.status).toBe(200);
        
        // Verify standard response structure
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);
      });
      
      await test.step('Error response format', async () => {
        const response = await apiClient.get('/api/v1/kanban/boards/non-existent-id');
        
        expect(response.status).toBe(404);
        
        // Verify error response structure
        expect(response.data).toHaveProperty('success', false);
        expect(response.data).toHaveProperty('error');
        expect(typeof response.data.error).toBe('string');
      });
    });
  });
  
  test.describe('Performance Regression', () => {
    test('page load times should remain acceptable', async ({ page }) => {
      const performanceThresholds = {
        homepage: 2000,
        kanban: 3000,
        wiki: 2500,
        memory: 2500
      };
      
      await test.step('Homepage performance', async () => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(performanceThresholds.homepage);
        console.log(`Homepage load time: ${loadTime}ms`);
      });
      
      await test.step('Kanban performance', async () => {
        const startTime = Date.now();
        await page.goto('/kanban');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(performanceThresholds.kanban);
        console.log(`Kanban load time: ${loadTime}ms`);
      });
      
      await test.step('Wiki performance', async () => {
        const startTime = Date.now();
        await page.goto('/wiki');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(performanceThresholds.wiki);
        console.log(`Wiki load time: ${loadTime}ms`);
      });
    });
    
    test('API response times should remain fast', async () => {
      const endpoints = [
        { path: '/health', threshold: 100 },
        { path: '/api/v1/kanban/boards', threshold: 500 },
        { path: '/api/v1/wiki/pages', threshold: 500 },
        { path: '/api/v1/memories', threshold: 1000 }
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await apiClient.get(endpoint.path);
        const responseTime = Date.now() - startTime;
        
        expect(response.status).toBeLessThan(400);
        expect(responseTime).toBeLessThan(endpoint.threshold);
        
        console.log(`${endpoint.path}: ${responseTime}ms`);
      }
    });
  });
});
