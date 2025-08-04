/**
 * Custom migration provider that loads migrations from code
 * instead of files, ensuring all migrations are bundled in the container
 */

import { MigrationProvider, Migration } from 'kysely';
import { logger } from '../utils/logger.js';

// Import consolidated migration
import { initialSchemaComplete } from '../migrations/001_initial_schema_complete.js';

/**
 * Migration registry that maps migration names to their implementations
 * 
 * Note: Since this app hasn't been released yet, we've consolidated all 
 * migrations into a single comprehensive schema migration for simplicity.
 */
const MIGRATION_REGISTRY: Record<string, Migration> = {
  '001_initial_schema_complete': initialSchemaComplete
};

/**
 * Custom migration provider that loads migrations from memory
 * This ensures all migrations are available in the container without
 * requiring file system access
 */
export class CodeMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    logger.info(`Loading ${Object.keys(MIGRATION_REGISTRY).length} migration from registry`);
    
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
  
  // For single migration, just validate the naming
  if (names.length === 1) {
    const name = names[0];
    if (!name.startsWith('001_')) {
      throw new Error(`Single migration must start with 001_, found: ${name}`);
    }
  }
  
  logger.info(`Migration registry validated: ${names.length} migration ready for execution`);
}