'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Clock, 
  TrendingUp, 
  Users, 
  Target,
  CheckCircle2,
  Eye,
  X
} from 'lucide-react';
import type { ProductivityInsight } from '@mcp-tools/core';

interface InsightCardProps {
  insight: ProductivityInsight;
  onMarkAsRead?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const INSIGHT_ICONS = {
  peak_hours: Clock,
  task_patterns: TrendingUp,
  collaboration_style: Users,
  productivity_trends: Target,
  feature_usage: Lightbulb
};

const INSIGHT_COLORS = {
  peak_hours: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  task_patterns: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  collaboration_style: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  productivity_trends: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  feature_usage: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
};

export function InsightCard({ 
  insight, 
  onMarkAsRead, 
  onDismiss, 
  className 
}: InsightCardProps) {
  const IconComponent = INSIGHT_ICONS[insight.insightType] || Lightbulb;
  const colorClass = INSIGHT_COLORS[insight.insightType] || INSIGHT_COLORS.feature_usage;

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  };

  const formatInsightType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className={`${className} ${!insight.isRead ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base leading-none">
                {insight.title}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {formatInsightType(insight.insightType)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getConfidenceColor(insight.confidenceScore)}`}
                >
                  {getConfidenceLabel(insight.confidenceScore)} Confidence
                </Badge>
                {!insight.isRead && (
                  <Badge variant="default" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {onMarkAsRead && !insight.isRead && (
              <Button
                onClick={onMarkAsRead}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <CardDescription className="text-sm leading-relaxed">
          {insight.description}
        </CardDescription>
        
        {insight.recommendation && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-1 flex items-center">
              <Target className="h-3 w-3 mr-1" />
              Recommendation
            </h4>
            <p className="text-sm text-muted-foreground">
              {insight.recommendation}
            </p>
          </div>
        )}
        
        {insight.dataPoints && Object.keys(insight.dataPoints).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Data Points</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(insight.dataPoints).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {insight.timePeriodStart && insight.timePeriodEnd && (
          <div className="text-xs text-muted-foreground flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Based on data from {' '}
            {new Date(insight.timePeriodStart).toLocaleDateString()} to {' '}
            {new Date(insight.timePeriodEnd).toLocaleDateString()}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Generated {new Date(insight.createdAt!).toLocaleDateString()}
          </span>
          <div className="flex items-center space-x-1">
            <span>Confidence:</span>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 w-3 rounded ${
                    i < Math.round(insight.confidenceScore * 5)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
              <span className="ml-1">
                {Math.round(insight.confidenceScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InsightCard;