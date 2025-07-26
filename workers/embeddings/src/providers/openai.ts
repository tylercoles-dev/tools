/**
 * OpenAI embedding provider
 */

import OpenAI from 'openai';
import { BaseEmbeddingProvider } from './base.js';
import { EmbeddingProviderError } from '../types.js';

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
      throw new EmbeddingProviderError(`Unknown OpenAI model: ${modelName}`, 'openai');
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
        throw new EmbeddingProviderError('No embedding data returned from OpenAI API', 'openai');
      }

      const embedding = response.data[0].embedding;

      // Validate dimension
      if (embedding.length !== this.dimension) {
        throw new EmbeddingProviderError(
          `Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`,
          'openai'
        );
      }

      // Cache the result
      this.setCachedEmbedding(text, embedding);

      return embedding;

    } catch (error) {
      if (error instanceof EmbeddingProviderError) {
        throw error;
      }

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingProviderError(
          `OpenAI API error: ${error.message}`,
          'openai',
          error.status,
          undefined,
          error
        );
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw new EmbeddingProviderError(
          'OpenAI API rate limit exceeded',
          'openai',
          429,
          undefined,
          error
        );
      }

      if (error instanceof OpenAI.AuthenticationError) {
        throw new EmbeddingProviderError(
          'OpenAI API authentication failed - check your API key',
          'openai',
          401,
          undefined,
          error
        );
      }

      throw new EmbeddingProviderError(
        `Unexpected error generating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai',
        undefined,
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
        throw new EmbeddingProviderError(
          `Expected ${texts.length} embeddings, got ${response.data?.length || 0}`,
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
      if (error instanceof EmbeddingProviderError) {
        throw error;
      }

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        throw new EmbeddingProviderError(
          `OpenAI API batch error: ${error.message}`,
          'openai',
          error.status,
          undefined,
          error
        );
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw new EmbeddingProviderError(
          'OpenAI API rate limit exceeded during batch processing',
          'openai',
          429,
          undefined,
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