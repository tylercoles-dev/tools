/**
 * Relationship detection between memories
 */

import type { ProcessedMemory, MemoryRelationship, RelationshipType, SimilarMemory } from '../types.js';
import type { QdrantStorage } from '../storage/qdrant.js';

export class RelationshipDetector {
  constructor(private storage: QdrantStorage) {}

  async detectRelationships(memory: ProcessedMemory): Promise<MemoryRelationship[]> {
    const relationships: MemoryRelationship[] = [];
    const now = Date.now();

    try {
      // 1. Semantic similarity relationships
      const semanticRelationships = await this.detectSemanticSimilarity(memory);
      relationships.push(...semanticRelationships.map(rel => ({
        source_memory_id: memory.id,
        target_memory_id: rel.target_memory_id,
        relationship_type: 'semantic_similarity' as RelationshipType,
        strength: rel.strength,
        created_at: now,
        metadata: { similarity_score: rel.strength }
      })));

      // 2. Topic overlap relationships
      const topicRelationships = await this.detectTopicOverlap(memory);
      relationships.push(...topicRelationships);

      // 3. Tag similarity relationships  
      const tagRelationships = await this.detectTagSimilarity(memory);
      relationships.push(...tagRelationships);

      // 4. Temporal proximity relationships
      const temporalRelationships = await this.detectTemporalProximity(memory);
      relationships.push(...temporalRelationships);

      // 5. User and project connections are implicit (same user/project)
      // These could be added if needed for explicit relationship modeling

      return relationships;

    } catch (error) {
      console.error(`Failed to detect relationships for memory ${memory.id}:`, error);
      return [];
    }
  }

  private async detectSemanticSimilarity(memory: ProcessedMemory): Promise<Array<{target_memory_id: string, strength: number}>> {
    try {
      const similarMemories = await this.storage.findSimilarMemories(
        memory.embedding,
        memory.user_id,
        memory.project_name,
        10, // limit
        0.75 // threshold
      );

      return similarMemories
        .filter(similar => similar.id !== memory.id) // Exclude self
        .map(similar => ({
          target_memory_id: similar.id,
          strength: similar.similarity_score
        }));

    } catch (error) {
      console.error('Failed to detect semantic similarity:', error);
      return [];
    }
  }

  private async detectTopicOverlap(memory: ProcessedMemory): Promise<MemoryRelationship[]> {
    // For now, we'll use a simplified approach since we don't have topic storage
    // In a full implementation, you'd query for memories with overlapping topics
    
    const relationships: MemoryRelationship[] = [];
    const now = Date.now();

    try {
      // Get similar memories and check for topic overlap
      const similarMemories = await this.storage.findSimilarMemories(
        memory.embedding,
        memory.user_id,
        memory.project_name,
        20, // larger set for topic analysis
        0.5  // lower threshold
      );

      for (const similar of similarMemories) {
        if (similar.id === memory.id) continue;

        // Check if memory topics match (simplified - in practice you'd have richer topic data)
        if (memory.memory_topic && similar.memory_topic && 
            memory.memory_topic === similar.memory_topic) {
          
          relationships.push({
            source_memory_id: memory.id,
            target_memory_id: similar.id,
            relationship_type: 'topic_overlap',
            strength: 0.8, // High strength for exact topic match
            created_at: now,
            metadata: { 
              shared_topic: memory.memory_topic,
              detection_method: 'exact_match'
            }
          });
        }
      }

      return relationships;

    } catch (error) {
      console.error('Failed to detect topic overlap:', error);
      return [];
    }
  }

  private async detectTagSimilarity(memory: ProcessedMemory): Promise<MemoryRelationship[]> {
    if (!memory.tags || memory.tags.length === 0) {
      return [];
    }

    const relationships: MemoryRelationship[] = [];
    const now = Date.now();

    try {
      // Get similar memories and check for tag overlap
      const similarMemories = await this.storage.findSimilarMemories(
        memory.embedding,
        memory.user_id,
        memory.project_name,
        20, // larger set for tag analysis
        0.4  // lower threshold
      );

      for (const similar of similarMemories) {
        if (similar.id === memory.id || !similar.tags || similar.tags.length === 0) continue;

        // Calculate tag overlap
        const memoryTagSet = new Set(memory.tags);
        const similarTagSet = new Set(similar.tags);
        const intersection = new Set([...memoryTagSet].filter(tag => similarTagSet.has(tag)));
        const union = new Set([...memoryTagSet, ...similarTagSet]);

        const overlapRatio = intersection.size / union.size;

        // Only create relationship if overlap is significant (>30%)
        if (overlapRatio > 0.3) {
          relationships.push({
            source_memory_id: memory.id,
            target_memory_id: similar.id,
            relationship_type: 'tag_similarity',
            strength: overlapRatio,
            created_at: now,
            metadata: {
              shared_tags: Array.from(intersection),
              overlap_ratio: overlapRatio,
              total_shared: intersection.size
            }
          });
        }
      }

      return relationships;

    } catch (error) {
      console.error('Failed to detect tag similarity:', error);
      return [];
    }
  }

  private async detectTemporalProximity(memory: ProcessedMemory): Promise<MemoryRelationship[]> {
    const relationships: MemoryRelationship[] = [];
    const now = Date.now();
    const memoryTime = memory.created_at;
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    try {
      // Get memories from similar timeframe
      const similarMemories = await this.storage.findSimilarMemories(
        memory.embedding,
        memory.user_id,
        memory.project_name,
        50, // larger set for temporal analysis
        0.3  // very low similarity threshold
      );

      for (const similar of similarMemories) {
        if (similar.id === memory.id) continue;

        const timeDiff = Math.abs(memoryTime - similar.created_at);
        
        if (timeDiff <= timeWindow) {
          // Calculate temporal strength (closer in time = higher strength)
          const temporalStrength = 1 - (timeDiff / timeWindow);
          
          // Apply minimum threshold
          if (temporalStrength > 0.1) {
            relationships.push({
              source_memory_id: memory.id,
              target_memory_id: similar.id,
              relationship_type: 'temporal_proximity',
              strength: temporalStrength,
              created_at: now,
              metadata: {
                time_diff_ms: timeDiff,
                time_diff_hours: Math.round(timeDiff / (60 * 60 * 1000) * 10) / 10
              }
            });
          }
        }
      }

      return relationships;

    } catch (error) {
      console.error('Failed to detect temporal proximity:', error);
      return [];
    }
  }

  async storeRelationships(relationships: MemoryRelationship[]): Promise<void> {
    // For now, we'll just log the relationships
    // In a full implementation, you'd store these in a graph database or relationships table
    
    if (relationships.length > 0) {
      console.log(`Storing ${relationships.length} relationships:`, 
        relationships.map(rel => ({
          type: rel.relationship_type,
          strength: rel.strength,
          source: rel.source_memory_id,
          target: rel.target_memory_id
        }))
      );
    }

    // TODO: Implement actual relationship storage
    // This could be:
    // 1. A separate relationships collection in Qdrant
    // 2. A graph database like Neo4j
    // 3. A relational database table
    // 4. Published as events to NATS for other services to consume
  }
}