/**
 * Unit tests for use-analytics.ts hook
 */

import { act, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/lib/api-client';

import {
  renderHookWithProviders,
  createTestQueryClient,
  mockToast,
  waitForAsyncOperations,
} from '../../__tests__/utils/test-utils';

import {
  useAnalytics,
  useAnalyticsDashboard,
  useTimeSeriesData,
  useProductivityInsights,
  usePerformanceMetrics,
  usePageTracking,
  useInteractionTracking,
} from '../use-analytics';

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => mockToast,
}));

// Mock the API client
jest.mock('@/lib/api-client');

// Mock crypto for sessionId generation
const mockRandomUUID = jest.fn(() => 'test-session-id');
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockRandomUUID },
  writable: true,
});

describe('useAnalytics', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAdapter.restore();
    consoleErrorSpy.restore();
  });

  describe('trackEvent', () => {
    it('should track individual events successfully', async () => {
      const eventData = {
        eventType: 'click',
        eventCategory: 'dashboard',
        eventAction: 'button_click',
        eventLabel: 'save_button',
      };

      mockAdapter.onPost('/api/v1/analytics/events').reply(200, { success: true });

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.trackEvent(eventData);
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = mockAdapter.history.post[0];
      expect(JSON.parse(request.data)).toEqual(eventData);
      expect(request.headers?.['x-session-id']).toBe('test-session-id');
    });

    it('should not show error toasts when tracking fails', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(500);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.trackEvent({
          eventType: 'click',
          eventCategory: 'dashboard',
          eventAction: 'test',
        });
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to track event:',
          expect.any(Error)
        );
      });

      // Should not show user-facing toasts for analytics failures
      expect(mockToast.toast).not.toHaveBeenCalled();
    });
  });

  describe('trackEventBatch', () => {
    it('should track multiple events in batch', async () => {
      const events = [
        { eventType: 'click', eventCategory: 'dashboard', eventAction: 'button1' },
        { eventType: 'view', eventCategory: 'dashboard', eventAction: 'page_view' },
      ];

      mockAdapter.onPost('/api/v1/analytics/events/batch').reply(200, { success: true });

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.trackEventBatch(events);
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = mockAdapter.history.post[0];
      expect(JSON.parse(request.data)).toEqual({ events });
      expect(request.headers?.['x-session-id']).toBe('test-session-id');
    });
  });

  describe('trackPerformance', () => {
    it('should track performance metrics', async () => {
      mockAdapter.onPost('/api/v1/analytics/performance').reply(200, { success: true });

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.trackPerformance(
          'api_call',
          '/api/kanban/boards',
          1500,
          200,
          { userId: 'user-1' }
        );
      });

      await waitForAsyncOperations();

      expect(mockAdapter.history.post).toHaveLength(1);
      const request = mockAdapter.history.post[0];
      const requestData = JSON.parse(request.data);
      
      expect(requestData).toMatchObject({
        metricType: 'api_call',
        endpoint: '/api/kanban/boards',
        responseTimeMs: 1500,
        statusCode: 200,
        metadata: { userId: 'user-1' },
      });
      expect(requestData.startTime).toBeDefined();
      expect(requestData.endTime).toBeDefined();
    });

    it('should handle performance tracking errors silently', async () => {
      mockAdapter.onPost('/api/v1/analytics/performance').reply(500);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.trackPerformance('test', '/api/test', 1000);
      });

      await waitForAsyncOperations();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to track performance:',
        expect.any(Error)
      );
    });
  });

  describe('track convenience methods', () => {
    it('should track page views with correct format', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(200);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.track.pageView('/dashboard', { section: 'analytics' });
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = JSON.parse(mockAdapter.history.post[0].data);
      expect(request).toMatchObject({
        eventType: 'page_view',
        eventCategory: 'dashboard',
        eventAction: 'view',
        eventLabel: '/dashboard',
        properties: {
          page: '/dashboard',
          section: 'analytics',
          timestamp: expect.any(String),
        },
      });
    });

    it('should track feature usage', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(200);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.track.featureUse(
          'kanban',
          'create_card',
          'task_card',
          { boardId: 'board-1' }
        );
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = JSON.parse(mockAdapter.history.post[0].data);
      expect(request).toMatchObject({
        eventType: 'feature_use',
        eventCategory: 'kanban',
        eventAction: 'create_card',
        eventLabel: 'task_card',
        properties: {
          boardId: 'board-1',
          timestamp: expect.any(String),
        },
      });
    });

    it('should track user actions', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(200);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      act(() => {
        result.current.track.userAction(
          'memory',
          'delete',
          'memory-123',
          { source: 'context_menu' }
        );
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = JSON.parse(mockAdapter.history.post[0].data);
      expect(request).toMatchObject({
        eventType: 'action',
        eventCategory: 'memory',
        eventAction: 'delete',
        properties: {
          resourceId: 'memory-123',
          source: 'context_menu',
          timestamp: expect.any(String),
        },
      });
    });

    it('should track errors with stack trace', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(200);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      const testError = new Error('Test error message');
      testError.stack = 'Error: Test error\n    at test.js:1:1';

      act(() => {
        result.current.track.error(testError, 'component_render');
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = JSON.parse(mockAdapter.history.post[0].data);
      expect(request).toMatchObject({
        eventType: 'error',
        eventCategory: 'system',
        eventAction: 'error_occurred',
        eventLabel: 'Test error message',
        properties: {
          errorName: 'Error',
          errorMessage: 'Test error message',
          errorStack: 'Error: Test error\n    at test.js:1:1',
          context: 'component_render',
          timestamp: expect.any(String),
        },
      });
    });

    it('should truncate error stack trace if too long', async () => {
      mockAdapter.onPost('/api/v1/analytics/events').reply(200);

      const { result } = renderHookWithProviders(() => useAnalytics(), {
        queryClient,
      });

      const testError = new Error('Test error');
      testError.stack = 'a'.repeat(1000); // Long stack trace

      act(() => {
        result.current.track.error(testError);
      });

      await waitFor(() => {
        expect(mockAdapter.history.post).toHaveLength(1);
      });

      const request = JSON.parse(mockAdapter.history.post[0].data);
      expect(request.properties.errorStack).toHaveLength(500);
    });
  });

  it('should generate consistent session ID', () => {
    const { result: result1 } = renderHookWithProviders(() => useAnalytics(), {
      queryClient,
    });
    const { result: result2 } = renderHookWithProviders(() => useAnalytics(), {
      queryClient,
    });

    expect(result1.current.sessionId).toBe('test-session-id');
    expect(result2.current.sessionId).toBe('test-session-id');
  });
});

describe('useAnalyticsDashboard', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch dashboard metrics successfully', async () => {
    const mockMetrics = {
      totalUsers: 100,
      activeUsers: 25,
      totalBoards: 15,
      totalCards: 150,
      completionRate: 0.75,
    };

    mockAdapter.onGet('/api/v1/analytics/dashboard?timeRange=week').reply(200, mockMetrics);

    const { result } = renderHookWithProviders(() => useAnalyticsDashboard('week'), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMetrics);
  });

  it('should use default time range of "week"', async () => {
    mockAdapter.onGet('/api/v1/analytics/dashboard?timeRange=week').reply(200, {});

    const { result } = renderHookWithProviders(() => useAnalyticsDashboard(), {
      queryClient,
    });

    await waitFor(() => {
      expect(mockAdapter.history.get).toHaveLength(1);
    });

    expect(mockAdapter.history.get[0].url).toBe('/api/v1/analytics/dashboard?timeRange=week');
  });

  it('should retry failed requests', async () => {
    mockAdapter
      .onGet('/api/v1/analytics/dashboard?timeRange=day')
      .replyOnce(500)
      .onGet('/api/v1/analytics/dashboard?timeRange=day')
      .reply(200, {});

    const { result } = renderHookWithProviders(() => useAnalyticsDashboard('day'), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 5000 });

    expect(mockAdapter.history.get.length).toBeGreaterThan(1);
  });
});

describe('useTimeSeriesData', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch time series data with query parameters', async () => {
    const query = {
      metric: 'user_activity',
      timeRange: 'week',
      granularity: 'day',
    };

    const mockData = [
      { timestamp: '2023-01-01', value: 10 },
      { timestamp: '2023-01-02', value: 15 },
    ];

    mockAdapter.onGet('/api/v1/analytics/timeseries').reply(200, mockData);

    const { result } = renderHookWithProviders(() => useTimeSeriesData(query), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);

    // Check that query parameters were sent correctly
    const request = mockAdapter.history.get[0];
    expect(request.params?.toString()).toContain('metric=user_activity');
    expect(request.params?.toString()).toContain('timeRange=week');
    expect(request.params?.toString()).toContain('granularity=day');
  });

  it('should handle null and undefined values in query', async () => {
    const query = {
      metric: 'test',
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'valid',
    };

    mockAdapter.onGet('/api/v1/analytics/timeseries').reply(200, []);

    const { result } = renderHookWithProviders(() => useTimeSeriesData(query), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should only include non-null, non-undefined values
    const request = mockAdapter.history.get[0];
    expect(request.params?.toString()).toContain('metric=test');
    expect(request.params?.toString()).toContain('validValue=valid');
    expect(request.params?.toString()).not.toContain('nullValue');
    expect(request.params?.toString()).not.toContain('undefinedValue');
  });

  it('should not fetch when query is falsy', () => {
    const { result } = renderHookWithProviders(() => useTimeSeriesData(null as any), {
      queryClient,
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useProductivityInsights', () => {
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

  it('should fetch productivity insights', async () => {
    const mockInsights = [
      { id: '1', type: 'productivity', message: 'Great job!', isRead: false },
      { id: '2', type: 'suggestion', message: 'Try this', isRead: true },
    ];

    mockAdapter.onGet('/api/v1/analytics/insights').reply(200, mockInsights);

    const { result } = renderHookWithProviders(() => useProductivityInsights(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.insights).toEqual(mockInsights);
  });

  describe('generateInsights', () => {
    it('should generate insights and show success toast', async () => {
      const newInsights = [
        { id: '3', type: 'productivity', message: 'New insight' },
      ];

      mockAdapter.onPost('/api/v1/analytics/insights/generate').reply(200, newInsights);

      const { result } = renderHookWithProviders(() => useProductivityInsights(), {
        queryClient,
      });

      act(() => {
        result.current.generateInsights();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Insights Generated',
        description: 'Generated 1 new productivity insights',
        variant: 'default',
      });
    });

    it('should handle generation errors', async () => {
      mockAdapter.onPost('/api/v1/analytics/insights/generate').reply(500);

      const { result } = renderHookWithProviders(() => useProductivityInsights(), {
        queryClient,
      });

      act(() => {
        result.current.generateInsights();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Failed to Generate Insights',
        description: 'Please try again later',
        variant: 'destructive',
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark insight as read', async () => {
      mockAdapter.onPut('/api/v1/analytics/insights/insight-1/read').reply(200);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useProductivityInsights(), {
        queryClient,
      });

      act(() => {
        result.current.markAsRead('insight-1');
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
          queryKey: ['analytics', 'insights'] 
        });
      });
    });

    it('should handle mark as read errors silently', async () => {
      mockAdapter.onPut('/api/v1/analytics/insights/insight-1/read').reply(500);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHookWithProviders(() => useProductivityInsights(), {
        queryClient,
      });

      act(() => {
        result.current.markAsRead('insight-1');
      });

      await waitForAsyncOperations();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to mark insight as read:',
        expect.any(Error)
      );

      consoleErrorSpy.restore();
    });
  });
});

describe('usePageTracking', () => {
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

  it('should track page view on mount', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    renderHookWithProviders(() => usePageTracking('dashboard', { section: 'overview' }), {
      queryClient,
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request).toMatchObject({
      eventType: 'page_view',
      eventCategory: 'dashboard',
      eventAction: 'view',
      eventLabel: 'dashboard',
      properties: {
        page: 'dashboard',
        section: 'overview',
      },
    });
  });

  it('should track page unload on unmount', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { unmount } = renderHookWithProviders(() => 
      usePageTracking('dashboard'), {
      queryClient,
    });

    // Clear the initial page view
    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    unmount();

    await waitForAsyncOperations();

    expect(mockAdapter.history.post).toHaveLength(2);
    const unloadRequest = JSON.parse(mockAdapter.history.post[1].data);
    expect(unloadRequest).toMatchObject({
      eventType: 'feature_use',
      eventCategory: 'dashboard',
      eventAction: 'page_unload',
      eventLabel: 'dashboard',
      properties: {
        timeSpent: expect.any(Number),
      },
    });
  });
});

describe('useInteractionTracking', () => {
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

  it('should track clicks', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackClick('save_button', 'kanban', { boardId: 'board-1' });
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request).toMatchObject({
      eventType: 'feature_use',
      eventCategory: 'kanban',
      eventAction: 'click',
      eventLabel: 'save_button',
      properties: {
        element: 'save_button',
        boardId: 'board-1',
      },
    });
  });

  it('should track form submissions', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackFormSubmit('login_form', 'auth', true, { method: 'email' });
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request).toMatchObject({
      eventType: 'action',
      eventCategory: 'auth',
      eventAction: 'form_submit_success',
      properties: {
        formName: 'login_form',
        success: true,
        method: 'email',
      },
    });
  });

  it('should track failed form submissions', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackFormSubmit('signup_form', 'auth', false);
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request.eventAction).toBe('form_submit_failure');
    expect(request.properties.success).toBe(false);
  });

  it('should track searches', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackSearch('test query', 'memory', 5, { source: 'header' });
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request).toMatchObject({
      eventType: 'action',
      eventCategory: 'memory',
      eventAction: 'search',
      properties: {
        query: 'test query',
        resultCount: 5,
        queryLength: 10,
        source: 'header',
      },
    });
  });

  it('should use default category for trackClick', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackClick('menu_button');
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request.eventCategory).toBe('dashboard');
  });

  it('should use default category for trackSearch', async () => {
    mockAdapter.onPost('/api/v1/analytics/events').reply(200);

    const { result } = renderHookWithProviders(() => useInteractionTracking(), {
      queryClient,
    });

    act(() => {
      result.current.trackSearch('test query');
    });

    await waitFor(() => {
      expect(mockAdapter.history.post).toHaveLength(1);
    });

    const request = JSON.parse(mockAdapter.history.post[0].data);
    expect(request.eventCategory).toBe('dashboard');
  });
});

describe('usePerformanceMetrics', () => {
  let mockAdapter: MockAdapter;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockAdapter = new MockAdapter(apiClient['client'] as any);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    mockAdapter.restore();
  });

  it('should fetch performance metrics with default parameters', async () => {
    const mockMetrics = {
      averageResponseTime: 250,
      p95ResponseTime: 500,
      errorRate: 0.02,
    };

    mockAdapter.onGet('/api/v1/analytics/metrics/performance?timeRange=day').reply(200, mockMetrics);

    const { result } = renderHookWithProviders(() => usePerformanceMetrics(), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMetrics);
  });

  it('should fetch performance metrics with custom parameters', async () => {
    mockAdapter.onGet('/api/v1/analytics/metrics/performance?timeRange=week&metricType=api_call').reply(200, {});

    const { result } = renderHookWithProviders(() => 
      usePerformanceMetrics('week', 'api_call'), {
      queryClient,
    });

    await waitFor(() => {
      expect(mockAdapter.history.get).toHaveLength(1);
    });

    const request = mockAdapter.history.get[0];
    expect(request.url).toBe('/api/v1/analytics/metrics/performance?timeRange=week&metricType=api_call');
  });

  it('should not include metricType param when not provided', async () => {
    mockAdapter.onGet('/api/v1/analytics/metrics/performance?timeRange=month').reply(200, {});

    const { result } = renderHookWithProviders(() => 
      usePerformanceMetrics('month'), {
      queryClient,
    });

    await waitFor(() => {
      expect(mockAdapter.history.get).toHaveLength(1);
    });

    const request = mockAdapter.history.get[0];
    expect(request.url).toBe('/api/v1/analytics/metrics/performance?timeRange=month');
  });
});