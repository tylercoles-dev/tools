/**
 * Configuration management for embeddings worker
 */

import { config } from 'dotenv';
import { EmbeddingsWorkerConfigSchema, type EmbeddingsWorkerConfig } from './types.js';

// Load environment variables
config();

export function loadConfig(): EmbeddingsWorkerConfig {
  const rawConfig = {
    // NATS Configuration
    natsUrl: process.env.NATS_URL,
    
    // Worker Configuration  
    workerName: process.env.WORKER_NAME,
    batchSize: process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : undefined,
    maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : undefined,
    logLevel: process.env.LOG_LEVEL,
    healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL ? parseInt(process.env.HEALTH_CHECK_INTERVAL) : undefined,
    
    // Embedding Provider Configuration
    embeddingProvider: process.env.EMBEDDING_PROVIDER,
    
    // Ollama Configuration
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    
    // OpenAI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    
    // Qdrant not needed anymore, but keeping in schema for compatibility
    qdrantUrl: 'http://localhost:6333',
    collectionName: 'memories'
  };

  // Validate and return config with defaults
  return EmbeddingsWorkerConfigSchema.parse(rawConfig);
}

export function validateConfig(config: EmbeddingsWorkerConfig): void {
  // Additional validation beyond Zod schema
  if (config.embeddingProvider === 'openai' && !config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI provider');
  }

  if (config.batchSize > 100) {
    console.warn('Large batch sizes may cause memory issues or API rate limits');
  }

  if (config.embeddingProvider === 'ollama') {
    console.log(`Using Ollama embedding provider at ${config.ollamaBaseUrl} with model ${config.ollamaModel}`);
  } else if (config.embeddingProvider === 'openai') {
    console.log(`Using OpenAI embedding provider with model ${config.openaiModel}`);
  }
}