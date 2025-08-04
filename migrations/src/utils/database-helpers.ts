/**
 * Database utility helpers for migrations
 * Provides database-agnostic helpers for common migration tasks
 */

import { Kysely } from 'kysely';
import { logger } from './logger.js';

/**
 * Database type supported by the migration system
 */
export type DatabaseType = 'postgresql';

/**
 * Get the database type (always PostgreSQL)
 */
export function detectDatabaseType(db: Kysely<any>): DatabaseType {
  // Always return PostgreSQL since we only support it now
  logger.debug('Database type: PostgreSQL (hardcoded)');
  return 'postgresql';
}

/**
 * Check if a column exists in a table (PostgreSQL)
 */
export async function columnExists(
  db: Kysely<any>, 
  tableName: string, 
  columnName: string
): Promise<boolean> {
  try {
    const result = await db
      .selectFrom('information_schema.columns' as any)
      .select('column_name')
      .where('table_name', '=', tableName)
      .where('column_name', '=', columnName)
      .executeTakeFirst();
    return !!result;
  } catch (error) {
    logger.warn(`Error checking column existence: ${error}`);
    return false;
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(
  db: Kysely<any>, 
  tableName: string
): Promise<boolean> {
  try {
    const tables = await db.introspection.getTables();
    return tables.some(table => table.name === tableName);
  } catch (error) {
    logger.warn(`Error checking table existence: ${error}`);
    return false;
  }
}

/**
 * Check if an index exists (PostgreSQL)
 */
export async function indexExists(
  db: Kysely<any>, 
  indexName: string
): Promise<boolean> {
  try {
    const result = await db
      .selectFrom('pg_indexes' as any)
      .select('indexname')
      .where('indexname', '=', indexName)
      .executeTakeFirst();
    return !!result;
  } catch (error) {
    logger.warn(`Error checking index existence: ${error}`);
    return false;
  }
}

/**
 * Safely execute database-specific operations
 * Returns true if successful, false if operation should be skipped
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  skipOnError: boolean = true
): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch (error) {
    if (skipOnError) {
      logger.warn(`${errorMessage}: ${error}`);
      return false;
    } else {
      throw error;
    }
  }
}

/**
 * Create text search index using PostgreSQL GIN index
 */
export async function createTextSearchIndex(
  db: Kysely<any>,
  tableName: string,
  columnName: string,
  indexName: string
): Promise<void> {
  logger.info(`Creating PostgreSQL text search index ${indexName} on ${tableName}.${columnName}`);
  await db.schema
    .createIndex(indexName)
    .on(tableName)
    .using('gin')
    .column(columnName)
    .execute();
}

/**
 * Drop index safely (PostgreSQL)
 */
export async function dropIndexSafely(
  db: Kysely<any>,
  indexName: string,
  tableName?: string
): Promise<void> {
  try {
    await db.schema.dropIndex(indexName).ifExists().execute();
    logger.info(`Dropped index ${indexName}`);
  } catch (error) {
    logger.warn(`Could not drop index ${indexName}: ${error}`);
  }
}

/**
 * Create a single-column index safely
 */
export async function createSingleColumnIndex(
  db: Kysely<any>,
  indexName: string,
  tableName: string,
  columnName: string
): Promise<void> {
  const exists = await indexExists(db, indexName);
  if (exists) {
    logger.debug(`Index ${indexName} already exists, skipping`);
    return;
  }

  await safeExecute(
    () => db.schema
      .createIndex(indexName)
      .on(tableName)
      .column(columnName)
      .execute(),
    `Failed to create index ${indexName}`,
    true
  );
}

/**
 * Create a multi-column index safely
 */
export async function createMultiColumnIndex(
  db: Kysely<any>,
  indexName: string,
  tableName: string,
  columnNames: string[]
): Promise<void> {
  const exists = await indexExists(db, indexName);
  if (exists) {
    logger.debug(`Index ${indexName} already exists, skipping`);
    return;
  }

  await safeExecute(
    () => db.schema
      .createIndex(indexName)
      .on(tableName)
      .columns(columnNames)
      .execute(),
    `Failed to create index ${indexName}`,
    true
  );
}

/**
 * Create indexes in batch to improve performance
 */
export async function createIndexesBatch(
  db: Kysely<any>,
  indexes: Array<{
    name: string;
    table: string;
    columns: string | string[];
  }>
): Promise<void> {
  logger.info(`Creating ${indexes.length} indexes...`);
  
  for (const index of indexes) {
    if (typeof index.columns === 'string') {
      await createSingleColumnIndex(db, index.name, index.table, index.columns);
    } else {
      await createMultiColumnIndex(db, index.name, index.table, index.columns);
    }
  }
  
  logger.info(`Completed creating ${indexes.length} indexes`);
}