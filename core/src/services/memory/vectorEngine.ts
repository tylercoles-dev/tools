/**
 * Vector Engine for Memory Search
 */

import { connect, NatsConnection } from 'nats';

// Vector store configuration
export interface VectorConfig {
  vectorSize: number;
  natsUrl?: string;
}

// Simple in-memory vector store for development
interface VectorPoint {
  id: string;
  vector: number[];
  payload: any;
}

export class VectorEngine {
  private vectorStore: VectorPoint[] = [];
  private natsConnection?: NatsConnection;

  constructor(private config: VectorConfig) {
    // In production, would initialize actual vector database here
  }

  async initialize(): Promise<void> {
    try {
      // Initialize NATS connection for worker communication
      try {
        this.natsConnection = await connect({ 
          servers: this.config.natsUrl || 'nats://localhost:4222' 
        });
        console.log('Connected to NATS for embedding service');
      } catch (natsError) {
        console.warn('Failed to connect to NATS, using dummy embeddings:', natsError);
      }

      // Initialize in-memory vector store
      this.vectorStore = [];
      console.log('Initialized in-memory vector store');
    } catch (error) {
      console.error('Failed to initialize vector engine:', error);
      throw error;
    }
  }

  async indexMemory(memoryId: string, content: string, metadata: any): Promise<string> {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);
      
      // Store in memory vector store
      const existingIndex = this.vectorStore.findIndex(p => p.id === memoryId);
      const point: VectorPoint = {
        id: memoryId,
        vector: embedding,
        payload: {
          memoryId,
          content: content.substring(0, 1000), // Store truncated content for filtering
          ...metadata
        }
      };
      
      if (existingIndex >= 0) {
        this.vectorStore[existingIndex] = point;
      } else {
        this.vectorStore.push(point);
      }
      
      return memoryId; // Using memoryId as vectorId for simplicity
    } catch (error) {
      console.error('Failed to index memory:', error);
      throw error;
    }
  }

  async findSimilar(content: string, threshold: number = 0.7, limit: number = 10): Promise<Array<{
    memoryId: string;
    similarity: number;
  }>> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(content);
      
      // Calculate cosine similarity with all stored vectors
      const similarities = this.vectorStore.map(point => {
        const similarity = this.cosineSimilarity(queryEmbedding, point.vector);
        return {
          memoryId: point.payload.memoryId,
          similarity
        };
      });
      
      // Filter by threshold and sort by similarity
      return similarities
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to find similar memories:', error);
      throw error;
    }
  }

  async updateVector(memoryId: string, content: string, metadata: any): Promise<void> {
    // Re-index the memory with new content
    await this.indexMemory(memoryId, content, metadata);
  }

  async deleteVector(vectorId: string): Promise<void> {
    try {
      const index = this.vectorStore.findIndex(p => p.id === vectorId);
      if (index >= 0) {
        this.vectorStore.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.natsConnection) {
      try {
        // Send embedding request to worker via NATS
        const response = await this.natsConnection.request(
          'embedding.generate',
          JSON.stringify({ text, model: 'text-embedding-3-small' }),
          { timeout: 10000 }
        );
        
        const result = JSON.parse(new TextDecoder().decode(response.data));
        if (result.embedding && Array.isArray(result.embedding)) {
          return result.embedding;
        }
      } catch (error) {
        console.warn('Failed to get embedding from worker, using dummy:', error);
      }
    }
    
    // Fallback to dummy embedding vector for testing
    const vector = Array.from({ length: this.config.vectorSize }, () => Math.random() - 0.5);
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async convertToMarkdown(content: string, options?: {
    contentType?: string;
    filename?: string;
    preserveFormatting?: boolean;
  }): Promise<string> {
    if (this.natsConnection) {
      try {
        // Send document conversion request to MarkItDown worker
        const response = await this.natsConnection.request(
          'markitdown.convert.document',
          JSON.stringify({
            content,
            contentType: options?.contentType,
            filename: options?.filename,
            options: {
              preserveFormatting: options?.preserveFormatting ?? true,
              includeMetadata: false,
              stripImages: false
            }
          }),
          { timeout: 30000 }
        );
        
        const result = JSON.parse(new TextDecoder().decode(response.data));
        if (result.success && result.markdown) {
          return result.markdown;
        } else {
          console.warn('MarkItDown conversion failed:', result.error);
          return content; // Fallback to original content
        }
      } catch (error) {
        console.warn('Failed to convert document via MarkItDown worker:', error);
        return content; // Fallback to original content
      }
    }
    
    return content; // No NATS connection, return original content
  }

  async convertUrlToMarkdown(url: string, options?: {
    preserveFormatting?: boolean;
    timeout?: number;
  }): Promise<string> {
    if (this.natsConnection) {
      try {
        // Send URL conversion request to MarkItDown worker
        const response = await this.natsConnection.request(
          'markitdown.convert.url',
          JSON.stringify({
            url,
            options: {
              preserveFormatting: options?.preserveFormatting ?? true,
              includeMetadata: false,
              stripImages: false,
              timeout: options?.timeout ?? 30000
            }
          }),
          { timeout: (options?.timeout ?? 30000) + 5000 } // Add 5s buffer
        );
        
        const result = JSON.parse(new TextDecoder().decode(response.data));
        if (result.success && result.markdown) {
          return result.markdown;
        } else {
          console.warn('MarkItDown URL conversion failed:', result.error);
          throw new Error(`Failed to convert URL: ${result.error}`);
        }
      } catch (error) {
        console.warn('Failed to convert URL via MarkItDown worker:', error);
        throw error;
      }
    }
    
    throw new Error('No NATS connection available for document conversion');
  }

  async close(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.close();
    }
  }
}