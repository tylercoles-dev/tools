/**
 * OpenAI embedding provider
 */

import OpenAI from 'openai';
import { BaseEmbeddingProvider } from './base.js';
import { EmbeddingError } from '../types.js';

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  protected modelName: string;
  protected dimension: number;
  private client: OpenAI;

  // Model dimension mappings
  private static readonly MODEL_DIMENSIONS: Record<string, number> = {
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,
  };

  constructor(apiKey: string, modelName: string) {
    super();
    this.modelName = modelName;
    this.client = new OpenAI({ apiKey });
    
    this.dimension = OpenAIEmbeddingProvider.MODEL_DIMENSIONS[modelName];
    if (!this.dimension) {
      throw new EmbeddingError(
        `Unknown OpenAI model: ${modelName}`,
        'UNKNOWN_MODEL',
        'openai'
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      return new Array(this.dimension).fill(0);
    }

    // Check cache first
    const cached = await this.getCachedEmbedding(text);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: text,
        encoding_format: 'float',
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError(
          'No embedding data returned from OpenAI API',
          'EMPTY_RESPONSE',
          'openai'
        );
      }

      const embedding = response.data[0].embedding;

      // Validate dimension
      if (embedding.length !== this.dimension) {
        throw new EmbeddingError(
          `Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`,
          'DIMENSION_MISMATCH',
          'openai'
        );
      }

      // Cache the result
      this.setCachedEmbedding(text, embedding);

      return embedding;

    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingError(
          `OpenAI API error: ${error.message}`,
          error.code || 'API_ERROR',
          'openai',
          error.status,
          error
        );
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw new EmbeddingError(
          'OpenAI API rate limit exceeded',
          'RATE_LIMIT',
          'openai',
          429,
          error
        );
      }

      if (error instanceof OpenAI.AuthenticationError) {
        throw new EmbeddingError(
          'OpenAI API authentication failed - check your API key',
          'AUTH_ERROR',
          'openai',
          401,
          error
        );
      }

      throw new EmbeddingError(
        `Unexpected error generating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR',
        'openai',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // OpenAI supports batch processing natively
    try {
      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: texts,
        encoding_format: 'float',
      });

      if (!response.data || response.data.length !== texts.length) {
        throw new EmbeddingError(
          `Expected ${texts.length} embeddings, got ${response.data?.length || 0}`,
          'BATCH_SIZE_MISMATCH',
          'openai'
        );
      }

      const embeddings = response.data
        .sort((a, b) => a.index - b.index) // Ensure correct order
        .map(item => item.embedding);

      // Cache all results
      for (let i = 0; i < texts.length; i++) {
        this.setCachedEmbedding(texts[i], embeddings[i]);
      }

      return embeddings;

    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingError(
          `OpenAI API batch error: ${error.message}`,
          error.code || 'API_ERROR',
          'openai',
          error.status,
          error
        );
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw new EmbeddingError(
          'OpenAI API rate limit exceeded during batch processing',
          'RATE_LIMIT',
          'openai',
          429,
          error
        );
      }

      // Fallback to individual processing if batch fails
      console.warn('Batch processing failed, falling back to individual requests:', error);
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      }

      return embeddings;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple embedding request
      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: 'test',
        encoding_format: 'float',
      });

      return response.data && response.data.length > 0;

    } catch (error) {
      return false;
    }
  }

  getUsageStats(): { totalTokens: number; apiCalls: number } {
    // TODO: Implement usage tracking
    return { totalTokens: 0, apiCalls: 0 };
  }
}