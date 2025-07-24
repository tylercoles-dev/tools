// Memory Graph MCP Server Types
// Based on architectural specifications and Rust reference implementation

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy?: string; // User ID
  metadata?: Record<string, any>;
}

export interface MemoryNode extends BaseEntity {
  content: string;
  contentHash: string; // For deduplication
  context: MemoryContext;
  concepts: Concept[];
  importance: 1 | 2 | 3 | 4 | 5;
  status: 'active' | 'archived' | 'merged';
  accessCount: number;
  lastAccessedAt?: string;
  vectorId?: string; // Reference to Qdrant vector
}

export interface MemoryContext {
  source?: string;
  timestamp?: string;
  location?: string;
  participants?: string[];
  tags?: string[];
  sessionId?: string;
  parentMemoryId?: string;
  userId?: string;
  projectName?: string;
  memoryTopic?: string;
  memoryType?: string;
  [key: string]: any;
}

export interface Concept {
  id: string;
  name: string;
  description?: string;
  type: 'entity' | 'topic' | 'skill' | 'project' | 'person' | 'custom';
  confidence: number; // 0.0 to 1.0
  extractedAt: string;
}

export interface Relationship extends BaseEntity {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength: number; // 0.0 to 1.0
  bidirectional: boolean;
  metadata: Record<string, any>;
  lastUpdated: string;
}

export interface MemoryCluster {
  id: string;
  name?: string;
  description?: string;
  memoryIds: string[];
  centroid?: number[]; // Vector centroid
  coherenceScore: number;
  topics: string[];
  createdAt: string;
}

export interface RelatedMemories {
  centerMemory: MemoryNode;
  relatedNodes: Array<{
    memory: MemoryNode;
    relationship: Relationship;
    path?: Relationship[]; // For multi-hop connections
    distance: number;
  }>;
  clusters: MemoryCluster[];
  concepts: Concept[];
}

// MCP Tool Arguments
export interface StoreMemoryArgs {
  content: string;
  context: {
    source?: string;
    timestamp?: string;
    location?: string;
    participants?: string[];
    tags?: string[];
    userId?: string;
    projectName?: string;
    memoryTopic?: string;
    memoryType?: string;
    [key: string]: any;
  };
  concepts?: string[];
  importance?: 1 | 2 | 3 | 4 | 5; // 1=low, 5=critical
}

export interface RetrieveMemoryArgs {
  query?: string;
  concepts?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  context?: Record<string, any>;
  userId?: string;
  projectName?: string;
  similarityThreshold?: number;
  limit?: number;
}

export interface CreateConnectionArgs {
  sourceId: string;
  targetId: string;
  relationshipType: 'semantic_similarity' | 'causal' | 'temporal' | 'conceptual' | 'custom';
  strength?: number; // 0.0 to 1.0
  metadata?: Record<string, any>;
  bidirectional?: boolean;
}

export interface SearchMemoriesArgs {
  query: string;
  contextFilters?: Record<string, any>;
  conceptFilters?: string[];
  includeRelated?: boolean;
  maxDepth?: number; // For relationship traversal
  userId?: string;
  projectName?: string;
  similarityThreshold?: number;
  limit?: number;
}

export interface GetRelatedArgs {
  memoryId: string;
  relationshipTypes?: string[];
  maxDepth?: number;
  minStrength?: number;
}

export interface MergeMemoriesArgs {
  primaryMemoryId: string;
  secondaryMemoryIds: string[];
  strategy: 'combine_content' | 'preserve_primary' | 'create_summary';
}

// Database Configuration
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  filename?: string; // for SQLite
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

// Vector Search Configuration
export interface VectorConfig {
  qdrantUrl: string;
  collectionName: string;
  vectorSize: number;
  apiKey?: string;
}

// Response Types
export interface StoreMemoryResponse {
  id: string;
  status: 'success' | 'error';
  message: string;
  memory?: MemoryNode;
}

export interface SearchResponse {
  memories: MemoryNode[];
  total: number;
  processingTimeMs: number;
  relatedConcepts?: Concept[];
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