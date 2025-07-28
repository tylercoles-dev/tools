'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock, 
  Users, 
  CheckCircle2,
  FileText,
  Brain,
  Zap,
  Target,
  Calendar,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { useAnalyticsDashboard, useProductivityInsights, usePageTracking } from '@/hooks/use-analytics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnalyticsChart } from './AnalyticsChart';
import { MetricCard } from './MetricCard';
import { InsightCard } from './InsightCard';
import { TimeRangeSelector } from './TimeRangeSelector';
import { RealtimeAnalytics } from './RealtimeAnalytics';
import { PredictiveDashboard } from './PredictiveDashboard';
import { SmartRecommendations } from './SmartRecommendations';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Track page view
  usePageTracking('analytics_dashboard', { timeRange, activeTab });
  
  // Fetch dashboard data
  const { 
    data: dashboard, 
    isLoading: isDashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useAnalyticsDashboard(timeRange);
  
  // Fetch insights
  const {
    insights,
    isLoading: isInsightsLoading,
    generateInsights,
    isGenerating,
    markAsRead
  } = useProductivityInsights();

  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
  };

  const handleRefresh = () => {
    refetchDashboard();
  };

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load analytics dashboard. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your productivity and system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Tasks"
              value={dashboard?.user.totalTasks || 0}
              icon={<CheckCircle2 className="h-4 w-4" />}
              trend={dashboard?.user.completionRate}
              trendLabel="completion rate"
            />
            <MetricCard
              title="Wiki Pages"
              value={dashboard?.user.wikiPages || 0}
              icon={<FileText className="h-4 w-4" />}
              change={12}
              changeLabel="from last period"
            />
            <MetricCard
              title="Memories Stored"
              value={dashboard?.user.memories || 0}
              icon={<Brain className="h-4 w-4" />}
              change={5}
              changeLabel="this week"
            />
            <MetricCard
              title="Active Days"
              value={dashboard?.user.activeDays || 0}
              icon={<Calendar className="h-4 w-4" />}
              subtitle={`Avg ${Math.round(dashboard?.user.avgSessionDuration || 0)}m sessions`}
            />
          </div>

          {/* Activity Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>
                Your daily activity across all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                type="line"
                title="Daily Activity"
                timeRange={timeRange}
                category="dashboard"
                height={300}
              />
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <Badge variant="secondary">
                      {dashboard?.system.avgResponseTime || 0}ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Error Rate</span>
                    <Badge variant={dashboard?.system.errorRate && dashboard.system.errorRate > 5 ? "destructive" : "secondary"}>
                      {dashboard?.system.errorRate || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <Badge variant="secondary">
                      {dashboard?.system.uptime || 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Insights</CardTitle>
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="text-sm">
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {insight.description}
                      </p>
                    </div>
                  ))}
                  {insights.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No insights available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Real-time Analytics */}
            <div className="lg:col-span-1">
              <RealtimeAnalytics 
                showEvents={true}
                showMetrics={false}
                showInsights={false}
                autoSubscribe={true}
              />
            </div>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Today's Tasks"
              value={dashboard?.productivity.todayTasks || 0}
              icon={<Target className="h-4 w-4" />}
              change={dashboard?.productivity.todayTasks ? 15 : 0}
              changeLabel="vs yesterday"
            />
            <MetricCard
              title="Week's Tasks"
              value={dashboard?.productivity.weekTasks || 0}
              icon={<BarChart3 className="h-4 w-4" />}
              change={dashboard?.productivity.weekTasks ? 8 : 0}
              changeLabel="vs last week"
            />
            <MetricCard
              title="Streak Days"
              value={dashboard?.productivity.streakDays || 0}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle="consecutive active days"
            />
          </div>

          {/* Productivity Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trend</CardTitle>
                <CardDescription>
                  Track your task completion over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="area"
                  title="Tasks Completed"
                  timeRange={timeRange}
                  category="kanban"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>
                  Most used features this {timeRange}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.productivity.topFeatures.map((feature, index) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{feature}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-muted rounded-full w-20">
                          <div 
                            className="h-2 bg-primary rounded-full" 
                            style={{ width: `${100 - (index * 20)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {100 - (index * 20)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Activity Hours</CardTitle>
              <CardDescription>
                When you're most productive during the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1 mt-4">
                {Array.from({ length: 24 }, (_, hour) => {
                  const isPeakHour = dashboard?.productivity.peakHours.includes(hour);
                  return (
                    <div
                      key={hour}
                      className={`h-8 rounded text-xs flex items-center justify-center ${
                        isPeakHour 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {hour}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Avg Response Time"
              value={`${dashboard?.system.avgResponseTime || 0}ms`}
              icon={<Clock className="h-4 w-4" />}
              trend={dashboard?.system.avgResponseTime ? -12 : 0}
              trendLabel="improvement"
            />
            <MetricCard
              title="Active Users"
              value={dashboard?.system.activeToday || 0}
              icon={<Users className="h-4 w-4" />}
              change={dashboard?.system.activeToday ? 5 : 0}
              changeLabel="today"
            />
            <MetricCard
              title="Error Rate"
              value={`${dashboard?.system.errorRate || 0}%`}
              icon={dashboard?.system.errorRate && dashboard.system.errorRate > 5 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              trend={dashboard?.system.errorRate || 0}
              isNegativeTrend={true}
            />
            <MetricCard
              title="System Uptime"
              value={`${dashboard?.system.uptime || 0}%`}
              icon={<Zap className="h-4 w-4" />}
              subtitle="last 30 days"
            />
          </div>

          {/* Performance Charts */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Response Times</CardTitle>
                <CardDescription>
                  Monitor system performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="line"
                  title="Response Time (ms)"
                  timeRange={timeRange}
                  category="system"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Productivity Insights</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered insights to help you improve your productivity
              </p>
            </div>
            <Button 
              onClick={() => generateInsights()} 
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {isInsightsLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-muted-foreground">Loading insights...</span>
              </div>
            ) : insights.length > 0 ? (
              insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onMarkAsRead={() => markAsRead(insight.id!)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No insights available yet.</p>
                    <p className="text-sm">Generate insights to get personalized productivity recommendations.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <PredictiveDashboard />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <SmartRecommendations />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;