/**
 * Database connection factory for different database types
 */

import { Kysely } from 'kysely';
import { PostgresDialect } from 'kysely';
import { SqliteDialect } from 'kysely';
import { MysqlDialect } from 'kysely';
import Database from 'better-sqlite3';
import pkg from 'pg';
import mysql from 'mysql2';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  filename?: string; // for SQLite
}

/**
 * Create database connection based on configuration
 */
export function createDatabaseConnection(config: DatabaseConfig): Kysely<any> {
  logger.info(`Creating ${config.type} database connection...`);
  
  switch (config.type) {
    case 'postgresql':
      return createPostgresConnection(config);
    
    case 'mysql':
      return createMysqlConnection(config);
    
    case 'sqlite':
      return createSqliteConnection(config);
    
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

/**
 * Create PostgreSQL connection using pg driver
 */
function createPostgresConnection(config: DatabaseConfig): Kysely<any> {
  if (!config.host || !config.database || !config.username || !config.password) {
    throw new Error('PostgreSQL connection requires host, database, username, and password');
  }

  const pool = new Pool({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    max: 5, // Limit connections for migration process
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Connection validation
    options: '--application_name=mcp-tools-migration'
  });

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('PostgreSQL pool error:', err);
  });

  logger.info(`PostgreSQL connection configured for ${config.host}:${config.port}/${config.database}`);

  return new Kysely({
    dialect: new PostgresDialect({
      pool
    })
  });
}

/**
 * Create MySQL connection using mysql2 driver
 */
function createMysqlConnection(config: DatabaseConfig): Kysely<any> {
  if (!config.host || !config.database || !config.username || !config.password) {
    throw new Error('MySQL connection requires host, database, username, and password');
  }

  const pool = mysql.createPool({
    host: config.host,
    port: config.port || 3306,
    database: config.database,
    user: config.username,
    password: config.password,
    connectionLimit: 5, // Limit connections for migration process
    acquireTimeout: 10000,
    timezone: 'Z' // Use UTC
  });

  logger.info(`MySQL connection configured for ${config.host}:${config.port}/${config.database}`);

  return new Kysely({
    dialect: new MysqlDialect({
      pool
    })
  });
}

/**
 * Create SQLite connection using better-sqlite3 driver
 */
function createSqliteConnection(config: DatabaseConfig): Kysely<any> {
  const filename = config.filename || './mcp-tools.db';
  
  logger.info(`SQLite connection configured for ${filename}`);
  
  const database = new Database(filename, {
    // Enable foreign keys
    pragma: {
      foreign_keys: 1,
      journal_mode: 'WAL',
      synchronous: 'NORMAL'
    }
  });

  // Configure SQLite for better performance during migrations
  database.pragma('cache_size = -64000'); // 64MB cache
  database.pragma('temp_store = memory');
  database.pragma('mmap_size = 268435456'); // 256MB mmap

  return new Kysely({
    dialect: new SqliteDialect({
      database
    })
  });
}

/**
 * Test database connection
 */
export async function testConnection(db: Kysely<any>): Promise<boolean> {
  try {
    await db.selectFrom('information_schema.tables' as any)
      .select('table_name')
      .limit(1)
      .execute();
    return true;
  } catch (error) {
    try {
      // Fallback for SQLite
      await db.selectFrom('sqlite_master' as any)
        .select('name')
        .limit(1)
        .execute();
      return true;
    } catch (sqliteError) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }
}