/**
 * Shared NATS message schemas and types
 */

import { z } from 'zod';

// Base message schema that all NATS messages should extend
export const BaseMessageSchema = z.object({
  messageId: z.string().describe('Unique message identifier'),
  timestamp: z.number().describe('Message timestamp in milliseconds'),
  source: z.string().describe('Service or component that sent the message'),
  correlationId: z.string().optional().describe('Correlation ID for request tracking'),
  version: z.string().default('1.0').describe('Message schema version'),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;

// Memory-related events
export const MemoryEventSchema = BaseMessageSchema.extend({
  eventType: z.enum(['created', 'updated', 'deleted', 'analyzed']).describe('Memory event type'),
  memoryId: z.string().describe('Memory identifier'),
  userId: z.string().describe('User who owns the memory'),
  projectName: z.string().optional().describe('Associated project name'),
  content: z.string().optional().describe('Memory content (for create/update events)'),
  metadata: z.record(z.any()).optional().describe('Additional memory metadata'),
});

export type MemoryEvent = z.infer<typeof MemoryEventSchema>;

// Analysis events
export const AnalysisEventSchema = BaseMessageSchema.extend({
  analysisType: z.enum(['content', 'relationship', 'sentiment', 'topic']).describe('Type of analysis'),
  targetId: z.string().describe('ID of the target being analyzed'),
  targetType: z.enum(['memory', 'document', 'conversation']).describe('Type of target'),
  userId: z.string().describe('User associated with the analysis'),
  results: z.record(z.any()).describe('Analysis results'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score for the analysis'),
});

export type AnalysisEvent = z.infer<typeof AnalysisEventSchema>;

// Relationship events
export const RelationshipEventSchema = BaseMessageSchema.extend({
  eventType: z.enum(['detected', 'confirmed', 'rejected', 'updated']).describe('Relationship event type'),
  sourceId: z.string().describe('Source entity ID'),
  targetId: z.string().describe('Target entity ID'),
  relationshipType: z.string().describe('Type of relationship'),
  strength: z.number().min(0).max(1).describe('Relationship strength score'),
  metadata: z.record(z.any()).optional().describe('Additional relationship metadata'),
});

export type RelationshipEvent = z.infer<typeof RelationshipEventSchema>;

// Processing events for batch operations
export const BatchProcessingEventSchema = BaseMessageSchema.extend({
  batchId: z.string().describe('Batch identifier'),
  batchType: z.string().describe('Type of batch operation'),
  status: z.enum(['started', 'processing', 'completed', 'failed']).describe('Batch status'),
  totalItems: z.number().describe('Total number of items in batch'),
  processedItems: z.number().describe('Number of items processed'),
  failedItems: z.number().describe('Number of items that failed'),
  progress: z.number().min(0).max(1).describe('Progress percentage (0-1)'),
  estimatedCompletion: z.number().optional().describe('Estimated completion timestamp'),
  errors: z.array(z.string()).optional().describe('Error messages if any'),
});

export type BatchProcessingEvent = z.infer<typeof BatchProcessingEventSchema>;

// System events
export const SystemEventSchema = BaseMessageSchema.extend({
  eventType: z.enum(['startup', 'shutdown', 'error', 'warning', 'info']).describe('System event type'),
  component: z.string().describe('System component that generated the event'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Event severity'),
  message: z.string().describe('Human-readable event message'),
  details: z.record(z.any()).optional().describe('Additional event details'),
});

export type SystemEvent = z.infer<typeof SystemEventSchema>;

// Standard NATS subjects used across the system
export const NATS_SUBJECTS = {
  // Memory events
  MEMORY_CREATED: 'memories.created',
  MEMORY_UPDATED: 'memories.updated',
  MEMORY_DELETED: 'memories.deleted',
  MEMORY_ANALYZED: 'memories.analyzed',
  
  // Analysis events
  ANALYSIS_REQUESTED: 'analysis.requested',
  ANALYSIS_COMPLETED: 'analysis.completed',
  ANALYSIS_FAILED: 'analysis.failed',
  
  // Relationship events
  RELATIONSHIPS_DETECTED: 'relationships.detected',
  RELATIONSHIPS_UPDATED: 'relationships.updated',
  
  // Processing events
  BATCH_STARTED: 'processing.batch.started',
  BATCH_PROGRESS: 'processing.batch.progress',
  BATCH_COMPLETED: 'processing.batch.completed',
  BATCH_FAILED: 'processing.batch.failed',
  
  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
  
  // Worker communication
  EMBEDDINGS_REQUEST: 'workers.embeddings.request',
  EMBEDDINGS_RESPONSE: 'workers.embeddings.response',
  VECTOR_STORE_REQUEST: 'workers.vector.request',
  VECTOR_STORE_RESPONSE: 'workers.vector.response',
  
  // Health and monitoring
  HEALTH_CHECK: 'system.health',
  METRICS_UPDATE: 'system.metrics',
} as const;

// Request-response pattern helpers
export const RequestResponseSchema = z.object({
  requestId: z.string().describe('Unique request identifier'),
  replyTo: z.string().optional().describe('NATS subject to reply to'),
  timeout: z.number().default(30000).describe('Request timeout in milliseconds'),
});

export type RequestResponse = z.infer<typeof RequestResponseSchema>;

// Generic response wrapper
export const ResponseWrapperSchema = z.object({
  requestId: z.string().describe('Matching request identifier'),
  success: z.boolean().describe('Whether the request was successful'),
  data: z.any().optional().describe('Response data if successful'),
  error: z.string().optional().describe('Error message if failed'),
  processingTime: z.number().describe('Processing time in milliseconds'),
  timestamp: z.number().describe('Response timestamp'),
});

export type ResponseWrapper<T = any> = Omit<z.infer<typeof ResponseWrapperSchema>, 'data'> & {
  data?: T;
};