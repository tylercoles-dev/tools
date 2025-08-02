/**
 * Unit tests for use-realtime.ts hook
 */

import { act, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { 
  renderHookWithProviders, 
  createTestQueryClient, 
  mockToast,
  MockWebSocket,
  mockWebSocket,
  restoreWebSocket,
} from '../../__tests__/utils/test-utils';
import { queryKeys } from '../use-api';
import {
  useRealtimeConnection,
  useRealtimeUpdates,
  useRealtimeKanban,
  useRealtimeMemory,
  useRealtimeWiki,
  useRealtimePresence,
  RealtimeUpdate,
} from '../use-realtime';

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => mockToast,
}));

// Mock the WebSocket library
jest.mock('@/lib/websocket', () => ({
  useWebSocket: jest.fn(),
  useWebSocketSubscription: jest.fn(),
}));

// Mock modules
const mockUseWebSocket = require('@/lib/websocket').useWebSocket as jest.MockedFunction<any>;
const mockUseWebSocketSubscription = require('@/lib/websocket').useWebSocketSubscription as jest.MockedFunction<any>;

describe('useRealtimeConnection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it('should initialize WebSocket connection with correct handlers', () => {
    const mockWebSocketReturn = {
      connectionStatus: 'connected',
      isConnected: true,
      sendMessage: jest.fn(),
    };

    mockUseWebSocket.mockReturnValue(mockWebSocketReturn);

    const { result } = renderHookWithProviders(() => useRealtimeConnection(), {
      queryClient,
    });

    expect(mockUseWebSocket).toHaveBeenCalledWith({
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onError: expect.any(Function),
    });

    expect(result.current).toEqual(mockWebSocketReturn);
  });

  it('should log connection events', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let onOpenHandler: Function;
    let onCloseHandler: Function;
    let onErrorHandler: Function;

    mockUseWebSocket.mockImplementation((config) => {
      onOpenHandler = config.onOpen;
      onCloseHandler = config.onClose;
      onErrorHandler = config.onError;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeConnection(), {
      queryClient,
    });

    // Test onOpen handler
    act(() => {
      onOpenHandler();
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('Real-time connection established');

    // Test onClose handler
    act(() => {
      onCloseHandler({ reason: 'server closed' });
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('Real-time connection closed:', 'server closed');

    // Test onError handler
    act(() => {
      onErrorHandler(new Error('connection error'));
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Real-time connection error:', expect.any(Error));

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
  });
});

describe('useRealtimeUpdates', () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.clearAllMocks();
  });

  afterEach(() => {
    invalidateQueriesSpy.restore();
  });

  it('should subscribe to realtime_update messages', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimeUpdates(), {
      queryClient,
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalledWith(
      'realtime_update',
      expect.any(Function)
    );
  });

  describe('kanban updates', () => {
    it('should handle kanban board creation', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'kanban',
        action: 'created',
        id: 'board-1',
        data: {
          type: 'board',
          name: 'New Board',
        },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.boards() 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'New board created',
        description: '"New Board" was added',
      });
    });

    it('should handle kanban card creation', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'kanban',
        action: 'created',
        id: 'card-1',
        boardId: 'board-1',
        data: {
          type: 'card',
          title: 'New Card',
        },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.board('board-1') 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'New card added',
        description: '"New Card" was created',
      });
    });

    it('should handle kanban card moves', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'kanban',
        action: 'moved',
        id: 'card-1',
        boardId: 'board-1',
        data: {
          type: 'card',
          title: 'Moved Card',
          columnName: 'In Progress',
        },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.board('board-1') 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Card moved',
        description: '"Moved Card" was moved to In Progress',
      });
    });

    it('should handle kanban board updates', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'kanban',
        action: 'updated',
        id: 'board-1',
        data: {
          type: 'board',
          name: 'Updated Board',
        },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.boards() 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.kanban.board('board-1') 
      });
    });

    it('should handle kanban deletions', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const boardDeleteUpdate: RealtimeUpdate = {
        entity: 'kanban',
        action: 'deleted',
        id: 'board-1',
        data: { type: 'board' },
      };

      act(() => {
        updateHandler(boardDeleteUpdate);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Board deleted',
        description: 'A board was removed',
        variant: 'destructive',
      });

      const cardDeleteUpdate: RealtimeUpdate = {
        entity: 'kanban',
        action: 'deleted',
        id: 'card-1',
        boardId: 'board-1',
        data: { type: 'card' },
      };

      act(() => {
        updateHandler(cardDeleteUpdate);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Card deleted',
        description: 'A card was removed',
        variant: 'destructive',
      });
    });
  });

  describe('memory updates', () => {
    it('should handle memory creation', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'memory',
        action: 'created',
        id: 'memory-1',
        data: { title: 'New Memory' },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.memory.all 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'New memory created',
        description: '"New Memory" was added',
      });
    });

    it('should handle memory updates', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'memory',
        action: 'updated',
        id: 'memory-1',
        data: { title: 'Updated Memory' },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.memory.all 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.memory.memory('memory-1') 
      });
    });

    it('should handle memory deletion', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'memory',
        action: 'deleted',
        id: 'memory-1',
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.memory.all 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Memory deleted',
        description: 'A memory was removed',
        variant: 'destructive',
      });
    });
  });

  describe('wiki updates', () => {
    it('should handle wiki page creation', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'wiki',
        action: 'created',
        id: 'page-1',
        data: { title: 'New Page' },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.all 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'New wiki page created',
        description: '"New Page" was added',
      });
    });

    it('should handle wiki page updates', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'wiki',
        action: 'updated',
        id: 'page-1',
        data: { title: 'Updated Page' },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.all 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.page('page-1') 
      });
    });

    it('should handle wiki page deletion', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'wiki',
        action: 'deleted',
        id: 'page-1',
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.wiki.all 
      });
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Wiki page deleted',
        description: 'A page was removed',
        variant: 'destructive',
      });
    });
  });

  describe('user updates', () => {
    it('should handle user profile updates', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'user',
        action: 'updated',
        id: 'user-1',
        data: { name: 'Updated User' },
      };

      act(() => {
        updateHandler(update);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.auth.user 
      });
    });
  });

  describe('message deduplication', () => {
    it('should prevent duplicate message processing', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      const update: RealtimeUpdate = {
        entity: 'kanban',
        action: 'created',
        id: 'board-1',
        data: { type: 'board', name: 'Test Board' },
      };

      // Send the same update multiple times
      act(() => {
        updateHandler(update);
        updateHandler(update);
        updateHandler(update);
      });

      // Should only invalidate queries once
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
      expect(mockToast.toast).toHaveBeenCalledTimes(1);
    });

    it('should cleanup old message IDs to prevent memory leaks', () => {
      let updateHandler: Function;

      mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
        updateHandler = handler;
        return { connectionStatus: 'connected' };
      });

      renderHookWithProviders(() => useRealtimeUpdates(), {
        queryClient,
      });

      // Send 120 different updates to trigger cleanup (threshold is 100)
      act(() => {
        for (let i = 0; i < 120; i++) {
          updateHandler({
            entity: 'kanban',
            action: 'created',
            id: `board-${i}`,
            data: { type: 'board', name: `Board ${i}` },
          });
        }
      });

      // All updates should be processed
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(120);
    });
  });
});

describe('useRealtimeKanban', () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.clearAllMocks();
  });

  afterEach(() => {
    invalidateQueriesSpy.restore();
  });

  it('should subscribe to kanban_update messages', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimeKanban('board-1'), {
      queryClient,
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalledWith(
      'kanban_update',
      expect.any(Function)
    );
  });

  it('should handle card move updates for specific board', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeKanban('board-1'), {
      queryClient,
    });

    const update = {
      boardId: 'board-1',
      action: 'card_moved',
      data: {
        title: 'Moved Card',
        movedBy: 'John Doe',
      },
    };

    act(() => {
      updateHandler(update);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.kanban.board('board-1') 
    });
    expect(mockToast.toast).toHaveBeenCalledWith({
      title: 'Card moved',
      description: '"Moved Card" was moved by John Doe',
    });
  });

  it('should ignore updates for different boards', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeKanban('board-1'), {
      queryClient,
    });

    const update = {
      boardId: 'board-2', // Different board
      action: 'card_moved',
      data: { title: 'Moved Card' },
    };

    act(() => {
      updateHandler(update);
    });

    // Should not invalidate queries or show toast
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    expect(mockToast.toast).not.toHaveBeenCalled();
  });

  it('should handle updates without movedBy information', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeKanban('board-1'), {
      queryClient,
    });

    const update = {
      boardId: 'board-1',
      action: 'card_moved',
      data: { title: 'Moved Card' },
    };

    act(() => {
      updateHandler(update);
    });

    expect(mockToast.toast).toHaveBeenCalledWith({
      title: 'Card moved',
      description: '"Moved Card" was moved by another user',
    });
  });

  it('should work without boardId parameter', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimeKanban(), {
      queryClient,
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalled();
  });
});

describe('useRealtimeMemory', () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.clearAllMocks();
  });

  afterEach(() => {
    invalidateQueriesSpy.restore();
  });

  it('should subscribe to memory_update messages', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimeMemory(), {
      queryClient,
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalledWith(
      'memory_update',
      expect.any(Function)
    );
  });

  it('should invalidate all memory queries on updates', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeMemory(), {
      queryClient,
    });

    const update = { id: 'memory-1', action: 'updated' };

    act(() => {
      updateHandler(update);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.memory.all 
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.memory.memory('memory-1') 
    });
  });

  it('should handle updates without specific memory ID', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeMemory(), {
      queryClient,
    });

    const update = { action: 'updated' }; // No ID

    act(() => {
      updateHandler(update);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.memory.all 
    });
    // Should not try to invalidate specific memory query without ID
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useRealtimeWiki', () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.clearAllMocks();
  });

  afterEach(() => {
    invalidateQueriesSpy.restore();
  });

  it('should subscribe to wiki_update messages', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimeWiki(), {
      queryClient,
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalledWith(
      'wiki_update',
      expect.any(Function)
    );
  });

  it('should invalidate wiki queries on updates', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimeWiki(), {
      queryClient,
    });

    const update = { id: 'page-1', action: 'updated' };

    act(() => {
      updateHandler(update);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.wiki.all 
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
      queryKey: queryKeys.wiki.page('page-1') 
    });
  });
});

describe('useRealtimePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe to presence_update messages', () => {
    mockUseWebSocketSubscription.mockReturnValue({ connectionStatus: 'connected' });

    renderHookWithProviders(() => useRealtimePresence(), {
      queryClient: createTestQueryClient(),
    });

    expect(mockUseWebSocketSubscription).toHaveBeenCalledWith(
      'presence_update',
      expect.any(Function)
    );
  });

  it('should show toast when user joins', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimePresence(), {
      queryClient: createTestQueryClient(),
    });

    const update = {
      type: 'user_joined',
      data: { name: 'John Doe' },
    };

    act(() => {
      updateHandler(update);
    });

    expect(mockToast.toast).toHaveBeenCalledWith({
      title: 'User joined',
      description: 'John Doe is now online',
    });
  });

  it('should show toast when user leaves', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimePresence(), {
      queryClient: createTestQueryClient(),
    });

    const update = {
      type: 'user_left',
      data: { name: 'Jane Doe' },
    };

    act(() => {
      updateHandler(update);
    });

    expect(mockToast.toast).toHaveBeenCalledWith({
      title: 'User left',
      description: 'Jane Doe went offline',
    });
  });

  it('should ignore unknown presence update types', () => {
    let updateHandler: Function;

    mockUseWebSocketSubscription.mockImplementation((messageType, handler) => {
      updateHandler = handler;
      return { connectionStatus: 'connected' };
    });

    renderHookWithProviders(() => useRealtimePresence(), {
      queryClient: createTestQueryClient(),
    });

    const update = {
      type: 'unknown_type',
      data: { name: 'Test User' },
    };

    act(() => {
      updateHandler(update);
    });

    // Should not show any toast
    expect(mockToast.toast).not.toHaveBeenCalled();
  });
});