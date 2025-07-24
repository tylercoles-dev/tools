/**
 * Types for memory processing, analysis, and relationships
 */

import { z } from 'zod';

// Analysis types
export const ContentAnalysisSchema = z.object({
  memory_id: z.string(),
  user_id: z.string(),
  content_hash: z.string(),
  word_count: z.number().int().min(0),
  character_count: z.number().int().min(0),
  topics: z.array(z.string()),
  entities: z.array(z.string()),
  sentiment_score: z.number().min(-1).max(1),
  language: z.string(),
  keywords: z.array(z.string()),
  analysis_timestamp: z.number(),
});

export type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;

// Relationship types
export const RelationshipTypeSchema = z.enum([
  'semantic_similarity',
  'topic_overlap',
  'tag_similarity', 
  'temporal_proximity',
  'user_connection',
  'project_connection'
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const MemoryRelationshipSchema = z.object({
  id: z.string().optional(), // For database storage
  source_memory_id: z.string(),
  target_memory_id: z.string(),
  relationship_type: RelationshipTypeSchema,
  strength: z.number().min(0).max(1),
  created_at: z.number(),
  metadata: z.record(z.any()),
});

export type MemoryRelationship = z.infer<typeof MemoryRelationshipSchema>;

// Processing events
export const MemoryProcessingEventSchema = z.object({
  memory_id: z.string(),
  user_id: z.string(),
  project_name: z.string(),
  content: z.string(),
  memory_topic: z.string().optional(),
  memory_type: z.string().optional(),
  tags: z.array(z.string()),
  embedding: z.array(z.number()).optional(),
  created_at: z.number(),
});

export type MemoryProcessingEvent = z.infer<typeof MemoryProcessingEventSchema>;

export const ProcessedMemoryEventSchema = z.object({
  memory_id: z.string(),
  analysis: ContentAnalysisSchema,
  relationships: z.array(MemoryRelationshipSchema),
  processing_completed_at: z.number(),
});

export type ProcessedMemoryEvent = z.infer<typeof ProcessedMemoryEventSchema>;

// Similar memory for relationship detection
export interface SimilarMemory {
  id: string;
  similarity_score: number;
  content: string;
  tags: string[];
  memory_topic?: string;
  memory_type?: string;
  created_at: number;
  embedding?: number[];
}

// Configuration
export interface MemoryProcessingConfig {
  // Relationship detection thresholds
  semanticSimilarityThreshold: number;
  topicOverlapThreshold: number;
  tagSimilarityThreshold: number;
  temporalProximityWindow: number; // milliseconds
  
  // Analysis settings
  maxKeywords: number;
  enableSentimentAnalysis: boolean;
  enableEntityExtraction: boolean;
  
  // Processing limits
  maxRelationshipsPerMemory: number;
  maxSimilarMemoriesToCheck: number;
  
  // External service URLs
  embeddingsWorkerSubject: string;
}

export const defaultMemoryProcessingConfig: MemoryProcessingConfig = {
  semanticSimilarityThreshold: 0.75,
  topicOverlapThreshold: 0.8,
  tagSimilarityThreshold: 0.3,
  temporalProximityWindow: 24 * 60 * 60 * 1000, // 24 hours
  maxKeywords: 10,
  enableSentimentAnalysis: true,
  enableEntityExtraction: true,
  maxRelationshipsPerMemory: 20,
  maxSimilarMemoriesToCheck: 50,
  embeddingsWorkerSubject: 'embeddings.request',
};

// Processing statistics
export interface ProcessingStats {
  totalMemoriesProcessed: number;
  totalAnalysesCompleted: number;
  totalRelationshipsDetected: number;
  averageProcessingTime: number;
  relationshipsByType: Record<RelationshipType, number>;
  languageDistribution: Record<string, number>;
  topicDistribution: Record<string, number>;
}

// Error types
export class MemoryProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public memoryId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MemoryProcessingError';
  }
}

export class RelationshipDetectionError extends Error {
  constructor(
    message: string,
    public memoryId: string,
    public relationshipType: RelationshipType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RelationshipDetectionError';
  }
}

export class ContentAnalysisError extends Error {
  constructor(
    message: string,
    public memoryId: string,
    public analysisType: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContentAnalysisError';
  }
}