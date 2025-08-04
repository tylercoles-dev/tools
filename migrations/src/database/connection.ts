/**
 * PostgreSQL database connection for MCP Tools
 */

import { Kysely } from 'kysely';
import { PostgresDialect } from 'kysely';
import pkg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

interface DatabaseConfig {
  type: 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Create PostgreSQL database connection
 */
export function createDatabaseConnection(config: DatabaseConfig): Kysely<any> {
  logger.info(`Creating PostgreSQL database connection...`);
  
  if (config.type !== 'postgresql') {
    throw new Error(`Only PostgreSQL is supported. Received: ${config.type}`);
  }
  
  return createPostgresConnection(config);
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
 * Test PostgreSQL database connection
 */
export async function testConnection(db: Kysely<any>): Promise<boolean> {
  try {
    await db.selectFrom('information_schema.tables' as any)
      .select('table_name')
      .limit(1)
      .execute();
    return true;
  } catch (error) {
    logger.error('PostgreSQL connection test failed:', error);
    return false;
  }
}