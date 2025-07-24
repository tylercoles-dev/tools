/**
 * Shared embedding types used across workers and services
 */

import { z } from 'zod';

// Embedding request schema
export const EmbeddingRequestSchema = z.object({
  id: z.string().describe('Unique identifier for the request'),
  text: z.string().min(1).describe('Text content to generate embedding for'),
  user_id: z.string().optional().describe('Optional user ID for tracking'),
  request_id: z.string().describe('Request tracking ID for correlation'),
  model: z.string().optional().describe('Optional specific model to use'),
  dimensions: z.number().optional().describe('Optional embedding dimensions'),
});

// Embedding response schema
export const EmbeddingResponseSchema = z.object({
  request_id: z.string().describe('Matching request ID for correlation'),
  embedding: z.array(z.number()).describe('Generated embedding vector'),
  dimension: z.number().describe('Dimension of the embedding vector'),
  processing_time_ms: z.number().describe('Time taken to process in milliseconds'),
  model_used: z.string().optional().describe('Model that was actually used'),
  error: z.string().optional().describe('Error message if request failed'),
});

// Error response schema
export const EmbeddingErrorSchema = z.object({
  request_id: z.string().describe('Matching request ID for correlation'),
  error: z.string().describe('Error message'),
  error_code: z.string().describe('Machine-readable error code'),
  processing_time_ms: z.number().describe('Time until error occurred'),
});

// Type exports
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
export type EmbeddingError = z.infer<typeof EmbeddingErrorSchema>;

// Provider configuration
export const EmbeddingProviderConfigSchema = z.object({
  type: z.enum(['ollama', 'openai']).describe('Provider type'),
  baseUrl: z.string().url().optional().describe('Base URL for API requests'),
  apiKey: z.string().optional().describe('API key for authentication'),
  modelName: z.string().describe('Model name to use for embeddings'),
  dimensions: z.number().optional().describe('Embedding dimensions'),
  timeout: z.number().default(30000).describe('Request timeout in milliseconds'),
  retryAttempts: z.number().default(3).describe('Number of retry attempts'),
  rateLimitPerSecond: z.number().optional().describe('Rate limit for requests'),
});

export type EmbeddingProviderConfig = z.infer<typeof EmbeddingProviderConfigSchema>;

// Batch processing types
export const EmbeddingBatchRequestSchema = z.object({
  batch_id: z.string().describe('Unique batch identifier'),
  requests: z.array(EmbeddingRequestSchema).describe('Array of embedding requests'),
  priority: z.enum(['low', 'normal', 'high']).default('normal').describe('Processing priority'),
  callback_subject: z.string().optional().describe('NATS subject for batch completion callback'),
});

export const EmbeddingBatchResponseSchema = z.object({
  batch_id: z.string().describe('Matching batch identifier'),
  responses: z.array(EmbeddingResponseSchema).describe('Array of embedding responses'),
  errors: z.array(EmbeddingErrorSchema).describe('Array of any errors that occurred'),
  total_processing_time_ms: z.number().describe('Total time for entire batch'),
  completed_at: z.number().describe('Timestamp when batch completed'),
});

export type EmbeddingBatchRequest = z.infer<typeof EmbeddingBatchRequestSchema>;
export type EmbeddingBatchResponse = z.infer<typeof EmbeddingBatchResponseSchema>;