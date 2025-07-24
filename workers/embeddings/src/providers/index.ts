/**
 * Embedding provider factory
 */

import type { EmbeddingProvider, WorkerConfig } from '../types.js';
import { EmbeddingError } from '../types.js';
import { OllamaEmbeddingProvider } from './ollama.js';
import { OpenAIEmbeddingProvider } from './openai.js';

export { BaseEmbeddingProvider } from './base.js';
export { OllamaEmbeddingProvider } from './ollama.js';
export { OpenAIEmbeddingProvider } from './openai.js';

export function createEmbeddingProvider(config: WorkerConfig): EmbeddingProvider {
  switch (config.embeddingProvider) {
    case 'ollama':
      return new OllamaEmbeddingProvider(config.ollamaBaseUrl, config.ollamaModel);
    
    case 'openai':
      if (!config.openaiApiKey) {
        throw new EmbeddingError(
          'OpenAI API key is required when using OpenAI provider',
          'MISSING_API_KEY',
          'openai'
        );
      }
      return new OpenAIEmbeddingProvider(config.openaiApiKey, config.openaiModel);
    
    default:
      throw new EmbeddingError(
        `Unknown embedding provider: ${config.embeddingProvider}`,
        'UNKNOWN_PROVIDER',
        'factory'
      );
  }
}