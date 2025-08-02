'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface KanbanStats {
  total_boards: number;
  total_cards: number;
  cards_by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  cards_by_status: Record<string, number>;
  overdue_cards: number;
  recent_activity: any[];
}

interface UserActivityStats {
  timeframe: string;
  user_stats: Record<string, {
    total: number;
    actions: Record<string, number>;
  }>;
  action_type_stats: Record<string, number>;
  daily_activity: Record<string, number>;
}

interface KanbanAnalyticsDashboardProps {
  boardId?: number;
  className?: string;
}

export function KanbanAnalyticsDashboard({ boardId, className = '' }: KanbanAnalyticsDashboardProps) {
  const [stats, setStats] = useState<KanbanStats | null>(null);
  const [userStats, setUserStats] = useState<UserActivityStats | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const api = useApi();

  useEffect(() => {
    loadAnalytics();
  }, [boardId, timeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [overviewResponse, userStatsResponse] = await Promise.all([
        api.get('/api/kanban/analytics/overview'),
        api.get(`/api/kanban/analytics/user-productivity?timeframe=${timeframe}`)
      ]);
      
      setStats(overviewResponse.data);
      setUserStats(userStatsResponse.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
    
    toast({
      title: 'Refreshed',
      description: 'Analytics data updated'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    trend?: number,
    color = 'text-gray-600'
  ) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              <TrendingUp className="h-3 w-3" />
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </Card>
  );

  const renderPriorityChart = () => {
    if (!stats) return null;

    const priorities = Object.entries(stats.cards_by_priority);
    const total = priorities.reduce((sum, [, count]) => sum + count, 0);
    
    if (total === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No cards with priorities</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {priorities.map(([priority, count]) => {
          const percentage = (count / total) * 100;
          return (
            <div key={priority} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`} />
                  <span className="capitalize">{priority}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{count}</span>
                  <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getPriorityColor(priority)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatusChart = () => {
    if (!stats || !stats.cards_by_status) return null;

    const statuses = Object.entries(stats.cards_by_status);
    const total = statuses.reduce((sum, [, count]) => sum + count, 0);
    
    if (total === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No cards in any status</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {statuses.map(([status, count], index) => {
          const percentage = (count / total) * 100;
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(index)}`} />
                  <span>{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{count}</span>
                  <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getStatusColor(index)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUserProductivity = () => {
    if (!userStats) return null;

    const topUsers = Object.entries(userStats.user_stats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5);

    if (topUsers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No user activity in this timeframe</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {topUsers.map(([userName, stats], index) => (
          <div key={userName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                index < 3 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-400'
              }`}>
                {index + 1}
              </div>
              <span className="font-medium">{userName}</span>
            </div>
            <div className="text-right">
              <div className="font-medium">{stats.total} actions</div>
              <div className="text-xs text-gray-500">
                {Object.entries(stats.actions)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 2)
                  .map(([action, count]) => `${action}: ${count}`)
                  .join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading && !stats) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Kanban Analytics</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderMetricCard(
            'Total Cards',
            stats.total_cards,
            <CheckCircle className="h-6 w-6" />,
            undefined,
            'text-blue-600'
          )}
          
          {renderMetricCard(
            'Total Boards',
            stats.total_boards,
            <BarChart3 className="h-6 w-6" />,
            undefined,
            'text-purple-600'
          )}
          
          {renderMetricCard(
            'Overdue Cards',
            stats.overdue_cards,
            <AlertTriangle className="h-6 w-6" />,
            undefined,
            stats.overdue_cards > 0 ? 'text-red-600' : 'text-green-600'
          )}
          
          {renderMetricCard(
            'Active Users',
            userStats ? Object.keys(userStats.user_stats).length : 0,
            <Users className="h-6 w-6" />,
            undefined,
            'text-teal-600'
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Priority Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4" />
            <h3 className="font-medium">Cards by Priority</h3>
          </div>
          {renderPriorityChart()}
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4" />
            <h3 className="font-medium">Cards by Status</h3>
          </div>
          {renderStatusChart()}
        </Card>

        {/* User Productivity */}
        <Card className="p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            <h3 className="font-medium">Top Contributors</h3>
            <Badge variant="outline" className="text-xs">
              {timeframe}
            </Badge>
          </div>
          {renderUserProductivity()}
        </Card>
      </div>

      {/* Action Types Breakdown */}
      {userStats && Object.keys(userStats.action_type_stats).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4" />
            <h3 className="font-medium">Activity Breakdown</h3>
            <Badge variant="outline" className="text-xs">
              {timeframe}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(userStats.action_type_stats)
              .sort(([, a], [, b]) => b - a)
              .map(([action, count]) => (
                <div key={action} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600 capitalize">{action}</div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}