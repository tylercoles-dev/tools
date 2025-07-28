import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-api';
import type { AnalyticsEvent, DashboardMetrics } from '@mcp-tools/core';

interface RealtimeAnalyticsState {
  isConnected: boolean;
  events: AnalyticsEvent[];
  metrics: any;
  dashboard: DashboardMetrics | null;
  insights: any[];
  error: string | null;
}

interface UseRealtimeAnalyticsOptions {
  autoConnect?: boolean;
  eventHistoryLimit?: number;
  metricsInterval?: number;
}

export function useRealtimeAnalytics(options: UseRealtimeAnalyticsOptions = {}) {
  const { 
    autoConnect = true, 
    eventHistoryLimit = 100,
    metricsInterval = 30000 
  } = options;
  
  // Mock user and token - replace with actual auth implementation
  const user = { id: 'mock-user-id', email: 'user@example.com', name: 'Mock User' };
  const token = 'mock-jwt-token';
  const socketRef = useRef<Socket | null>(null);
  
  const [state, setState] = useState<RealtimeAnalyticsState>({
    isConnected: false,
    events: [],
    metrics: null,
    dashboard: null,
    insights: [],
    error: null
  });

  // Connect to analytics WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected || !user || !token) return;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws');

    socketRef.current = io(`${wsUrl}/analytics`, {
      auth: {
        token,
        userId: user.id,
        email: user.email,
        name: user.name
      },
      transports: ['websocket'],
      upgrade: true
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to analytics WebSocket');
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from analytics WebSocket');
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('Analytics WebSocket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: error.message || 'Connection failed' 
      }));
    });

    // Analytics events
    socket.on('analytics:event', (data) => {
      setState(prev => ({
        ...prev,
        events: [data.event, ...prev.events].slice(0, eventHistoryLimit)
      }));
    });

    socket.on('analytics:stream', (data) => {
      if (data.type === 'user_metrics') {
        setState(prev => ({ ...prev, metrics: data.data }));
      } else if (data.type === 'events') {
        setState(prev => ({
          ...prev,
          events: [...data.data, ...prev.events].slice(0, eventHistoryLimit)
        }));
      }
    });

    // Dashboard updates
    socket.on('dashboard:data', (data) => {
      setState(prev => ({ ...prev, dashboard: data.dashboard }));
    });

    socket.on('dashboard:update', (data) => {
      setState(prev => ({ ...prev, dashboard: data.dashboard }));
    });

    // Insights updates
    socket.on('analytics:insights', (data) => {
      if (data.type === 'new_insights') {
        setState(prev => ({ ...prev, insights: data.insights }));
      }
    });

    socket.on('insights:generated', (data) => {
      setState(prev => ({ ...prev, insights: data.insights }));
    });

    // Performance tracking
    socket.on('performance:recorded', (data) => {
      console.log('Performance metric recorded:', data);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Analytics WebSocket error:', error);
      setState(prev => ({ ...prev, error: error.message || 'Unknown error' }));
    });

    // Confirmations
    socket.on('track:confirmed', (data) => {
      console.log('Event tracked:', data);
    });

    socket.on('subscription:confirmed', (data) => {
      console.log('Subscribed to analytics:', data);
    });

  }, [user, token, eventHistoryLimit]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  // Track event via WebSocket
  const trackEvent = useCallback((eventData: Omit<AnalyticsEvent, 'id' | 'createdAt' | 'userId'>) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('track:event', eventData);
  }, []);

  // Track multiple events via WebSocket
  const trackEventBatch = useCallback((events: Omit<AnalyticsEvent, 'id' | 'createdAt' | 'userId'>[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('track:batch', events);
  }, []);

  // Subscribe to metrics updates
  const subscribeToMetrics = useCallback((type: 'user' | 'system' = 'user', interval?: number) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('subscribe:metrics', { 
      type, 
      interval: interval || metricsInterval 
    });
  }, [metricsInterval]);

  // Subscribe to dashboard updates
  const subscribeToDashboard = useCallback((timeRange: string = 'week') => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('dashboard:subscribe', timeRange);
  }, []);

  // Generate insights
  const generateInsights = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('generate:insights');
  }, []);

  // Report performance metrics
  const reportPerformance = useCallback((performanceData: {
    page: string;
    loadTime: number;
    startTime?: number;
    endTime?: number;
    connectionType?: string;
    deviceMemory?: number;
    metadata?: Record<string, any>;
  }) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('performance:report', performanceData);
  }, []);

  // Unsubscribe from metrics
  const unsubscribeFromMetrics = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unsubscribe:metrics');
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && user && token) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        disconnect();
      }
    };
  }, [autoConnect, user, token, connect, disconnect]);

  // Performance tracking effect
  useEffect(() => {
    if (!state.isConnected) return;

    // Track page performance automatically
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          reportPerformance({
            page: window.location.pathname,
            loadTime: navEntry.loadEventEnd - navEntry.fetchStart,
            startTime: navEntry.fetchStart,
            endTime: navEntry.loadEventEnd,
            connectionType: (navigator as any).connection?.effectiveType,
            deviceMemory: (navigator as any).deviceMemory,
            metadata: {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              firstContentfulPaint: navEntry.loadEventStart - navEntry.fetchStart,
              transferSize: navEntry.transferSize,
              encodedBodySize: navEntry.encodedBodySize
            }
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, [state.isConnected, reportPerformance]);

  return {
    ...state,
    connect,
    disconnect,
    trackEvent,
    trackEventBatch,
    subscribeToMetrics,
    subscribeToDashboard,
    generateInsights,
    reportPerformance,
    unsubscribeFromMetrics,
    isReady: state.isConnected && user && token
  };
}

// Hook for automatic event tracking
export function useAutoAnalytics() {
  const { trackEvent, isReady } = useRealtimeAnalytics();

  const autoTrack = useCallback((
    eventCategory: 'kanban' | 'wiki' | 'memory' | 'dashboard' | 'auth' | 'system',
    eventAction: string,
    eventLabel?: string,
    properties?: Record<string, any>
  ) => {
    if (!isReady) return;

    trackEvent({
      eventType: 'action',
      eventCategory,
      eventAction,
      eventLabel,
      properties: {
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        ...properties
      }
    });
  }, [trackEvent, isReady]);

  const trackPageView = useCallback((pageName?: string) => {
    if (!isReady) return;

    trackEvent({
      eventType: 'page_view',
      eventCategory: 'dashboard',
      eventAction: 'view',
      eventLabel: pageName || window.location.pathname,
      properties: {
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        userAgent: navigator.userAgent
      }
    });
  }, [trackEvent, isReady]);

  const trackFeatureUse = useCallback((
    feature: string,
    action: string,
    properties?: Record<string, any>
  ) => {
    if (!isReady) return;

    trackEvent({
      eventType: 'feature_use',
      eventCategory: 'dashboard',
      eventAction: action,
      eventLabel: feature,
      properties: {
        feature,
        timestamp: new Date().toISOString(),
        ...properties
      }
    });
  }, [trackEvent, isReady]);

  return {
    autoTrack,
    trackPageView,
    trackFeatureUse,
    isReady
  };
}

export default useRealtimeAnalytics;