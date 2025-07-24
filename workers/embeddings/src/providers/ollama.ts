/**
 * Ollama embedding provider
 */

import { BaseEmbeddingProvider } from './base.js';
import { EmbeddingError } from '../types.js';

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  protected modelName: string;
  protected dimension: number = 768; // Default, will be updated after first call
  private baseUrl: string;

  constructor(baseUrl: string, modelName: string) {
    super();
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.modelName = modelName;
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
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new EmbeddingError(
          `Ollama API returned ${response.status}: ${response.statusText}`,
          'OLLAMA_API_ERROR',
          'ollama',
          response.status
        );
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new EmbeddingError(
          'Invalid response format from Ollama API',
          'INVALID_RESPONSE',
          'ollama'
        );
      }

      const embedding: number[] = data.embedding;
      
      // Update dimension if this is our first successful call
      if (this.dimension === 768 && embedding.length !== 768) {
        this.dimension = embedding.length;
      }

      // Validate dimension
      if (embedding.length !== this.dimension) {
        throw new EmbeddingError(
          `Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`,
          'DIMENSION_MISMATCH',
          'ollama'
        );
      }

      // Cache the result
      this.setCachedEmbedding(text, embedding);

      return embedding;

    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new EmbeddingError(
          `Failed to connect to Ollama at ${this.baseUrl}`,
          'CONNECTION_ERROR',
          'ollama',
          undefined,
          error
        );
      }

      throw new EmbeddingError(
        `Unexpected error generating embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR',
        'ollama',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // For now, process sequentially to avoid overwhelming Ollama
    // TODO: Add concurrent processing with configurable limit
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // Check if our model is available
      if (data.models && Array.isArray(data.models)) {
        return data.models.some((model: any) => 
          model.name === this.modelName || model.name.startsWith(this.modelName.split(':')[0])
        );
      }

      return false;

    } catch (error) {
      return false;
    }
  }

  async pullModel(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.modelName,
        }),
      });

      if (!response.ok) {
        throw new EmbeddingError(
          `Failed to pull model ${this.modelName}: ${response.status} ${response.statusText}`,
          'MODEL_PULL_ERROR',
          'ollama',
          response.status
        );
      }

      // Stream the response to handle pull progress
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Optionally parse and log progress
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                console.log(`Model pull: ${data.status}`);
              }
            } catch {
              // Ignore invalid JSON lines
            }
          }
        }
      }

    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      throw new EmbeddingError(
        `Failed to pull model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MODEL_PULL_ERROR',
        'ollama',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}