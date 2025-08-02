#!/usr/bin/env node

/**
 * MCP Tools Embeddings Worker
 * 
 * A TypeScript worker that generates vector embeddings via NATS requests.
 * Supports Ollama and OpenAI embedding providers.
 */

import { EmbeddingsWorker } from './worker.js';
import { loadConfig, validateConfig } from './config.js';
import { EmbeddingProviderError, WorkerError } from './types.js';

async function main() {
  try {
    console.log('🚀 Starting MCP Tools Embeddings Worker...');
    
    // Load and validate configuration
    const config = loadConfig();
    validateConfig(config);
    
    console.log('📋 Configuration loaded:', {
      provider: config.embeddingProvider,
      model: config.embeddingProvider === 'ollama' ? config.ollamaModel : config.openaiModel,
      natsUrl: config.natsUrl,
      logLevel: config.logLevel,
      batchSize: config.batchSize
    });

    // Create and start worker
    const worker = new EmbeddingsWorker(config);
    await worker.start();

    // Keep the process running
    console.log('✅ Embeddings worker is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('❌ Failed to start embeddings worker:', error);

    if (error instanceof EmbeddingProviderError) {
      console.error(`Embedding Error:`, error.message);
      console.error('Provider:', error.provider);
      if (error.statusCode) {
        console.error('Status Code:', error.statusCode);
      }
    } else if (error instanceof WorkerError) {
      console.error(`Worker Error [${error.code}]:`, error.message);
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the worker
main();