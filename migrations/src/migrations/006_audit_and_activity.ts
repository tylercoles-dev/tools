/**
 * Audit and activity tracking migration
 * Adds comprehensive audit trails and activity logging across all services
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const addAuditAndActivity: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 006_audit_and_activity (up)');

    // ===================
    // SYSTEM AUDIT TABLES
    // ===================

    // Global audit log table for cross-service auditing
    await db.schema
      .createTable('audit_logs')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('service', 'varchar(50)', (col) => col.notNull()) // 'kanban', 'wiki', 'memory'
      .addColumn('entity_type', 'varchar(100)', (col) => col.notNull()) // 'board', 'card', 'page', 'memory'
      .addColumn('entity_id', 'text', (col) => col.notNull())
      .addColumn('action', 'varchar(50)', (col) => col.notNull()) // 'create', 'update', 'delete', 'view'
      .addColumn('user_id', 'varchar(255)')
      .addColumn('user_name', 'varchar(255)')
      .addColumn('ip_address', 'varchar(45)')
      .addColumn('user_agent', 'text')
      .addColumn('session_id', 'varchar(255)')
      .addColumn('changes', 'text') // JSON of field changes
      .addColumn('metadata', 'text') // JSON of additional context
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // User sessions table for session tracking
    await db.schema
      .createTable('user_sessions')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
      .addColumn('user_name', 'varchar(255)')
      .addColumn('ip_address', 'varchar(45)')
      .addColumn('user_agent', 'text')
      .addColumn('login_timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('last_activity', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('logout_timestamp', 'timestamp')
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true))
      .addColumn('session_data', 'text') // JSON session context
      .execute();

    // System events table for application-level events
    await db.schema
      .createTable('system_events')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('event_type', 'varchar(100)', (col) => col.notNull()) // 'startup', 'shutdown', 'error', 'warning'
      .addColumn('service', 'varchar(50)', (col) => col.notNull())
      .addColumn('severity', 'varchar(20)', (col) => col.notNull()) // 'info', 'warn', 'error', 'critical'
      .addColumn('message', 'text', (col) => col.notNull())
      .addColumn('error_details', 'text') // JSON error stack/details
      .addColumn('context', 'text') // JSON context data
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // ===================
    // ACTIVITY TRACKING TABLES
    // ===================

    // User activity streams table
    await db.schema
      .createTable('user_activity_streams')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
      .addColumn('user_name', 'varchar(255)')
      .addColumn('activity_type', 'varchar(100)', (col) => col.notNull())
      .addColumn('service', 'varchar(50)', (col) => col.notNull())
      .addColumn('entity_type', 'varchar(100)', (col) => col.notNull())
      .addColumn('entity_id', 'text', (col) => col.notNull())
      .addColumn('entity_title', 'varchar(500)') // For display purposes
      .addColumn('action_description', 'text') // Human-readable description
      .addColumn('metadata', 'text') // JSON additional data
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Collaboration events table (for real-time collaboration)
    await db.schema
      .createTable('collaboration_events')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('room_id', 'varchar(255)', (col) => col.notNull()) // board_id, page_id, etc.
      .addColumn('room_type', 'varchar(50)', (col) => col.notNull()) // 'kanban_board', 'wiki_page'
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
      .addColumn('user_name', 'varchar(255)')
      .addColumn('event_type', 'varchar(50)', (col) => col.notNull()) // 'join', 'leave', 'edit', 'cursor_move'
      .addColumn('event_data', 'text') // JSON event payload
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // ===================
    // PERFORMANCE MONITORING TABLES
    // ===================

    // API performance metrics table
    await db.schema
      .createTable('api_performance_metrics')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('endpoint', 'varchar(500)', (col) => col.notNull())
      .addColumn('method', 'varchar(10)', (col) => col.notNull()) // GET, POST, PUT, DELETE
      .addColumn('status_code', 'integer', (col) => col.notNull())
      .addColumn('response_time_ms', 'integer', (col) => col.notNull())
      .addColumn('request_size_bytes', 'integer')
      .addColumn('response_size_bytes', 'integer')
      .addColumn('user_id', 'varchar(255)')
      .addColumn('ip_address', 'varchar(45)')
      .addColumn('error_message', 'text')
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Database query performance table
    await db.schema
      .createTable('db_query_performance')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('service', 'varchar(50)', (col) => col.notNull())
      .addColumn('operation', 'varchar(100)', (col) => col.notNull()) // 'select', 'insert', 'update', 'delete'
      .addColumn('table_name', 'varchar(100)')
      .addColumn('query_hash', 'varchar(64)') // Hash of the query for grouping
      .addColumn('execution_time_ms', 'real', (col) => col.notNull())
      .addColumn('rows_affected', 'integer')
      .addColumn('was_cached', 'boolean', (col) => col.defaultTo(false))
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // ===================
    // NOTIFICATION TABLES
    // ===================

    // User notifications table
    await db.schema
      .createTable('user_notifications')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
      .addColumn('notification_type', 'varchar(100)', (col) => col.notNull()) // 'mention', 'assignment', 'comment', 'due_date'
      .addColumn('title', 'varchar(500)', (col) => col.notNull())
      .addColumn('message', 'text', (col) => col.notNull())
      .addColumn('entity_type', 'varchar(100)') // 'card', 'page', 'memory'
      .addColumn('entity_id', 'text')
      .addColumn('entity_url', 'varchar(1000)') // Deep link to entity
      .addColumn('is_read', 'boolean', (col) => col.defaultTo(false))
      .addColumn('read_at', 'timestamp')
      .addColumn('priority', 'varchar(20)', (col) => col.defaultTo('normal')) // 'low', 'normal', 'high', 'urgent'
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('expires_at', 'timestamp')
      .execute();

    // Notification preferences table
    await db.schema
      .createTable('notification_preferences')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('preferences', 'text', (col) => col.notNull()) // JSON preferences object
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // ===================
    // FEATURE FLAGS AND EXPERIMENTS
    // ===================

    // Feature flags table
    await db.schema
      .createTable('feature_flags')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('flag_name', 'varchar(100)', (col) => col.notNull().unique())
      .addColumn('description', 'text')
      .addColumn('is_enabled', 'boolean', (col) => col.defaultTo(false))
      .addColumn('rollout_percentage', 'integer', (col) => col.defaultTo(0)) // 0-100
      .addColumn('target_users', 'text') // JSON array of user IDs
      .addColumn('conditions', 'text') // JSON conditions for enabling
      .addColumn('created_by', 'varchar(255)')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // User feature flag evaluations table
    await db.schema
      .createTable('user_feature_evaluations')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
      .addColumn('flag_name', 'varchar(100)', (col) => col.notNull())
      .addColumn('is_enabled', 'boolean', (col) => col.notNull())
      .addColumn('evaluation_reason', 'varchar(100)') // 'rollout', 'target_user', 'conditions'
      .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addUniqueConstraint('uk_user_feature_evaluations', ['user_id', 'flag_name'])
      .execute();

    // ===================
    // DATA RETENTION POLICIES
    // ===================

    // Data retention policies table
    await db.schema
      .createTable('data_retention_policies')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('table_name', 'varchar(100)', (col) => col.notNull())
      .addColumn('retention_days', 'integer', (col) => col.notNull())
      .addColumn('conditions', 'text') // JSON conditions for retention
      .addColumn('last_cleanup', 'timestamp')
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // ===================
    // INDEXES FOR AUDIT AND ACTIVITY TABLES
    // ===================

    // Audit logs indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON audit_logs(service)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`.execute(db);

    // User sessions indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_login_timestamp ON user_sessions(login_timestamp)`.execute(db);

    // System events indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_system_events_service ON system_events(service)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp)`.execute(db);

    // User activity streams indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_streams_user_id ON user_activity_streams(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_streams_service ON user_activity_streams(service)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_streams_timestamp ON user_activity_streams(timestamp)`.execute(db);

    // Collaboration events indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_collaboration_events_room_id ON collaboration_events(room_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_collaboration_events_user_id ON collaboration_events(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_collaboration_events_timestamp ON collaboration_events(timestamp)`.execute(db);

    // Performance metrics indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_api_performance_metrics_endpoint ON api_performance_metrics(endpoint)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_api_performance_metrics_timestamp ON api_performance_metrics(timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_api_performance_metrics_response_time ON api_performance_metrics(response_time_ms)`.execute(db);

    // User notifications indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at)`.execute(db);

    // Feature flags indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_user_feature_evaluations_user_id ON user_feature_evaluations(user_id)`.execute(db);

    logger.info('Migration 006_audit_and_activity completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 006_audit_and_activity (down)');

    // Drop tables in reverse dependency order
    const tables = [
      'data_retention_policies',
      'user_feature_evaluations',
      'feature_flags',
      'notification_preferences',
      'user_notifications',
      'db_query_performance',
      'api_performance_metrics',
      'collaboration_events',
      'user_activity_streams',
      'system_events',
      'user_sessions',
      'audit_logs'
    ];

    for (const table of tables) {
      await db.schema.dropTable(table).ifExists().execute();
    }

    logger.info('Migration 006_audit_and_activity rollback completed');
  }
};