/**
 * Relationship detection between memories
 */

import type { 
  MemoryRelationship, 
  SimilarMemory, 
  MemoryProcessingConfig,
  MemoryProcessingEvent
} from '../types.js';
import { RelationshipDetectionError } from '../types.js';

export class RelationshipDetector {
  constructor(
    private config: MemoryProcessingConfig,
    private findSimilarMemories: (
      embedding: number[], 
      userId: string, 
      projectName?: string, 
      limit?: number, 
      threshold?: number
    ) => Promise<SimilarMemory[]>
  ) {}

  async detectRelationships(
    memory: MemoryProcessingEvent,
    embedding: number[]
  ): Promise<MemoryRelationship[]> {
    const relationships: MemoryRelationship[] = [];
    const now = Date.now();

    try {
      // Get similar memories for analysis
      const similarMemories = await this.findSimilarMemories(
        embedding,
        memory.user_id,
        memory.project_name,
        this.config.maxSimilarMemoriesToCheck,
        0.3 // Low threshold to get broad set for analysis
      );

      // 1. Semantic similarity relationships
      const semanticRelationships = await this.detectSemanticSimilarity(
        memory, 
        similarMemories, 
        now
      );
      relationships.push(...semanticRelationships);

      // 2. Topic overlap relationships
      const topicRelationships = await this.detectTopicOverlap(
        memory,
        similarMemories,
        now
      );
      relationships.push(...topicRelationships);

      // 3. Tag similarity relationships  
      const tagRelationships = await this.detectTagSimilarity(
        memory,
        similarMemories,
        now
      );
      relationships.push(...tagRelationships);

      // 4. Temporal proximity relationships
      const temporalRelationships = await this.detectTemporalProximity(
        memory,
        similarMemories,
        now
      );
      relationships.push(...temporalRelationships);

      // Limit total relationships per memory
      const sortedRelationships = relationships
        .sort((a, b) => b.strength - a.strength)
        .slice(0, this.config.maxRelationshipsPerMemory);

      return sortedRelationships;

    } catch (error) {
      throw new RelationshipDetectionError(
        `Failed to detect relationships for memory ${memory.memory_id}`,
        memory.memory_id,
        'semantic_similarity', // Default type for general errors
        error instanceof Error ? error : undefined
      );
    }
  }

  private async detectSemanticSimilarity(
    memory: MemoryProcessingEvent,
    similarMemories: SimilarMemory[],
    timestamp: number
  ): Promise<MemoryRelationship[]> {
    try {
      return similarMemories
        .filter(similar => 
          similar.id !== memory.memory_id && 
          similar.similarity_score >= this.config.semanticSimilarityThreshold
        )
        .map(similar => ({
          source_memory_id: memory.memory_id,
          target_memory_id: similar.id,
          relationship_type: 'semantic_similarity' as const,
          strength: similar.similarity_score,
          created_at: timestamp,
          metadata: { 
            similarity_score: similar.similarity_score,
            detection_method: 'vector_similarity'
          }
        }));

    } catch (error) {
      console.warn(`Failed to detect semantic similarity for memory ${memory.memory_id}:`, error);
      return [];
    }
  }

  private async detectTopicOverlap(
    memory: MemoryProcessingEvent,
    similarMemories: SimilarMemory[],
    timestamp: number
  ): Promise<MemoryRelationship[]> {
    if (!memory.memory_topic) return [];

    try {
      const relationships: MemoryRelationship[] = [];

      for (const similar of similarMemories) {
        if (similar.id === memory.memory_id || !similar.memory_topic) continue;

        // Exact topic match
        if (memory.memory_topic === similar.memory_topic) {
          relationships.push({
            source_memory_id: memory.memory_id,
            target_memory_id: similar.id,
            relationship_type: 'topic_overlap',
            strength: this.config.topicOverlapThreshold,
            created_at: timestamp,
            metadata: { 
              shared_topic: memory.memory_topic,
              detection_method: 'exact_match'
            }
          });
        }
      }

      return relationships;

    } catch (error) {
      console.warn(`Failed to detect topic overlap for memory ${memory.memory_id}:`, error);
      return [];
    }
  }

  private async detectTagSimilarity(
    memory: MemoryProcessingEvent,
    similarMemories: SimilarMemory[],
    timestamp: number
  ): Promise<MemoryRelationship[]> {
    if (!memory.tags || memory.tags.length === 0) return [];

    try {
      const relationships: MemoryRelationship[] = [];

      for (const similar of similarMemories) {
        if (similar.id === memory.memory_id || !similar.tags || similar.tags.length === 0) continue;

        // Calculate tag overlap using Jaccard similarity
        const memoryTagSet = new Set(memory.tags);
        const similarTagSet = new Set(similar.tags);
        const intersection = new Set([...memoryTagSet].filter(tag => similarTagSet.has(tag)));
        const union = new Set([...memoryTagSet, ...similarTagSet]);

        const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

        // Only create relationship if overlap is significant
        if (jaccardSimilarity >= this.config.tagSimilarityThreshold) {
          relationships.push({
            source_memory_id: memory.memory_id,
            target_memory_id: similar.id,
            relationship_type: 'tag_similarity',
            strength: jaccardSimilarity,
            created_at: timestamp,
            metadata: {
              shared_tags: Array.from(intersection),
              jaccard_similarity: jaccardSimilarity,
              total_shared: intersection.size,
              detection_method: 'jaccard_similarity'
            }
          });
        }
      }

      return relationships;

    } catch (error) {
      console.warn(`Failed to detect tag similarity for memory ${memory.memory_id}:`, error);
      return [];
    }
  }

  private async detectTemporalProximity(
    memory: MemoryProcessingEvent,
    similarMemories: SimilarMemory[],
    timestamp: number
  ): Promise<MemoryRelationship[]> {
    try {
      const relationships: MemoryRelationship[] = [];
      const memoryTime = memory.created_at;
      const timeWindow = this.config.temporalProximityWindow;

      for (const similar of similarMemories) {
        if (similar.id === memory.memory_id) continue;

        const timeDiff = Math.abs(memoryTime - similar.created_at);
        
        if (timeDiff <= timeWindow) {
          // Calculate temporal strength (closer in time = higher strength)
          // Using exponential decay: strength = e^(-timeDiff/halfLife)
          const halfLife = timeWindow / 3; // Half strength at 1/3 of window
          const temporalStrength = Math.exp(-timeDiff / halfLife);
          
          // Apply minimum threshold
          if (temporalStrength > 0.1) {
            relationships.push({
              source_memory_id: memory.memory_id,
              target_memory_id: similar.id,
              relationship_type: 'temporal_proximity',
              strength: temporalStrength,
              created_at: timestamp,
              metadata: {
                time_diff_ms: timeDiff,
                time_diff_hours: Math.round(timeDiff / (60 * 60 * 1000) * 10) / 10,
                detection_method: 'exponential_decay'
              }
            });
          }
        }
      }

      return relationships;

    } catch (error) {
      console.warn(`Failed to detect temporal proximity for memory ${memory.memory_id}:`, error);
      return [];
    }
  }

  // Additional relationship types that could be implemented:

  async detectUserConnection(
    _memory: MemoryProcessingEvent,
    _similarMemories: SimilarMemory[],
    _timestamp: number
  ): Promise<MemoryRelationship[]> {
    // Detect memories from the same user that share patterns
    // This could look at user behavior patterns, common phrases, etc.
    return [];
  }

  async detectProjectConnection(
    _memory: MemoryProcessingEvent,
    _similarMemories: SimilarMemory[],
    _timestamp: number
  ): Promise<MemoryRelationship[]> {
    // Detect memories within the same project that are related
    // This could be more sophisticated than just same project_name
    return [];
  }

}