# MCP Tools Testing Guide

## 🧪 Overview

This guide provides comprehensive testing strategies for the MCP Tools ecosystem, covering unit tests, integration tests, end-to-end tests, and performance testing across all components.

## 📋 Testing Strategy

### Testing Pyramid

```
        E2E Tests (10%)
    ┌─────────────────────┐
    │   User Workflows   │
    └─────────────────────┘
          Integration Tests (20%)
    ┌─────────────────────────────┐
    │    API + WebSocket + DB     │
    └─────────────────────────────┘
              Unit Tests (70%)
    ┌─────────────────────────────────────┐
    │  Components + Services + Utils      │
    └─────────────────────────────────────┘
```

### Test Categories

1. **Unit Tests**: Individual functions, components, and utilities
2. **Integration Tests**: API endpoints, MCP servers, and database operations  
3. **E2E Tests**: Complete user workflows, real-time features, and cross-service interactions
4. **Performance Tests**: Load testing and system performance under stress

## 🚀 Running Tests

### Prerequisites

Build the core package first (required for all tests):
```bash
cd core && npm install && npm run build
```

### Test Commands

```bash
cd tests

# Install test dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only  
npm run test:performance   # Performance tests only

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 🏗️ Test Structure

```
tests/
├── src/
│   ├── e2e/              # End-to-end tests
│   │   └── full-workflow.test.ts
│   ├── integration/      # Integration tests
│   │   ├── api-gateway.test.ts
│   │   ├── kanban-workflow.test.ts
│   │   └── embeddings-worker.test.ts
│   ├── performance/      # Performance tests
│   │   └── load-testing.test.ts
│   ├── setup/           # Test setup and utilities
│   │   ├── global-setup.ts
│   │   ├── global-teardown.ts
│   │   └── jest-setup.ts
│   └── utils/           # Test utilities
│       └── test-client.ts
├── jest.config.js       # Jest configuration
└── package.json        # Test dependencies and scripts
```

## 🛠️ Test Environment Setup

The test suite includes automatic service startup and teardown:

```bash
# Start test services (if needed)
npm run start:services

# Stop test services  
npm run stop:services

# Setup test environment
npm run setup

# Teardown test environment
npm run teardown
```

### Test Configuration

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**Playwright Configuration** (`playwright.config.ts`):
```typescript
export default {
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
};
```

## 🔬 Unit Tests

### Analytics Service Tests

**File**: `tests/unit/services/AnalyticsService.test.ts`
```typescript
import { AnalyticsService } from '../../../gateway/src/services/AnalyticsService';
import { Pool } from 'pg';
import Redis from 'ioredis';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPgPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPgPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn()
    } as any;

    analyticsService = new AnalyticsService(mockPgPool, mockRedis);
  });

  describe('trackEvent', () => {
    it('should track a valid analytics event', async () => {
      const event = {
        userId: 'user-123',
        eventType: 'action' as const,
        eventCategory: 'kanban' as const,
        eventAction: 'task_completed',
        eventLabel: 'High Priority Task'
      };

      mockPgPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await analyticsService.trackEvent(event);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_events'),
        expect.arrayContaining([event.userId, event.eventType])
      );
    });

    it('should handle database errors gracefully', async () => {
      const event = {
        userId: 'user-123',
        eventType: 'action' as const,
        eventCategory: 'kanban' as const,
        eventAction: 'task_completed'
      };

      mockPgPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(analyticsService.trackEvent(event)).rejects.toThrow('DB Error');
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics for a user', async () => {
      const mockMetrics = {
        user: { totalTasks: 25, completionRate: 0.8 },
        system: { avgResponseTime: 150, errorRate: 0.02 }
      };

      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ total_tasks: 25, completion_rate: 0.8 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_time: 150, error_rate: 0.02 }] });

      const result = await analyticsService.getDashboardMetrics('user-123', 'week');

      expect(result).toMatchObject(mockMetrics);
      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Predictive Analytics Tests

**File**: `tests/unit/services/PredictiveAnalytics.test.ts`
```typescript
import { PredictiveAnalyticsService } from '../../../gateway/src/services/PredictiveAnalytics';

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;
  let mockPgPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockPgPool = { query: jest.fn() } as any;
    mockRedis = { get: jest.fn(), setex: jest.fn() } as any;
    service = new PredictiveAnalyticsService(mockPgPool, mockRedis);
  });

  describe('predictTaskCompletion', () => {
    it('should predict task completion with sufficient data', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // No cache
      mockPgPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          value: 2 + Math.random() * 2 // 2-4 hours
        }))
      });

      const prediction = await service.predictTaskCompletion('user-123', 'task-456', 7);

      expect(prediction).toMatchObject({
        taskId: 'task-456',
        confidence: expect.any(Number),
        estimatedCompletion: expect.any(Date),
        factors: {
          historicalAverage: expect.any(Number),
          currentPace: expect.any(Number),
          complexity: 0.7,
          timeOfDay: expect.any(Number),
          dayOfWeek: expect.any(Number)
        },
        recommendations: expect.any(Array)
      });

      expect(prediction.confidence).toBeGreaterThan(0.5);
    });

    it('should return default prediction with insufficient data', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPgPool.query.mockResolvedValueOnce({ rows: [] }); // No historical data

      const prediction = await service.predictTaskCompletion('user-123', 'task-456', 5);

      expect(prediction.confidence).toBe(0.5);
      expect(prediction.recommendations).toContain(
        'Insufficient historical data - estimates are based on averages'
      );
    });
  });

  describe('generateProductivityForecast', () => {
    it('should generate 7-day productivity forecast', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPgPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          task_completions: 3 + Math.floor(Math.random() * 5),
          activity_level: 0.7 + Math.random() * 0.3,
          session_duration: 60 + Math.random() * 60
        }))
      });

      const forecast = await service.generateProductivityForecast('user-123', 7);

      expect(forecast).toMatchObject({
        timeRange: {
          start: expect.any(Date),
          end: expect.any(Date)
        },
        predictions: {
          tasksCompleted: expect.any(Number),
          productivityScore: expect.any(Number),
          peakHours: expect.any(Array),
          lowEnergyPeriods: expect.any(Array),
          optimalWorkload: expect.any(Number)
        },
        confidence: expect.any(Number),
        trendDirection: expect.stringMatching(/improving|declining|stable/)
      });
    });
  });
});
```

### React Component Tests

**File**: `tests/unit/components/AnalyticsDashboard.test.tsx`
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsDashboard } from '../../../web/src/components/analytics/AnalyticsDashboard';

// Mock the hooks
jest.mock('../../../web/src/hooks/use-analytics', () => ({
  useAnalyticsDashboard: () => ({
    data: {
      user: { totalTasks: 25, completionRate: 0.8 },
      system: { avgResponseTime: 150, errorRate: 0.02 }
    },
    isLoading: false,
    error: null,
    refetch: jest.fn()
  }),
  useProductivityInsights: () => ({
    insights: [],
    generateInsights: jest.fn(),
    isGenerating: false
  }),
  usePageTracking: jest.fn()
}));

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  const renderWithProvider = (component: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );

  it('should render dashboard with analytics data', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Track your productivity and system performance')).toBeInTheDocument();

    // Check for tab navigation
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Productivity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Predictions' })).toBeInTheDocument();
  });

  it('should display metric cards with correct values', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total tasks
      expect(screen.getByText('150ms')).toBeInTheDocument(); // Response time
    });
  });

  it('should show loading state initially', () => {
    // Mock loading state
    jest.doMock('../../../web/src/hooks/use-analytics', () => ({
      useAnalyticsDashboard: () => ({
        data: null,
        isLoading: true,
        error: null
      })
    }));

    renderWithProvider(<AnalyticsDashboard />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });
});
```

## 🔗 Integration Tests

### API Endpoint Tests

**File**: `tests/integration/analytics-api.test.ts`
```typescript
import supertest from 'supertest';
import { createApp } from '../../gateway/src/index';

describe('Analytics API', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createApp();
    request = supertest(app);
  });

  describe('POST /api/v1/analytics/events', () => {
    it('should track analytics event successfully', async () => {
      const event = {
        eventType: 'action',
        eventCategory: 'kanban',
        eventAction: 'task_completed',
        eventLabel: 'Test Task'
      };

      const response = await request
        .post('/api/v1/analytics/events')
        .set('Authorization', 'Bearer test-token')
        .send(event)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Event tracked successfully'
      });
    });

    it('should validate required fields', async () => {
      const invalidEvent = {
        eventType: 'invalid_type'
      };

      await request
        .post('/api/v1/analytics/events')
        .set('Authorization', 'Bearer test-token')
        .send(invalidEvent)
        .expect(400);
    });
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request
        .get('/api/v1/analytics/dashboard?timeRange=week')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.data).toMatchObject({
        user: {
          totalTasks: expect.any(Number),
          completionRate: expect.any(Number)
        },
        system: {
          avgResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        }
      });
    });
  });

  describe('GET /api/v1/analytics/predictions/tasks', () => {
    it('should return task completion prediction', async () => {
      const response = await request
        .get('/api/v1/analytics/predictions/tasks?complexity=7')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.data).toMatchObject({
        estimatedCompletion: expect.any(String),
        confidence: expect.any(Number),
        factors: expect.any(Object),
        recommendations: expect.any(Array)
      });
    });
  });
});
```

### WebSocket Integration Tests

**File**: `tests/integration/analytics-websocket.test.ts`
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { setupWebSocket } from '../../gateway/src/websocket/index';

describe('Analytics WebSocket', () => {
  let server: any;
  let io: Server;
  let clientSocket: Socket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    
    // Mock services
    const mockKanbanService = {} as any;
    const mockAnalyticsService = {
      trackEvent: jest.fn(),
      createEventStream: jest.fn(),
      generateInsights: jest.fn()
    } as any;

    setupWebSocket(io, mockKanbanService, mockAnalyticsService);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}/analytics`, {
        auth: { token: 'test-token' }
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server?.close();
    clientSocket?.close();
  });

  it('should connect to analytics namespace', (done) => {
    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });
  });

  it('should handle metrics subscription', (done) => {
    clientSocket.emit('subscribe:metrics', { type: 'user', interval: 5000 });
    
    clientSocket.on('subscription:confirmed', (data) => {
      expect(data.type).toBe('metrics');
      done();
    });
  });

  it('should handle event tracking', (done) => {
    const event = {
      eventType: 'action',
      eventCategory: 'kanban',
      eventAction: 'task_completed'
    };

    clientSocket.emit('track:event', event);
    
    clientSocket.on('track:confirmed', (data) => {
      expect(data.event).toMatchObject(event);
      done();
    });
  });

  it('should handle insights generation', (done) => {
    clientSocket.emit('generate:insights');
    
    clientSocket.on('insights:generated', (data) => {
      expect(data.insights).toBeDefined();
      done();
    });
  });
});
```

## 🎭 End-to-End Tests

### Analytics Dashboard E2E

**File**: `tests/e2e/analytics-dashboard.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to analytics
    await page.goto('/auth/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display analytics dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Analytics Dashboard');
    
    // Check for main metric cards
    await expect(page.locator('[data-testid=total-tasks-metric]')).toBeVisible();
    await expect(page.locator('[data-testid=wiki-pages-metric]')).toBeVisible();
    await expect(page.locator('[data-testid=memories-metric]')).toBeVisible();
    
    // Check for tabs
    await expect(page.locator('[role=tab]')).toHaveCount(6);
  });

  test('should navigate between tabs', async ({ page }) => {
    // Test tab navigation
    await page.click('[role=tab][name="Productivity"]');
    await expect(page.locator('[data-testid=productivity-content]')).toBeVisible();
    
    await page.click('[role=tab][name="Predictions"]');
    await expect(page.locator('[data-testid=predictions-content]')).toBeVisible();
    
    await page.click('[role=tab][name="Recommendations"]');
    await expect(page.locator('[data-testid=recommendations-content]')).toBeVisible();
  });

  test('should display real-time analytics', async ({ page }) => {
    // Check for real-time components
    await expect(page.locator('[data-testid=realtime-analytics]')).toBeVisible();
    await expect(page.locator('[data-testid=connection-status]')).toContainText('Connected');
    
    // Trigger an action and check for real-time update
    await page.click('[data-testid=refresh-button]');
    
    // Wait for real-time event
    await page.waitForSelector('[data-testid=recent-event]', { timeout: 5000 });
  });

  test('should generate and display insights', async ({ page }) => {
    await page.click('[role=tab][name="Insights"]');
    
    // Generate insights
    await page.click('[data-testid=generate-insights-button]');
    
    // Wait for insights to load
    await page.waitForSelector('[data-testid=insight-card]', { timeout: 10000 });
    
    const insightCards = page.locator('[data-testid=insight-card]');
    await expect(insightCards).toHaveCountGreaterThan(0);
    
    // Check insight card content
    const firstInsight = insightCards.first();
    await expect(firstInsight.locator('[data-testid=insight-title]')).toBeVisible();
    await expect(firstInsight.locator('[data-testid=insight-description]')).toBeVisible();
    await expect(firstInsight.locator('[data-testid=confidence-score]')).toBeVisible();
  });

  test('should show predictive analytics', async ({ page }) => {
    await page.click('[role=tab][name="Predictions"]');
    
    // Check for prediction components
    await expect(page.locator('[data-testid=task-prediction]')).toBeVisible();
    await expect(page.locator('[data-testid=productivity-forecast]')).toBeVisible();
    await expect(page.locator('[data-testid=workload-analysis]')).toBeVisible();
    
    // Check for confidence indicators
    await expect(page.locator('[data-testid=confidence-indicator]')).toHaveCountGreaterThan(0);
  });

  test('should display smart recommendations', async ({ page }) => {
    await page.click('[role=tab][name="Recommendations"]');
    
    // Wait for recommendations to load
    await page.waitForSelector('[data-testid=recommendation-card]', { timeout: 5000 });
    
    const recommendationCards = page.locator('[data-testid=recommendation-card]');
    await expect(recommendationCards).toHaveCountGreaterThan(0);
    
    // Test recommendation interaction
    const firstRecommendation = recommendationCards.first();
    await firstRecommendation.locator('[data-testid=implement-button]').click();
    
    await expect(firstRecommendation.locator('[data-testid=implemented-badge]')).toBeVisible();
  });

  test('should handle time range changes', async ({ page }) => {
    // Change time range
    await page.click('[data-testid=time-range-selector]');
    await page.click('[data-testid=time-range-month]');
    
    // Wait for data to refresh
    await page.waitForLoadState('networkidle');
    
    // Verify updated data
    await expect(page.locator('[data-testid=chart-container]')).toBeVisible();
  });
});
```

### WebSocket Real-time E2E

**File**: `tests/e2e/real-time-analytics.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Real-time Analytics', () => {
  test('should update analytics in real-time', async ({ page, context }) => {
    // Open two pages to test real-time sync
    const page1 = page;
    const page2 = await context.newPage();
    
    // Login on both pages
    for (const p of [page1, page2]) {
      await p.goto('/auth/login');
      await p.fill('[data-testid=email]', 'test@example.com');
      await p.fill('[data-testid=password]', 'password');
      await p.click('[data-testid=login-button]');
    }
    
    // Navigate to analytics on both pages
    await page1.goto('/dashboard/analytics');
    await page2.goto('/dashboard/analytics');
    
    // Perform action on page1
    await page1.goto('/kanban');
    await page1.click('[data-testid=create-task-button]');
    await page1.fill('[data-testid=task-title]', 'Real-time Test Task');
    await page1.click('[data-testid=save-task-button]');
    
    // Check for real-time update on page2
    await page2.goto('/dashboard/analytics');
    await expect(page2.locator('[data-testid=recent-event]')).toContainText('task_created', { timeout: 10000 });
    
    // Complete task on page1
    await page1.click('[data-testid=task-checkbox]');
    
    // Verify completion update on page2
    await expect(page2.locator('[data-testid=recent-event]')).toContainText('task_completed', { timeout: 10000 });
  });

  test('should handle WebSocket disconnection gracefully', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    
    // Wait for connection
    await expect(page.locator('[data-testid=connection-status]')).toContainText('Connected');
    
    // Simulate network disconnection
    await page.context().setOffline(true);
    
    // Check disconnection status
    await expect(page.locator('[data-testid=connection-status]')).toContainText('Disconnected', { timeout: 5000 });
    
    // Restore connection
    await page.context().setOffline(false);
    
    // Check reconnection
    await expect(page.locator('[data-testid=connection-status]')).toContainText('Connected', { timeout: 10000 });
  });
});
```

## 📊 Performance Tests

### Load Testing with Artillery

**File**: `tests/performance/analytics-load.yml`
```yaml
config:
  target: 'http://localhost:8193'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
  defaults:
    headers:
      Authorization: 'Bearer test-token'

scenarios:
  - name: 'Analytics Event Tracking'
    weight: 70
    flow:
      - post:
          url: '/api/v1/analytics/events'
          json:
            eventType: 'action'
            eventCategory: 'kanban'
            eventAction: 'task_completed'
            properties:
              duration: 45
              complexity: 7

  - name: 'Dashboard Metrics'
    weight: 20
    flow:
      - get:
          url: '/api/v1/analytics/dashboard?timeRange=week'

  - name: 'Predictive Analytics'
    weight: 10
    flow:
      - get:
          url: '/api/v1/analytics/predictions/tasks?complexity=5'
      - get:
          url: '/api/v1/analytics/predictions/productivity'
```

### WebSocket Performance Test

**File**: `tests/performance/websocket-load.js`
```javascript
const io = require('socket.io-client');

const TARGET_URL = 'http://localhost:8193/analytics';
const CONCURRENT_CONNECTIONS = 100;
const EVENTS_PER_CONNECTION = 50;

async function loadTest() {
  const connections = [];
  const startTime = Date.now();
  
  console.log(`Starting WebSocket load test with ${CONCURRENT_CONNECTIONS} connections`);
  
  for (let i = 0; i < CONCURRENT_CONNECTIONS; i++) {
    const socket = io(TARGET_URL, {
      auth: { token: 'test-token' }
    });
    
    connections.push(socket);
    
    socket.on('connect', () => {
      console.log(`Connection ${i + 1} established`);
      
      // Send events
      for (let j = 0; j < EVENTS_PER_CONNECTION; j++) {
        socket.emit('track:event', {
          eventType: 'action',
          eventCategory: 'kanban',
          eventAction: 'test_action',
          properties: { testId: `${i}-${j}` }
        });
      }
    });
    
    socket.on('track:confirmed', (data) => {
      // Track confirmed events
    });
  }
  
  // Wait for test completion
  setTimeout(() => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalEvents = CONCURRENT_CONNECTIONS * EVENTS_PER_CONNECTION;
    
    console.log(`Load test completed in ${duration}ms`);
    console.log(`Total events: ${totalEvents}`);
    console.log(`Events per second: ${(totalEvents / (duration / 1000)).toFixed(2)}`);
    
    connections.forEach(socket => socket.disconnect());
    process.exit(0);
  }, 30000);
}

loadTest().catch(console.error);
```

## 🔒 Security Tests

### Authentication Tests

**File**: `tests/security/auth.test.ts`
```typescript
import supertest from 'supertest';
import { createApp } from '../../gateway/src/index';

describe('Analytics Security', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createApp();
    request = supertest(app);
  });

  test('should reject requests without authentication', async () => {
    await request
      .post('/api/v1/analytics/events')
      .send({ eventType: 'action' })
      .expect(401);
  });

  test('should reject requests with invalid tokens', async () => {
    await request
      .post('/api/v1/analytics/events')
      .set('Authorization', 'Bearer invalid-token')
      .send({ eventType: 'action' })
      .expect(401);
  });

  test('should prevent access to other users data', async () => {
    const userAToken = 'user-a-token';
    const userBId = 'user-b-id';

    await request
      .get(`/api/v1/analytics/dashboard?userId=${userBId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403);
  });

  test('should sanitize input data', async () => {
    const maliciousEvent = {
      eventType: 'action',
      eventCategory: 'kanban',
      eventAction: '<script>alert("xss")</script>',
      properties: {
        sqlInjection: "'; DROP TABLE analytics_events; --"
      }
    };

    const response = await request
      .post('/api/v1/analytics/events')
      .set('Authorization', 'Bearer test-token')
      .send(maliciousEvent);

    expect(response.status).toBe(400); // Should reject malicious input
  });
});
```

## 🏃‍♂️ Running Tests

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:load": "artillery run tests/performance/analytics-load.yml",
    "test:ws-load": "node tests/performance/websocket-load.js",
    "test:all": "npm run test && npm run test:e2e && npm run test:load"
  }
}
```

### CI/CD Pipeline

**File**: `.github/workflows/analytics-tests.yml`
```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: --health-cmd pg_isready --health-interval 10s
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:load
```

## 📈 Test Metrics & Coverage

### Coverage Requirements

- **Unit Tests**: 80%+ coverage for services and utilities
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user workflows covered
- **Performance Tests**: Response time < 200ms for 95% of requests

### Quality Gates

- All tests must pass before deployment
- Coverage thresholds must be met
- Performance benchmarks must be satisfied
- Security scans must show no high-severity issues

---

*This testing guide ensures the reliability, performance, and security of the MCP Tools Analytics system.*