import { Server as SocketIOServer, Socket } from 'socket.io';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { authMiddleware } from '../middleware/auth.js';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function setupAnalyticsWebSocket(io: SocketIOServer, analyticsService: AnalyticsService) {
  // Create analytics namespace
  const analyticsNamespace = io.of('/analytics');
  
  // Authentication middleware for analytics namespace
  analyticsNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('No authentication token provided');
      }
      
      // Verify token (reuse auth middleware logic)
      // This would typically use JWT verification
      // For now, we'll assume token is valid and contains user info
      socket.user = {
        id: socket.handshake.auth.userId || 'anonymous',
        email: socket.handshake.auth.email || 'anonymous@example.com',
        name: socket.handshake.auth.name || 'Anonymous'
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  analyticsNamespace.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Analytics WebSocket connection: ${socket.id} (User: ${socket.user?.id})`);
    
    // Join user-specific room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Handle real-time analytics subscriptions
    socket.on('subscribe:metrics', async (data: { type: 'user' | 'system'; interval?: number }) => {
      try {
        const { type, interval = 30000 } = data; // Default 30 second intervals
        const userId = socket.user?.id;

        if (type === 'user' && !userId) {
          socket.emit('error', { message: 'User ID required for user metrics' });
          return;
        }

        // Create event stream
        const stream = await analyticsService.createEventStream(type === 'user' ? userId : undefined);
        
        // Store stream reference for cleanup
        (socket as any).analyticsStream = stream;

        // Start streaming
        streamMetrics(socket, stream, interval);
        
        socket.emit('subscription:confirmed', { type, interval });
      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to subscribe to metrics',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle real-time event tracking
    socket.on('track:event', async (eventData) => {
      try {
        if (!socket.user?.id) {
          socket.emit('error', { message: 'Authentication required for event tracking' });
          return;
        }

        // Add user context to event
        const event = {
          ...eventData,
          userId: socket.user.id,
          sessionId: socket.id,
          userAgent: socket.handshake.headers['user-agent'],
          ipAddress: socket.handshake.address
        };

        await analyticsService.trackEvent(event);
        
        // Acknowledge event tracking
        socket.emit('track:confirmed', { 
          eventType: event.eventType,
          eventAction: event.eventAction,
          timestamp: new Date()
        });

        // Broadcast to user's room for real-time updates
        socket.to(`user:${socket.user.id}`).emit('analytics:event', {
          type: 'user_event',
          event: event,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to track event',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle batch event tracking
    socket.on('track:batch', async (eventsData: any[]) => {
      try {
        if (!socket.user?.id) {
          socket.emit('error', { message: 'Authentication required for event tracking' });
          return;
        }

        // Add user context to all events
        const events = eventsData.map(eventData => ({
          ...eventData,
          userId: socket.user.id,
          sessionId: socket.id,
          userAgent: socket.handshake.headers['user-agent'],
          ipAddress: socket.handshake.address
        }));

        await analyticsService.trackEventBatch(events);
        
        socket.emit('track:batch:confirmed', { 
          count: events.length,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to track event batch',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle insights generation request
    socket.on('generate:insights', async () => {
      try {
        if (!socket.user?.id) {
          socket.emit('error', { message: 'Authentication required for insights generation' });
          return;
        }

        socket.emit('insights:generating', { message: 'Generating insights...' });
        
        const insights = await analyticsService.generateInsights(socket.user.id);
        
        socket.emit('insights:generated', { 
          insights,
          count: insights.length,
          timestamp: new Date()
        });

        // Notify user's other sessions
        socket.to(`user:${socket.user.id}`).emit('analytics:insights', {
          type: 'new_insights',
          insights,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to generate insights',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle real-time dashboard request
    socket.on('dashboard:subscribe', async (timeRange: string = 'week') => {
      try {
        if (!socket.user?.id) {
          socket.emit('error', { message: 'Authentication required for dashboard' });
          return;
        }

        // Get initial dashboard data
        const dashboard = await analyticsService.getUserDashboard(socket.user.id, timeRange);
        
        socket.emit('dashboard:data', {
          dashboard,
          timeRange,
          timestamp: new Date()
        });

        // Set up periodic dashboard updates
        const dashboardInterval = setInterval(async () => {
          try {
            const updatedDashboard = await analyticsService.getUserDashboard(socket.user.id, timeRange);
            socket.emit('dashboard:update', {
              dashboard: updatedDashboard,
              timeRange,
              timestamp: new Date()
            });
          } catch (error) {
            console.error('Error sending dashboard update:', error);
          }
        }, 60000); // Update every minute

        // Store interval for cleanup
        (socket as any).dashboardInterval = dashboardInterval;

      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to subscribe to dashboard',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle performance monitoring
    socket.on('performance:report', async (performanceData) => {
      try {
        const metric = {
          metricType: 'page_load',
          endpoint: performanceData.page || 'unknown',
          responseTimeMs: performanceData.loadTime || 0,
          startTime: new Date(performanceData.startTime || Date.now()),
          endTime: new Date(performanceData.endTime || Date.now()),
          userId: socket.user?.id,
          metadata: {
            userAgent: socket.handshake.headers['user-agent'],
            connectionType: performanceData.connectionType,
            deviceMemory: performanceData.deviceMemory,
            ...performanceData.metadata
          }
        };

        await analyticsService.recordPerformanceMetric(metric);
        
        socket.emit('performance:recorded', { 
          page: performanceData.page,
          loadTime: performanceData.loadTime,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { 
          message: 'Failed to record performance metric',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle unsubscribe requests
    socket.on('unsubscribe:metrics', () => {
      if ((socket as any).analyticsStream) {
        // Stop the stream
        try {
          (socket as any).analyticsStream.return();
        } catch (error) {
          console.error('Error stopping analytics stream:', error);
        }
        delete (socket as any).analyticsStream;
      }
      
      socket.emit('unsubscription:confirmed');
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`Analytics WebSocket disconnected: ${socket.id}`);
      
      // Clean up streams and intervals
      if ((socket as any).analyticsStream) {
        try {
          (socket as any).analyticsStream.return();
        } catch (error) {
          console.error('Error stopping analytics stream on disconnect:', error);
        }
      }
      
      if ((socket as any).dashboardInterval) {
        clearInterval((socket as any).dashboardInterval);
      }
    });

    // Send welcome message with available events
    socket.emit('connected', {
      message: 'Connected to analytics WebSocket',
      availableEvents: [
        'subscribe:metrics',
        'track:event',
        'track:batch',
        'generate:insights',
        'dashboard:subscribe',
        'performance:report',
        'unsubscribe:metrics'
      ],
      user: socket.user
    });
  });

  // Set up real-time analytics listener
  analyticsService.addRealtimeListener((event) => {
    // Broadcast event to relevant rooms
    if (event.userId) {
      analyticsNamespace.to(`user:${event.userId}`).emit('analytics:event', {
        type: 'real_time_event',
        event,
        timestamp: new Date()
      });
    }
    
    // Broadcast system-wide events to admin users
    if (event.eventType === 'error' || event.eventCategory === 'system') {
      analyticsNamespace.emit('analytics:system_event', {
        type: 'system_event',
        event,
        timestamp: new Date()
      });
    }
  });

  console.log('Analytics WebSocket namespace configured');
}

// Helper function to stream metrics
async function streamMetrics(socket: AuthenticatedSocket, stream: AsyncGenerator<any, void, unknown>, interval: number) {
  try {
    for await (const data of stream) {
      socket.emit('analytics:stream', data);
      
      // Add delay between emissions
      await new Promise(resolve => setTimeout(resolve, interval));
      
      // Check if socket is still connected
      if (!socket.connected) {
        break;
      }
    }
  } catch (error) {
    console.error('Error in metrics stream:', error);
    socket.emit('error', { 
      message: 'Metrics stream error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default setupAnalyticsWebSocket;