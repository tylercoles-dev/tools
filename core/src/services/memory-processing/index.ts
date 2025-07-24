/**
 * Memory Processing Service exports
 */

// Main service
export { MemoryProcessingService } from './service.js';
export type { MemoryProcessingServiceDeps } from './service.js';

// Analysis components
export { ContentAnalyzer } from './analysis/content-analyzer.js';

// Relationship detection
export { RelationshipDetector } from './relationships/detector.js';

// Types and configurations
export type {
  ContentAnalysis,
  MemoryRelationship,
  RelationshipType,
  MemoryProcessingEvent,
  ProcessedMemoryEvent,
  MemoryProcessingConfig,
  ProcessingStats,
  SimilarMemory,
} from './types.js';

export {
  ContentAnalysisSchema,
  MemoryRelationshipSchema,
  RelationshipTypeSchema,
  MemoryProcessingEventSchema,
  ProcessedMemoryEventSchema,
  defaultMemoryProcessingConfig,
  MemoryProcessingError,
  RelationshipDetectionError,
  ContentAnalysisError,
} from './types.js';