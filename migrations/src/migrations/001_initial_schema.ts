/**
 * Initial schema migration - creates all base tables for MCP Tools ecosystem
 * Consolidates schemas from kanban, wiki, and memory services
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const createInitialSchema: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 001_initial_schema (up)');

    // ===================
    // KANBAN TABLES
    // ===================
    
    // Boards table
    await db.schema
      .createTable('boards')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#6366f1'))
      .execute();

    // Columns table (kanban columns/swim lanes)
    await db.schema
      .createTable('columns')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#64748b'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_columns_board', ['board_id'], 'boards', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Cards table
    await db.schema
      .createTable('cards')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('column_id', 'integer', (col) => col.notNull())
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('priority', 'varchar(20)', (col) => col.defaultTo('medium'))
      .addColumn('assigned_to', 'varchar(255)')
      .addColumn('due_date', 'date')
      .addColumn('estimated_hours', 'real')
      .addColumn('actual_hours', 'real')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_cards_board', ['board_id'], 'boards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_cards_column', ['column_id'], 'columns', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Tags table (kanban tags)
    await db.schema
      .createTable('tags')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#64748b'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Card tags junction table
    await db.schema
      .createTable('card_tags')
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('tag_id', 'integer', (col) => col.notNull())
      .addPrimaryKeyConstraint('pk_card_tags', ['card_id', 'tag_id'])
      .addForeignKeyConstraint('fk_card_tags_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_tags_tag', ['tag_id'], 'tags', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Comments table (kanban card comments)
    await db.schema
      .createTable('comments')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('author', 'varchar(255)')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_comments_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // ===================
    // WIKI TABLES
    // ===================

    // Pages table
    await db.schema
      .createTable('pages')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('slug', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('summary', 'text')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('created_by', 'varchar(255)')
      .addColumn('updated_by', 'varchar(255)')
      .addColumn('is_published', 'boolean', (col) => col.defaultTo(true))
      .addColumn('parent_id', 'integer')
      .addColumn('sort_order', 'integer', (col) => col.defaultTo(0))
      .addForeignKeyConstraint('fk_pages_parent', ['parent_id'], 'pages', ['id'], (cb) => cb.onDelete('set null'))
      .execute();

    // Categories table (wiki categories)
    await db.schema
      .createTable('categories')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('description', 'text')
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#6366f1'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Page categories junction table
    await db.schema
      .createTable('page_categories')
      .addColumn('page_id', 'integer', (col) => col.notNull())
      .addColumn('category_id', 'integer', (col) => col.notNull())
      .addPrimaryKeyConstraint('pk_page_categories', ['page_id', 'category_id'])
      .addForeignKeyConstraint('fk_page_categories_page', ['page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_page_categories_category', ['category_id'], 'categories', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Wiki tags table (separate from kanban tags to avoid conflicts)
    await db.schema
      .createTable('wiki_tags')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#64748b'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Page tags junction table
    await db.schema
      .createTable('page_tags')
      .addColumn('page_id', 'integer', (col) => col.notNull())
      .addColumn('tag_id', 'integer', (col) => col.notNull())
      .addPrimaryKeyConstraint('pk_page_tags', ['page_id', 'tag_id'])
      .addForeignKeyConstraint('fk_page_tags_page', ['page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_page_tags_tag', ['tag_id'], 'wiki_tags', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Page links table (internal wiki links)
    await db.schema
      .createTable('page_links')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('source_page_id', 'integer', (col) => col.notNull())
      .addColumn('target_page_id', 'integer', (col) => col.notNull())
      .addColumn('link_text', 'varchar(255)')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addUniqueConstraint('uk_page_links', ['source_page_id', 'target_page_id'])
      .addForeignKeyConstraint('fk_page_links_source', ['source_page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_page_links_target', ['target_page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Wiki attachments table
    await db.schema
      .createTable('wiki_attachments')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('page_id', 'integer', (col) => col.notNull())
      .addColumn('filename', 'text', (col) => col.notNull())
      .addColumn('original_name', 'text', (col) => col.notNull())
      .addColumn('mime_type', 'text', (col) => col.notNull())
      .addColumn('size_bytes', 'integer', (col) => col.notNull())
      .addColumn('storage_path', 'text', (col) => col.notNull())
      .addColumn('thumbnail_path', 'text')
      .addColumn('description', 'text')
      .addColumn('uploaded_by', 'text')
      .addColumn('uploaded_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_wiki_attachments_page', ['page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Page history table (version control)
    await db.schema
      .createTable('page_history')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('page_id', 'integer', (col) => col.notNull())
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('summary', 'text')
      .addColumn('changed_by', 'varchar(255)')
      .addColumn('change_reason', 'varchar(500)')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_page_history_page', ['page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Wiki comments table (separate from kanban comments)
    await db.schema
      .createTable('wiki_comments')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('page_id', 'integer', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('author', 'varchar(255)')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('parent_id', 'integer')
      .addForeignKeyConstraint('fk_wiki_comments_page', ['page_id'], 'pages', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_wiki_comments_parent', ['parent_id'], 'wiki_comments', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // ===================
    // MEMORY TABLES
    // ===================

    // Memories table
    await db.schema
      .createTable('memories')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('content_hash', 'text', (col) => col.notNull())
      .addColumn('context', 'text', (col) => col.notNull()) // JSON
      .addColumn('importance', 'integer', (col) => col.notNull().defaultTo(1))
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('access_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('last_accessed_at', 'text')
      .addColumn('vector_id', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_by', 'text')
      .addColumn('metadata', 'text') // JSON
      .execute();

    // Relationships table (memory connections)
    await db.schema
      .createTable('relationships')
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
      .addForeignKeyConstraint('fk_relationships_source', ['source_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_relationships_target', ['target_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Concepts table
    await db.schema
      .createTable('concepts')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('confidence', 'real', (col) => col.notNull().defaultTo(1.0))
      .addColumn('extracted_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Memory concepts junction table
    await db.schema
      .createTable('memory_concepts')
      .addColumn('memory_id', 'text', (col) => col.notNull())
      .addColumn('concept_id', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addPrimaryKeyConstraint('pk_memory_concepts', ['memory_id', 'concept_id'])
      .addForeignKeyConstraint('fk_memory_concepts_memory', ['memory_id'], 'memories', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_memory_concepts_concept', ['concept_id'], 'concepts', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Usage tracking table
    await db.schema
      .createTable('usage_tracking')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('service', 'text', (col) => col.notNull())
      .addColumn('operation', 'text', (col) => col.notNull())
      .addColumn('tokens_used', 'integer')
      .addColumn('cost_usd', 'real')
      .addColumn('timestamp', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();


    logger.info('Migration 001_initial_schema completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 001_initial_schema (down)');

    // Drop tables in reverse dependency order
    const tables = [
      'usage_tracking',
      'memory_concepts',
      'concepts',
      'relationships',
      'memories',
      'wiki_comments',
      'page_history',
      'wiki_attachments',
      'page_links',
      'page_tags',
      'wiki_tags',
      'page_categories',
      'categories',
      'pages',
      'comments',
      'card_tags',
      'tags',
      'cards',
      'columns',
      'boards'
    ];

    for (const table of tables) {
      await db.schema.dropTable(table).ifExists().execute();
    }

    logger.info('Migration 001_initial_schema rollback completed');
  }
};