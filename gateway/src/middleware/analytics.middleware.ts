import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/AnalyticsService.js';

/**
 * Middleware to automatically track analytics events
 */
export function createAnalyticsMiddleware(analyticsService: AnalyticsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Store analytics service in request for route-specific tracking
    req.analyticsService = analyticsService;
    
    // Track the original res.json method
    const originalJson = res.json;
    
    res.json = function(this: Response, body?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Track API performance
      analyticsService.recordPerformanceMetric({
        metricType: 'api_response',
        endpoint: req.route?.path || req.path,
        responseTimeMs: responseTime,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        method: req.method,
        statusCode: res.statusCode,
        userId: req.user?.id,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          query: req.query,
          params: req.params
        }
      }).catch(error => {
        console.error('Failed to record performance metric:', error);
      });
      
      // Track page view events for GET requests
      if (req.method === 'GET' && req.user?.id) {
        const eventCategory = req.path.split('/')[2] || 'system'; // Extract category from path like /api/kanban -> kanban
        
        analyticsService.trackEvent({
          userId: req.user.id,
          sessionId: req.headers['x-session-id'] as string || req.sessionID,
          eventType: 'page_view',
          eventCategory: eventCategory as any,
          eventAction: 'view',
          eventLabel: req.path,
          properties: {
            method: req.method,
            statusCode: res.statusCode,
            responseTime
          },
          pageUrl: req.originalUrl,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          loadTime: responseTime
        }).catch(error => {
          console.error('Failed to track page view:', error);
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Helper function to track feature usage
 */
export function trackFeatureUsage(
  req: Request,
  eventCategory: string,
  eventAction: string,
  eventLabel?: string,
  properties?: Record<string, any>
) {
  if (!req.analyticsService || !req.user?.id) return;
  
  req.analyticsService.trackEvent({
    userId: req.user.id,
    sessionId: req.headers['x-session-id'] as string || req.sessionID,
    eventType: 'feature_use',
    eventCategory: eventCategory as any,
    eventAction,
    eventLabel,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    },
    pageUrl: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  }).catch(error => {
    console.error('Failed to track feature usage:', error);
  });
}

/**
 * Helper function to track user actions
 */
export function trackUserAction(
  req: Request,
  eventCategory: string,
  eventAction: string,
  resourceId?: string,
  properties?: Record<string, any>
) {
  if (!req.analyticsService || !req.user?.id) return;
  
  const eventProperties = {
    ...properties,
    resourceId,
    timestamp: new Date().toISOString(),
    method: req.method,
    endpoint: req.path
  };
  
  req.analyticsService.trackEvent({
    userId: req.user.id,
    sessionId: req.headers['x-session-id'] as string || req.sessionID,
    eventType: 'action',
    eventCategory: eventCategory as any,
    eventAction,
    properties: eventProperties,
    pageUrl: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    // Set context IDs based on category
    ...(eventCategory === 'kanban' && { boardId: resourceId }),
    ...(eventCategory === 'wiki' && { pageId: resourceId }),
    ...(eventCategory === 'memory' && { memoryId: resourceId })
  }).catch(error => {
    console.error('Failed to track user action:', error);
  });
}

/**
 * Express middleware to track errors
 */
export function createErrorTrackingMiddleware(analyticsService: AnalyticsService) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Track error event
    if (req.user?.id) {
      analyticsService.trackEvent({
        userId: req.user.id,
        sessionId: req.headers['x-session-id'] as string || req.sessionID,
        eventType: 'error',
        eventCategory: 'system',
        eventAction: 'error_occurred',
        eventLabel: error.message,
        properties: {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 1000), // Limit stack trace length
          endpoint: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        pageUrl: req.originalUrl,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }).catch(trackingError => {
        console.error('Failed to track error event:', trackingError);
      });
    }
    
    next(error);
  };
}

// Extend Express Request interface to include analytics service
declare global {
  namespace Express {
    interface Request {
      analyticsService?: AnalyticsService;
    }
  }
}

export default createAnalyticsMiddleware;