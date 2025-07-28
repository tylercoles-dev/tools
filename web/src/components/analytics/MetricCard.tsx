'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  trend?: number;
  trendLabel?: string;
  isNegativeTrend?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon,
  subtitle,
  change,
  changeLabel,
  trend,
  trendLabel,
  isNegativeTrend = false,
  className
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}k`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = (trendValue: number, isNegative: boolean = false) => {
    if (trendValue === 0) return 'text-muted-foreground';
    
    const isPositive = isNegative ? trendValue < 0 : trendValue > 0;
    return isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getTrendIcon = (trendValue: number, isNegative: boolean = false) => {
    if (trendValue === 0) return null;
    
    const isPositive = isNegative ? trendValue < 0 : trendValue > 0;
    return isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{formatValue(value)}</div>
          
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          
          {change !== undefined && changeLabel && (
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {change > 0 ? '+' : ''}{change}
              </Badge>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
          
          {trend !== undefined && trendLabel && (
            <div className={`flex items-center space-x-1 text-xs ${getTrendColor(trend, isNegativeTrend)}`}>
              {getTrendIcon(trend, isNegativeTrend)}
              <span>
                {Math.abs(trend)}% {trendLabel}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;