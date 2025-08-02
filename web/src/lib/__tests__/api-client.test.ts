/**
 * Unit tests for api-client.ts
 */

import MockAdapter from 'axios-mock-adapter';
import { ApiClient } from '../api-client';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000',
  assign: jest.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    apiClient = new ApiClient();
    mockAdapter = new MockAdapter(apiClient['client']);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  describe('constructor', () => {
    it('should create client with default configuration', () => {
      const client = new ApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('should create client with custom configuration', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 5,
      };
      
      const client = new ApiClient(config);
      expect(client).toBeInstanceOf(ApiClient);
      expect(client['retries']).toBe(5);
    });

    it('should use environment variables for baseURL', () => {
      process.env.API_BASE_URL = 'https://env.example.com';
      const client = new ApiClient();
      expect(client['client'].defaults.baseURL).toBe('https://env.example.com');
      delete process.env.API_BASE_URL;
    });
  });

  describe('authentication interceptors', () => {
    describe('request interceptor', () => {
      it('should add authorization header when token exists', async () => {
        localStorageMock.getItem.mockReturnValue('test-token');
        
        mockAdapter.onGet('/test').reply((config) => {
          expect(config.headers?.Authorization).toBe('Bearer test-token');
          return [200, {}];
        });

        await apiClient.get('/test');
        expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
      });

      it('should not add authorization header when token does not exist', async () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        mockAdapter.onGet('/test').reply((config) => {
          expect(config.headers?.Authorization).toBeUndefined();
          return [200, {}];
        });

        await apiClient.get('/test');
      });
    });

    describe('response interceptor', () => {
      it('should pass through successful responses', async () => {
        const responseData = { success: true };
        mockAdapter.onGet('/test').reply(200, responseData);

        const response = await apiClient.get('/test');
        expect(response.data).toEqual(responseData);
      });

      it('should attempt token refresh on 401 error', async () => {
        localStorageMock.getItem
          .mockReturnValueOnce('expired-token') // First call for auth header
          .mockReturnValueOnce('refresh-token'); // Second call for refresh token

        const newTokens = {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        };

        // First request fails with 401
        mockAdapter.onGet('/test').replyOnce(401);
        // Refresh token request succeeds
        mockAdapter.onPost('/api/auth/refresh').reply(200, newTokens);
        // Retry original request succeeds
        mockAdapter.onGet('/test').reply(200, { success: true });

        const response = await apiClient.get('/test');
        
        expect(response.data).toEqual({ success: true });
        expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-access-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
      });

      it('should redirect to login when token refresh fails', async () => {
        localStorageMock.getItem
          .mockReturnValueOnce('expired-token')
          .mockReturnValueOnce('invalid-refresh-token');

        mockAdapter.onGet('/test').reply(401);
        mockAdapter.onPost('/api/auth/refresh').reply(401);

        try {
          await apiClient.get('/test');
        } catch (error) {
          // Expected to throw
        }

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
        expect(mockLocation.href).toBe('/auth/login');
      });

      it('should redirect to login when no refresh token available', async () => {
        localStorageMock.getItem
          .mockReturnValueOnce('expired-token')
          .mockReturnValueOnce(null); // No refresh token

        mockAdapter.onGet('/test').reply(401);

        try {
          await apiClient.get('/test');
        } catch (error) {
          // Expected to throw
        }

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
        expect(mockLocation.href).toBe('/auth/login');
      });

      it('should not retry requests that already have retry header', async () => {
        mockAdapter.onGet('/test').reply((config) => {
          if (config.headers?.['X-Retry']) {
            return [401, {}]; // Still fail even with retry header
          }
          return [401, {}];
        });

        try {
          await apiClient['client'].get('/test', {
            headers: { 'X-Retry': 'true' },
          });
        } catch (error) {
          expect(error.response?.status).toBe(401);
        }

        // Should not attempt refresh since retry header is present
        expect(mockAdapter.history.post).toHaveLength(0);
      });

      it('should pass through non-401 errors', async () => {
        mockAdapter.onGet('/test').reply(500, { error: 'Server error' });

        try {
          await apiClient.get('/test');
        } catch (error) {
          expect(error.response?.status).toBe(500);
          expect(error.response?.data).toEqual({ error: 'Server error' });
        }
      });
    });
  });

  describe('health endpoints', () => {
    it('should get basic health status', async () => {
      const healthData = { status: 'healthy', uptime: 12345 };
      mockAdapter.onGet('/api/health').reply(200, healthData);

      const result = await apiClient.getHealth();
      expect(result).toEqual(healthData);
    });

    it('should get detailed health information', async () => {
      const detailedHealth = {
        status: 'healthy',
        uptime: 12345,
        services: { database: 'healthy', redis: 'healthy' },
      };
      mockAdapter.onGet('/api/health/detailed').reply(200, detailedHealth);

      const result = await apiClient.getDetailedHealth();
      expect(result).toEqual(detailedHealth);
    });
  });

  describe('authentication endpoints', () => {
    describe('login', () => {
      it('should login and store tokens', async () => {
        const loginResponse = {
          data: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: { id: '1', email: 'test@example.com' },
          },
        };
        
        mockAdapter.onPost('/api/auth/login').reply(200, loginResponse);

        const result = await apiClient.login('test@example.com', 'password');
        
        expect(result).toEqual(loginResponse);
        expect(mockAdapter.history.post[0].data).toBe(
          JSON.stringify({ email: 'test@example.com', password: 'password' })
        );
        expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'access-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
      });

      it('should handle login errors', async () => {
        mockAdapter.onPost('/api/auth/login').reply(401, { message: 'Invalid credentials' });

        try {
          await apiClient.login('test@example.com', 'wrong-password');
        } catch (error) {
          expect(error.response?.status).toBe(401);
        }
      });
    });

    describe('signup', () => {
      it('should signup new user', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password',
          name: 'Test User',
        };
        const signupResponse = { data: { success: true } };
        
        mockAdapter.onPost('/api/auth/signup').reply(201, signupResponse);

        const result = await apiClient.signup(userData);
        
        expect(result).toEqual(signupResponse);
        expect(mockAdapter.history.post[0].data).toBe(JSON.stringify(userData));
      });

      it('should handle signup errors', async () => {
        mockAdapter.onPost('/api/auth/signup').reply(400, { message: 'Email already exists' });

        try {
          await apiClient.signup({
            email: 'existing@example.com',
            password: 'password',
            name: 'Test User',
          });
        } catch (error) {
          expect(error.response?.status).toBe(400);
        }
      });
    });

    describe('logout', () => {
      it('should logout and clear tokens', async () => {
        mockAdapter.onPost('/api/auth/logout').reply(200);

        await apiClient.logout();
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      });

      it('should clear tokens even if logout request fails', async () => {
        mockAdapter.onPost('/api/auth/logout').reply(500);

        // Should not throw error even if request fails due to finally block
        await expect(apiClient.logout()).resolves.not.toThrow();
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      });
    });
  });

  describe('kanban endpoints', () => {
    it('should get kanban boards', async () => {
      const boardsData = [
        { id: '1', name: 'Board 1' },
        { id: '2', name: 'Board 2' },
      ];
      mockAdapter.onGet('/api/kanban/boards').reply(200, boardsData);

      const result = await apiClient.getKanbanBoards();
      expect(result).toEqual(boardsData);
    });

    it('should create kanban board', async () => {
      const newBoard = { name: 'New Board', description: 'Test board' };
      const createdBoard = { id: '1', ...newBoard };
      
      mockAdapter.onPost('/api/kanban/boards').reply(201, createdBoard);

      const result = await apiClient.createKanbanBoard(newBoard);
      expect(result).toEqual(createdBoard);
      expect(mockAdapter.history.post[0].data).toBe(JSON.stringify(newBoard));
    });

    it('should get specific kanban board', async () => {
      const boardData = { id: '1', name: 'Test Board' };
      mockAdapter.onGet('/api/kanban/boards/1').reply(200, boardData);

      const result = await apiClient.getKanbanBoard('1');
      expect(result).toEqual(boardData);
    });

    it('should update kanban board', async () => {
      const updates = { name: 'Updated Board' };
      const updatedBoard = { id: '1', name: 'Updated Board' };
      
      mockAdapter.onPatch('/api/kanban/boards/1').reply(200, updatedBoard);

      const result = await apiClient.updateKanbanBoard('1', updates);
      expect(result).toEqual(updatedBoard);
      expect(mockAdapter.history.patch[0].data).toBe(JSON.stringify(updates));
    });

    it('should delete kanban board', async () => {
      mockAdapter.onDelete('/api/kanban/boards/1').reply(200, { success: true });

      const result = await apiClient.deleteKanbanBoard('1');
      expect(result).toEqual({ success: true });
    });

    it('should create kanban card', async () => {
      const newCard = { title: 'New Card', boardId: '1' };
      const createdCard = { id: 'card-1', ...newCard };
      
      mockAdapter.onPost('/api/kanban/cards').reply(201, createdCard);

      const result = await apiClient.createKanbanCard(newCard);
      expect(result).toEqual(createdCard);
    });

    it('should update kanban card', async () => {
      const updates = { title: 'Updated Card' };
      mockAdapter.onPatch('/api/kanban/cards/card-1').reply(200, { success: true });

      const result = await apiClient.updateKanbanCard('card-1', updates);
      expect(result).toEqual({ success: true });
    });

    it('should delete kanban card', async () => {
      mockAdapter.onDelete('/api/kanban/cards/card-1').reply(200, { success: true });

      const result = await apiClient.deleteKanbanCard('card-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('memory endpoints', () => {
    it('should get memories', async () => {
      const memoriesData = [
        { id: '1', title: 'Memory 1' },
        { id: '2', title: 'Memory 2' },
      ];
      mockAdapter.onGet('/api/memory/memories').reply(200, memoriesData);

      const result = await apiClient.getMemories();
      expect(result).toEqual(memoriesData);
    });

    it('should get memories with parameters', async () => {
      const params = { limit: 10, category: 'work' };
      mockAdapter.onGet('/api/memory/memories').reply((config) => {
        expect(config.params).toEqual(params);
        return [200, []];
      });

      await apiClient.getMemories(params);
    });

    it('should create memory', async () => {
      const newMemory = { title: 'New Memory', content: 'Test content' };
      const createdMemory = { id: 'mem-1', ...newMemory };
      
      mockAdapter.onPost('/api/memory/memories').reply(201, createdMemory);

      const result = await apiClient.createMemory(newMemory);
      expect(result).toEqual(createdMemory);
    });

    it('should get specific memory', async () => {
      const memoryData = { id: 'mem-1', title: 'Test Memory' };
      mockAdapter.onGet('/api/memory/memories/mem-1').reply(200, memoryData);

      const result = await apiClient.getMemory('mem-1');
      expect(result).toEqual(memoryData);
    });

    it('should update memory', async () => {
      const updates = { title: 'Updated Memory' };
      mockAdapter.onPatch('/api/memory/memories/mem-1').reply(200, { success: true });

      const result = await apiClient.updateMemory('mem-1', updates);
      expect(result).toEqual({ success: true });
    });

    it('should delete memory', async () => {
      mockAdapter.onDelete('/api/memory/memories/mem-1').reply(200, { success: true });

      const result = await apiClient.deleteMemory('mem-1');
      expect(result).toEqual({ success: true });
    });

    it('should search memories', async () => {
      const searchResults = [{ id: '1', title: 'Found Memory' }];
      const query = 'test query';
      const filters = { category: 'work' };
      
      mockAdapter.onGet('/api/memory/search').reply((config) => {
        expect(config.params).toEqual({ query, ...filters });
        return [200, searchResults];
      });

      const result = await apiClient.searchMemories(query, filters);
      expect(result).toEqual(searchResults);
    });
  });

  describe('wiki endpoints', () => {
    it('should get wiki pages', async () => {
      const pagesData = [
        { id: '1', title: 'Page 1' },
        { id: '2', title: 'Page 2' },
      ];
      mockAdapter.onGet('/api/wiki/pages').reply(200, pagesData);

      const result = await apiClient.getWikiPages();
      expect(result).toEqual(pagesData);
    });

    it('should get wiki pages with parameters', async () => {
      const params = { category: 'docs', limit: 5 };
      mockAdapter.onGet('/api/wiki/pages').reply((config) => {
        expect(config.params).toEqual(params);
        return [200, []];
      });

      await apiClient.getWikiPages(params);
    });

    it('should create wiki page', async () => {
      const newPage = { title: 'New Page', content: 'Page content' };
      const createdPage = { id: 'page-1', ...newPage };
      
      mockAdapter.onPost('/api/wiki/pages').reply(201, createdPage);

      const result = await apiClient.createWikiPage(newPage);
      expect(result).toEqual(createdPage);
    });

    it('should get specific wiki page', async () => {
      const pageData = { id: 'page-1', title: 'Test Page' };
      mockAdapter.onGet('/api/wiki/pages/page-1').reply(200, pageData);

      const result = await apiClient.getWikiPage('page-1');
      expect(result).toEqual(pageData);
    });

    it('should update wiki page', async () => {
      const updates = { title: 'Updated Page' };
      mockAdapter.onPatch('/api/wiki/pages/page-1').reply(200, { success: true });

      const result = await apiClient.updateWikiPage('page-1', updates);
      expect(result).toEqual({ success: true });
    });

    it('should delete wiki page', async () => {
      mockAdapter.onDelete('/api/wiki/pages/page-1').reply(200, { success: true });

      const result = await apiClient.deleteWikiPage('page-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('MCP endpoints', () => {
    it('should call MCP tool', async () => {
      const toolCall = { name: 'test-tool', arguments: { param: 'value' } };
      const toolResponse = { result: 'success' };
      
      mockAdapter.onPost('/api/mcp/kanban/tools/call').reply(200, toolResponse);

      const result = await apiClient.callMCPTool('kanban', toolCall);
      expect(result).toEqual(toolResponse);
      expect(mockAdapter.history.post[0].data).toBe(JSON.stringify(toolCall));
    });

    it('should get MCP resource', async () => {
      const resourceRequest = { uri: 'kanban://board/1' };
      const resourceData = { id: '1', name: 'Board 1' };
      
      mockAdapter.onPost('/api/mcp/kanban/resources/read').reply(200, resourceData);

      const result = await apiClient.getMCPResource('kanban', resourceRequest);
      expect(result).toEqual(resourceData);
    });

    it('should list MCP tools', async () => {
      const toolsList = [
        { name: 'create-board', description: 'Create a new board' },
        { name: 'get-board', description: 'Get board details' },
      ];
      
      mockAdapter.onGet('/api/mcp/kanban/tools').reply(200, toolsList);

      const result = await apiClient.listMCPTools('kanban');
      expect(result).toEqual(toolsList);
    });

    it('should list MCP resources', async () => {
      const resourcesList = [
        { uri: 'kanban://board/1', name: 'Board 1' },
        { uri: 'kanban://board/2', name: 'Board 2' },
      ];
      
      mockAdapter.onGet('/api/mcp/kanban/resources').reply(200, resourcesList);

      const result = await apiClient.listMCPResources('kanban');
      expect(result).toEqual(resourcesList);
    });
  });

  describe('generic HTTP methods', () => {
    it('should perform GET requests', async () => {
      const responseData = { test: 'data' };
      mockAdapter.onGet('/test-endpoint').reply(200, responseData);

      const response = await apiClient.get('/test-endpoint');
      expect(response.data).toEqual(responseData);
      expect(response.status).toBe(200);
    });

    it('should perform POST requests', async () => {
      const requestData = { name: 'test' };
      const responseData = { id: '1', ...requestData };
      
      mockAdapter.onPost('/test-endpoint').reply(201, responseData);

      const response = await apiClient.post('/test-endpoint', requestData);
      expect(response.data).toEqual(responseData);
      expect(response.status).toBe(201);
    });

    it('should perform PUT requests', async () => {
      const requestData = { name: 'updated' };
      mockAdapter.onPut('/test-endpoint/1').reply(200, { success: true });

      const response = await apiClient.put('/test-endpoint/1', requestData);
      expect(response.data).toEqual({ success: true });
    });

    it('should perform PATCH requests', async () => {
      const updates = { name: 'patched' };
      mockAdapter.onPatch('/test-endpoint/1').reply(200, { success: true });

      const response = await apiClient.patch('/test-endpoint/1', updates);
      expect(response.data).toEqual({ success: true });
    });

    it('should perform DELETE requests', async () => {
      mockAdapter.onDelete('/test-endpoint/1').reply(200, { success: true });

      const response = await apiClient.delete('/test-endpoint/1');
      expect(response.data).toEqual({ success: true });
    });

    it('should pass through request config', async () => {
      const config = { 
        headers: { 'Custom-Header': 'value' },
        timeout: 5000,
      };
      
      mockAdapter.onGet('/test').reply((requestConfig) => {
        expect(requestConfig.headers?.['Custom-Header']).toBe('value');
        expect(requestConfig.timeout).toBe(5000);
        return [200, {}];
      });

      await apiClient.get('/test', config);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockAdapter.onGet('/test').networkError();

      try {
        await apiClient.get('/test');
      } catch (error) {
        expect(error.message).toBe('Network Error');
      }
    });

    it('should handle timeout errors', async () => {
      mockAdapter.onGet('/test').timeout();

      try {
        await apiClient.get('/test');
      } catch (error) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });

    it('should handle server errors', async () => {
      mockAdapter.onGet('/test').reply(500, { error: 'Internal server error' });

      try {
        await apiClient.get('/test');
      } catch (error) {
        expect(error.response?.status).toBe(500);
        expect(error.response?.data).toEqual({ error: 'Internal server error' });
      }
    });
  });

  describe('edge cases', () => {
    it('should handle undefined window object (SSR)', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const client = new ApiClient();
      
      // Should not throw when window is undefined
      expect(() => client['getAuthToken']()).not.toThrow();
      expect(client['getAuthToken']()).toBeNull();

      // Restore window
      global.window = originalWindow;
    });

    it('should handle malformed tokens in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token-format');
      
      // Should not throw when token is malformed
      expect(() => apiClient['getAuthToken']()).not.toThrow();
      expect(apiClient['getAuthToken']()).toBe('invalid-token-format');
    });

    it('should handle localStorage unavailable', () => {
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;

      const client = new ApiClient();
      
      // Should not throw when localStorage is unavailable
      expect(() => client['getAuthToken']()).not.toThrow();
      expect(client['getAuthToken']()).toBeNull();

      // Restore localStorage
      (window as any).localStorage = originalLocalStorage;
    });
  });
});