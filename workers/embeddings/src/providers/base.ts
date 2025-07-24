/**
 * Base embedding provider interface
 */

import type { EmbeddingProvider } from '../types.js';
import { createHash } from 'crypto';

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  protected cache = new Map<string, number[]>();
  protected abstract modelName: string;
  protected abstract dimension: number;

  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.modelName;
  }

  protected createCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  protected async getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = this.createCacheKey(text);
    return this.cache.get(key) || null;
  }

  protected setCachedEmbedding(text: string, embedding: number[]): void {
    const key = this.createCacheKey(text);
    this.cache.set(key, embedding);
    
    // Simple cache eviction - keep only last 1000 entries
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}