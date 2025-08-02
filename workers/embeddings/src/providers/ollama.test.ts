/**
 * Tests for Ollama concurrent batch processing
 */

import { OllamaEmbeddingProvider, OllamaConfig } from './ollama.js';
import { EmbeddingProviderError } from '../types.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('OllamaEmbeddingProvider', () => {
  let provider: OllamaEmbeddingProvider;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new OllamaEmbeddingProvider('http://localhost:11434', 'nomic-embed-text');
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const metrics = provider.getPerformanceMetrics();
      expect(metrics.concurrency).toBe(3);
      expect(metrics.batchSize).toBe(10);
      expect(metrics.maxMemoryUsage).toBe(512 * 1024 * 1024);
    });

    it('should apply custom configuration', () => {
      const config: OllamaConfig = {
        concurrency: 5,
        batchSize: 20,
        retryAttempts: 5,
        retryDelay: 2000,
        maxMemoryUsage: 1024 * 1024 * 1024
      };
      
      const customProvider = new OllamaEmbeddingProvider(
        'http://localhost:11434',
        'nomic-embed-text',
        config
      );
      
      const metrics = customProvider.getPerformanceMetrics();
      expect(metrics.concurrency).toBe(5);
      expect(metrics.batchSize).toBe(20);
      expect(metrics.maxMemoryUsage).toBe(1024 * 1024 * 1024);
    });

    it('should limit concurrency to maximum of 10', () => {
      const config: OllamaConfig = { concurrency: 15 };
      const customProvider = new OllamaEmbeddingProvider(
        'http://localhost:11434',
        'nomic-embed-text',
        config
      );
      
      const metrics = customProvider.getPerformanceMetrics();
      expect(metrics.concurrency).toBe(10);
    });

    it('should update configuration at runtime', () => {
      provider.updateConfig({ concurrency: 6, batchSize: 15 });
      
      const metrics = provider.getPerformanceMetrics();
      expect(metrics.concurrency).toBe(6);
      expect(metrics.batchSize).toBe(15);
    });
  });

  describe('Single embedding generation', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      } as Response);

      const result = await provider.generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding })
        } as Response);

      const result = await provider.generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(provider.generateEmbedding('test text'))
        .rejects.toThrow('Network error');
      
      // Default retry attempts is 3, so 4 total calls (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should handle empty text', async () => {
      const result = await provider.generateEmbedding('');
      expect(result).toEqual(new Array(768).fill(0));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Batch processing', () => {
    beforeEach(() => {
      // Mock successful responses for batch processing
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      } as Response));
    });

    it('should process batch with default concurrency', async () => {
      const texts = ['text1', 'text2', 'text3', 'text4', 'text5'];
      const startTime = Date.now();
      
      const results = await provider.generateEmbeddingsBatch(texts);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      expect(results[0]).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(mockFetch).toHaveBeenCalledTimes(5);
      
      // Should complete faster than sequential processing due to concurrency
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should be much faster than 5 seconds
    });

    it('should handle large batches with chunking', async () => {
      // Create a batch larger than the default batch size (10)
      const texts = Array.from({ length: 25 }, (_, i) => `text${i + 1}`);
      
      const results = await provider.generateEmbeddingsBatch(texts);
      
      expect(results).toHaveLength(25);
      expect(mockFetch).toHaveBeenCalledTimes(25);
    });

    it('should handle empty batch', async () => {
      const results = await provider.generateEmbeddingsBatch([]);
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should process concurrent requests within limit', async () => {
      const texts = ['text1', 'text2', 'text3', 'text4', 'text5', 'text6'];
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;
      
      mockFetch.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentCalls--;
        return {
          ok: true,
          json: async () => ({ embedding: [0.1, 0.2, 0.3, 0.4] })
        } as Response;
      });
      
      await provider.generateEmbeddingsBatch(texts);
      
      // Should not exceed concurrency limit
      expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
    });

    it('should handle partial failures in batch', async () => {
      const texts = ['text1', 'text2', 'text3'];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [0.1, 0.2, 0.3, 0.4] })
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: [0.5, 0.6, 0.7, 0.8] })
        } as Response);

      // Should throw on the failed request
      await expect(provider.generateEmbeddingsBatch(texts))
        .rejects.toThrow();
    });
  });

  describe('Performance metrics', () => {
    it('should track memory usage', () => {
      const initialMetrics = provider.getPerformanceMetrics();
      expect(initialMetrics.memoryUsage).toBe(0);
      expect(initialMetrics.memoryUtilization).toBe(0);
    });

    it('should report performance metrics correctly', () => {
      const metrics = provider.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('concurrency');
      expect(metrics).toHaveProperty('batchSize');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('maxMemoryUsage');
      expect(metrics).toHaveProperty('memoryUtilization');
      
      expect(typeof metrics.concurrency).toBe('number');
      expect(typeof metrics.batchSize).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.maxMemoryUsage).toBe('number');
      expect(typeof metrics.memoryUtilization).toBe('number');
    });
  });

  describe('Health check', () => {
    it('should perform health check successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'llama2' }
          ]
        })
      } as Response);

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should fail health check when model not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'other-model' }
          ]
        })
      } as Response);

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should handle health check network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(provider.generateEmbedding('test'))
        .rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalidResponse: true })
      } as Response);

      await expect(provider.generateEmbedding('test'))
        .rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle dimension mismatch', async () => {
      // First call to establish dimension
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2, 0.3, 0.4] })
      } as Response);

      await provider.generateEmbedding('test1');

      // Second call with different dimension
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2] })
      } as Response);

      await expect(provider.generateEmbedding('test2'))
        .rejects.toThrow(EmbeddingProviderError);
    });
  });
});