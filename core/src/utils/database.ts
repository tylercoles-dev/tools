/**
 * Database Utilities
 */

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  filename?: string; // for SQLite
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export function createDatabaseConfig(options: Partial<DatabaseConfig> = {}): DatabaseConfig {
  return {
    type: 'sqlite',
    filename: './database.db',
    ...options
  };
}