/**
 * Unit tests for use-api.ts hook
 */

import { act, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api-client';
import {
  renderHookWithProviders,
  createTestQueryClient,
  mockToast,
  createMockApiResponse,
} from '../../__tests__/utils/test-utils';
import {
  queryKeys,
  useHealth,
  useAuth,
  useKanbanBoards,
  useKanbanBoard,
  useKanbanMutations,
  useMemories,
  useMemory,
  useMemorySearch,
  useMemoryMutations,
  useWikiPages,
  useWikiPage,
  useWikiMutations,
} from '../use-api';

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => mockToast,
}));

// Mock the API client
jest.mock('@/lib/api-client');

describe('queryKeys', () => {
  it('should generate correct query keys for health', () => {
    expect(queryKeys.health).toEqual(['health']);
  });

  it('should generate correct query keys for auth', () => {
    expect(queryKeys.auth.user).toEqual(['auth', 'user']);
  });

  it('should generate correct query keys for kanban', () => {
    expect(queryKeys.kanban.all).toEqual(['kanban']);
    expect(queryKeys.kanban.boards()).toEqual(['kanban', 'boards']);
    expect(queryKeys.kanban.board('123')).toEqual(['kanban', 'board', '123']);
    expect(queryKeys.kanban.cards('board-1')).toEqual(['kanban', 'cards', 'board-1']);
  });

  it('should generate correct query keys for memory', () => {
    expect(queryKeys.memory.all).toEqual(['memory']);
    expect(queryKeys.memory.memories({ filter: 'test' })).toEqual(['memory', 'memories', { filter: 'test' }]);
    expect(queryKeys.memory.memory('mem-1')).toEqual(['memory', 'memory', 'mem-1']);
    expect(queryKeys.memory.search('test query', { limit: 10 })).toEqual(['memory', 'search', 'test query', { limit: 10 }]);
  });

  it('should generate correct query keys for wiki', () => {
    expect(queryKeys.wiki.all).toEqual(['wiki']);
    expect(queryKeys.wiki.pages({ category: 'docs' })).toEqual(['wiki', 'pages', { category: 'docs' }]);
    expect(queryKeys.wiki.page('page-1')).toEqual(['wiki', 'page', 'page-1']);
  });
});

describe('useHealth', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch health data successfully', async () => {
    const healthData = { status: 'healthy', uptime: 12345 };
    mockAdapter.onGet('/api/health').reply(200, healthData);

    const { result } = renderHookWithProviders(() => useHealth(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(healthData);
  });

  it('should handle health check errors', async () => {
    mockAdapter.onGet('/api/health').reply(500, { error: 'Server error' });

    const { result } = renderHookWithProviders(() => useHealth(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch health data every 30 seconds', () => {
    const { result } = renderHookWithProviders(() => useHealth(), {
      queryClient,
    });

    // Check that refetchInterval is set correctly
    expect(result.current.refetchInterval).toBe(30000);
  });
});

describe('useAuth', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  describe('login', () => {
    it('should login successfully and show success toast', async () => {
      const loginResponse = { 
        accessToken: 'test-token', 
        refreshToken: 'test-refresh-token',
        user: { id: '1', email: 'test@example.com' }
      };
      mockAdapter.onPost('/api/auth/login').reply(200, { data: loginResponse });

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.login({ email: 'test@example.com', password: 'password' });
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
    });

    it('should handle login errors and show error toast', async () => {
      mockAdapter.onPost('/api/auth/login').reply(401, { 
        data: { message: 'Invalid credentials' }
      });

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.login({ email: 'test@example.com', password: 'wrong' });
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      });
    });

    it('should invalidate user queries on successful login', async () => {
      const loginResponse = { accessToken: 'test-token', refreshToken: 'test-refresh-token' };
      mockAdapter.onPost('/api/auth/login').reply(200, { data: loginResponse });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.login({ email: 'test@example.com', password: 'password' });
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
          queryKey: queryKeys.auth.user 
        });
      });
    });
  });

  describe('signup', () => {
    it('should signup successfully and show success toast', async () => {
      const signupData = { 
        email: 'test@example.com', 
        password: 'password', 
        name: 'Test User' 
      };
      mockAdapter.onPost('/api/auth/signup').reply(201, { data: { success: true } });

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.signup(signupData);
      });

      await waitFor(() => {
        expect(result.current.isSigningUp).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    });

    it('should handle signup errors and show error toast', async () => {
      mockAdapter.onPost('/api/auth/signup').reply(400, { 
        data: { message: 'Email already exists' }
      });

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.signup({ 
          email: 'test@example.com', 
          password: 'password', 
          name: 'Test User' 
        });
      });

      await waitFor(() => {
        expect(result.current.isSigningUp).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Signup failed',
        description: 'Email already exists',
        variant: 'destructive',
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear queries', async () => {
      mockAdapter.onPost('/api/auth/logout').reply(200);

      const clearSpy = jest.spyOn(queryClient, 'clear');

      const { result } = renderHookWithProviders(() => useAuth(), {
        queryClient,
      });

      act(() => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(false);
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    });
  });
});

describe('useKanbanBoards', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch kanban boards successfully', async () => {
    const boardsData = [
      { id: '1', name: 'Board 1', description: 'Test board' },
      { id: '2', name: 'Board 2', description: 'Another board' }
    ];
    mockAdapter.onGet('/api/kanban/boards').reply(200, boardsData);

    const { result } = renderHookWithProviders(() => useKanbanBoards(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(boardsData);
  });

  it('should handle fetch errors gracefully', async () => {
    mockAdapter.onGet('/api/kanban/boards').reply(500);

    const { result } = renderHookWithProviders(() => useKanbanBoards(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useKanbanBoard', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch specific kanban board when id is provided', async () => {
    const boardData = { 
      id: '1', 
      name: 'Test Board', 
      columns: [
        { id: 'col-1', name: 'To Do', cards: [] }
      ]
    };
    mockAdapter.onGet('/api/kanban/boards/1').reply(200, boardData);

    const { result } = renderHookWithProviders(() => useKanbanBoard('1'), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(boardData);
  });

  it('should not fetch when id is not provided', () => {
    const { result } = renderHookWithProviders(() => useKanbanBoard(''), {
      queryClient,
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useKanbanMutations', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  describe('createBoard', () => {
    it('should create board and show success toast', async () => {
      const newBoard = { name: 'New Board', description: 'Test board' };
      const createdBoard = { id: '1', ...newBoard };
      
      mockAdapter.onPost('/api/kanban/boards').reply(201, createdBoard);

      const { result } = renderHookWithProviders(() => useKanbanMutations(), {
        queryClient,
      });

      act(() => {
        result.current.createBoard.mutate(newBoard);
      });

      await waitFor(() => {
        expect(result.current.createBoard.isSuccess).toBe(true);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Board created',
        description: 'Your new kanban board has been created successfully.',
      });
    });

    it('should handle create board errors', async () => {
      mockAdapter.onPost('/api/kanban/boards').reply(500);

      const { result } = renderHookWithProviders(() => useKanbanMutations(), {
        queryClient,
      });

      act(() => {
        result.current.createBoard.mutate({ name: 'New Board' });
      });

      await waitFor(() => {
        expect(result.current.createBoard.isError).toBe(true);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Failed to create board',
        description: 'There was an error creating your board. Please try again.',
        variant: 'destructive',
      });
    });
  });

  describe('updateCard', () => {
    it('should update card and invalidate board queries', async () => {
      const cardUpdate = { id: 'card-1', updates: { title: 'Updated Card', boardId: 'board-1' } };
      
      mockAdapter.onPatch('/api/kanban/cards/card-1').reply(200, {});

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useKanbanMutations(), {
        queryClient,
      });

      act(() => {
        result.current.updateCard.mutate(cardUpdate);
      });

      await waitFor(() => {
        expect(result.current.updateCard.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.board('board-1') 
      });
    });
  });
});

describe('useMemorySearch', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should search memories when query is provided', async () => {
    const searchResults = [
      { id: '1', title: 'Memory 1', content: 'Test content' },
      { id: '2', title: 'Memory 2', content: 'Another test' }
    ];
    
    mockAdapter.onGet('/api/memory/search').reply(200, searchResults);

    const { result } = renderHookWithProviders(() => 
      useMemorySearch('test query', { limit: 10 }), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(searchResults);
  });

  it('should not search when query is empty', () => {
    const { result } = renderHookWithProviders(() => 
      useMemorySearch('', { limit: 10 }), {
      queryClient,
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('should not search when query is only whitespace', () => {
    const { result } = renderHookWithProviders(() => 
      useMemorySearch('   ', { limit: 10 }), {
      queryClient,
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useMemoryMutations', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  describe('createMemory', () => {
    it('should create memory and show success toast', async () => {
      const newMemory = { title: 'New Memory', content: 'Test content' };
      const createdMemory = { id: 'mem-1', ...newMemory };
      
      mockAdapter.onPost('/api/memory/memories').reply(201, createdMemory);

      const { result } = renderHookWithProviders(() => useMemoryMutations(), {
        queryClient,
      });

      act(() => {
        result.current.createMemory.mutate(newMemory);
      });

      await waitFor(() => {
        expect(result.current.createMemory.isSuccess).toBe(true);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Memory created',
        description: 'Your memory has been saved successfully.',
      });
    });

    it('should invalidate memory queries on successful creation', async () => {
      mockAdapter.onPost('/api/memory/memories').reply(201, {});

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useMemoryMutations(), {
        queryClient,
      });

      act(() => {
        result.current.createMemory.mutate({ title: 'Test', content: 'Test' });
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
          queryKey: queryKeys.memory.all 
        });
      });
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory and show success toast', async () => {
      mockAdapter.onDelete('/api/memory/memories/mem-1').reply(200);

      const { result } = renderHookWithProviders(() => useMemoryMutations(), {
        queryClient,
      });

      act(() => {
        result.current.deleteMemory.mutate('mem-1');
      });

      await waitFor(() => {
        expect(result.current.deleteMemory.isSuccess).toBe(true);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Memory deleted',
        description: 'The memory has been deleted successfully.',
      });
    });
  });
});

describe('useWikiMutations', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  describe('updatePage', () => {
    it('should update page and invalidate specific page queries', async () => {
      const pageUpdate = { id: 'page-1', updates: { title: 'Updated Page' } };
      
      mockAdapter.onPatch('/api/wiki/pages/page-1').reply(200, {});

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useWikiMutations(), {
        queryClient,
      });

      act(() => {
        result.current.updatePage.mutate(pageUpdate);
      });

      await waitFor(() => {
        expect(result.current.updatePage.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.page('page-1') 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.all 
      });
    });
  });
});