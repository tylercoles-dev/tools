/**
 * Kysely migration runner with proper migration management
 */

import { Kysely, sql, Migrator, MigrationProvider } from 'kysely';
import { logger } from '../utils/logger.js';
import { createMigrationProvider } from './migration-provider.js';

interface MigrationConfig {
  directory: string;
  lockTable: string;
}

interface MigrationResult {
  migrationName: string;
  direction: 'Up' | 'Down';
  status: 'Success' | 'Error';
}

/**
 * Run database migrations using Kysely migrator
 */
export async function runMigrations(
  db: Kysely<any>,
  config: MigrationConfig
): Promise<MigrationResult[]> {
  logger.info('Initializing migration system...');
  
  try {
    // Create migration provider
    const migrationProvider = createMigrationProvider();
    
    // Create migrator instance
    const migrator = new Migrator({
      db,
      provider: migrationProvider,
      migrationTableName: config.lockTable,
      migrationLockTableName: `${config.lockTable}_lock`
    });

    // Get migration status
    const { results, error } = await migrator.migrateToLatest();
    
    if (error) {
      logger.error('Migration failed:', error);
      throw error;
    }

    // Format results
    const migrationResults: MigrationResult[] = results?.map(result => ({
      migrationName: result.migrationName,
      direction: result.direction,
      status: result.status
    })) || [];

    // Log migration summary
    if (migrationResults.length > 0) {
      logger.info('Migration results:');
      migrationResults.forEach(result => {
        const status = result.status === 'Success' ? '✓' : '✗';
        logger.info(`  ${status} ${result.migrationName} (${result.direction})`);
      });
    } else {
      logger.info('No migrations needed - database is up to date');
    }

    return migrationResults;
    
  } catch (error) {
    logger.error('Migration process failed:', error);
    throw error;
  }
}

/**
 * Get current migration status
 */
export async function getMigrationStatus(
  db: Kysely<any>,
  config: MigrationConfig
): Promise<{
  executed: string[];
  pending: string[];
}> {
  try {
    const migrationProvider = createMigrationProvider();
    
    const migrator = new Migrator({
      db,
      provider: migrationProvider,
      migrationTableName: config.lockTable
    });

    // Get all migrations
    const allMigrations = await migrationProvider.getMigrations();
    const allMigrationNames = Object.keys(allMigrations);

    // Get executed migrations
    const executedMigrations = await migrator.getMigrations();
    const executedNames = executedMigrations.map(m => m.name);

    // Calculate pending migrations
    const pendingNames = allMigrationNames.filter(name => !executedNames.includes(name));

    return {
      executed: executedNames,
      pending: pendingNames
    };
    
  } catch (error) {
    logger.error('Failed to get migration status:', error);
    throw error;
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackLastMigration(
  db: Kysely<any>,
  config: MigrationConfig
): Promise<MigrationResult[]> {
  logger.info('Rolling back last migration...');
  
  try {
    const migrationProvider = createMigrationProvider();
    
    const migrator = new Migrator({
      db,
      provider: migrationProvider,
      migrationTableName: config.lockTable
    });

    const { results, error } = await migrator.migrateDown();
    
    if (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }

    const migrationResults: MigrationResult[] = results?.map(result => ({
      migrationName: result.migrationName,
      direction: result.direction,
      status: result.status
    })) || [];

    logger.info('Rollback completed successfully');
    return migrationResults;
    
  } catch (error) {
    logger.error('Rollback process failed:', error);
    throw error;
  }
}

/**
 * Reset database by running all down migrations
 */
export async function resetDatabase(
  db: Kysely<any>,
  config: MigrationConfig
): Promise<MigrationResult[]> {
  logger.warn('Resetting database - this will remove all data!');
  
  try {
    const migrationProvider = createMigrationProvider();
    
    const migrator = new Migrator({
      db,
      provider: migrationProvider,
      migrationTableName: config.lockTable
    });

    // Get all executed migrations
    const executedMigrations = await migrator.getMigrations();
    const results: MigrationResult[] = [];

    // Roll back all migrations in reverse order
    for (let i = 0; i < executedMigrations.length; i++) {
      const { results: rollbackResults, error } = await migrator.migrateDown();
      
      if (error) {
        logger.error(`Rollback failed at migration ${i + 1}:`, error);
        throw error;
      }

      if (rollbackResults) {
        results.push(...rollbackResults.map(result => ({
          migrationName: result.migrationName,
          direction: result.direction,
          status: result.status
        })));
      }
    }

    logger.info('Database reset completed successfully');
    return results;
    
  } catch (error) {
    logger.error('Database reset failed:', error);
    throw error;
  }
}