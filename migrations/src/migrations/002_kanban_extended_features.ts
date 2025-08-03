/**
 * Extended Kanban features migration
 * Adds custom fields, milestones, subtasks, card links, time tracking, and activity logging
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const addKanbanExtendedFeatures: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 002_kanban_extended_features (up)');

    // Custom Fields table (board-level field definitions)
    await db.schema
      .createTable('custom_fields')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('field_type', 'varchar(50)', (col) => col.notNull())
      .addColumn('is_required', 'boolean', (col) => col.defaultTo(false))
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('options', 'text') // JSON string for dropdown/multi_select options
      .addColumn('validation_rules', 'text') // JSON string for validation rules
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_custom_fields_board', ['board_id'], 'boards', ['id'], (cb) => cb.onDelete('cascade'))
      .addUniqueConstraint('uk_custom_fields_board_name', ['board_id', 'name'])
      .execute();

    // Note: Check constraints for field_type are added to table creation above

    // Card Custom Field Values table
    await db.schema
      .createTable('card_custom_field_values')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('custom_field_id', 'integer', (col) => col.notNull())
      .addColumn('value', 'text') // Stored as text, parsed based on field_type
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_card_custom_field_values_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_custom_field_values_field', ['custom_field_id'], 'custom_fields', ['id'], (cb) => cb.onDelete('cascade'))
      .addUniqueConstraint('uk_card_custom_field_values', ['card_id', 'custom_field_id'])
      .execute();

    // Milestones table
    await db.schema
      .createTable('milestones')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('due_date', 'date')
      .addColumn('is_completed', 'boolean', (col) => col.defaultTo(false))
      .addColumn('completion_date', 'date')
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('color', 'varchar(7)', (col) => col.defaultTo('#6366f1'))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_milestones_board', ['board_id'], 'boards', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Card Milestones junction table
    await db.schema
      .createTable('card_milestones')
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('milestone_id', 'integer', (col) => col.notNull())
      .addPrimaryKeyConstraint('pk_card_milestones', ['card_id', 'milestone_id'])
      .addForeignKeyConstraint('fk_card_milestones_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_milestones_milestone', ['milestone_id'], 'milestones', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Card Subtasks table (hierarchical todo lists)
    await db.schema
      .createTable('card_subtasks')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('parent_subtask_id', 'integer') // For nested subtasks
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('is_completed', 'boolean', (col) => col.defaultTo(false))
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('assigned_to', 'varchar(255)')
      .addColumn('due_date', 'date')
      .addColumn('completed_at', 'timestamp')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_card_subtasks_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_subtasks_parent', ['parent_subtask_id'], 'card_subtasks', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Card Links table (relationships between cards)
    await db.schema
      .createTable('card_links')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('source_card_id', 'integer', (col) => col.notNull())
      .addColumn('target_card_id', 'integer', (col) => col.notNull())
      .addColumn('link_type', 'varchar(50)', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('created_by', 'varchar(255)')
      .addForeignKeyConstraint('fk_card_links_source', ['source_card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_links_target', ['target_card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addUniqueConstraint('uk_card_links', ['source_card_id', 'target_card_id', 'link_type'])
      .execute();

    // Note: Check constraints for link_type are added to table creation above

    // Time Entries table (time tracking)
    await db.schema
      .createTable('time_entries')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('user_name', 'varchar(255)')
      .addColumn('description', 'text')
      .addColumn('start_time', 'timestamp')
      .addColumn('end_time', 'timestamp')
      .addColumn('duration_minutes', 'integer') // Calculated or manually entered
      .addColumn('is_billable', 'boolean', (col) => col.defaultTo(false))
      .addColumn('hourly_rate', 'real')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_time_entries_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Card Activities table (activity tracking and audit log)
    await db.schema
      .createTable('card_activities')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('action_type', 'varchar(50)', (col) => col.notNull())
      .addColumn('user_id', 'varchar(255)')
      .addColumn('user_name', 'varchar(255)')
      .addColumn('details', 'text') // JSON string containing action-specific details
      .addColumn('old_values', 'text') // JSON string of previous values (for updates)
      .addColumn('new_values', 'text') // JSON string of new values (for updates)
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint('fk_card_activities_card', ['card_id'], 'cards', ['id'], (cb) => cb.onDelete('cascade'))
      .addForeignKeyConstraint('fk_card_activities_board', ['board_id'], 'boards', ['id'], (cb) => cb.onDelete('cascade'))
      .execute();

    // Note: Check constraints for action_type are added to table creation above

    logger.info('Migration 002_kanban_extended_features completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 002_kanban_extended_features (down)');

    // Drop tables in reverse dependency order
    const tables = [
      'card_activities',
      'time_entries',
      'card_links',
      'card_subtasks',
      'card_milestones',
      'milestones',
      'card_custom_field_values',
      'custom_fields'
    ];

    for (const table of tables) {
      await db.schema.dropTable(table).ifExists().execute();
    }

    logger.info('Migration 002_kanban_extended_features rollback completed');
  }
};