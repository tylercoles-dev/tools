/**
 * Qdrant vector storage implementation
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { ProcessedMemory, SimilarMemory, WorkerConfig } from '../types.js';
import { VectorStorageError } from '../types.js';

export class QdrantStorage {
  private client: QdrantClient;
  private collectionName: string;

  constructor(config: WorkerConfig) {
    const url = new URL(config.qdrantUrl);
    this.client = new QdrantClient({
      url: config.qdrantUrl,
      port: parseInt(url.port) || 6333,
    });
    this.collectionName = config.collectionName;
  }

  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (!collectionExists) {
        console.log(`Creating collection: ${this.collectionName}`);
        await this.createCollection();
      } else {
        console.log(`Collection ${this.collectionName} already exists`);
      }

      // Verify collection is ready
      const info = await this.client.getCollection(this.collectionName);
      console.log(`Collection info:`, {
        name: info.collection_name,
        vectorsCount: info.vectors_count,
        status: info.status,
        pointsCount: info.points_count,
      });

    } catch (error) {
      throw new VectorStorageError(
        `Failed to initialize Qdrant storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async createCollection(): Promise<void> {
    try {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 768, // Default dimension, will be updated dynamically
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      console.log(`Created collection: ${this.collectionName}`);

    } catch (error) {
      throw new VectorStorageError(
        `Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_COLLECTION',
        error instanceof Error ? error : undefined
      );
    }
  }

  async storeMemory(memory: ProcessedMemory): Promise<void> {
    try {
      const point = {
        id: memory.id,
        vector: memory.embedding,
        payload: {
          content: memory.content,
          user_id: memory.user_id,
          project_name: memory.project_name,
          memory_topic: memory.memory_topic,
          memory_type: memory.memory_type,
          tags: memory.tags,
          created_at: memory.created_at,
          processed_at: memory.processed_at,
        },
      };

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [point],
      });

    } catch (error) {
      throw new VectorStorageError(
        `Failed to store memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORE_MEMORY',
        error instanceof Error ? error : undefined
      );
    }
  }

  async storeMemoriesBatch(memories: ProcessedMemory[]): Promise<void> {
    if (memories.length === 0) return;

    try {
      const points = memories.map((memory) => ({
        id: memory.id,
        vector: memory.embedding,
        payload: {
          content: memory.content,
          user_id: memory.user_id,
          project_name: memory.project_name,
          memory_topic: memory.memory_topic,
          memory_type: memory.memory_type,
          tags: memory.tags,
          created_at: memory.created_at,
          processed_at: memory.processed_at,
        },
      }));

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });

      console.log(`Stored batch of ${memories.length} memories`);

    } catch (error) {
      throw new VectorStorageError(
        `Failed to store memory batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORE_BATCH',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findSimilarMemories(
    embedding: number[],
    userId: string,
    projectName?: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SimilarMemory[]> {
    try {
      const filter: any = {
        must: [
          {
            key: 'user_id',
            match: { value: userId },
          },
        ],
      };

      if (projectName) {
        filter.must.push({
          key: 'project_name',
          match: { value: projectName },
        });
      }

      const searchResult = await this.client.search(this.collectionName, {
        vector: embedding,
        limit,
        score_threshold: threshold,
        filter,
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id as string,
        similarity_score: result.score,
        content: result.payload?.content as string,
        tags: (result.payload?.tags as string[]) || [],
        memory_topic: result.payload?.memory_topic as string | undefined,
        created_at: result.payload?.created_at as number,
      }));

    } catch (error) {
      throw new VectorStorageError(
        `Failed to find similar memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_SIMILAR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getMemory(id: string): Promise<ProcessedMemory | null> {
    try {
      const result = await this.client.retrieve(this.collectionName, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });

      if (result.length === 0) {
        return null;
      }

      const point = result[0];
      const payload = point.payload;

      if (!payload || !point.vector) {
        return null;
      }

      return {
        id: point.id as string,
        content: payload.content as string,
        user_id: payload.user_id as string,
        project_name: payload.project_name as string,
        memory_topic: payload.memory_topic as string | undefined,
        memory_type: payload.memory_type as string | undefined,
        tags: (payload.tags as string[]) || [],
        embedding: point.vector as number[],
        created_at: payload.created_at as number,
        processed_at: payload.processed_at as number,
      };

    } catch (error) {
      throw new VectorStorageError(
        `Failed to get memory ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_MEMORY',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });

      console.log(`Deleted memory: ${id}`);

    } catch (error) {
      throw new VectorStorageError(
        `Failed to delete memory ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_MEMORY',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      throw new VectorStorageError(
        `Failed to get collection info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_COLLECTION_INFO',
        error instanceof Error ? error : undefined
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some(
        (collection) => collection.name === this.collectionName
      );
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    // Qdrant client doesn't need explicit closing
    console.log('Qdrant storage closed');
  }
}