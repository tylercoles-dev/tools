'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { useRealtime } from '@/hooks/use-realtime';
import { 
  Activity, 
  Plus, 
  Edit3, 
  Move, 
  User, 
  MessageSquare, 
  Tag, 
  Archive, 
  RotateCcw,
  Link as LinkIcon,
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: number;
  action_type: 'created' | 'updated' | 'moved' | 'assigned' | 'commented' | 'tagged' | 'archived' | 'restored' | 'linked' | 'time_logged';
  user_name?: string;
  details?: any;
  old_values?: any;
  new_values?: any;
  timestamp: string;
  card_title: string;
}

interface KanbanActivityFeedProps {
  boardId?: number;
  limit?: number;
  showRefresh?: boolean;
  className?: string;
}

export function KanbanActivityFeed({ 
  boardId, 
  limit = 20, 
  showRefresh = true,
  className = '' 
}: KanbanActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const api = useApi();
  const { isConnected } = useRealtime();

  useEffect(() => {
    loadActivities();
  }, [boardId, limit]);

  // Listen for real-time activity updates
  useEffect(() => {
    if (!isConnected) return;

    const handleActivityUpdate = (data: any) => {
      if (data.type === 'activity_created' && (!boardId || data.board_id === boardId)) {
        setActivities(prev => [data.activity, ...prev.slice(0, limit - 1)]);
      }
    };

    // This would be connected to your WebSocket implementation
    // For now, we'll just refresh periodically
    const interval = setInterval(loadActivities, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, boardId, limit]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const endpoint = boardId 
        ? `/api/kanban/boards/${boardId}/activity?limit=${limit}`
        : `/api/kanban/analytics/overview`;
      
      const response = await api.get(endpoint);
      
      if (boardId) {
        setActivities(response.data || []);
      } else {
        // Extract recent activity from overview stats
        setActivities(response.data?.recent_activity || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load activity feed',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivities();
    setIsRefreshing(false);
    
    toast({
      title: 'Refreshed',
      description: 'Activity feed updated'
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'moved':
        return <Move className="h-4 w-4 text-purple-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-orange-500" />;
      case 'commented':
        return <MessageSquare className="h-4 w-4 text-teal-500" />;
      case 'tagged':
        return <Tag className="h-4 w-4 text-pink-500" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
      case 'restored':
        return <RotateCcw className="h-4 w-4 text-indigo-500" />;
      case 'linked':
        return <LinkIcon className="h-4 w-4 text-cyan-500" />;
      case 'time_logged':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'moved':
        return 'bg-purple-100 text-purple-800';
      case 'assigned':
        return 'bg-orange-100 text-orange-800';
      case 'commented':
        return 'bg-teal-100 text-teal-800';
      case 'tagged':
        return 'bg-pink-100 text-pink-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'restored':
        return 'bg-indigo-100 text-indigo-800';
      case 'linked':
        return 'bg-cyan-100 text-cyan-800';
      case 'time_logged':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActivityDescription = (activity: ActivityItem) => {
    const { action_type, user_name, details, old_values, new_values } = activity;
    const userName = user_name || 'Someone';

    switch (action_type) {
      case 'created':
        return `${userName} created card`;
      case 'updated':
        if (details?.changed_fields) {
          return `${userName} updated ${details.changed_fields.join(', ')}`;
        }
        return `${userName} updated card`;
      case 'moved':
        if (details?.from_column && details?.to_column) {
          return `${userName} moved card from "${details.from_column}" to "${details.to_column}"`;
        }
        return `${userName} moved card`;
      case 'assigned':
        if (new_values?.assigned_to) {
          return `${userName} assigned card to ${new_values.assigned_to}`;
        }
        return `${userName} changed assignment`;
      case 'commented':
        return `${userName} added a comment`;
      case 'tagged':
        return `${userName} updated tags`;
      case 'archived':
        return `${userName} archived card`;
      case 'restored':
        return `${userName} restored card`;
      case 'linked':
        return `${userName} created a link`;
      case 'time_logged':
        if (details?.duration_minutes) {
          return `${userName} logged ${details.duration_minutes} minutes`;
        }
        return `${userName} logged time`;
      default:
        return `${userName} performed an action`;
    }
  };

  if (isLoading && activities.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h3 className="font-medium">Recent Activity</h3>
          {!isConnected && (
            <Badge variant="outline" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
        
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-xs mt-1">Activity will appear here as you work with cards</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 p-1">
                {getActionIcon(activity.action_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getActionColor(activity.action_type)}`}
                  >
                    {activity.action_type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp))} ago
                  </span>
                </div>
                
                <p className="text-sm text-gray-900 mb-1">
                  {formatActivityDescription(activity)}
                </p>
                
                <p className="text-sm font-medium text-blue-600 truncate">
                  {activity.card_title}
                </p>
                
                {/* Additional details */}
                {activity.details && (
                  <div className="mt-2 text-xs text-gray-500">
                    {activity.action_type === 'updated' && activity.old_values && activity.new_values && (
                      <div className="space-y-1">
                        {Object.keys(activity.new_values).map(key => {
                          const oldValue = activity.old_values[key];
                          const newValue = activity.new_values[key];
                          if (oldValue === newValue) return null;
                          
                          return (
                            <div key={key} className="flex items-center gap-1">
                              <span className="capitalize">{key}:</span>
                              <span className="line-through text-red-500">{String(oldValue)}</span>
                              <span>→</span>
                              <span className="text-green-600">{String(newValue)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-gray-500">
            Showing {activities.length} most recent activities
          </p>
        </div>
      )}
    </Card>
  );
}