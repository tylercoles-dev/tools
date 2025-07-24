/**
 * Shared worker configuration and common types
 */

import { z } from 'zod';

// Base worker configuration that all workers should extend
export const BaseWorkerConfigSchema = z.object({
  // NATS connection settings
  natsUrl: z.string().url().default('nats://localhost:4222').describe('NATS server URL'),
  natsUser: z.string().optional().describe('NATS username for authentication'),
  natsPassword: z.string().optional().describe('NATS password for authentication'),
  natsToken: z.string().optional().describe('NATS authentication token'),
  
  // Logging configuration
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe('Logging level'),
  logFormat: z.enum(['json', 'text']).default('json').describe('Log output format'),
  
  // Health and monitoring
  healthCheckInterval: z.number().default(30000).describe('Health check interval in milliseconds'),
  metricsEnabled: z.boolean().default(true).describe('Enable metrics collection'),
  metricsPort: z.number().optional().describe('Port for metrics endpoint'),
  
  // Performance settings
  maxConcurrency: z.number().default(10).describe('Maximum concurrent operations'),
  shutdownTimeout: z.number().default(30000).describe('Graceful shutdown timeout in milliseconds'),
  
  // Worker identification
  workerId: z.string().optional().describe('Unique worker instance identifier'),
  workerName: z.string().describe('Human-readable worker name'),
  version: z.string().optional().describe('Worker version'),
});

export type BaseWorkerConfig = z.infer<typeof BaseWorkerConfigSchema>;

// Worker status and health types
export const WorkerStatusSchema = z.object({
  workerId: z.string().describe('Worker instance identifier'),
  workerName: z.string().describe('Worker name'),
  status: z.enum(['starting', 'healthy', 'degraded', 'unhealthy', 'stopping']).describe('Current status'),
  uptime: z.number().describe('Uptime in milliseconds'),
  lastHealthCheck: z.number().describe('Timestamp of last health check'),
  version: z.string().optional().describe('Worker version'),
  metadata: z.record(z.any()).optional().describe('Additional worker-specific metadata'),
});

export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

// Worker metrics types
export const WorkerMetricsSchema = z.object({
  workerId: z.string().describe('Worker instance identifier'),
  timestamp: z.number().describe('Metrics timestamp'),
  
  // Performance metrics
  totalRequests: z.number().describe('Total requests processed'),
  successfulRequests: z.number().describe('Successful requests'),
  failedRequests: z.number().describe('Failed requests'),
  averageResponseTime: z.number().describe('Average response time in milliseconds'),
  
  // Resource usage
  memoryUsage: z.number().optional().describe('Memory usage in bytes'),
  cpuUsage: z.number().optional().describe('CPU usage percentage'),
  
  // Custom metrics
  customMetrics: z.record(z.number()).optional().describe('Worker-specific metrics'),
});

export type WorkerMetrics = z.infer<typeof WorkerMetricsSchema>;

// Worker lifecycle events
export const WorkerEventSchema = z.object({
  workerId: z.string().describe('Worker instance identifier'),
  eventType: z.enum(['started', 'stopped', 'error', 'health_check', 'metrics']).describe('Event type'),
  timestamp: z.number().describe('Event timestamp'),
  data: z.any().optional().describe('Event-specific data'),
  message: z.string().optional().describe('Human-readable event message'),
});

export type WorkerEvent = z.infer<typeof WorkerEventSchema>;

// NATS subject patterns for workers
export const WORKER_SUBJECTS = {
  // Health and status
  HEALTH_CHECK: 'workers.health',
  STATUS_UPDATE: 'workers.status',
  METRICS: 'workers.metrics',
  
  // Lifecycle events
  STARTED: 'workers.lifecycle.started',
  STOPPED: 'workers.lifecycle.stopped',
  ERROR: 'workers.lifecycle.error',
  
  // Service-specific subjects (workers should extend these)
  EMBEDDINGS: 'workers.embeddings',
  VECTOR_STORE: 'workers.vector',
  ANALYSIS: 'workers.analysis',
} as const;

// Error types for workers
export class WorkerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly workerId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}

export class WorkerConfigurationError extends WorkerError {
  constructor(message: string, workerId?: string, cause?: Error) {
    super(message, 'WORKER_CONFIG_ERROR', workerId, cause);
    this.name = 'WorkerConfigurationError';
  }
}

export class WorkerConnectionError extends WorkerError {
  constructor(message: string, workerId?: string, cause?: Error) {
    super(message, 'WORKER_CONNECTION_ERROR', workerId, cause);
    this.name = 'WorkerConnectionError';
  }
}