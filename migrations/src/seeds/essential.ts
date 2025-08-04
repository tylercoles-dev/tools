/**
 * Essential seed data for MCP Tools ecosystem
 * Contains data required for the application to function properly in production
 */

import { Kysely } from 'kysely';
import { logger } from '../utils/logger.js';
import type { SeedData } from './types.js';

/**
 * System configurations seed
 */
export const systemConfigSeed: SeedData = {
  id: 'system_config',
  name: 'System Configuration',
  description: 'Insert essential system configuration data',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding system configuration data...');
    
    // Insert default data retention policies for audit tables
    await db.insertInto('data_retention_policies')
      .values([
        {
          table_name: 'audit_logs',
          retention_days: 365, // Keep audit logs for 1 year
          conditions: '{}',
          is_active: true
        },
        {
          table_name: 'user_activity_streams',
          retention_days: 90, // Keep activity streams for 90 days
          conditions: '{}',
          is_active: true
        },
        {
          table_name: 'api_performance_metrics',
          retention_days: 30, // Keep performance metrics for 30 days
          conditions: '{}',
          is_active: true
        },
        {
          table_name: 'collaboration_events',
          retention_days: 30, // Keep collaboration events for 30 days
          conditions: '{}',
          is_active: true
        }
      ])
      .onConflict((oc) => oc.column('table_name').doNothing())
      .execute();

    logger.info('System configuration data seeded successfully');
  }
};

/**
 * Default user roles and permissions seed
 */
export const userRolesSeed: SeedData = {
  id: 'user_roles',
  name: 'Default User Roles',
  description: 'Insert default user roles and permission structure',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding default user roles...');
    
    // Insert default notification preferences for new users
    // This will serve as a template for user registration
    await db.insertInto('notification_preferences')
      .values({
        user_id: '_TEMPLATE_', // Special template user
        notification_type: 'default',
        channel: 'all',
        is_enabled: true,
        settings: JSON.stringify({
          email_notifications: true,
          push_notifications: true,
          mentions: true,
          assignments: true,
          due_dates: true,
          comments: true,
          system_updates: false,
          digest_frequency: 'daily'
        })
      })
      .onConflict((oc) => oc.columns(['user_id', 'notification_type', 'channel']).doNothing())
      .execute();

    logger.info('Default user roles seeded successfully');
  }
};

/**
 * Essential categories seed
 */
export const essentialCategoriesSeed: SeedData = {
  id: 'essential_categories',
  name: 'Essential Categories',
  description: 'Insert essential wiki categories required for organization',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding essential categories...');
    
    // Insert essential wiki categories
    await db.insertInto('categories')
      .values([
        {
          name: 'Documentation',
          description: 'Technical documentation and guides',
          color: '#3b82f6'
        },
        {
          name: 'System',
          description: 'System-related pages and configurations',
          color: '#6b7280'
        },
        {
          name: 'Help',
          description: 'Help articles and support documentation',
          color: '#10b981'
        }
      ])
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();

    logger.info('Essential categories seeded successfully');
  }
};

/**
 * Essential tags seed
 */
export const essentialTagsSeed: SeedData = {
  id: 'essential_tags',
  name: 'Essential Tags',
  description: 'Insert essential tags for task and content organization',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding essential tags...');
    
    // Insert essential kanban tags
    await db.insertInto('tags')
      .values([
        {
          name: 'system',
          color: '#6b7280'
        },
        {
          name: 'maintenance',
          color: '#f59e0b'
        },
        {
          name: 'security',
          color: '#ef4444'
        }
      ])
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();

    // Insert essential wiki tags
    await db.insertInto('wiki_tags')
      .values([
        {
          name: 'system',
          color: '#6b7280'
        },
        {
          name: 'documentation',
          color: '#3b82f6'
        },
        {
          name: 'help',
          color: '#10b981'
        }
      ])
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();

    logger.info('Essential tags seeded successfully');
  }
};

/**
 * Feature flags seed
 */
export const featureFlagsSeed: SeedData = {
  id: 'feature_flags',
  name: 'Feature Flags',
  description: 'Insert default feature flags for production environment',
  idempotent: true,
  
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Seeding feature flags...');
    
    // Insert default feature flags (all disabled for production safety)
    await db.insertInto('feature_flags')
      .values([
        {
          flag_name: 'advanced_analytics',
          description: 'Enable advanced analytics and reporting features',
          is_enabled: false,
          rollout_percentage: 0,
          conditions: '{}',
          created_by: 'system'
        },
        {
          flag_name: 'real_time_collaboration',
          description: 'Enable real-time collaboration features',
          is_enabled: true, // This can be enabled by default
          rollout_percentage: 100,
          conditions: '{}',
          created_by: 'system'
        },
        {
          flag_name: 'advanced_search',
          description: 'Enable advanced search capabilities',
          is_enabled: true, // This can be enabled by default
          rollout_percentage: 100,
          conditions: '{}',
          created_by: 'system'
        },
        {
          flag_name: 'beta_features',
          description: 'Enable beta features for testing',
          is_enabled: false,
          rollout_percentage: 0,
          conditions: '{}',
          created_by: 'system'
        }
      ])
      .onConflict((oc) => oc.column('flag_name').doNothing())
      .execute();

    logger.info('Feature flags seeded successfully');
  }
};

/**
 * All essential seeds in execution order
 */
export const essentialSeeds: SeedData[] = [
  systemConfigSeed,
  userRolesSeed,
  essentialCategoriesSeed,
  essentialTagsSeed,
  featureFlagsSeed
];