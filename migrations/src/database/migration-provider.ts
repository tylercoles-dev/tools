/**
 * Custom migration provider that loads migrations from code
 * instead of files, ensuring all migrations are bundled in the container
 */

import { MigrationProvider, Migration } from 'kysely';
import { logger } from '../utils/logger.js';

// Import all migration modules
import { createInitialSchema } from '../migrations/001_initial_schema.js';
import { addKanbanExtendedFeatures } from '../migrations/002_kanban_extended_features.js';
import { addWikiFullTextSearch } from '../migrations/003_wiki_full_text_search.js';
import { addMemoryGraphTables } from '../migrations/004_memory_graph_tables.js';
import { addIndexesAndOptimizations } from '../migrations/005_indexes_and_optimizations.js';
import { addAuditAndActivity } from '../migrations/006_audit_and_activity.js';

/**
 * Migration registry that maps migration names to their implementations
 */
const MIGRATION_REGISTRY: Record<string, Migration> = {
  '001_initial_schema': createInitialSchema,
  '002_kanban_extended_features': addKanbanExtendedFeatures,
  '003_wiki_full_text_search': addWikiFullTextSearch,
  '004_memory_graph_tables': addMemoryGraphTables,
  '005_indexes_and_optimizations': addIndexesAndOptimizations,
  '006_audit_and_activity': addAuditAndActivity
};

/**
 * Custom migration provider that loads migrations from memory
 * This ensures all migrations are available in the container without
 * requiring file system access
 */
export class CodeMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    logger.info(`Loading ${Object.keys(MIGRATION_REGISTRY).length} migrations from registry`);
    
    // Validate all migrations have required methods
    for (const [name, migration] of Object.entries(MIGRATION_REGISTRY)) {
      if (!migration.up || typeof migration.up !== 'function') {
        throw new Error(`Migration ${name} is missing required 'up' method`);
      }
      
      if (!migration.down || typeof migration.down !== 'function') {
        throw new Error(`Migration ${name} is missing required 'down' method`);
      }
    }
    
    logger.debug('All migrations validated successfully');
    return MIGRATION_REGISTRY;
  }
}

/**
 * Factory function to create migration provider instance
 */
export function createMigrationProvider(): MigrationProvider {
  return new CodeMigrationProvider();
}

/**
 * Get list of available migration names in execution order
 */
export function getMigrationNames(): string[] {
  return Object.keys(MIGRATION_REGISTRY).sort();
}

/**
 * Get specific migration by name
 */
export function getMigration(name: string): Migration | undefined {
  return MIGRATION_REGISTRY[name];
}

/**
 * Validate migration registry integrity
 */
export function validateMigrationRegistry(): void {
  const names = getMigrationNames();
  
  // Check for proper naming convention
  for (const name of names) {
    if (!/^\d{3}_[a-z_]+$/.test(name)) {
      throw new Error(`Migration ${name} does not follow naming convention: 001_migration_name`);
    }
  }
  
  // Check for sequential numbering
  for (let i = 0; i < names.length; i++) {
    const expectedNumber = String(i + 1).padStart(3, '0');
    const actualNumber = names[i].substring(0, 3);
    
    if (actualNumber !== expectedNumber) {
      throw new Error(`Migration numbering gap detected: expected ${expectedNumber}, found ${actualNumber}`);
    }
  }
  
  logger.info(`Migration registry validated: ${names.length} migrations in sequence`);
}