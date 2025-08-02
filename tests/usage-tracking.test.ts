/**
 * Tests for usage tracking functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAIEmbeddingProvider } from '../workers/embeddings/src/providers/openai.js';
import { UsageTracker } from '../workers/embeddings/src/services/usageTracker.js';
import fs from 'fs';
import path from 'path';

// Mock OpenAI client to avoid real API calls in tests
const mockOpenAIClient = {
  embeddings: {
    create: async (params: any) => {
      // Mock response based on input
      const inputTexts = Array.isArray(params.input) ? params.input : [params.input];
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      
      return {
        data: inputTexts.map((text: string, index: number) => ({
          index,
          embedding: mockEmbedding
        })),
        usage: {
          total_tokens: inputTexts.reduce((total: number, text: string) => total + Math.ceil(text.length / 4), 0)
        }
      };
    }
  }
};

// Mock the OpenAI import
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = mockOpenAIClient.embeddings;
    }
  };
});

describe('Usage Tracking', () => {
  let usageTracker: UsageTracker;
  let provider: OpenAIEmbeddingProvider;
  const testDbPath = path.join(__dirname, 'test-usage.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    usageTracker = new UsageTracker(testDbPath);
    provider = new OpenAIEmbeddingProvider('test-api-key', 'text-embedding-3-small', usageTracker);
  });

  afterEach(async () => {
    await usageTracker.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Basic Usage Tracking', () => {
    it('should track individual embedding requests', async () => {
      const testText = 'This is a test text for embedding generation';
      await provider.generateEmbedding(testText);

      const stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(1);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('should track batch embedding requests', async () => {
      const testTexts = [
        'First test text',
        'Second test text',
        'Third test text'
      ];
      
      await provider.generateEmbeddingsBatch(testTexts);

      const stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(1); // One batch call
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('should accumulate usage across multiple calls', async () => {
      await provider.generateEmbedding('First text');
      await provider.generateEmbedding('Second text');
      await provider.generateEmbedding('Third text');

      const stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(3);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly for text-embedding-3-small', async () => {
      const testText = 'This is a test text';
      await provider.generateEmbedding(testText);

      const cost = provider.getCostEstimate();
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be very small for short text
    });

    it('should track different costs for different models', async () => {
      const smallProvider = new OpenAIEmbeddingProvider('test-key', 'text-embedding-3-small', usageTracker);
      const largeProvider = new OpenAIEmbeddingProvider('test-key', 'text-embedding-3-large', usageTracker);

      const testText = 'Same test text';
      
      await Promise.all([
        smallProvider.generateEmbedding(testText),
        largeProvider.generateEmbedding(testText)
      ]);

      const smallCost = smallProvider.getCostEstimate();
      const largeCost = largeProvider.getCostEstimate();

      // Large model should be more expensive
      expect(largeCost).toBeGreaterThan(smallCost);
    });
  });

  describe('Database Persistence', () => {
    it('should persist usage data to database', async () => {
      await usageTracker.trackUsage('test-service', 'test-operation', 100, 0.002);

      const stats = await usageTracker.getUsageStats('test-service');
      expect(stats.totalTokens).toBe(100);
      expect(stats.totalCost).toBe(0.002);
      expect(stats.apiCalls).toBe(1);
    });

    it('should retrieve usage stats by service', async () => {
      await usageTracker.trackUsage('service-a', 'operation1', 50, 0.001);
      await usageTracker.trackUsage('service-a', 'operation2', 75, 0.0015);
      await usageTracker.trackUsage('service-b', 'operation1', 100, 0.002);

      const serviceAStats = await usageTracker.getUsageStats('service-a');
      const serviceBStats = await usageTracker.getUsageStats('service-b');

      expect(serviceAStats.totalTokens).toBe(125);
      expect(serviceAStats.totalCost).toBe(0.0025);
      expect(serviceAStats.apiCalls).toBe(2);

      expect(serviceBStats.totalTokens).toBe(100);
      expect(serviceBStats.totalCost).toBe(0.002);
      expect(serviceBStats.apiCalls).toBe(1);
    });

    it('should get service breakdown', async () => {
      await usageTracker.trackUsage('openai-small', 'embedding', 100, 0.002);
      await usageTracker.trackUsage('openai-large', 'embedding', 50, 0.0065);
      await usageTracker.trackUsage('openai-small', 'embedding', 75, 0.0015);

      const breakdown = await usageTracker.getServiceBreakdown();
      
      expect(breakdown).toHaveLength(2);
      
      // Should be sorted by cost (descending)
      expect(breakdown[0].service).toBe('openai-large');
      expect(breakdown[0].totalCost).toBe(0.0065);
      
      expect(breakdown[1].service).toBe('openai-small');
      expect(breakdown[1].totalCost).toBe(0.0035);
      expect(breakdown[1].totalTokens).toBe(175);
    });
  });

  describe('Time-based Filtering', () => {
    it('should filter usage by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      await usageTracker.trackUsage('test-service', 'old-operation', 50, 0.001);
      
      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await usageTracker.trackUsage('test-service', 'new-operation', 100, 0.002);

      const recentUsage = await usageTracker.getRecentUsage(24); // Last 24 hours
      expect(recentUsage.length).toBeGreaterThanOrEqual(2);
      
      // Should be sorted by timestamp (descending)
      expect(recentUsage[0].operation).toBe('new-operation');
      expect(recentUsage[1].operation).toBe('old-operation');
    });

    it('should get stats since specific date', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      await usageTracker.trackUsage('test-service', 'operation', 100, 0.002);
      
      const stats = await usageTracker.getUsageStats('test-service', yesterday);
      expect(stats.totalTokens).toBe(100);
      expect(stats.apiCalls).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty text gracefully', async () => {
      const embedding = await provider.generateEmbedding('');
      expect(embedding).toHaveLength(1536);
      expect(embedding.every(val => val === 0)).toBe(true);
      
      // Should not track usage for empty text
      const stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });

    it('should handle whitespace-only text gracefully', async () => {
      const embedding = await provider.generateEmbedding('   \n\t   ');
      expect(embedding).toHaveLength(1536);
      expect(embedding.every(val => val === 0)).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    it('should not track usage for cached results', async () => {
      const testText = 'This text will be cached';
      
      // First call should track usage
      await provider.generateEmbedding(testText);
      const statsAfterFirst = provider.getUsageStats();
      
      // Second call should use cache and not track additional usage
      await provider.generateEmbedding(testText);
      const statsAfterSecond = provider.getUsageStats();
      
      expect(statsAfterSecond.apiCalls).toBe(statsAfterFirst.apiCalls);
      expect(statsAfterSecond.totalTokens).toBe(statsAfterFirst.totalTokens);
    });
  });

  describe('Usage Stats Reset', () => {
    it('should reset usage statistics', async () => {
      await provider.generateEmbedding('Test text');
      
      let stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(1);
      expect(stats.totalTokens).toBeGreaterThan(0);
      
      provider.resetUsageStats();
      
      stats = provider.getUsageStats();
      expect(stats.apiCalls).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });
  });
});