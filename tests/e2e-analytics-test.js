#!/usr/bin/env node

/**
 * Comprehensive End-to-End Analytics Test
 * 
 * This script tests the complete analytics pipeline:
 * 1. Event tracking and storage
 * 2. Real-time WebSocket updates
 * 3. Predictive analytics generation
 * 4. Dashboard data retrieval
 * 5. Insights engine functionality
 */

import axios from 'axios';
import { io } from 'socket.io-client';
import { performance } from 'perf_hooks';

// Test configuration
const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:8193',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  testUser: {
    id: 'test-user-123',
    email: 'test@analytics.com',
    name: 'Analytics Test User'
  },
  testToken: 'test-jwt-token-for-analytics-e2e'
};

class AnalyticsE2ETest {
  constructor() {
    this.results = {
      tests: [],
      startTime: performance.now(),
      errors: []
    };
    
    this.apiClient = axios.create({
      baseURL: config.gatewayUrl,
      headers: {
        'Authorization': `Bearer ${config.testToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Run all analytics tests
   */
  async runTests() {
    console.log('🧪 Starting Analytics E2E Tests...\n');

    try {
      // Core functionality tests
      await this.testEventTracking();
      await this.testDashboardMetrics();
      await this.testPredictiveAnalytics();
      await this.testInsightsGeneration();
      
      // Real-time tests
      await this.testWebSocketConnection();
      await this.testRealTimeEventStreaming();
      
      // Performance tests
      await this.testEventBatchProcessing();
      await this.testConcurrentConnections();
      
      // Integration tests
      await this.testEndToEndWorkflow();

      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.results.errors.push(error);
      process.exit(1);
    }
  }

  /**
   * Test 1: Event Tracking
   */
  async testEventTracking() {
    const testName = 'Event Tracking';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      const events = [
        {
          eventType: 'page_view',
          eventCategory: 'dashboard',
          eventAction: 'view',
          eventLabel: 'analytics_dashboard',
          properties: { loadTime: 150, browser: 'test' }
        },
        {
          eventType: 'action',
          eventCategory: 'kanban',
          eventAction: 'task_created',
          eventLabel: 'Test Task',
          properties: { priority: 'high', complexity: 7 }
        },
        {
          eventType: 'feature_use',
          eventCategory: 'analytics',
          eventAction: 'generate_insights',
          properties: { trigger: 'manual' }
        }
      ];

      const startTime = performance.now();
      
      for (const event of events) {
        const response = await this.apiClient.post('/api/v1/analytics/events', event);
        
        if (response.status !== 201) {
          throw new Error(`Event tracking failed: ${response.status}`);
        }
      }
      
      const duration = performance.now() - startTime;
      
      this.recordTest(testName, true, `Tracked ${events.length} events in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Test 2: Dashboard Metrics
   */
  async testDashboardMetrics() {
    const testName = 'Dashboard Metrics';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      const timeRanges = ['today', 'week', 'month'];
      
      for (const timeRange of timeRanges) {
        const response = await this.apiClient.get(`/api/v1/analytics/dashboard?timeRange=${timeRange}`);
        
        if (response.status !== 200) {
          throw new Error(`Dashboard metrics failed for ${timeRange}: ${response.status}`);
        }
        
        const { data } = response.data;
        
        // Validate structure
        if (!data.user || !data.system || !data.productivity) {
          throw new Error(`Invalid dashboard structure for ${timeRange}`);
        }
        
        // Validate required fields
        const requiredUserFields = ['totalTasks', 'completionRate', 'activeDays'];
        const requiredSystemFields = ['avgResponseTime', 'errorRate', 'uptime'];
        
        for (const field of requiredUserFields) {
          if (typeof data.user[field] === 'undefined') {
            throw new Error(`Missing user field: ${field}`);
          }
        }
        
        for (const field of requiredSystemFields) {
          if (typeof data.system[field] === 'undefined') {
            throw new Error(`Missing system field: ${field}`);
          }
        }
      }
      
      this.recordTest(testName, true, `Retrieved metrics for ${timeRanges.length} time ranges`);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Test 3: Predictive Analytics
   */
  async testPredictiveAnalytics() {
    const testName = 'Predictive Analytics';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      // Test task completion prediction
      const taskResponse = await this.apiClient.get('/api/v1/analytics/predictions/tasks?complexity=7');
      
      if (taskResponse.status !== 200) {
        throw new Error(`Task prediction failed: ${taskResponse.status}`);
      }
      
      const taskPrediction = taskResponse.data.data;
      
      // Validate task prediction structure
      const requiredTaskFields = ['estimatedCompletion', 'confidence', 'factors', 'recommendations'];
      for (const field of requiredTaskFields) {
        if (!taskPrediction[field]) {
          throw new Error(`Missing task prediction field: ${field}`);
        }
      }
      
      // Test productivity forecast
      const productivityResponse = await this.apiClient.get('/api/v1/analytics/predictions/productivity?days=7');
      
      if (productivityResponse.status !== 200) {
        throw new Error(`Productivity forecast failed: ${productivityResponse.status}`);
      }
      
      const productivityForecast = productivityResponse.data.data;
      
      // Validate productivity forecast structure
      const requiredForecastFields = ['timeRange', 'predictions', 'confidence', 'trendDirection'];
      for (const field of requiredForecastFields) {
        if (!productivityForecast[field]) {
          throw new Error(`Missing forecast field: ${field}`);
        }
      }
      
      // Test workload capacity
      const workloadResponse = await this.apiClient.get('/api/v1/analytics/predictions/workload');
      
      if (workloadResponse.status !== 200) {
        throw new Error(`Workload prediction failed: ${workloadResponse.status}`);
      }
      
      const workloadPrediction = workloadResponse.data.data;
      
      // Validate workload prediction structure
      const requiredWorkloadFields = ['currentCapacity', 'optimalCapacity', 'burnoutRisk', 'recommendations'];
      for (const field of requiredWorkloadFields) {
        if (typeof workloadPrediction[field] === 'undefined') {
          throw new Error(`Missing workload field: ${field}`);
        }
      }
      
      // Test comprehensive predictions
      const comprehensiveResponse = await this.apiClient.get('/api/v1/analytics/predictions/comprehensive');
      
      if (comprehensiveResponse.status !== 200) {
        throw new Error(`Comprehensive predictions failed: ${comprehensiveResponse.status}`);
      }
      
      const comprehensive = comprehensiveResponse.data.data;
      
      if (!comprehensive.taskCompletion || !comprehensive.productivityForecast || !comprehensive.workloadCapacity) {
        throw new Error('Incomplete comprehensive predictions');
      }
      
      this.recordTest(testName, true, 'All prediction endpoints working correctly');
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Test 4: Insights Generation
   */
  async testInsightsGeneration() {
    const testName = 'Insights Generation';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      // Get current insights
      const getResponse = await this.apiClient.get('/api/v1/analytics/insights');
      
      if (getResponse.status !== 200) {
        throw new Error(`Get insights failed: ${getResponse.status}`);
      }
      
      // Generate new insights
      const generateResponse = await this.apiClient.post('/api/v1/analytics/insights/generate');
      
      if (generateResponse.status !== 200) {
        throw new Error(`Generate insights failed: ${generateResponse.status}`);
      }
      
      const insights = generateResponse.data.data;
      
      if (!Array.isArray(insights)) {
        throw new Error('Insights should be an array');
      }
      
      // Validate insight structure if insights exist
      if (insights.length > 0) {
        const insight = insights[0];
        const requiredFields = ['id', 'title', 'description', 'insightType', 'confidenceScore'];
        
        for (const field of requiredFields) {
          if (!insight[field]) {
            throw new Error(`Missing insight field: ${field}`);
          }
        }
        
        // Validate confidence score range
        if (insight.confidenceScore < 0 || insight.confidenceScore > 1) {
          throw new Error('Invalid confidence score range');
        }
      }
      
      this.recordTest(testName, true, `Generated ${insights.length} insights`);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Test 5: WebSocket Connection
   */
  async testWebSocketConnection() {
    const testName = 'WebSocket Connection';
    console.log(`🔬 Testing ${testName}...`);
    
    return new Promise((resolve, reject) => {
      try {
        const socket = io(`${config.gatewayUrl}/analytics`, {
          auth: { token: config.testToken },
          timeout: 5000
        });
        
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          
          // Test subscription
          socket.emit('subscribe:metrics', { type: 'user', interval: 5000 });
          
          socket.on('subscription:confirmed', (data) => {
            if (data.type === 'metrics') {
              socket.disconnect();
              this.recordTest(testName, true, 'WebSocket connection and subscription successful');
              resolve();
            }
          });
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.recordTest(testName, false, `Connection error: ${error.message}`);
          reject(error);
        });
        
      } catch (error) {
        this.recordTest(testName, false, error.message);
        reject(error);
      }
    });
  }

  /**
   * Test 6: Real-time Event Streaming
   */
  async testRealTimeEventStreaming() {
    const testName = 'Real-time Event Streaming';
    console.log(`🔬 Testing ${testName}...`);
    
    return new Promise((resolve, reject) => {
      try {
        const socket = io(`${config.gatewayUrl}/analytics`, {
          auth: { token: config.testToken }
        });
        
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Real-time streaming timeout'));
        }, 15000);
        
        let eventReceived = false;
        
        socket.on('connect', () => {
          // Subscribe to real-time events
          socket.emit('subscribe:events');
          
          // Send a test event via API
          setTimeout(async () => {
            try {
              await this.apiClient.post('/api/v1/analytics/events', {
                eventType: 'action',
                eventCategory: 'test',
                eventAction: 'realtime_test',
                properties: { testId: 'realtime-stream-test' }
              });
            } catch (error) {
              clearTimeout(timeout);
              socket.disconnect();
              reject(error);
            }
          }, 1000);
        });
        
        socket.on('analytics:event', (data) => {
          if (data.event && data.event.eventAction === 'realtime_test') {
            eventReceived = true;
            clearTimeout(timeout);
            socket.disconnect();
            this.recordTest(testName, true, 'Real-time event streaming working');
            resolve();
          }
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.recordTest(testName, false, `Streaming error: ${error.message}`);
          reject(error);
        });
        
      } catch (error) {
        this.recordTest(testName, false, error.message);
        reject(error);
      }
    });
  }

  /**
   * Test 7: Event Batch Processing
   */
  async testEventBatchProcessing() {
    const testName = 'Event Batch Processing';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      const batchSize = 50;
      const events = Array.from({ length: batchSize }, (_, i) => ({
        eventType: 'action',
        eventCategory: 'test',
        eventAction: 'batch_test',
        eventLabel: `Batch Event ${i + 1}`,
        properties: { batchIndex: i, testId: 'batch-processing-test' }
      }));
      
      const startTime = performance.now();
      
      // Send events concurrently
      const promises = events.map(event => 
        this.apiClient.post('/api/v1/analytics/events', event)
      );
      
      const responses = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      // Verify all events were processed
      const successCount = responses.filter(r => r.status === 201).length;
      
      if (successCount !== batchSize) {
        throw new Error(`Only ${successCount}/${batchSize} events processed successfully`);
      }
      
      const eventsPerSecond = (batchSize / (duration / 1000)).toFixed(2);
      
      this.recordTest(testName, true, `Processed ${batchSize} events in ${duration.toFixed(2)}ms (${eventsPerSecond} events/sec)`);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Test 8: Concurrent WebSocket Connections
   */
  async testConcurrentConnections() {
    const testName = 'Concurrent WebSocket Connections';
    console.log(`🔬 Testing ${testName}...`);
    
    const connectionCount = 20;
    const connections = [];
    
    return new Promise((resolve, reject) => {
      try {
        let connectedCount = 0;
        const startTime = performance.now();
        
        const timeout = setTimeout(() => {
          connections.forEach(socket => socket?.disconnect());
          reject(new Error('Concurrent connections timeout'));
        }, 20000);
        
        for (let i = 0; i < connectionCount; i++) {
          const socket = io(`${config.gatewayUrl}/analytics`, {
            auth: { token: config.testToken }
          });
          
          connections.push(socket);
          
          socket.on('connect', () => {
            connectedCount++;
            
            if (connectedCount === connectionCount) {
              const duration = performance.now() - startTime;
              
              // Cleanup
              clearTimeout(timeout);
              connections.forEach(s => s.disconnect());
              
              this.recordTest(testName, true, `${connectionCount} concurrent connections established in ${duration.toFixed(2)}ms`);
              resolve();
            }
          });
          
          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            connections.forEach(s => s?.disconnect());
            this.recordTest(testName, false, `Connection ${i + 1} failed: ${error.message}`);
            reject(error);
          });
        }
        
      } catch (error) {
        this.recordTest(testName, false, error.message);
        reject(error);
      }
    });
  }

  /**
   * Test 9: End-to-End Workflow
   */
  async testEndToEndWorkflow() {
    const testName = 'End-to-End Analytics Workflow';
    console.log(`🔬 Testing ${testName}...`);
    
    try {
      // 1. Simulate user session with multiple events
      const sessionEvents = [
        { eventType: 'page_view', eventCategory: 'dashboard', eventAction: 'view', eventLabel: 'dashboard' },
        { eventType: 'action', eventCategory: 'kanban', eventAction: 'board_opened', eventLabel: 'Project Board' },
        { eventType: 'action', eventCategory: 'kanban', eventAction: 'task_created', properties: { complexity: 5 } },
        { eventType: 'action', eventCategory: 'kanban', eventAction: 'task_updated', properties: { field: 'status' } },
        { eventType: 'action', eventCategory: 'kanban', eventAction: 'task_completed', properties: { duration: 45 } },
        { eventType: 'feature_use', eventCategory: 'analytics', eventAction: 'view_dashboard' },
        { eventType: 'page_view', eventCategory: 'wiki', eventAction: 'view', eventLabel: 'documentation' }
      ];
      
      // Track all events
      for (const event of sessionEvents) {
        await this.apiClient.post('/api/v1/analytics/events', event);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate real usage
      }
      
      // 2. Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Check dashboard reflects the new data
      const dashboardResponse = await this.apiClient.get('/api/v1/analytics/dashboard?timeRange=today');
      if (dashboardResponse.status !== 200) {
        throw new Error('Dashboard not accessible after events');
      }
      
      // 4. Generate insights based on the new data
      const insightsResponse = await this.apiClient.post('/api/v1/analytics/insights/generate');
      if (insightsResponse.status !== 200) {
        throw new Error('Insights generation failed after events');
      }
      
      // 5. Get predictions with the new data
      const predictionsResponse = await this.apiClient.get('/api/v1/analytics/predictions/comprehensive');
      if (predictionsResponse.status !== 200) {
        throw new Error('Predictions failed after events');
      }
      
      // 6. Train models with the new data
      const trainingResponse = await this.apiClient.post('/api/v1/analytics/models/train');
      if (trainingResponse.status !== 200) {
        throw new Error('Model training failed');
      }
      
      this.recordTest(testName, true, `Complete workflow with ${sessionEvents.length} events executed successfully`);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
      throw error;
    }
  }

  /**
   * Record test result
   */
  recordTest(name, passed, message) {
    const result = {
      name,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${message}\n`);
  }

  /**
   * Print test results summary
   */
  printResults() {
    const endTime = performance.now();
    const duration = endTime - this.results.startTime;
    
    const passed = this.results.tests.filter(t => t.passed).length;
    const failed = this.results.tests.filter(t => !t.passed).length;
    const total = this.results.tests.length;
    
    console.log('\n📊 Analytics E2E Test Results');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n🔥 Errors:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.message}`);
      });
    }
    
    console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : `⚠️  ${failed} test(s) failed`));
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the tests
const test = new AnalyticsE2ETest();
test.runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});

export default AnalyticsE2ETest;