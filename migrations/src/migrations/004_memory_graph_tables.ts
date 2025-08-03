/**
 * Memory graph tables migration
 * Adds additional tables for memory merge tracking and enhanced graph functionality
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const addMemoryGraphTables: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 004_memory_graph_tables (up)');

    // Memory merges table - tracks merge operations for audit trail
    await db.schema
      .createTable('memory_merges')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('primary_memory_id', 'text', (col) => col.notNull())
      .addColumn('merged_memory_ids', 'text', (col) => col.notNull()) // JSON array of merged memory IDs
      .addColumn('strategy', 'text', (col) => col.notNull()) // Merge strategy used
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .addForeignKeyConstraint('fk_memory_merges_primary', ['primary_memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Memory snapshots table - for versioning and rollback capabilities
    await db.schema
      .createTable('memory_snapshots')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('snapshot_data', 'text', (col) => col.notNull()) // JSON snapshot of memory state
      .addColumn('version', 'integer', (col) => col.notNull())
      .addColumn('change_reason', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .addForeignKeyConstraint('fk_memory_snapshots_memory', ['memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .addUniqueConstraint('uk_memory_snapshots_version', ['memory_id', 'version'])
      .execute();

    // Concept hierarchies table - for concept taxonomy and relationships
    await db.schema
      .createTable('concept_hierarchies')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('parent_concept_id', 'text', (col) => col.notNull())
      .addColumn('child_concept_id', 'text', (col) => col.notNull())
      .addColumn('relationship_type', 'text', (col) => col.notNull().defaultTo('is-a'))
      .addColumn('strength', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addForeignKeyConstraint('fk_concept_hierarchies_parent', ['parent_concept_id'], 'concepts', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_concept_hierarchies_child', ['child_concept_id'], 'concepts', ['id'], (cb) => cb.onDelete('cascade'))
      .addUniqueConstraint('uk_concept_hierarchies', ['parent_concept_id', 'child_concept_id', 'relationship_type'])
      .execute();

    // Memory clusters table - for grouping related memories
    await db.schema
      .createTable('memory_clusters')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('cluster_type', 'text', (col) => col.notNull().defaultTo('semantic'))
      .addColumn('centroid_vector_id', 'text') // Reference to vector representing cluster center
      .addColumn('cohesion_score', 'real', (col) => col.defaultTo(0.0))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .execute();

    // Memory cluster memberships junction table
    await db.schema
      .createTable('memory_cluster_memberships')
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('cluster_id', 'text', (col) => col.notNull())
      .addColumn('membership_score', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addPrimaryKeyConstraint('pk_memory_cluster_memberships', ['memory_id', 'cluster_id'])
      .addForeignKeyConstraint('fk_memory_cluster_memberships_memory', ['memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_memory_cluster_memberships_cluster', ['cluster_id'], 'memory_clusters', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Context patterns table - for identifying recurring contexts
    await db.schema
      .createTable('context_patterns')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('pattern_name', 'text', (col) => col.notNull())
      .addColumn('pattern_type', 'text', (col) => col.notNull()) // 'project', 'user', 'temporal', 'domain'
      .addColumn('pattern_data', 'text', (col) => col.notNull()) // JSON pattern definition
      .addColumn('frequency', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('confidence', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('first_seen', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('last_seen', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .execute();

    // Memory context patterns junction table
    await db.schema
      .createTable('memory_context_patterns')
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('pattern_id', 'text', (col) => col.notNull())
      .addColumn('match_score', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addPrimaryKeyConstraint('pk_memory_context_patterns', ['memory_id', 'pattern_id'])
      .addForeignKeyConstraint('fk_memory_context_patterns_memory', ['memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_memory_context_patterns_pattern', ['pattern_id'], 'context_patterns', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Memory access logs table - for tracking access patterns
    await db.schema
      .createTable('memory_access_logs')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('access_type', 'text', (col) => col.notNull()) // 'read', 'update', 'search', 'link'
      .addColumn('user_id', 'text')
      .addColumn('session_id', 'text')
      .addColumn('context_data', 'text') // JSON context at time of access
      .addColumn('timestamp', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addForeignKeyConstraint('fk_memory_access_logs_memory', ['memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Knowledge graph metrics table - for tracking graph evolution
    await db.schema
      .createTable('knowledge_graph_metrics')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('metric_name', 'text', (col) => col.notNull())
      .addColumn('metric_value', 'real', (col) => col.notNull())
      .addColumn('metric_metadata', 'text') // JSON metadata for the metric
      .addColumn('calculation_timestamp', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('time_period', 'text') // 'hour', 'day', 'week', 'month'
      .addColumn('created_by', 'text')
      .execute();

    logger.info('Migration 004_memory_graph_tables completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 004_memory_graph_tables (down)');

    // Drop tables in reverse dependency order
    const tables = [
      'knowledge_graph_metrics',
      'memory_access_logs',
      'memory_context_patterns',
      'context_patterns',
      'memory_cluster_memberships',
      'memory_clusters',
      'concept_hierarchies',
      'memory_snapshots',
      'memory_merges'
    ];

    for (const table of tables) {
      await db.schema.dropTable(table).ifExists().execute();
    }

    logger.info('Migration 004_memory_graph_tables rollback completed');
  }
};