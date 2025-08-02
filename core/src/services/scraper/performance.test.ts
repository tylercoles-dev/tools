/**
 * Tests for Scraper Performance Metrics System
 */

import { ScraperDatabaseManager } from './database.js';
import { ScraperService } from './service.js';
import { ScrapingEngine } from './engine.js';
import { createDatabaseConfig } from '../../utils/database.js';

// Mock the external dependencies
jest.mock('./engine.js');

// Mock crypto with unique IDs
let idCounter = 0;
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => `test-uuid-${++idCounter}`)
}));

describe('Scraper Performance Metrics', () => {
  let databaseManager: ScraperDatabaseManager;
  let scraperService: ScraperService;
  let mockEngine: jest.Mocked<ScrapingEngine>;

  beforeEach(async () => {
    // Reset the ID counter for each test
    idCounter = 0;
    
    // Use in-memory SQLite for testing
    const config = createDatabaseConfig({
      type: 'sqlite',
      filename: ':memory:'
    });
    
    databaseManager = new ScraperDatabaseManager(config);
    await databaseManager.initialize();
    
    mockEngine = new ScrapingEngine() as jest.Mocked<ScrapingEngine>;
    scraperService = new ScraperService(databaseManager, mockEngine);
  });

  afterEach(async () => {
    await databaseManager.close();
  });

  describe('Performance Metrics Database Operations', () => {
    it('should create performance metric record', async () => {
      const metric = {
        url: 'https://example.com',
        domain: 'example.com',
        processing_time_ms: 1500,
        content_size_bytes: 5000,
        status_code: 200,
        error_message: null,
        timestamp: new Date().toISOString()
      };

      const result = await databaseManager.createPerformanceMetric(metric);

      expect(result).toMatchObject({
        ...metric,
        id: expect.any(String)
      });
    });

    it('should retrieve performance metrics with filters', async () => {
      // Create test data
      const metrics = [
        {
          url: 'https://example.com/page1',
          domain: 'example.com',
          processing_time_ms: 1500,
          content_size_bytes: 5000,
          status_code: 200,
          error_message: null,
          timestamp: new Date().toISOString()
        },
        {
          url: 'https://test.com/page1',
          domain: 'test.com',
          processing_time_ms: 2000,
          content_size_bytes: 7000,
          status_code: 200,
          error_message: null,
          timestamp: new Date().toISOString()
        }
      ];

      for (const metric of metrics) {
        await databaseManager.createPerformanceMetric(metric);
      }

      // Test filtering by domain
      const exampleMetrics = await databaseManager.getPerformanceMetrics({
        domain: 'example.com'
      });

      expect(exampleMetrics).toHaveLength(1);
      expect(exampleMetrics[0].domain).toBe('example.com');

      // Test limit
      const limitedMetrics = await databaseManager.getPerformanceMetrics({
        limit: 1
      });

      expect(limitedMetrics).toHaveLength(1);
    });

    it('should calculate average processing time', async () => {
      // Create test metrics with known processing times
      const baseTime = new Date();
      const metrics = [
        {
          url: 'https://example.com/1',
          domain: 'example.com',
          processing_time_ms: 1000,
          content_size_bytes: 5000,
          status_code: 200,
          error_message: null,
          timestamp: new Date(baseTime.getTime() - 1000).toISOString()
        },
        {
          url: 'https://example.com/2',
          domain: 'example.com',
          processing_time_ms: 2000,
          content_size_bytes: 6000,
          status_code: 200,
          error_message: null,
          timestamp: new Date(baseTime.getTime() - 500).toISOString()
        },
        {
          url: 'https://example.com/3',
          domain: 'example.com',
          processing_time_ms: 3000,
          content_size_bytes: 7000,
          status_code: 200,
          error_message: null,
          timestamp: baseTime.toISOString()
        }
      ];

      for (const metric of metrics) {
        await databaseManager.createPerformanceMetric(metric);
      }

      const avgTime = await databaseManager.getAverageProcessingTime('24h');
      expect(avgTime).toBe(2000); // (1000 + 2000 + 3000) / 3
    });

    it('should exclude failed requests from average calculation', async () => {
      const baseTime = new Date();
      const metrics = [
        {
          url: 'https://example.com/1',
          domain: 'example.com',
          processing_time_ms: 1000,
          content_size_bytes: 5000,
          status_code: 200,
          error_message: null,
          timestamp: baseTime.toISOString()
        },
        {
          url: 'https://example.com/2',
          domain: 'example.com',
          processing_time_ms: 5000,
          content_size_bytes: null,
          status_code: null,
          error_message: 'Network error',
          timestamp: baseTime.toISOString()
        }
      ];

      for (const metric of metrics) {
        await databaseManager.createPerformanceMetric(metric);
      }

      const avgTime = await databaseManager.getAverageProcessingTime('24h');
      expect(avgTime).toBe(1000); // Only successful request counted
    });

    it('should get domain performance statistics', async () => {
      const baseTime = new Date();
      const metrics = [
        {
          url: 'https://example.com/1',
          domain: 'example.com',
          processing_time_ms: 1000,
          content_size_bytes: 5000,
          status_code: 200,
          error_message: null,
          timestamp: baseTime.toISOString()
        },
        {
          url: 'https://example.com/2',
          domain: 'example.com',
          processing_time_ms: 2000,
          content_size_bytes: 6000,
          status_code: 200,
          error_message: null,
          timestamp: baseTime.toISOString()
        },
        {
          url: 'https://example.com/3',
          domain: 'example.com',
          processing_time_ms: 3000,
          content_size_bytes: null,
          status_code: null,
          error_message: 'Timeout',
          timestamp: baseTime.toISOString()
        }
      ];

      for (const metric of metrics) {
        await databaseManager.createPerformanceMetric(metric);
      }

      const stats = await databaseManager.getDomainPerformanceStats('example.com', '24h');

      expect(stats).toMatchObject({
        avgProcessingTime: 1500, // (1000 + 2000) / 2 - only successful requests
        successRate: expect.closeTo(66.67, 1), // 2/3 * 100
        totalRequests: 3,
        avgContentSize: 5500 // (5000 + 6000) / 2
      });
    });

    it('should get performance trends', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const metrics = [
        {
          url: 'https://example.com/1',
          domain: 'example.com',
          processing_time_ms: 1000,
          content_size_bytes: 5000,
          status_code: 200,
          error_message: null,
          timestamp: yesterday.toISOString()
        },
        {
          url: 'https://example.com/2',
          domain: 'example.com',
          processing_time_ms: 2000,
          content_size_bytes: 6000,
          status_code: 200,
          error_message: null,
          timestamp: today.toISOString()
        }
      ];

      for (const metric of metrics) {
        await databaseManager.createPerformanceMetric(metric);
      }

      const trends = await databaseManager.getPerformanceTrends('7d');

      expect(trends).toHaveLength(2);
      expect(trends[0]).toMatchObject({
        date: expect.any(String),
        avgProcessingTime: expect.any(Number),
        requestCount: expect.any(Number),
        successRate: expect.any(Number)
      });
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      // Mock successful scraping
      mockEngine.scrapeUrl.mockResolvedValue({
        id: 'test-id',
        url: 'https://example.com',
        title: 'Test Page',
        content: 'Test content',
        contentHash: 'hash123',
        metadata: {
          description: 'Test description',
          wordCount: 10,
          readingTime: 1
        },
        scrapedAt: new Date().toISOString(),
        status: 'success'
      });
    });

    it('should track performance metrics during scraping', async () => {
      const result = await scraperService.scrapeUrl({
        url: 'https://example.com'
      });

      expect(result).toBeDefined();

      // Verify that performance metrics were recorded
      const metrics = await databaseManager.getPerformanceMetrics({
        domain: 'example.com'
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        url: 'https://example.com',
        domain: 'example.com',
        processing_time_ms: expect.any(Number),
        content_size_bytes: expect.any(Number)
      });
    });

    it('should track failed scraping attempts', async () => {
      mockEngine.scrapeUrl.mockRejectedValue(new Error('Network timeout'));

      await expect(scraperService.scrapeUrl({
        url: 'https://example.com'
      })).rejects.toThrow('Network timeout');

      // Verify that failed metrics were recorded
      const metrics = await databaseManager.getPerformanceMetrics({
        domain: 'example.com'
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        url: 'https://example.com',
        domain: 'example.com',
        processing_time_ms: expect.any(Number),
        content_size_bytes: null,
        error_message: 'Network timeout'
      });
    });

    it('should use real performance data in stats', async () => {
      // Generate some performance data
      await scraperService.scrapeUrl({ url: 'https://example.com/1' });
      await scraperService.scrapeUrl({ url: 'https://example.com/2' });

      const stats = await scraperService.getStats();

      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).not.toBe(5000); // Should not be the hardcoded fallback
    });

    it('should provide detailed stats with timeframes', async () => {
      // Generate some performance data
      await scraperService.scrapeUrl({ url: 'https://example.com/1' });
      await scraperService.scrapeUrl({ url: 'https://test.com/1' });

      const detailedStats = await scraperService.getDetailedStats('24h');

      expect(detailedStats).toMatchObject({
        totalPages: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        topDomains: expect.any(Array),
        performanceTrends: expect.any(Array),
        timeframe: '24h'
      });

      expect(detailedStats.performanceTrends.length).toBeGreaterThan(0);
    });

    it('should get performance metrics for specific domain', async () => {
      await scraperService.scrapeUrl({ url: 'https://example.com/1' });
      await scraperService.scrapeUrl({ url: 'https://example.com/2' });
      await scraperService.scrapeUrl({ url: 'https://test.com/1' });

      const exampleStats = await scraperService.getDomainPerformanceStats('example.com', '24h');

      expect(exampleStats).toMatchObject({
        avgProcessingTime: expect.any(Number),
        successRate: expect.any(Number),
        totalRequests: 2,
        avgContentSize: expect.any(Number)
      });
    });
  });

  describe('URL Domain Extraction', () => {
    it('should extract domain correctly from valid URLs', async () => {
      const testCases = [
        { url: 'https://example.com/path', expected: 'example.com' },
        { url: 'http://subdomain.example.com', expected: 'subdomain.example.com' },
        { url: 'https://example.co.uk/path?query=1', expected: 'example.co.uk' }
      ];

      for (const testCase of testCases) {
        await scraperService.scrapeUrl({ url: testCase.url });
        
        const metrics = await databaseManager.getPerformanceMetrics({
          domain: testCase.expected
        });

        expect(metrics.length).toBeGreaterThan(0);
        expect(metrics[0].domain).toBe(testCase.expected);
      }
    });

    it('should handle malformed URLs gracefully', async () => {
      mockEngine.scrapeUrl.mockResolvedValue({
        id: 'test-id',
        url: 'not-a-valid-url',
        title: 'Test Page',
        content: 'Test content',
        contentHash: 'hash123',
        metadata: {
          description: 'Test description',
          wordCount: 10,
          readingTime: 1
        },
        scrapedAt: new Date().toISOString(),
        status: 'success'
      });

      await scraperService.scrapeUrl({ url: 'not-a-valid-url' });

      const metrics = await databaseManager.getPerformanceMetrics({
        domain: 'unknown'
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].domain).toBe('unknown');
    });
  });

  describe('Database Health Check', () => {
    it('should perform database health check', async () => {
      const healthCheck = await databaseManager.healthCheck();

      expect(healthCheck).toMatchObject({
        isHealthy: true,
        latency: expect.any(Number),
        timestamp: expect.any(String)
      });

      expect(healthCheck.latency).toBeGreaterThanOrEqual(0);
    });
  });
});