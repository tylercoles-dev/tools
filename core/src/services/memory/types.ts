/**
 * Memory Types and Schemas
 */

import { z } from 'zod';

// Database entity interfaces
export interface Memory {
  id: string;
  content: string;
  content_hash: string;
  context: string; // JSON
  importance: number;
  status: 'active' | 'archived' | 'merged';
  access_count: number;
  last_accessed_at: string | null;
  vector_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: string | null; // JSON
}

export interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  strength: number;
  bidirectional: boolean;
  metadata: string; // JSON
  created_at: string;
  updated_at: string;
  last_updated: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string | null;
  type: 'entity' | 'topic' | 'skill' | 'project' | 'person' | 'custom';
  confidence: number;
  extracted_at: string;
  created_at: string;
  updated_at: string;
}

// Input schemas
export const StoreMemorySchema = z.object({
  content: z.string().min(1),
  context: z.object({
    source: z.string().optional(),
    timestamp: z.string().optional(),
    location: z.string().optional(),
    participants: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    userId: z.string().optional(),
    projectName: z.string().optional(),
    memoryTopic: z.string().optional(),
    memoryType: z.string().optional()
  }).passthrough(),
  concepts: z.array(z.string()).optional(),
  importance: z.number().int().min(1).max(5).default(1)
});

export const RetrieveMemorySchema = z.object({
  query: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional(),
  context: z.record(z.any()).optional(),
  userId: z.string().optional(),
  projectName: z.string().optional(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).default(20)
});

export const SearchMemoriesSchema = z.object({
  query: z.string().min(1),
  contextFilters: z.record(z.any()).optional(),
  conceptFilters: z.array(z.string()).optional(),
  includeRelated: z.boolean().default(false),
  maxDepth: z.number().int().min(1).max(5).default(2),
  userId: z.string().optional(),
  projectName: z.string().optional(),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  limit: z.number().int().min(1).max(100).default(10)
});

export const CreateConnectionSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  relationshipType: z.enum(['semantic_similarity', 'causal', 'temporal', 'conceptual', 'custom']),
  strength: z.number().min(0).max(1).default(1.0),
  metadata: z.record(z.any()).default({}),
  bidirectional: z.boolean().default(false)
});

// Input types
export type StoreMemoryInput = z.infer<typeof StoreMemorySchema>;
export type RetrieveMemoryInput = z.infer<typeof RetrieveMemorySchema>;
export type SearchMemoriesInput = z.infer<typeof SearchMemoriesSchema>;
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;

// Response types
export interface MemoryNode {
  id: string;
  content: string;
  contentHash: string;
  context: Record<string, any>;
  concepts: ConceptInfo[];
  importance: number;
  status: 'active' | 'archived' | 'merged';
  accessCount: number;
  lastAccessedAt?: string;
  vectorId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata: Record<string, any>;
}

export interface ConceptInfo {
  id: string;
  name: string;
  description?: string;
  type: 'entity' | 'topic' | 'skill' | 'project' | 'person' | 'custom';
  confidence: number;
  extractedAt: string;
}

export interface RelationshipInfo {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength: number;
  bidirectional: boolean;
  metadata: Record<string, any>;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedMemories {
  centerMemory: MemoryNode;
  relatedNodes: Array<{
    memory: MemoryNode;
    relationship: RelationshipInfo;
    distance: number;
    path?: RelationshipInfo[];
  }>;
  clusters: any[]; // TODO: Define cluster type
  concepts: ConceptInfo[];
}

export interface MemorySearchResults {
  memories: MemoryNode[];
  total: number;
  processingTimeMs: number;
  relatedConcepts?: Array<{
    name: string;
    relevance: number;
  }>;
}

export interface MemoryStats {
  totalMemories: number;
  totalRelationships: number;
  totalConcepts: number;
  averageImportance: number;
  mostActiveUsers: Array<{
    userId: string;
    count: number;
  }>;
  topProjects: Array<{
    projectName: string;
    count: number;
  }>;
  conceptDistribution: Record<string, number>;
}

// Error types
export class MemoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(`Memory with id ${id} not found`, 'NOT_FOUND', 404);
  }
}