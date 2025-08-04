// Memory Database Layer (PostgreSQL only)
// Database schema and operations for memory storage

import { Kysely, sql } from 'kysely';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import crypto from 'crypto';
import type { DatabaseConfig } from '../types/index.js';

// Database schema interfaces
export interface MemoryTable {
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

export interface RelationshipTable {
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

export interface ConceptTable {
  id: string;
  name: string;
  description: string | null;
  type: 'entity' | 'topic' | 'skill' | 'project' | 'person' | 'custom';
  confidence: number;
  extracted_at: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryConceptTable {
  memory_id: string;
  concept_id: string;
  created_at: string;
}

export interface Database {
  memories: MemoryTable;
  relationships: RelationshipTable;
  concepts: ConceptTable;
  memory_concepts: MemoryConceptTable;
}

export class MemoryDatabase {
  private db: Kysely<Database>;

  constructor(private config: DatabaseConfig) {
    if (config.type !== 'postgres') {
      throw new Error(`Only PostgreSQL is supported. Received: ${config.type}`);
    }

    let dialect;
    if (config.connectionString) {
      dialect = new PostgresDialect({
        pool: new Pool({
          connectionString: config.connectionString,
        }),
      });
    } else {
      dialect = new PostgresDialect({
        pool: new Pool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
        }),
      });
    }

    this.db = new Kysely<Database>({ dialect });
  }

  async initialize(): Promise<void> {
    // Database initialization is now handled by the dedicated migration service
    // This method is kept for compatibility but performs no database setup
    console.log('Memory database initialization: Database migrations are handled by the migration service');
    
    // Test database connection to ensure it's available
    try {
      await this.db.selectFrom('memories').select('id').limit(1).execute();
      console.log('Memory database connection verified successfully');
    } catch (error) {
      console.error('Memory database connection failed. Ensure migration service has completed:', error);
      throw new Error('Database not available. Migration service may not have completed successfully.');
    }
  }

  // Database schema creation is now handled by the dedicated migration service

  // Repository methods
  async createMemory(memory: Omit<MemoryTable, 'id' | 'created_at' | 'updated_at'>): Promise<MemoryTable> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const result = await this.db
      .insertInto('memories')
      .values({
        id,
        created_at: now,
        updated_at: now,
        ...memory
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getMemory(id: string): Promise<MemoryTable | undefined> {
    return await this.db
      .selectFrom('memories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async searchMemories(filters: {
    contentHash?: string;
    status?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<MemoryTable[]> {
    let query = this.db.selectFrom('memories').selectAll();
    
    if (filters.contentHash) {
      query = query.where('content_hash', '=', filters.contentHash);
    }
    if (filters.status) {
      query = query.where('status', '=', filters.status);
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
    
    return await query.execute();
  }

  async updateMemory(id: string, updates: Partial<MemoryTable>): Promise<MemoryTable> {
    const now = new Date().toISOString();
    
    return await this.db
      .updateTable('memories')
      .set({ ...updates, updated_at: now })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db
      .deleteFrom('memories')
      .where('id', '=', id)
      .execute();
  }

  async createRelationship(relationship: Omit<RelationshipTable, 'id' | 'created_at' | 'updated_at'>): Promise<RelationshipTable> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    return await this.db
      .insertInto('relationships')
      .values({
        id,
        created_at: now,
        updated_at: now,
        last_updated: now,
        ...relationship
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getRelationships(memoryId: string): Promise<RelationshipTable[]> {
    return await this.db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) => eb.or([
        eb('source_id', '=', memoryId),
        eb('target_id', '=', memoryId)
      ]))
      .execute();
  }

  async createConcept(concept: Omit<ConceptTable, 'id' | 'created_at' | 'updated_at'>): Promise<ConceptTable> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    return await this.db
      .insertInto('concepts')
      .values({
        id,
        created_at: now,
        updated_at: now,
        ...concept
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findConceptByName(name: string): Promise<ConceptTable | undefined> {
    return await this.db
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();
  }

  async linkMemoryConcept(memoryId: string, conceptId: string): Promise<void> {
    await this.db
      .insertInto('memory_concepts')
      .values({
        memory_id: memoryId,
        concept_id: conceptId,
        created_at: new Date().toISOString()
      })
      .execute();
  }

  async getMemoryConcepts(memoryId: string): Promise<ConceptTable[]> {
    return await this.db
      .selectFrom('memory_concepts')
      .innerJoin('concepts', 'concepts.id', 'memory_concepts.concept_id')
      .selectAll('concepts')
      .where('memory_concepts.memory_id', '=', memoryId)
      .execute();
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
    let memoryQuery = this.db.selectFrom('memories').select(sql`count(*)`.as('count'));
    
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
      this.db.selectFrom('relationships').select(sql`count(*)`.as('count')).executeTakeFirstOrThrow(),
      this.db.selectFrom('concepts').select(sql`count(*)`.as('count')).executeTakeFirstOrThrow()
    ]);
    
    return {
      totalMemories: Number(memoryCount.count),
      totalRelationships: Number(relationshipCount.count),
      totalConcepts: Number(conceptCount.count)
    };
  }

  async getAverageImportance(): Promise<number> {
    const result = await this.db
      .selectFrom('memories')
      .select(sql`avg(importance)`.as('average'))
      .where('status', '=', 'active')
      .executeTakeFirst();
    
    return Number(result?.average) || 1;
  }

  async getMostActiveUsers(limit: number = 10): Promise<Array<{ created_by: string; memory_count: number }>> {
    const results = await this.db
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
    const results = await this.db
      .selectFrom('memories')
      .select([
        sql`JSON_EXTRACT(context, '$.projectName')`.as('project_name'),
        sql`count(*)`.as('memory_count')
      ])
      .where('status', '=', 'active')
      .where(sql`JSON_EXTRACT(context, '$.projectName')`, 'is not', null)
      .groupBy(sql`JSON_EXTRACT(context, '$.projectName')`)
      .orderBy('memory_count', 'desc')
      .limit(limit)
      .execute();
    
    return results.map(r => ({
      project_name: r.project_name as string,
      memory_count: Number(r.memory_count)
    }));
  }

  async getConceptDistribution(): Promise<Record<string, number>> {
    const results = await this.db
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
    await this.db
      .deleteFrom('memory_concepts')
      .where('memory_id', '=', memoryId)
      .execute();
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await this.db
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
    // Create merge_audit table if it doesn't exist
    await this.db.schema
      .createTable('memory_merges')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('primary_memory_id', 'text', (col) => col.notNull())
      .addColumn('merged_memory_ids', 'text', (col) => col.notNull())
      .addColumn('strategy', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('created_by', 'text')
      .execute();

    // Insert audit record
    await this.db
      .insertInto('memory_merges')
      .values({
        id: crypto.randomUUID(),
        ...auditData
      })
      .execute();
  }

  get kysely() {
    return this.db;
  }
}