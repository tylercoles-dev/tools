'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X, Users, Activity } from 'lucide-react';
import { useRealtime } from './realtime-provider';

interface LiveUpdate {
  id: string;
  type: 'kanban' | 'memory' | 'wiki' | 'user';
  action: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface LiveUpdatesProps {
  maxUpdates?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function LiveUpdates({ 
  maxUpdates = 5, 
  autoHide = true, 
  autoHideDelay = 5000 
}: LiveUpdatesProps) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { isConnected } = useRealtime();

  const addUpdate = (update: Omit<LiveUpdate, 'id' | 'timestamp'>) => {
    const newUpdate: LiveUpdate = {
      ...update,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
    };

    setUpdates(prev => [newUpdate, ...prev.slice(0, maxUpdates - 1)]);
    setIsVisible(true);

    if (autoHide) {
      setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
    }
  };

  const removeUpdate = (id: string) => {
    setUpdates(prev => prev.filter(update => update.id !== id));
    if (updates.length <= 1) {
      setIsVisible(false);
    }
  };

  const clearAll = () => {
    setUpdates([]);
    setIsVisible(false);
  };

  // Mock real-time updates for demonstration
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const mockUpdates = [
        {
          type: 'kanban' as const,
          action: 'card_moved',
          message: 'John moved "Fix login bug" to Done',
          data: { user: 'John', card: 'Fix login bug', column: 'Done' }
        },
        {
          type: 'memory' as const,
          action: 'created',
          message: 'Sarah created a new memory "Meeting Notes"',
          data: { user: 'Sarah', title: 'Meeting Notes' }
        },
        {
          type: 'wiki' as const,
          action: 'updated',
          message: 'Mike updated the API documentation',
          data: { user: 'Mike', page: 'API documentation' }
        },
        {
          type: 'user' as const,
          action: 'joined',
          message: 'Alex joined the workspace',
          data: { user: 'Alex' }
        }
      ];

      const randomUpdate = mockUpdates[Math.floor(Math.random() * mockUpdates.length)];
      addUpdate(randomUpdate);
    }, 15000); // Add update every 15 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected || (!isVisible && updates.length === 0)) {
    return null;
  }

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'kanban': return '📋';
      case 'memory': return '🧠';
      case 'wiki': return '📚';
      case 'user': return '👤';
      default: return '📢';
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'kanban': return 'border-blue-200 bg-blue-50';
      case 'memory': return 'border-purple-200 bg-purple-50';
      case 'wiki': return 'border-green-200 bg-green-50';
      case 'user': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 w-80 space-y-2">
      {updates.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-gray-600">
            <Activity className="w-4 h-4 mr-1" />
            Live Updates ({updates.length})
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2"
          >
            Clear All
          </Button>
        </div>
      )}

      {updates.map((update) => (
        <Card 
          key={update.id} 
          className={`shadow-lg transition-all duration-300 ${getUpdateColor(update.type)} ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                <span className="text-lg">{getUpdateIcon(update.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">
                    {update.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {update.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUpdate(update.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LiveActivityIndicator() {
  const [activityCount, setActivityCount] = useState(0);
  const { isConnected } = useRealtime();

  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setActivityCount(prev => prev + Math.floor(Math.random() * 3));
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="flex items-center space-x-2 bg-white border rounded-full px-3 py-2 shadow-lg">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Users className="w-4 h-4 text-gray-600" />
        </div>
        <span className="text-sm text-gray-600">
          {activityCount} active users
        </span>
      </div>
    </div>
  );
}