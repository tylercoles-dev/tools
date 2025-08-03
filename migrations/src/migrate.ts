#!/usr/bin/env node

/**
 * MCP Tools Database Migration Runner
 * 
 * This service handles all database migrations for the MCP Tools ecosystem
 * using Kysely schema builder. It consolidates all database schemas from
 * kanban, wiki, and memory servers into unified migration scripts.
 */

import { Kysely, sql } from 'kysely';
import { createDatabaseConnection } from './database/connection.js';
import { runMigrations } from './database/migrator.js';
import { logger } from './utils/logger.js';
import { SeedRunner, essentialSeeds, sampleSeeds } from './seeds/index.js';
import type { SeedLevel } from './seeds/index.js';

interface MigrationConfig {
  database: {
    type: 'sqlite' | 'postgresql' | 'mysql';
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filename?: string; // for SQLite
  };
  migrations: {
    directory: string;
    lockTable: string;
  };
  seeds: {
    level: SeedLevel;
    force: boolean;
  };
}

/**
 * Parse environment variables into migration configuration
 */
function parseConfig(): MigrationConfig {
  const dbType = (process.env.DATABASE_TYPE || 'postgresql') as 'sqlite' | 'postgresql' | 'mysql';
  const seedLevel = (process.env.SEED_LEVEL || 'essential') as SeedLevel;
  const forceSeed = process.env.FORCE_SEED === 'true';
  
  const config: MigrationConfig = {
    database: {
      type: dbType,
    },
    migrations: {
      directory: './dist/migrations',
      lockTable: 'kysely_migration'
    },
    seeds: {
      level: seedLevel,
      force: forceSeed
    }
  };

  // Database-specific configuration
  switch (dbType) {
    case 'postgresql':
      config.database = {
        ...config.database,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'mcp_tools',
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password'
      };
      break;
    
    case 'mysql':
      config.database = {
        ...config.database,
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        database: process.env.MYSQL_DATABASE || 'mcp_tools',
        username: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password'
      };
      break;
    
    case 'sqlite':
      config.database = {
        ...config.database,
        filename: process.env.SQLITE_DATABASE || './mcp-tools.db'
      };
      break;
  }

  return config;
}

/**
 * Validate database connection and configuration
 */
async function validateConnection(db: Kysely<any>): Promise<void> {
  try {
    // Simple connection test
    await sql`SELECT 1 as test`.execute(db);
    logger.info('Database connection validated successfully');
  } catch (error) {
    logger.error('Database connection validation failed:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute seed data based on configuration
 */
async function runSeedProcess(db: Kysely<any>, config: MigrationConfig): Promise<void> {
  logger.info(`Starting seed data process with level: ${config.seeds.level}`);
  
  // Initialize seed runner
  const seedRunner = new SeedRunner(db);
  await seedRunner.initialize();
  
  // Determine which seeds to run
  let seedsToRun: typeof essentialSeeds = [];
  
  switch (config.seeds.level) {
    case 'essential':
      seedsToRun = [...essentialSeeds];
      break;
    case 'samples':
      seedsToRun = [...essentialSeeds, ...sampleSeeds];
      break;
    case 'all':
      seedsToRun = [...essentialSeeds, ...sampleSeeds];
      break;
    default:
      logger.warn(`Unknown seed level: ${config.seeds.level}, defaulting to essential`);
      seedsToRun = [...essentialSeeds];
  }
  
  if (seedsToRun.length === 0) {
    logger.info('No seeds to execute');
    return;
  }
  
  // Execute seeds
  const seedResults = await seedRunner.executeSeeds(seedsToRun, {
    level: config.seeds.level,
    force: config.seeds.force
  });
  
  // Report results
  const successful = seedResults.filter(r => r.success);
  const failed = seedResults.filter(r => !r.success);
  
  logger.info(`Seed execution completed: ${successful.length} successful, ${failed.length} failed`);
  
  if (successful.length > 0) {
    logger.info('Successfully executed seeds:');
    successful.forEach(result => {
      logger.info(`  ✓ ${result.seedName} (${result.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    logger.error('Failed seeds:');
    failed.forEach(result => {
      logger.error(`  ✗ ${result.seedName}: ${result.error?.message}`);
    });
    throw new Error(`${failed.length} seeds failed to execute`);
  }
}

/**
 * Main migration execution function
 */
async function runMigrationProcess(): Promise<void> {
  let db: Kysely<any> | null = null;
  
  try {
    logger.info('Starting MCP Tools database migration process...');
    
    // Parse configuration
    const config = parseConfig();
    logger.info(`Database type: ${config.database.type}`);
    logger.info(`Seed level: ${config.seeds.level}`);
    if (config.seeds.force) {
      logger.info('Force seed mode enabled - will re-run existing seeds');
    }
    
    // Create database connection
    db = createDatabaseConnection(config.database);
    logger.info('Database connection established');
    
    // Validate connection
    await validateConnection(db);
    
    // Run migrations
    logger.info('Starting database migrations...');
    const migrationResults = await runMigrations(db, config.migrations);
    
    if (migrationResults.length === 0) {
      logger.info('No new migrations to run - database is up to date');
    } else {
      logger.info(`Successfully executed ${migrationResults.length} migrations:`);
      migrationResults.forEach(result => {
        logger.info(`  ✓ ${result.migrationName} (${result.direction})`);
      });
    }
    
    // Run seed data if requested
    if (config.seeds.level !== 'none') {
      await runSeedProcess(db, config);
    } else {
      logger.info('Skipping seed data (SEED_LEVEL=none)');
    }
    
    logger.info('Database migration and seeding process completed successfully');
    
  } catch (error) {
    logger.error('Migration process failed:', error);
    
    // Provide detailed error information
    if (error instanceof Error) {
      logger.error(`Error message: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    }
    
    process.exit(1);
  } finally {
    // Clean up database connection
    if (db) {
      try {
        await db.destroy();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection:', error);
      }
    }
  }
}

/**
 * Handle process signals for graceful shutdown
 */
function setupSignalHandlers(): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'] as const;
  
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      process.exit(0);
    });
  });
}

/**
 * Handle unhandled promise rejections and exceptions
 */
function setupErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  // Setup error handling
  setupErrorHandlers();
  setupSignalHandlers();
  
  // Start migration process
  await runMigrationProcess();
}

// Run the migration if this file is executed directly
// For now, always run since this is a dedicated migration script
main().catch((error) => {
  logger.error('Fatal error in main process:', error);
  process.exit(1);
});