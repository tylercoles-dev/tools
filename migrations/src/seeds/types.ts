/**
 * Seed data types and interfaces for MCP Tools ecosystem
 */

import { Kysely } from 'kysely';

/**
 * Seed data interface that all seed modules must implement
 */
export interface SeedData {
  /**
   * Unique identifier for this seed
   */
  id: string;
  
  /**
   * Human-readable name for this seed
   */
  name: string;
  
  /**
   * Description of what this seed does
   */
  description: string;
  
  /**
   * Whether this seed can be run multiple times safely (idempotent)
   */
  idempotent: boolean;
  
  /**
   * Execute the seed data insertion
   */
  up(db: Kysely<any>): Promise<void>;
  
  /**
   * Remove seed data (optional, for cleanup)
   */
  down?(db: Kysely<any>): Promise<void>;
}

/**
 * Seed level configuration
 */
export type SeedLevel = 'none' | 'essential' | 'samples' | 'all';

/**
 * Seed execution result
 */
export interface SeedResult {
  seedId: string;
  seedName: string;
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * Seed configuration
 */
export interface SeedConfig {
  level: SeedLevel;
  force?: boolean; // Force re-run even if already executed
}