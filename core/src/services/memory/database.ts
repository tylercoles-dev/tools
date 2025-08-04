/**
 * Memory Database Layer - PostgreSQL implementation with Kysely
 */

import { Kysely, sql } from 'kysely';
import crypto from 'crypto';
import { DatabaseConnectionManager, createDatabaseConfig } from '../../utils/database.js';
import type { DatabaseConfig } from '../../utils/database.js';
import type { Memory, Relationship, Concept } from './types.js';

// Database schema interfaces
export interface MemoryDatabase {
  memories: Omit<Memory, 'id'> & { id?: string };
  relationships: Omit<Relationship, 'id'> & { id?: string };
  concepts: Omit<Concept, 'id'> & { id?: string };
  memory_concepts: {
    memory_id: string;
    concept_id: string;
    created_at: string;
  };
  memory_merges: {
    id?: string;
    primary_memory_id: string;
    merged_memory_ids: string;
    strategy: string;
    created_at: string;
    created_by: string | null;
  };
}

export class MemoryDatabaseManager {
  private dbManager: DatabaseConnectionManager<MemoryDatabase>;

  constructor(config?: Partial<DatabaseConfig>) {
    const dbConfig = createDatabaseConfig({
      database: 'memory_db',
      ...config
    });
    this.dbManager = new DatabaseConnectionManager<MemoryDatabase>(dbConfig);
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing memory database connection...');
      await this.dbManager.initialize();
      console.log('🔄 Testing memory database connection...');
      await this.testConnection();
      console.log('✅ Memory database connection verified successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to connect to memory database:', errorMessage);
      console.error('Error details:', error);
      throw error;
    }
  }

  get kysely(): Kysely<MemoryDatabase> {
    return this.dbManager.kysely;
  }

  private async testConnection(): Promise<void> {
    try {
      await this.kysely.selectFrom('memories').select('id').limit(1).execute();
      console.log('✅ Memory database tables verified successfully');
    } catch (error) {
      console.error('❌ Memory database tables not available. Ensure migration service has completed:', error);
      throw new Error('Memory database not available. Migration service may not have completed successfully.');
    }
  }

  // Repository methods
  async createMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<Memory> {
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.kysely
      .insertInto('memories')
      .values({
        created_at: now,
        updated_at: now,
        ...memory
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result as Memory;
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    const result = await this.kysely
      .selectFrom('memories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result as Memory | undefined;
  }

  async searchMemories(filters: {
    contentHash?: string;
    status?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<Memory[]> {
    let query = this.kysely.selectFrom('memories').selectAll();
    
    if (filters.contentHash) {
      query = query.where('content_hash', '=', filters.contentHash);
    }
    if (filters.status) {
      query = query.where('status', '=', filters.status as 'active' | 'archived' | 'merged');
    }
    if (filters.createdBy) {
      query = query.where('created_by', '=', filters.createdBy);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    const results = await query.execute();
    return results as Memory[];
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.kysely
      .updateTable('memories')
      .set({ ...updates, updated_at: now })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result as Memory;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.kysely
      .deleteFrom('memories')
      .where('id', '=', id)
      .execute();
  }

  async createRelationship(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.kysely
      .insertInto('relationships')
      .values({
        created_at: now,
        updated_at: now,
        ...relationship,
        last_updated: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result as Relationship;
  }

  async getRelationships(memoryId: string): Promise<Relationship[]> {
    const results = await this.kysely
      .selectFrom('relationships')
      .selectAll()
      .where((eb) => eb.or([
        eb('source_id', '=', memoryId),
        eb('target_id', '=', memoryId)
      ]))
      .execute();
    
    return results as Relationship[];
  }

  async createConcept(concept: Omit<Concept, 'id' | 'created_at' | 'updated_at'>): Promise<Concept> {
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.kysely
      .insertInto('concepts')
      .values({
        created_at: now,
        updated_at: now,
        ...concept
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result as Concept;
  }

  async findConceptByName(name: string): Promise<Concept | undefined> {
    const result = await this.kysely
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();
    
    return result as Concept | undefined;
  }

  async linkMemoryConcept(memoryId: string, conceptId: string): Promise<void> {
    await this.kysely
      .insertInto('memory_concepts')
      .values({
        memory_id: memoryId,
        concept_id: conceptId,
        created_at: this.dbManager.getCurrentTimestamp()
      })
      .execute();
  }

  async getMemoryConcepts(memoryId: string): Promise<Concept[]> {
    const results = await this.kysely
      .selectFrom('memory_concepts')
      .innerJoin('concepts', 'concepts.id', 'memory_concepts.concept_id')
      .selectAll('concepts')
      .where('memory_concepts.memory_id', '=', memoryId)
      .execute();
    
    return results as Concept[];
  }

  async getMemoryStats(filters?: {
    userId?: string;
    projectName?: string;
    dateRange?: { from: string; to: string };
  }): Promise<{
    totalMemories: number;
    totalRelationships: number;
    totalConcepts: number;
  }> {
    let memoryQuery = this.kysely.selectFrom('memories').select(sql`count(*)`.as('count'));
    
    if (filters?.userId) {
      memoryQuery = memoryQuery.where('created_by', '=', filters.userId);
    }
    if (filters?.dateRange) {
      memoryQuery = memoryQuery
        .where('created_at', '>=', filters.dateRange.from)
        .where('created_at', '<=', filters.dateRange.to);
    }
    
    const [memoryCount, relationshipCount, conceptCount] = await Promise.all([
      memoryQuery.executeTakeFirstOrThrow(),
      this.kysely.selectFrom('relationships').select(sql`count(*)`.as('count')).executeTakeFirstOrThrow(),
      this.kysely.selectFrom('concepts').select(sql`count(*)`.as('count')).executeTakeFirstOrThrow()
    ]);
    
    return {
      totalMemories: Number(memoryCount.count),
      totalRelationships: Number(relationshipCount.count),
      totalConcepts: Number(conceptCount.count)
    };
  }

  async getAverageImportance(): Promise<number> {
    const result = await this.kysely
      .selectFrom('memories')
      .select(sql`avg(importance)`.as('average'))
      .where('status', '=', 'active')
      .executeTakeFirst();
    
    return Number(result?.average) || 1;
  }

  async getMostActiveUsers(limit: number = 10): Promise<Array<{ created_by: string; memory_count: number }>> {
    const results = await this.kysely
      .selectFrom('memories')
      .select(['created_by', sql`count(*)`.as('memory_count')])
      .where('created_by', 'is not', null)
      .where('status', '=', 'active')
      .groupBy('created_by')
      .orderBy('memory_count', 'desc')
      .limit(limit)
      .execute();
    
    return results.map(r => ({
      created_by: r.created_by!,
      memory_count: Number(r.memory_count)
    }));
  }

  async getTopProjects(limit: number = 10): Promise<Array<{ project_name: string; memory_count: number }>> {
    const results = await this.kysely
      .selectFrom('memories')
      .select([
        sql`context->>'projectName'`.as('project_name'),
        sql`count(*)`.as('memory_count')
      ])
      .where('status', '=', 'active')
      .where(sql`context->>'projectName'`, 'is not', null)
      .groupBy(sql`context->>'projectName'`)
      .orderBy('memory_count', 'desc')
      .limit(limit)
      .execute();
    
    return results.map(r => ({
      project_name: r.project_name as string,
      memory_count: Number(r.memory_count)
    }));
  }

  async getConceptDistribution(): Promise<Record<string, number>> {
    const results = await this.kysely
      .selectFrom('concepts')
      .select(['type', sql`count(*)`.as('count')])
      .groupBy('type')
      .execute();
    
    const distribution: Record<string, number> = {};
    for (const result of results) {
      distribution[result.type] = Number(result.count);
    }
    
    return distribution;
  }

  async clearMemoryConcepts(memoryId: string): Promise<void> {
    await this.kysely
      .deleteFrom('memory_concepts')
      .where('memory_id', '=', memoryId)
      .execute();
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await this.kysely
      .deleteFrom('relationships')
      .where('id', '=', relationshipId)
      .execute();
  }

  async createMergeAuditTrail(auditData: {
    primary_memory_id: string;
    merged_memory_ids: string;
    strategy: string;
    created_at: string;
    created_by: string | null;
  }): Promise<void> {
    // Insert audit record
    await this.kysely
      .insertInto('memory_merges')
      .values(auditData)
      .execute();
  }

  async close(): Promise<void> {
    await this.dbManager.close();
  }
}