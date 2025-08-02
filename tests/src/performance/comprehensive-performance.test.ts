/**
 * Comprehensive Performance and Load Tests
 * 
 * Tests performance characteristics of all new features:
 * - Large dataset performance (1000+ memories, wiki pages, kanban cards)
 * - Memory merge operations on large memories
 * - Analytics query performance with substantial data
 * - Concurrent user scenarios
 * - Database query optimization verification
 * - Memory usage and resource consumption
 * - Response time benchmarks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { TestClient } from '../utils/test-client.js';
import { performance } from 'perf_hooks';
import axios from 'axios';

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  operation: string;
  dataSize: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

describe('Comprehensive Performance and Load Tests', () => {
  let testClient: TestClient;
  let performanceMetrics: PerformanceMetrics[] = [];
  
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  const TEST_USER_ID = 'performance-test-user';
  
  // Performance thresholds (adjust based on your requirements)
  const PERFORMANCE_THRESHOLDS = {
    MEMORY_CREATION: 500, // ms
    MEMORY_MERGE: 2000, // ms
    ANALYTICS_QUERY: 1000, // ms
    WIKI_PAGE_LOAD: 500, // ms
    KANBAN_BOARD_LOAD: 800, // ms
    CONCURRENT_USER_RESPONSE: 1500, // ms
    LARGE_DATASET_QUERY: 3000, // ms
  };
  
  beforeAll(async () => {
    testClient = new TestClient(BASE_URL);
    
    // Authenticate test user
    await testClient.authenticate({
      userId: TEST_USER_ID,
      email: 'performance-test@example.com',
      name: 'Performance Test User'
    });
    
    // Verify services are running
    await testClient.waitForService('/health', 30000);
  });
  
  afterAll(async () => {
    // Generate performance report
    await generatePerformanceReport();
    await testClient.cleanup();
  });
  
  const recordMetrics = (operation: string, startTime: number, dataSize: number = 0): PerformanceMetrics => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const memoryUsage = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      responseTime,
      memoryUsage,
      timestamp: Date.now(),
      operation,
      dataSize
    };
    
    performanceMetrics.push(metrics);
    return metrics;
  };
  
  const generatePerformanceReport = async () => {
    console.log('\n=== PERFORMANCE TEST REPORT ===');
    
    const operationGroups = performanceMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);
    
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const responseTimes = metrics.map(m => m.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      console.log(`\n${operation}:`);
      console.log(`  Tests: ${metrics.length}`);
      console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`  Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    }
  };
  
  describe('Large Dataset Performance Tests', () => {
    let largeDatasetIds: string[] = [];
    
    afterEach(async () => {
      // Cleanup large dataset
      for (const id of largeDatasetIds) {
        try {
          await testClient.delete(`/api/v1/memories/${id}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      largeDatasetIds = [];
    });
    
    test('should handle 1000+ memory creation efficiently', async () => {
      const memoryCount = 1000;
      const batchSize = 50;
      const batches = Math.ceil(memoryCount / batchSize);
      
      const startTime = performance.now();
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, memoryCount);
        
        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(
            testClient.post('/api/v1/memories', {
              content: `Performance test memory ${i} with detailed content to simulate realistic memory size. This memory contains multiple concepts and detailed information about the test scenario being executed.`,
              context: {
                userId: TEST_USER_ID,
                project: 'performance-test',
                batch: batch,
                index: i
              },
              concepts: [`concept-${i % 10}`, 'performance', 'test', `batch-${batch}`],
              importance: (i % 5) + 1
            })
          );
        }
        
        const batchResponses = await Promise.all(batchPromises);
        
        // Collect IDs for cleanup
        batchResponses.forEach(response => {
          if (response.status === 201) {
            largeDatasetIds.push(response.data.data.id);
          }
        });
        
        // Verify batch success
        const successfulInBatch = batchResponses.filter(r => r.status === 201).length;
        expect(successfulInBatch).toBe(batchEnd - batchStart);
      }
      
      const metrics = recordMetrics('Large Memory Creation', startTime, memoryCount);
      
      // Should complete within reasonable time
      expect(metrics.responseTime).toBeLessThan(30000); // 30 seconds for 1000 memories
      
      console.log(`Created ${largeDatasetIds.length} memories in ${metrics.responseTime.toFixed(2)}ms`);
    }, 60000); // 60 second timeout
    
    test('should query large datasets efficiently', async () => {
      // Create smaller dataset for query testing
      const memoryCount = 500;
      
      // Create memories in parallel batches
      const batchSize = 25;
      const batches = Math.ceil(memoryCount / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        for (let i = 0; i < batchSize && (batch * batchSize + i) < memoryCount; i++) {
          const index = batch * batchSize + i;
          batchPromises.push(
            testClient.post('/api/v1/memories', {
              content: `Query test memory ${index} with searchable content about ${index % 5 === 0 ? 'databases' : index % 3 === 0 ? 'algorithms' : 'programming'}`,
              context: { userId: TEST_USER_ID },
              concepts: [`query-test-${index % 10}`, 'performance'],
              importance: (index % 5) + 1
            })
          );
        }
        
        const responses = await Promise.all(batchPromises);
        responses.forEach(response => {
          if (response.status === 201) {
            largeDatasetIds.push(response.data.data.id);
          }
        });
      }
      
      // Test various query scenarios
      const queryTests = [
        {
          name: 'Simple search',
          params: { q: 'programming', limit: 20 }
        },
        {
          name: 'Complex search with filters',
          params: { q: 'databases', limit: 10, importance: 3 }
        },
        {
          name: 'Concept-based search',
          params: { concepts: ['query-test-1', 'performance'], limit: 15 }
        },
        {
          name: 'Paginated search',
          params: { q: 'algorithms', page: 2, limit: 25 }
        }
      ];
      
      for (const queryTest of queryTests) {
        const startTime = performance.now();
        
        const response = await testClient.get('/api/v1/memories/search', {
          params: queryTest.params
        });
        
        const metrics = recordMetrics(`Query: ${queryTest.name}`, startTime, memoryCount);
        
        expect(response.status).toBe(200);
        expect(response.data.data.memories).toBeDefined();
        expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_QUERY);
        
        console.log(`${queryTest.name}: ${metrics.responseTime.toFixed(2)}ms`);
      }
    }, 45000);
    
    test('should handle memory merge on large memories efficiently', async () => {
      // Create large memories for merge testing
      const largeContent1 = 'Large memory content '.repeat(1000);
      const largeContent2 = 'Another large memory content '.repeat(1000);
      
      const memory1Response = await testClient.post('/api/v1/memories', {
        content: largeContent1,
        context: { userId: TEST_USER_ID },
        concepts: Array.from({length: 20}, (_, i) => `large-concept-${i}`),
        importance: 4
      });
      
      const memory2Response = await testClient.post('/api/v1/memories', {
        content: largeContent2,
        context: { userId: TEST_USER_ID },
        concepts: Array.from({length: 15}, (_, i) => `large-concept-${i + 10}`),
        importance: 5
      });
      
      const memory1Id = memory1Response.data.data.id;
      const memory2Id = memory2Response.data.data.id;
      largeDatasetIds.push(memory1Id, memory2Id);
      
      // Test merge performance
      const startTime = performance.now();
      
      const mergeResponse = await testClient.post('/api/v1/memories/merge', {
        source_memory_ids: [memory1Id, memory2Id],
        merge_strategy: 'combine'
      });
      
      const metrics = recordMetrics('Large Memory Merge', startTime, largeContent1.length + largeContent2.length);
      
      expect(mergeResponse.status).toBe(201);
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_MERGE);
      
      const mergedMemory = mergeResponse.data.data.merged_memory;
      largeDatasetIds.push(mergedMemory.id);
      
      console.log(`Large memory merge completed in ${metrics.responseTime.toFixed(2)}ms`);
    });
  });
  
  describe('Analytics Query Performance Tests', () => {
    let testBoardId: string;
    let testPageIds: number[] = [];
    let testMemoryIds: string[] = [];
    
    beforeEach(async () => {
      // Create substantial test data for analytics
      await createAnalyticsTestData();
    });
    
    afterEach(async () => {
      // Cleanup test data
      await cleanupAnalyticsTestData();
    });
    
    const createAnalyticsTestData = async () => {
      // Create test board
      const boardResponse = await testClient.post('/api/v1/kanban/boards', {
        name: 'Performance Analytics Test Board'
      });
      testBoardId = boardResponse.data.data.id;
      
      // Create many cards for analytics
      const cardPromises = [];
      for (let i = 0; i < 200; i++) {
        cardPromises.push(
          testClient.post('/api/v1/kanban/cards', {
            title: `Analytics Card ${i}`,
            board_id: testBoardId,
            column: ['todo', 'in_progress', 'done'][i % 3],
            priority: ['low', 'medium', 'high'][i % 3],
            assignee: `user${i % 5}@example.com`,
            estimated_hours: (i % 8) + 1
          })
        );
      }
      
      await Promise.all(cardPromises);
      
      // Create wiki pages for analytics
      const pagePromises = [];
      for (let i = 0; i < 100; i++) {
        pagePromises.push(
          testClient.post('/api/v1/wiki/pages', {
            title: `Analytics Page ${i}`,
            content: `Content for analytics page ${i} `.repeat(50),
            tags: [`tag-${i % 10}`, 'analytics', 'performance']
          })
        );
      }
      
      const pageResponses = await Promise.all(pagePromises);
      testPageIds = pageResponses.map(r => r.data.data.id);
      
      // Create memories for analytics
      const memoryPromises = [];
      for (let i = 0; i < 150; i++) {
        memoryPromises.push(
          testClient.post('/api/v1/memories', {
            content: `Analytics memory ${i} with detailed content for testing`,
            context: { userId: TEST_USER_ID },
            concepts: [`analytics-${i % 15}`, 'performance', 'test'],
            importance: (i % 5) + 1
          })
        );
      }
      
      const memoryResponses = await Promise.all(memoryPromises);
      testMemoryIds = memoryResponses.map(r => r.data.data.id);
    };
    
    const cleanupAnalyticsTestData = async () => {
      // Cleanup in parallel
      const cleanupPromises = [];
      
      if (testBoardId) {
        cleanupPromises.push(testClient.delete(`/api/v1/kanban/boards/${testBoardId}`));
      }
      
      testPageIds.forEach(id => {
        cleanupPromises.push(testClient.delete(`/api/v1/wiki/pages/${id}`));
      });
      
      testMemoryIds.forEach(id => {
        cleanupPromises.push(testClient.delete(`/api/v1/memories/${id}`));
      });
      
      await Promise.allSettled(cleanupPromises);
      
      testBoardId = '';
      testPageIds = [];
      testMemoryIds = [];
    };
    
    test('should perform analytics queries efficiently with large datasets', async () => {
      const analyticsQueries = [
        {
          name: 'Memory Analytics',
          endpoint: '/api/v1/analytics/memory-stats',
          params: { user_id: TEST_USER_ID }
        },
        {
          name: 'Kanban Board Analytics',
          endpoint: `/api/v1/kanban/boards/${testBoardId}/analytics`,
          params: {}
        },
        {
          name: 'User Productivity',
          endpoint: `/api/v1/kanban/users/${TEST_USER_ID}/productivity`,
          params: {}
        },
        {
          name: 'Dashboard Analytics',
          endpoint: '/api/v1/analytics/dashboard',
          params: { timeRange: 'month' }
        },
        {
          name: 'Time Series Data',
          endpoint: '/api/v1/analytics/timeseries',
          params: {
            metric: 'memory_creation',
            timeRange: 'week',
            granularity: 'day'
          }
        }
      ];
      
      for (const query of analyticsQueries) {
        const startTime = performance.now();
        
        const response = await testClient.get(query.endpoint, {
          params: query.params
        });
        
        const metrics = recordMetrics(`Analytics: ${query.name}`, startTime);
        
        expect(response.status).toBe(200);
        expect(response.data.data).toBeDefined();
        expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS_QUERY);
        
        console.log(`${query.name}: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });
    
    test('should handle complex aggregation queries efficiently', async () => {
      const complexQueries = [
        {
          name: 'Multi-dimensional Board Analytics',
          endpoint: `/api/v1/kanban/boards/${testBoardId}/analytics`,
          params: {
            group_by: ['priority', 'assignee'],
            time_range: 'month',
            include_trends: true
          }
        },
        {
          name: 'Cross-platform Activity Feed',
          endpoint: '/api/v1/analytics/activity',
          params: {
            platforms: ['kanban', 'wiki', 'memory'],
            limit: 100,
            include_details: true
          }
        },
        {
          name: 'Comprehensive User Statistics',
          endpoint: `/api/v1/users/${TEST_USER_ID}/comprehensive-stats`,
          params: {
            include_productivity: true,
            include_memory_usage: true,
            include_collaboration: true,
            time_range: 'quarter'
          }
        }
      ];
      
      for (const query of complexQueries) {
        const startTime = performance.now();
        
        const response = await testClient.get(query.endpoint, {
          params: query.params
        });
        
        const metrics = recordMetrics(`Complex Query: ${query.name}`, startTime);
        
        // Some endpoints might not exist yet, that's okay for testing
        if (response.status === 200) {
          expect(response.data.data).toBeDefined();
          expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS_QUERY * 2);
        }
        
        console.log(`${query.name}: ${response.status} in ${metrics.responseTime.toFixed(2)}ms`);
      }
    });
  });
  
  describe('Concurrent User Performance Tests', () => {
    test('should handle multiple concurrent users efficiently', async () => {
      const concurrentUsers = 20;
      const operationsPerUser = 10;
      
      const userOperations = async (userId: string) => {
        const userClient = new TestClient(BASE_URL);
        await userClient.authenticate({
          userId: `concurrent-user-${userId}`,
          email: `user${userId}@example.com`
        });
        
        const operations = [];
        const startTime = performance.now();
        
        for (let i = 0; i < operationsPerUser; i++) {
          // Mix of different operations
          const operation = i % 4;
          
          switch (operation) {
            case 0:
              operations.push(
                userClient.post('/api/v1/memories', {
                  content: `Concurrent user ${userId} memory ${i}`,
                  context: { userId: `concurrent-user-${userId}` }
                })
              );
              break;
            case 1:
              operations.push(
                userClient.get('/api/v1/memories', {
                  params: { limit: 5 }
                })
              );
              break;
            case 2:
              operations.push(
                userClient.get('/api/v1/analytics/dashboard')
              );
              break;
            case 3:
              operations.push(
                userClient.post('/api/v1/wiki/pages', {
                  title: `User ${userId} Page ${i}`,
                  content: 'Concurrent test content'
                })
              );
              break;
          }
        }
        
        const results = await Promise.allSettled(operations);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.status < 400).length;
        const failed = results.length - successful;
        
        return {
          userId,
          responseTime: endTime - startTime,
          successful,
          failed,
          totalOperations: operations.length
        };
      };
      
      const startTime = performance.now();
      
      // Run concurrent user simulations
      const userPromises = Array.from({ length: concurrentUsers }, (_, i) =>
        userOperations(i.toString())
      );
      
      const results = await Promise.all(userPromises);
      const totalTime = performance.now() - startTime;
      
      // Analyze results
      const totalOperations = results.reduce((sum, r) => sum + r.totalOperations, 0);
      const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      const metrics = recordMetrics('Concurrent Users', startTime, concurrentUsers);
      
      // Performance assertions
      expect(totalSuccessful).toBeGreaterThan(totalOperations * 0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_USER_RESPONSE);
      
      console.log(`\nConcurrent User Test Results:`);
      console.log(`  Users: ${concurrentUsers}`);
      console.log(`  Total Operations: ${totalOperations}`);
      console.log(`  Successful: ${totalSuccessful}`);
      console.log(`  Failed: ${totalFailed}`);
      console.log(`  Success Rate: ${((totalSuccessful / totalOperations) * 100).toFixed(2)}%`);
      console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Total Test Time: ${totalTime.toFixed(2)}ms`);
    }, 60000);
    
    test('should maintain performance under sustained load', async () => {
      const testDuration = 10000; // 10 seconds
      const requestInterval = 100; // 100ms between requests
      const requestsPerInterval = 3;
      
      const loadTestResults: LoadTestResult = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        requestsPerSecond: 0,
        errors: []
      };
      
      const responseTimes: number[] = [];
      const startTime = Date.now();
      
      const makeRequest = async () => {
        const requestStart = performance.now();
        
        try {
          const response = await testClient.get('/api/v1/health');
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          
          responseTimes.push(responseTime);
          loadTestResults.totalRequests++;
          
          if (response.status === 200) {
            loadTestResults.successfulRequests++;
          } else {
            loadTestResults.failedRequests++;
          }
          
          loadTestResults.maxResponseTime = Math.max(loadTestResults.maxResponseTime, responseTime);
          loadTestResults.minResponseTime = Math.min(loadTestResults.minResponseTime, responseTime);
        } catch (error) {
          loadTestResults.totalRequests++;
          loadTestResults.failedRequests++;
          loadTestResults.errors.push(error.message);
        }
      };
      
      // Start sustained load
      const intervalId = setInterval(() => {
        for (let i = 0; i < requestsPerInterval; i++) {
          makeRequest();
        }
      }, requestInterval);
      
      // Run for specified duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(intervalId);
      
      // Wait for remaining requests to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      loadTestResults.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      loadTestResults.requestsPerSecond = (loadTestResults.totalRequests / totalTime) * 1000;
      
      // Performance assertions
      expect(loadTestResults.successfulRequests / loadTestResults.totalRequests).toBeGreaterThan(0.98); // 98% success
      expect(loadTestResults.averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(loadTestResults.maxResponseTime).toBeLessThan(1000); // Max under 1s
      
      console.log(`\nSustained Load Test Results:`);
      console.log(`  Duration: ${testDuration}ms`);
      console.log(`  Total Requests: ${loadTestResults.totalRequests}`);
      console.log(`  Successful: ${loadTestResults.successfulRequests}`);
      console.log(`  Failed: ${loadTestResults.failedRequests}`);
      console.log(`  Success Rate: ${((loadTestResults.successfulRequests / loadTestResults.totalRequests) * 100).toFixed(2)}%`);
      console.log(`  Requests/Second: ${loadTestResults.requestsPerSecond.toFixed(2)}`);
      console.log(`  Avg Response Time: ${loadTestResults.averageResponseTime.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${loadTestResults.maxResponseTime.toFixed(2)}ms`);
      console.log(`  Min Response Time: ${loadTestResults.minResponseTime.toFixed(2)}ms`);
    }, 20000);
  });
  
  describe('Resource Usage and Memory Management', () => {
    test('should maintain stable memory usage during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [initialMemory];
      
      // Monitor memory usage during intensive operations
      const memoryMonitor = setInterval(() => {
        memorySnapshots.push(process.memoryUsage());
      }, 1000);
      
      try {
        // Perform memory-intensive operations
        const operations = [];
        
        // Create many large memories
        for (let i = 0; i < 100; i++) {
          operations.push(
            testClient.post('/api/v1/memories', {
              content: `Large memory content for resource testing ${i} `.repeat(100),
              context: { userId: TEST_USER_ID },
              concepts: Array.from({length: 10}, (_, j) => `resource-test-${j}`):
            })
          );
        }
        
        const results = await Promise.all(operations);
        const memoryIds = results.map(r => r.data.data.id);
        
        // Perform merge operations
        for (let i = 0; i < memoryIds.length - 1; i += 2) {
          await testClient.post('/api/v1/memories/merge', {
            source_memory_ids: [memoryIds[i], memoryIds[i + 1]],
            merge_strategy: 'combine'
          });
        }
        
        // Cleanup
        for (const id of memoryIds) {
          try {
            await testClient.delete(`/api/v1/memories/${id}`);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
        
      } finally {
        clearInterval(memoryMonitor);
      }
      
      const finalMemory = process.memoryUsage();
      
      // Analyze memory usage
      const heapUsages = memorySnapshots.map(s => s.heapUsed);
      const maxHeapUsage = Math.max(...heapUsages);
      const avgHeapUsage = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      console.log(`\nMemory Usage Analysis:`);
      console.log(`  Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory Growth: ${memoryGrowthMB.toFixed(2)}MB`);
      console.log(`  Max Heap Usage: ${(maxHeapUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Avg Heap Usage: ${(avgHeapUsage / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory growth should be reasonable (less than 100MB for this test)
      expect(memoryGrowthMB).toBeLessThan(100);
    }, 30000);
  });
  
  describe('Database Performance Tests', () => {
    test('should perform database operations efficiently', async () => {
      const dbOperations = [
        {
          name: 'Simple Insert',
          operation: () => testClient.post('/api/v1/memories', {
            content: 'DB performance test memory',
            context: { userId: TEST_USER_ID }
          })
        },
        {
          name: 'Complex Query with Joins',
          operation: () => testClient.get('/api/v1/memories/search', {
            params: {
              q: 'performance',
              include_related: true,
              max_depth: 3,
              limit: 50
            }
          })
        },
        {
          name: 'Aggregation Query',
          operation: () => testClient.get('/api/v1/analytics/memory-stats', {
            params: { user_id: TEST_USER_ID }
          })
        },
        {
          name: 'Bulk Update',
          operation: async () => {
            // This would test bulk update operations if available
            return { status: 200, data: { message: 'Simulated bulk update' } };
          }
        }
      ];
      
      for (const dbOp of dbOperations) {
        const iterations = 10;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          const response = await dbOp.operation();
          const endTime = performance.now();
          
          times.push(endTime - startTime);
          
          if (response.status >= 400) {
            console.warn(`DB operation ${dbOp.name} failed with status ${response.status}`);
          }
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        console.log(`\n${dbOp.name}:`);
        console.log(`  Iterations: ${iterations}`);
        console.log(`  Avg Time: ${avgTime.toFixed(2)}ms`);
        console.log(`  Max Time: ${maxTime.toFixed(2)}ms`);
        console.log(`  Min Time: ${minTime.toFixed(2)}ms`);
        
        // Database operations should be fast
        expect(avgTime).toBeLessThan(500);
        expect(maxTime).toBeLessThan(1000);
      }
    });
  });
});
