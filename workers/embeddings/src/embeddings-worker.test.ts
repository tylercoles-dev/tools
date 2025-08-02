/**
 * Embeddings Worker Unit Tests
 * 
 * Comprehensive test suite for the Embeddings worker and providers
 */

import { EmbeddingsWorker } from './worker.js';
import { OpenAIEmbeddingProvider } from './providers/openai.js';
import { OllamaEmbeddingProvider } from './providers/ollama.js';
import { BaseEmbeddingProvider } from './providers/base.js';
import { EmbeddingProviderError } from './types.js';
import { createEmbeddingProvider } from './providers/index.js';

// Mock external dependencies
jest.mock('nats');
jest.mock('winston');
jest.mock('openai');

// Mock fetch for Ollama provider tests
global.fetch = jest.fn();

// Mock configuration
const mockConfig = {
  embeddingProvider: 'openai' as const,
  openaiApiKey: 'test-api-key',
  openaiModel: 'text-embedding-3-small' as const,
  natsUrl: 'nats://localhost:4222',
  logLevel: 'info' as const,
  healthCheckInterval: 30000,
  workerId: 'test-worker',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'nomic-embed-text:latest',
  batchSize: 32,
  maxRetries: 3,
  qdrantUrl: 'http://localhost:6333',
  collectionName: 'memories',
  requestTimeout: 30000
};

describe('Embeddings Worker', () => {
  describe('EmbeddingsWorker', () => {
    let worker: EmbeddingsWorker;
    let mockNatsConnection: any;
    let mockProvider: any;

    beforeEach(() => {
      // Mock NATS connection
      mockNatsConnection = {
        subscribe: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: jest.fn().mockReturnValue({
            next: jest.fn().mockResolvedValue({ done: true })
          })
        }),
        isClosed: jest.fn().mockReturnValue(false),
        drain: jest.fn(),
        close: jest.fn()
      };

      // Mock the NATS connect function
      const { connect } = require('nats');
      connect.mockResolvedValue(mockNatsConnection);

      // Mock embedding provider
      mockProvider = {
        generateEmbedding: jest.fn(),
        getModelName: jest.fn().mockReturnValue('text-embedding-3-small'),
        getDimension: jest.fn().mockReturnValue(1536)
      };

      // Mock the provider factory
      jest.doMock('./providers/index.js', () => ({
        createEmbeddingProvider: jest.fn().mockReturnValue(mockProvider)
      }));

      worker = new EmbeddingsWorker(mockConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('initialization', () => {
      it('should create worker with valid config', () => {
        expect(worker).toBeInstanceOf(EmbeddingsWorker);
      });

      it('should test embedding provider on start', async () => {
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

        await worker.start();

        expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('test');
      });

      it('should handle provider test failure', async () => {
        mockProvider.generateEmbedding.mockRejectedValue(new Error('Provider failed'));

        await expect(worker.start()).rejects.toThrow(EmbeddingProviderError);
      });

      it('should connect to NATS', async () => {
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

        await worker.start();

        const { connect } = require('nats');
        expect(connect).toHaveBeenCalledWith({
          servers: mockConfig.natsUrl,
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 1000
        });
      });

      it('should set up message subscriptions', async () => {
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

        await worker.start();

        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('embeddings.request', {
          queue: 'embeddings-workers'
        });
        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('embeddings.batch', {
          queue: 'embeddings-workers'
        });
        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('embeddings.stats');
      });
    });

    describe('message handling', () => {
      beforeEach(async () => {
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        await worker.start();
      });

      it('should handle single embedding request', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            request_id: 'req-123',
            text: 'test text'
          })),
          respond: jest.fn(),
          subject: 'embeddings.request'
        };

        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

        // Access the private method for testing
        await (worker as any).handleEmbeddingRequest(mockMsg);

        expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('test text');
        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded response
        );
      });

      it('should handle batch embedding request', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            batch_id: 'batch-123',
            requests: [
              { request_id: 'req-1', text: 'text 1' },
              { request_id: 'req-2', text: 'text 2' }
            ]
          })),
          respond: jest.fn(),
          subject: 'embeddings.batch'
        };

        mockProvider.generateEmbeddingsBatch = jest.fn().mockResolvedValue([
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6]
        ]);

        await (worker as any).handleBatchRequest(mockMsg);

        expect(mockProvider.generateEmbeddingsBatch).toHaveBeenCalledWith(['text 1', 'text 2']);
        expect(mockMsg.respond).toHaveBeenCalled();
      });

      it('should handle stats request', async () => {
        const mockMsg = {
          respond: jest.fn()
        };

        await (worker as any).handleStatsRequest(mockMsg);

        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded stats
        );
      });

      it('should handle embedding request errors', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            request_id: 'req-123',
            text: 'test text'
          })),
          respond: jest.fn(),
          subject: 'embeddings.request'
        };

        mockProvider.generateEmbedding.mockRejectedValue(new Error('API error'));

        await (worker as any).handleEmbeddingRequest(mockMsg);

        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded error response
        );
      });
    });

    describe('shutdown', () => {
      it('should stop gracefully', async () => {
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        await worker.start();

        await worker.stop();

        expect(mockNatsConnection.close).toHaveBeenCalled();
      });
    });
  });

  describe('OpenAIEmbeddingProvider', () => {
    let provider: OpenAIEmbeddingProvider;
    let mockOpenAI: any;

    beforeEach(() => {
      // Mock OpenAI client
      mockOpenAI = {
        embeddings: {
          create: jest.fn()
        }
      };

      // Mock OpenAI constructor
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => mockOpenAI);

      provider = new OpenAIEmbeddingProvider('test-api-key', 'text-embedding-3-small');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize with correct model dimensions', () => {
      expect(provider.getDimension()).toBe(1536);
      expect(provider.getModelName()).toBe('text-embedding-3-small');
    });

    it('should throw error for unknown model', () => {
      expect(() => {
        new OpenAIEmbeddingProvider('test-key', 'unknown-model');
      }).toThrow(EmbeddingProviderError);
    });

    it('should generate single embedding', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await provider.generateEmbedding('test text');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
        encoding_format: 'float'
      });
      expect(result).toEqual(mockEmbedding);
    });

    it('should return zero vector for empty text', async () => {
      const result = await provider.generateEmbedding('');

      expect(result).toEqual(new Array(1536).fill(0));
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should use cache for repeated requests', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      await provider.generateEmbedding('test text');
      await provider.generateEmbedding('test text');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
    });

    it('should generate batch embeddings', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbeddings[0], index: 0 },
          { embedding: mockEmbeddings[1], index: 1 }
        ]
      });

      const result = await provider.generateEmbeddingsBatch(['text 1', 'text 2']);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text 1', 'text 2'],
        encoding_format: 'float'
      });
      expect(result).toEqual(mockEmbeddings);
    });

    it('should handle empty batch', async () => {
      const result = await provider.generateEmbeddingsBatch([]);

      expect(result).toEqual([]);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should handle OpenAI API errors', async () => {
      const OpenAI = require('openai').default;
      const apiError = new OpenAI.APIError('API Error', {}, 'test', 500);
      mockOpenAI.embeddings.create.mockRejectedValue(apiError);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle rate limit errors', async () => {
      const OpenAI = require('openai').default;
      const rateLimitError = new OpenAI.RateLimitError('Rate limit exceeded');
      mockOpenAI.embeddings.create.mockRejectedValue(rateLimitError);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle authentication errors', async () => {
      const OpenAI = require('openai').default;
      const authError = new OpenAI.AuthenticationError('Invalid API key');
      mockOpenAI.embeddings.create.mockRejectedValue(authError);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should validate embedding dimensions', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2] }] // Wrong dimension
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle empty response data', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: []
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should perform health check', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test',
        encoding_format: 'float'
      });
    });

    it('should fail health check on error', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API down'));

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should fallback to individual requests on batch failure', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ];

      // First call (batch) fails, subsequent calls (individual) succeed
      mockOpenAI.embeddings.create
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockResolvedValueOnce({ data: [{ embedding: mockEmbeddings[0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: mockEmbeddings[1] }] });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await provider.generateEmbeddingsBatch(['text 1', 'text 2']);

      expect(result).toEqual(mockEmbeddings);
      expect(consoleSpy).toHaveBeenCalledWith('Batch processing failed, falling back to individual requests:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('BaseEmbeddingProvider', () => {
    class TestProvider extends BaseEmbeddingProvider {
      protected modelName = 'test-model';
      protected dimension = 128;

      async generateEmbedding(text: string): Promise<number[]> {
        return new Array(this.dimension).fill(0.5);
      }

      async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
        return texts.map(() => new Array(this.dimension).fill(0.5));
      }
    }

    let provider: TestProvider;

    beforeEach(() => {
      provider = new TestProvider();
    });

    it('should return correct model info', () => {
      expect(provider.getModelName()).toBe('test-model');
      expect(provider.getDimension()).toBe(128);
    });

    it('should create cache keys', () => {
      const key1 = (provider as any).createCacheKey('test');
      const key2 = (provider as any).createCacheKey('test');
      const key3 = (provider as any).createCacheKey('different');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(typeof key1).toBe('string');
    });

    it('should cache and retrieve embeddings', async () => {
      const embedding = [0.1, 0.2, 0.3];
      
      provider.setCachedEmbedding('test', embedding);
      const cached = await provider.getCachedEmbedding('test');

      expect(cached).toEqual(embedding);
    });

    it('should return null for uncached embeddings', async () => {
      const cached = await provider.getCachedEmbedding('nonexistent');
      expect(cached).toBeNull();
    });

    it('should limit cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 1200; i++) {
        provider.setCachedEmbedding(`text-${i}`, [i]);
      }

      const stats = provider.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
      expect(stats.maxSize).toBe(1000);
    });

    it('should clear cache', () => {
      provider.setCachedEmbedding('test', [0.1, 0.2, 0.3]);
      expect(provider.getCacheStats().size).toBe(1);

      provider.clearCache();
      expect(provider.getCacheStats().size).toBe(0);
    });
  });

  describe('OllamaEmbeddingProvider', () => {
    let provider: OllamaEmbeddingProvider;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockClear();
      provider = new OllamaEmbeddingProvider('http://localhost:11434/', 'nomic-embed-text:latest');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize with correct base URL and model', () => {
      expect(provider.getModelName()).toBe('nomic-embed-text:latest');
      expect(provider.getDimension()).toBe(768); // Default dimension
    });

    it('should handle trailing slash in base URL', () => {
      const provider1 = new OllamaEmbeddingProvider('http://localhost:11434/', 'test-model');
      const provider2 = new OllamaEmbeddingProvider('http://localhost:11434', 'test-model');
      
      // Both should work the same internally
      expect(provider1.getModelName()).toBe('test-model');
      expect(provider2.getModelName()).toBe('test-model');
    });

    it('should generate single embedding', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ embedding: mockEmbedding })
      } as any);

      const result = await provider.generateEmbedding('test text');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text:latest',
          prompt: 'test text'
        })
      });
      expect(result).toEqual(mockEmbedding);
    });

    it('should return zero vector for empty text', async () => {
      const result = await provider.generateEmbedding('');

      expect(result).toEqual(new Array(768).fill(0));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should update dimension on first successful call', async () => {
      const mockEmbedding = new Array(1024).fill(0.5); // Different dimension
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ embedding: mockEmbedding })
      } as any);

      await provider.generateEmbedding('test text');

      expect(provider.getDimension()).toBe(1024);
    });

    it('should use cache for repeated requests', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ embedding: mockEmbedding })
      } as any);

      await provider.generateEmbedding('test text');
      await provider.generateEmbedding('test text');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
      await expect(provider.generateEmbedding('test')).rejects.toThrow('Ollama API returned 500');
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ invalid: 'response' })
      } as any);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
      await expect(provider.generateEmbedding('test')).rejects.toThrow('Invalid response format');
    });

    it('should handle dimension mismatch', async () => {
      // First call establishes dimension
      const firstEmbedding = [0.1, 0.2, 0.3];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ embedding: firstEmbedding })
      } as any);

      await provider.generateEmbedding('first text');

      // Second call with different dimension - need to clear cache first
      provider.clearCache();
      const wrongEmbedding = [0.1, 0.2]; // Wrong dimension
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ embedding: wrongEmbedding })
      } as any);

      await expect(provider.generateEmbedding('second text')).rejects.toThrow(EmbeddingProviderError);
      await expect(provider.generateEmbedding('second text')).rejects.toThrow('dimension mismatch');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
      await expect(provider.generateEmbedding('test')).rejects.toThrow('Failed to connect to Ollama');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON'))
      } as any);

      await expect(provider.generateEmbedding('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should generate batch embeddings sequentially', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ embedding: mockEmbeddings[0] })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ embedding: mockEmbeddings[1] })
        } as any);

      const result = await provider.generateEmbeddingsBatch(['text 1', 'text 2']);

      expect(result).toEqual(mockEmbeddings);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle empty batch', async () => {
      const result = await provider.generateEmbeddingsBatch([]);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should perform health check successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          models: [
            { name: 'nomic-embed-text:latest' },
            { name: 'other-model:latest' }
          ]
        })
      } as any);

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should handle partial model name match in health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          models: [
            { name: 'nomic-embed-text' }, // Without :latest suffix
            { name: 'other-model:latest' }
          ]
        })
      } as any);

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should fail health check when model not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          models: [
            { name: 'other-model:latest' }
          ]
        })
      } as any);

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should fail health check on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      } as any);

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should fail health check on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const isHealthy = await provider.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should pull model successfully', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify({ status: 'downloading' }) + '\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify({ status: 'complete' }) + '\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      } as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await provider.pullModel();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'nomic-embed-text:latest' })
      });

      expect(consoleSpy).toHaveBeenCalledWith('Model pull: downloading');
      expect(consoleSpy).toHaveBeenCalledWith('Model pull: complete');
      
      consoleSpy.mockRestore();
    });

    it('should handle pull model HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await expect(provider.pullModel()).rejects.toThrow(EmbeddingProviderError);
      await expect(provider.pullModel()).rejects.toThrow('Failed to pull model');
    });

    it('should handle pull model stream error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => null }
      } as any);

      // Should not throw, just complete without streaming
      await expect(provider.pullModel()).resolves.toBeUndefined();
    });
  });

  describe('Provider Factory', () => {
    it('should create OpenAI provider', () => {
      const config = {
        embeddingProvider: 'openai' as const,
        openaiApiKey: 'test-key',
        openaiModel: 'text-embedding-3-small' as const
      };

      const provider = createEmbeddingProvider(config);

      expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
      expect(provider.getModelName()).toBe('text-embedding-3-small');
    });

    it('should create Ollama provider', () => {
      const config = {
        embeddingProvider: 'ollama' as const,
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaModel: 'nomic-embed-text:latest'
      };

      const provider = createEmbeddingProvider(config);

      expect(provider).toBeInstanceOf(OllamaEmbeddingProvider);
      expect(provider.getModelName()).toBe('nomic-embed-text:latest');
    });

    it('should throw error for unknown provider', () => {
      const config = {
        embeddingProvider: 'unknown' as any
      };

      expect(() => createEmbeddingProvider(config)).toThrow('Unknown embedding provider: unknown');
    });

    it('should throw error for OpenAI without API key', () => {
      const config = {
        embeddingProvider: 'openai' as const,
        openaiModel: 'text-embedding-3-small' as const
        // Missing openaiApiKey
      };

      expect(() => createEmbeddingProvider(config)).toThrow('OpenAI API key is required');
    });
  });

  describe('EmbeddingProviderError', () => {
    it('should create error with all properties', () => {
      const originalError = new Error('Original error');
      const error = new EmbeddingProviderError(
        'Test error',
        'openai',
        500,
        'worker-1',
        originalError
      );

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('openai');
      expect(error.statusCode).toBe(500);
      expect(error.workerId).toBe('worker-1');
      expect(error.cause).toBe(originalError); // Use cause instead of originalError
      expect(error.name).toBe('EmbeddingProviderError');
    });

    it('should create error with minimal properties', () => {
      const error = new EmbeddingProviderError('Test error', 'openai');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('openai');
      expect(error.statusCode).toBeUndefined();
      expect(error.workerId).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('Advanced Worker Integration', () => {
    let worker: EmbeddingsWorker;
    let mockNatsConnection: any;
    let mockProvider: any;

    beforeEach(() => {
      mockNatsConnection = {
        subscribe: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: jest.fn().mockReturnValue({
            next: jest.fn().mockResolvedValue({ done: true })
          })
        }),
        isClosed: jest.fn().mockReturnValue(false),
        drain: jest.fn(),
        close: jest.fn()
      };

      const { connect } = require('nats');
      connect.mockResolvedValue(mockNatsConnection);

      mockProvider = {
        generateEmbedding: jest.fn(),
        generateEmbeddingsBatch: jest.fn(),
        getModelName: jest.fn().mockReturnValue('test-model'),
        getDimension: jest.fn().mockReturnValue(384),
        clearCache: jest.fn()
      };

      jest.doMock('./providers/index.js', () => ({
        createEmbeddingProvider: jest.fn().mockReturnValue(mockProvider)
      }));

      worker = new EmbeddingsWorker({
        ...mockConfig,
        embeddingProvider: 'ollama',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaModel: 'test-model'
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should handle health check with provider caching', async () => {
      mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      await worker.start();

      // Simulate health check interval
      jest.advanceTimersByTime(30000);

      expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('health check');
    });

    it('should handle graceful shutdown with cache clearing', async () => {
      mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      await worker.start();

      // Simulate shutdown
      await worker.stop();

      expect(mockNatsConnection.close).toHaveBeenCalled();
    });

    it('should handle batch request with error recovery', async () => {
      mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      await worker.start();

      const mockMsg = {
        data: Buffer.from(JSON.stringify({
          batch_id: 'batch-123',
          requests: [
            { request_id: 'req-1', text: 'text 1' },
            { request_id: 'req-2', text: 'text 2' }
          ]
        })),
        respond: jest.fn(),
        subject: 'embeddings.batch'
      };

      mockProvider.generateEmbeddingsBatch.mockRejectedValue(new Error('Batch failed'));

      await (worker as any).handleBatchRequest(mockMsg);

      expect(mockMsg.respond).toHaveBeenCalledWith(
        expect.any(Uint8Array) // Error response
      );
    });
  });
});