'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  Users, 
  Eye, 
  Clock,
  Wifi,
  WifiOff,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import { useRealtimeAnalytics, useAutoAnalytics } from '@/hooks/use-realtime-analytics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface RealtimeAnalyticsProps {
  className?: string;
  showEvents?: boolean;
  showMetrics?: boolean;
  showInsights?: boolean;
  autoSubscribe?: boolean;
}

export function RealtimeAnalytics({ 
  className,
  showEvents = true,
  showMetrics = true,
  showInsights = true,
  autoSubscribe = true
}: RealtimeAnalyticsProps) {
  const {
    isConnected,
    events,
    metrics,
    dashboard,
    insights,
    error,
    subscribeToMetrics,
    subscribeToDashboard,
    generateInsights,
    isReady
  } = useRealtimeAnalytics({ autoConnect: true });

  const { trackFeatureUse } = useAutoAnalytics();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Auto-subscribe to updates
  useEffect(() => {
    if (isReady && autoSubscribe) {
      subscribeToMetrics('user');
      subscribeToDashboard('week');
      setLastUpdate(new Date());
    }
  }, [isReady, autoSubscribe, subscribeToMetrics, subscribeToDashboard]);

  // Update timestamp when metrics change
  useEffect(() => {
    if (metrics) {
      setLastUpdate(new Date());
    }
  }, [metrics]);

  const handleGenerateInsights = () => {
    generateInsights();
    trackFeatureUse('insights_generator', 'generate_insights', {
      trigger: 'manual_button_click'
    });
  };

  if (!isReady) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">
              Connecting to real-time analytics...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Connection failed: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 mr-2 text-green-500" />
                  Real-time Analytics
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-2 text-red-500" />
                  Disconnected
                </>
              )}
            </CardTitle>
            <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Last update: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Real-time Metrics */}
      {showMetrics && metrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Live Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {metrics.user.totalActions}
                </div>
                <div className="text-xs text-muted-foreground">Actions Today</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {metrics.user.tasksCompleted}
                </div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {metrics.user.pagesCreated}
                </div>
                <div className="text-xs text-muted-foreground">Pages Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {metrics.user.memoriesStored}
                </div>
                <div className="text-xs text-muted-foreground">Memories</div>
              </div>
            </div>
            
            {metrics.system && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Response Time:</span>
                  <Badge variant="outline">
                    {metrics.system.avgResponseTime}ms
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Active Users:</span>
                  <Badge variant="outline">
                    {metrics.system.activeUsers}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      {showEvents && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Live events from your session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {events.length > 0 ? (
                events.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        event.eventType === 'action' ? 'bg-blue-500' :
                        event.eventType === 'page_view' ? 'bg-green-500' :
                        event.eventType === 'feature_use' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="font-medium capitalize">
                        {event.eventAction?.replace(/_/g, ' ')}
                      </span>
                      {event.eventLabel && (
                        <span className="text-muted-foreground">
                          · {event.eventLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(event.createdAt!).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-xs py-4">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {showInsights && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                AI Insights
              </CardTitle>
              <Button 
                onClick={handleGenerateInsights}
                variant="outline" 
                size="sm"
                className="text-xs h-7"
              >
                <Zap className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.length > 0 ? (
                insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                    <div className="font-medium mb-1">{insight.title}</div>
                    <div className="text-muted-foreground line-clamp-2">
                      {insight.description}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(insight.confidenceScore * 100)}% confidence
                      </Badge>
                      <span className="text-muted-foreground">
                        {insight.insightType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-xs py-4">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No insights yet</p>
                  <p>Generate insights to see personalized recommendations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Indicator */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{events.length} events tracked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RealtimeAnalytics;