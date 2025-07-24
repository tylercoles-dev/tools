/**
 * Embedding provider factory
 */

import type { EmbeddingProvider, EmbeddingsWorkerConfig } from '../types.js';
import { EmbeddingProviderError } from '../types.js';
import { OllamaEmbeddingProvider } from './ollama.js';
import { OpenAIEmbeddingProvider } from './openai.js';

export { BaseEmbeddingProvider } from './base.js';
export { OllamaEmbeddingProvider } from './ollama.js';
export { OpenAIEmbeddingProvider } from './openai.js';

export function createEmbeddingProvider(config: EmbeddingsWorkerConfig): EmbeddingProvider {
  switch (config.embeddingProvider) {
    case 'ollama':
      return new OllamaEmbeddingProvider(config.ollamaBaseUrl, config.ollamaModel);
    
    case 'openai':
      if (!config.openaiApiKey) {
        throw new EmbeddingProviderError(
          'OpenAI API key is required when using OpenAI provider',
          'openai'
        );
      }
      return new OpenAIEmbeddingProvider(config.openaiApiKey, config.openaiModel);
    
    default:
      throw new EmbeddingProviderError(
        `Unknown embedding provider: ${config.embeddingProvider}`,
        'factory'
      );
  }
}