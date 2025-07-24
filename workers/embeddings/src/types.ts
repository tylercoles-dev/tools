/**
 * Type definitions for the embeddings worker
 * Uses shared types from core package where possible
 */

import { z } from 'zod';

// Re-export shared embedding types from core
export {
  type EmbeddingRequest,
  type EmbeddingResponse,
  type EmbeddingError,
  EmbeddingRequestSchema,
  EmbeddingResponseSchema,
  EmbeddingErrorSchema,
  type EmbeddingProviderConfig,
  EmbeddingProviderConfigSchema,
  type EmbeddingBatchRequest,
  type EmbeddingBatchResponse,
  EmbeddingBatchRequestSchema,
  EmbeddingBatchResponseSchema,
} from '@mcp-tools/core/shared';

// Re-export shared worker types from core
export {
  type BaseWorkerConfig,
  BaseWorkerConfigSchema,
  type WorkerStatus,
  WorkerStatusSchema,
  type WorkerMetrics,
  WorkerMetricsSchema,
  type WorkerEvent,
  WorkerEventSchema,
  WorkerError,
  WorkerConfigurationError,
  WorkerConnectionError,
  WORKER_SUBJECTS,
} from '@mcp-tools/core/shared';

// Worker-specific configuration extending base config
export const EmbeddingsWorkerConfigSchema = BaseWorkerConfigSchema.extend({
  // Legacy fields (kept for compatibility but not used)
  qdrantUrl: z.string().url().default('http://localhost:6333'),
  collectionName: z.string().default('memories'),
  
  // Worker-specific configuration
  batchSize: z.number().int().min(1).max(100).default(32),
  maxRetries: z.number().int().min(1).max(10).default(3),
  
  // Embedding Provider Configuration
  embeddingProvider: z.enum(['ollama', 'openai']).default('ollama'),
  
  // Ollama Configuration
  ollamaBaseUrl: z.string().url().default('http://localhost:11434'),
  ollamaModel: z.string().default('nomic-embed-text:latest'),
  
  // OpenAI Configuration
  openaiApiKey: z.string().optional(),
  openaiModel: z.enum(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])
    .default('text-embedding-3-small'),
});

export type EmbeddingsWorkerConfig = z.infer<typeof EmbeddingsWorkerConfigSchema>;

// Worker stats extending base metrics
export interface EmbeddingsWorkerStats extends WorkerMetrics {
  // Embedding-specific metrics
  successfulEmbeddings: number;
  failedEmbeddings: number;
  batchesProcessed: number;
  memoriesProcessed: number;
  relationshipsDetected: number;
}

// Provider-specific types
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
  getModelName(): string;
}

// Embedding-specific error extending base worker error
export class EmbeddingProviderError extends WorkerError {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    workerId?: string,
    originalError?: Error
  ) {
    super(message, 'EMBEDDING_PROVIDER_ERROR', workerId, originalError);
    this.name = 'EmbeddingProviderError';
  }
}