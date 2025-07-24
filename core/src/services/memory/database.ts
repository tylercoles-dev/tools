/**
 * Memory Database Layer
 */

import { Kysely, sql } from 'kysely';
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
import crypto from 'crypto';
import type { Memory, Relationship, Concept } from './types.js';

// Database schema interfaces
export interface MemoryDatabase {
  memories: Memory;
  relationships: Relationship;
  concepts: Concept;
  memory_concepts: {
    memory_id: string;
    concept_id: string;
    created_at: string;
  };
}

import type { DatabaseConfig } from '../../utils/database.js';

export class MemoryDatabaseManager {
  private db: Kysely<MemoryDatabase>;

  constructor(config: DatabaseConfig) {
    if (config.type === 'sqlite') {
      const database = new Database(config.filename || './memory.db');
      this.db = new Kysely<MemoryDatabase>({
        dialect: new SqliteDialect({ database })
      });
    } else {
      throw new Error('PostgreSQL support not yet implemented');
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Creating memory database tables...');
      await this.createTables();
      console.log('✅ Memory database tables created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to create memory tables:', errorMessage);
      console.error('Error details:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // Create memories table
    await this.db.schema
      .createTable('memories')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('content_hash', 'text', (col) => col.notNull())
      .addColumn('context', 'text', (col) => col.notNull())
      .addColumn('importance', 'integer', (col) => col.notNull().defaultTo(1))
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('access_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('last_accessed_at', 'text')
      .addColumn('vector_id', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .addColumn('metadata', 'text')
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
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('last_updated', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
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
      .addColumn('extracted_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create memory_concepts junction table
    await this.db.schema
      .createTable('memory_concepts')
      .ifNotExists()
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('concept_id', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addPrimaryKeyConstraint('primary_key', ['memory_id', 'concept_id'])
      .execute();

    // Add indexes for performance
    await this.db.schema
      .createIndex('idx_memories_content_hash')
      .ifNotExists()
      .on('memories')
      .columns(['content_hash'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_memories_created_at')
      .ifNotExists()
      .on('memories')
      .columns(['created_at'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_relationships_source')
      .ifNotExists()
      .on('relationships')
      .columns(['source_id'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_relationships_target')
      .ifNotExists()
      .on('relationships')
      .columns(['target_id'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_concepts_name')
      .ifNotExists()
      .on('concepts')
      .columns(['name'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_memory_concepts_memory')
      .ifNotExists()
      .on('memory_concepts')
      .columns(['memory_id'])
      .execute();
  }

  get kysely() {
    return this.db;
  }

  // Repository methods
  async createMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<Memory> {
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

  async getMemory(id: string): Promise<Memory | undefined> {
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
  }): Promise<Memory[]> {
    let query = this.db.selectFrom('memories').selectAll();
    
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
    
    return await query.execute();
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
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

  async createRelationship(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    return await this.db
      .insertInto('relationships')
      .values({
        id,
        created_at: now,
        updated_at: now,
        ...relationship,
        last_updated: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getRelationships(memoryId: string): Promise<Relationship[]> {
    return await this.db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) => eb.or([
        eb('source_id', '=', memoryId),
        eb('target_id', '=', memoryId)
      ]))
      .execute();
  }

  async createConcept(concept: Omit<Concept, 'id' | 'created_at' | 'updated_at'>): Promise<Concept> {
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

  async findConceptByName(name: string): Promise<Concept | undefined> {
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

  async getMemoryConcepts(memoryId: string): Promise<Concept[]> {
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

  async close(): Promise<void> {
    await this.db.destroy();
  }
}