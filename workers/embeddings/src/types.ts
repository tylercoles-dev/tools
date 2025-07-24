/**
 * Type definitions for the embeddings worker
 */

import { z } from 'zod';

// Configuration schemas
export const WorkerConfigSchema = z.object({
  // NATS Configuration
  natsUrl: z.string().url().default('nats://localhost:4222'),
  
  // Legacy fields (kept for compatibility but not used)
  qdrantUrl: z.string().url().default('http://localhost:6333'),
  collectionName: z.string().default('memories'),
  
  // Worker Configuration
  workerName: z.string().default('embeddings-worker'),
  batchSize: z.number().int().min(1).max(100).default(32),
  maxRetries: z.number().int().min(1).max(10).default(3),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  healthCheckInterval: z.number().int().min(1000).default(30000),
  
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

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

// Embedding request/response schemas
export const EmbeddingRequestSchema = z.object({
  id: z.string(),
  text: z.string(),
  user_id: z.string().optional(),
  request_id: z.string(),
});

export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;

export const EmbeddingResponseSchema = z.object({
  request_id: z.string(),
  embedding: z.array(z.number()),
  dimension: z.number(),
  processing_time_ms: z.number(),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

// Worker stats
export interface WorkerStats {
  totalRequests: number;
  successfulEmbeddings: number;
  failedEmbeddings: number;
  averageProcessingTime: number;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
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

// Error types
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}


export class WorkerError extends Error {
  constructor(
    message: string,
    public component: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}