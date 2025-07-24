/**
 * MCP Tools Core Library
 * 
 * Shared services and utilities for the MCP Tools ecosystem
 */

// Export all service modules
export * from './services/kanban/index.js';
export * from './services/memory/index.js';
export * from './services/memory-processing/index.js';
export * from './services/wiki/index.js';
export * from './services/scraper/index.js';

// Export shared utilities with explicit naming to avoid conflicts
export type { 
  DatabaseConfig as CoreDatabaseConfig 
} from './utils/database.js';
export { 
  createDatabaseConfig 
} from './utils/database.js';
export { 
  ValidationError as CoreValidationError,
  validateInput 
} from './utils/validation.js';