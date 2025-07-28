import { z } from 'zod';

// Base analytics event schema
export const AnalyticsEventSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().nullable().optional(),
  sessionId: z.string().optional(),
  eventType: z.enum(['page_view', 'action', 'feature_use', 'error', 'performance']),
  eventCategory: z.enum(['kanban', 'wiki', 'memory', 'auth', 'dashboard', 'system']),
  eventAction: z.string().min(1).max(100),
  eventLabel: z.string().max(255).optional(),
  properties: z.record(z.any()).default({}),
  pageUrl: z.string().url().optional(),
  referrer: z.string().url().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  loadTime: z.number().int().positive().optional(),
  interactionTime: z.number().int().positive().optional(),
  boardId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  memoryId: z.string().uuid().optional(),
  createdAt: z.date().optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// User analytics daily summary
export const UserAnalyticsSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  date: z.date(),
  sessionCount: z.number().int().min(0).default(0),
  totalSessionDuration: z.number().int().min(0).default(0),
  avgSessionDuration: z.number().min(0).default(0),
  actionsPerformed: z.number().int().min(0).default(0),
  pagesVisited: z.number().int().min(0).default(0),
  featuresUsed: z.array(z.string()).default([]),
  tasksCreated: z.number().int().min(0).default(0),
  tasksCompleted: z.number().int().min(0).default(0),
  tasksMoved: z.number().int().min(0).default(0),
  wikiPagesCreated: z.number().int().min(0).default(0),
  wikiPagesEdited: z.number().int().min(0).default(0),
  memoriesStored: z.number().int().min(0).default(0),
  searchesPerformed: z.number().int().min(0).default(0),
  boardsShared: z.number().int().min(0).default(0),
  commentsAdded: z.number().int().min(0).default(0),
  realTimeSessions: z.number().int().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserAnalytics = z.infer<typeof UserAnalyticsSchema>;

// System-wide analytics
export const SystemAnalyticsSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.date(),
  dailyActiveUsers: z.number().int().min(0).default(0),
  newUserRegistrations: z.number().int().min(0).default(0),
  userRetentionRate: z.number().min(0).max(100).default(0),
  avgApiResponseTime: z.number().min(0).default(0),
  totalApiRequests: z.number().int().min(0).default(0),
  errorRate: z.number().min(0).max(100).default(0),
  websocketConnections: z.number().int().min(0).default(0),
  kanbanBoardsCreated: z.number().int().min(0).default(0),
  wikiPagesCreated: z.number().int().min(0).default(0),
  memoriesStored: z.number().int().min(0).default(0),
  realTimeCollaborations: z.number().int().min(0).default(0),
  databaseQueries: z.number().int().min(0).default(0),
  cacheHitRate: z.number().min(0).max(100).default(0),
  storageUsedMb: z.number().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type SystemAnalytics = z.infer<typeof SystemAnalyticsSchema>;

// Performance metrics
export const PerformanceMetricSchema = z.object({
  id: z.string().uuid().optional(),
  metricType: z.enum(['api_response', 'db_query', 'websocket', 'page_load', 'feature_interaction']),
  endpoint: z.string().max(255).optional(),
  responseTimeMs: z.number().int().positive(),
  startTime: z.date(),
  endTime: z.date(),
  method: z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
  userId: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({}),
  errorMessage: z.string().optional(),
  createdAt: z.date().optional(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

// Productivity insights
export const ProductivityInsightSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  insightType: z.enum(['peak_hours', 'task_patterns', 'collaboration_style', 'productivity_trends', 'feature_usage']),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  recommendation: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).default(0),
  dataPoints: z.record(z.any()).default({}),
  timePeriodStart: z.date().optional(),
  timePeriodEnd: z.date().optional(),
  isActive: z.boolean().default(true),
  isRead: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ProductivityInsight = z.infer<typeof ProductivityInsightSchema>;

// Analytics dashboard data
export const DashboardMetricsSchema = z.object({
  user: z.object({
    totalTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    wikiPages: z.number().int().min(0),
    memories: z.number().int().min(0),
    activeDays: z.number().int().min(0),
    avgSessionDuration: z.number().min(0),
    lastActivity: z.date().optional(),
  }),
  productivity: z.object({
    todayTasks: z.number().int().min(0),
    weekTasks: z.number().int().min(0),
    monthTasks: z.number().int().min(0),
    streakDays: z.number().int().min(0),
    peakHours: z.array(z.number().int().min(0).max(23)),
    topFeatures: z.array(z.string()),
  }),
  system: z.object({
    totalUsers: z.number().int().min(0),
    activeToday: z.number().int().min(0),
    avgResponseTime: z.number().min(0),
    errorRate: z.number().min(0).max(100),
    uptime: z.number().min(0).max(100),
  }),
  insights: z.array(ProductivityInsightSchema),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

// Analytics API requests
export const AnalyticsQuerySchema = z.object({
  timeRange: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).default('week'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  userId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  eventCategory: z.string().optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

// Event tracking helpers
export const TrackEventRequestSchema = z.object({
  eventType: AnalyticsEventSchema.shape.eventType,
  eventCategory: AnalyticsEventSchema.shape.eventCategory,
  eventAction: AnalyticsEventSchema.shape.eventAction,
  eventLabel: AnalyticsEventSchema.shape.eventLabel.optional(),
  properties: AnalyticsEventSchema.shape.properties.optional(),
  loadTime: AnalyticsEventSchema.shape.loadTime.optional(),
  interactionTime: AnalyticsEventSchema.shape.interactionTime.optional(),
  boardId: AnalyticsEventSchema.shape.boardId.optional(),
  pageId: AnalyticsEventSchema.shape.pageId.optional(),
  memoryId: AnalyticsEventSchema.shape.memoryId.optional(),
});

export type TrackEventRequest = z.infer<typeof TrackEventRequestSchema>;

// Time series data for charts
export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.date(),
  value: z.number(),
  label: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;

export const TimeSeriesDataSchema = z.object({
  name: z.string(),
  data: z.array(TimeSeriesDataPointSchema),
  color: z.string().optional(),
  unit: z.string().optional(),
});

export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;

// Chart configuration
export const ChartConfigSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'area', 'scatter', 'heatmap']),
  title: z.string(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  series: z.array(TimeSeriesDataSchema),
  height: z.number().int().positive().default(400),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  animation: z.boolean().default(true),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

// Export all schemas for validation
export const AnalyticsSchemas = {
  AnalyticsEvent: AnalyticsEventSchema,
  UserAnalytics: UserAnalyticsSchema,
  SystemAnalytics: SystemAnalyticsSchema,
  PerformanceMetric: PerformanceMetricSchema,
  ProductivityInsight: ProductivityInsightSchema,
  DashboardMetrics: DashboardMetricsSchema,
  AnalyticsQuery: AnalyticsQuerySchema,
  TrackEventRequest: TrackEventRequestSchema,
  TimeSeriesDataPoint: TimeSeriesDataPointSchema,
  TimeSeriesData: TimeSeriesDataSchema,
  ChartConfig: ChartConfigSchema,
};

// Utility types for analytics
export type AnalyticsMetricType = 'tasks' | 'wiki' | 'memory' | 'collaboration' | 'performance';
export type AnalyticsTimeframe = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type AnalyticsAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'percentile';

// Constants for analytics
export const ANALYTICS_CONSTANTS = {
  MAX_EVENT_BATCH_SIZE: 100,
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_RETENTION_DAYS: 365,
  REAL_TIME_UPDATE_INTERVAL: 30000, // 30 seconds
  CACHE_TTL: 300, // 5 minutes
  INSIGHT_CONFIDENCE_THRESHOLD: 0.7,
} as const;