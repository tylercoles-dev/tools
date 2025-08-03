/**
 * MarkItDown Worker Entry Point
 */

import { config as dotenvConfig } from 'dotenv';
import { MarkItDownWorker } from './worker.js';
import type { WorkerConfig } from './types.js';

// Load environment variables
dotenvConfig();

async function main() {
  const config: WorkerConfig = {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
  };

  console.log('Starting MarkItDown Worker with config:', {
    natsUrl: config.natsUrl,
    logLevel: config.logLevel,
    maxConcurrentJobs: config.maxConcurrentJobs,
    requestTimeout: config.requestTimeout
  });

  const worker = new MarkItDownWorker(config);
  
  try {
    await worker.start();
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});