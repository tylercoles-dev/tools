// Memory Database Layer
// Database schema and operations for memory storage

import { Kysely, sql } from 'kysely';
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
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
    // TODO: Add PostgreSQL dialect support
    if (config.type === 'sqlite') {
      const database = new Database(config.filename || './memory.db');
      this.db = new Kysely<Database>({
        dialect: new SqliteDialect({ database })
      });
    } else {
      throw new Error('PostgreSQL support not yet implemented');
    }
  }

  async initialize(): Promise<void> {
    // TODO: Create database tables
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // Create memories table
    await this.db.schema
      .createTable('memories')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('content_hash', 'text', (col) => col.notNull())
      .addColumn('context', 'text', (col) => col.notNull()) // JSON
      .addColumn('importance', 'integer', (col) => col.notNull().defaultTo(1))
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('access_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('last_accessed_at', 'text')
      .addColumn('vector_id', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('created_by', 'text')
      .addColumn('metadata', 'text') // JSON
      .execute();

    // Create relationships table
    await this.db.schema
      .createTable('relationships')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('source_id', 'text', (col) => col.notNull())
      .addColumn('target_id', 'text', (col) => col.notNull())
      .addColumn('relationship_type', 'text', (col) => col.notNull())
      .addColumn('strength', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('bidirectional', 'boolean', (col) => col.notNull().defaultTo(false))
      .addColumn('metadata', 'text', (col) => col.notNull().defaultTo('{}'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('last_updated', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .execute();

    // Create concepts table
    await this.db.schema
      .createTable('concepts')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('confidence', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('extracted_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .execute();

    // Create memory_concepts junction table
    await this.db.schema
      .createTable('memory_concepts')
      .ifNotExists()
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('concept_id', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .execute();

    // Add indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(content_hash)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_concepts_memory ON memory_concepts(memory_id)`.execute(this.db);
  }

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

  get kysely() {
    return this.db;
  }
}