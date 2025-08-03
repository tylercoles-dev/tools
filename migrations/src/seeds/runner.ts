/**
 * Seed data runner for MCP Tools ecosystem
 * Handles execution of essential and sample data based on environment configuration
 */

import { Kysely, sql } from 'kysely';
import { logger } from '../utils/logger.js';
import type { SeedData, SeedLevel, SeedResult, SeedConfig } from './types.js';

/**
 * Seed execution tracking table name
 */
const SEED_EXECUTION_TABLE = 'seed_executions';

/**
 * Seed data runner class
 */
export class SeedRunner {
  constructor(private db: Kysely<any>) {}

  /**
   * Initialize seed tracking table
   */
  async initialize(): Promise<void> {
    try {
      await this.db.schema
        .createTable(SEED_EXECUTION_TABLE)
        .ifNotExists()
        .addColumn('seed_id', 'varchar(255)', (col) => col.primaryKey())
        .addColumn('seed_name', 'varchar(255)', (col) => col.notNull())
        .addColumn('executed_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('execution_time_ms', 'integer', (col) => col.notNull())
        .addColumn('success', 'boolean', (col) => col.notNull())
        .addColumn('error_message', 'text')
        .execute();
      
      logger.info('Seed execution tracking table initialized');
    } catch (error) {
      logger.warn('Seed tracking table may already exist:', error);
    }
  }

  /**
   * Check if a seed has already been executed
   */
  async hasBeenExecuted(seedId: string): Promise<boolean> {
    try {
      const result = await this.db
        .selectFrom(SEED_EXECUTION_TABLE)
        .select('seed_id')
        .where('seed_id', '=', seedId)
        .where('success', '=', true)
        .executeTakeFirst();
      
      return !!result;
    } catch (error) {
      // If table doesn't exist yet, seed hasn't been executed
      return false;
    }
  }

  /**
   * Record seed execution
   */
  async recordExecution(result: SeedResult): Promise<void> {
    try {
      await this.db
        .insertInto(SEED_EXECUTION_TABLE)
        .values({
          seed_id: result.seedId,
          seed_name: result.seedName,
          executed_at: sql`CURRENT_TIMESTAMP`,
          execution_time_ms: result.duration,
          success: result.success,
          error_message: result.error?.message || null
        })
        .onConflict((oc) => oc
          .column('seed_id')
          .doUpdateSet({
            seed_name: result.seedName,
            executed_at: sql`CURRENT_TIMESTAMP`,
            execution_time_ms: result.duration,
            success: result.success,
            error_message: result.error?.message || null
          })
        )
        .execute();
    } catch (error) {
      logger.warn('Could not record seed execution:', error);
    }
  }

  /**
   * Execute a single seed
   */
  async executeSeed(seed: SeedData, config: SeedConfig): Promise<SeedResult> {
    const startTime = Date.now();
    logger.info(`Starting seed: ${seed.name} (${seed.id})`);

    try {
      // Check if already executed (unless forced)
      if (!config.force && seed.idempotent) {
        const alreadyExecuted = await this.hasBeenExecuted(seed.id);
        if (alreadyExecuted) {
          logger.info(`Seed ${seed.id} already executed, skipping`);
          return {
            seedId: seed.id,
            seedName: seed.name,
            success: true,
            duration: Date.now() - startTime
          };
        }
      }

      // Execute the seed
      await seed.up(this.db);
      
      const duration = Date.now() - startTime;
      logger.info(`Completed seed: ${seed.name} in ${duration}ms`);
      
      const result: SeedResult = {
        seedId: seed.id,
        seedName: seed.name,
        success: true,
        duration
      };

      // Record execution
      await this.recordExecution(result);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const seedError = error instanceof Error ? error : new Error(String(error));
      
      logger.error(`Failed to execute seed ${seed.name}:`, seedError);
      
      const result: SeedResult = {
        seedId: seed.id,
        seedName: seed.name,
        success: false,
        duration,
        error: seedError
      };

      // Record failed execution
      await this.recordExecution(result);
      
      return result;
    }
  }

  /**
   * Execute multiple seeds
   */
  async executeSeeds(seeds: SeedData[], config: SeedConfig): Promise<SeedResult[]> {
    const results: SeedResult[] = [];
    
    logger.info(`Executing ${seeds.length} seeds with level: ${config.level}`);
    
    for (const seed of seeds) {
      const result = await this.executeSeed(seed, config);
      results.push(result);
      
      // Stop on first failure unless forced
      if (!result.success && !config.force) {
        logger.error(`Stopping seed execution due to failure in: ${seed.name}`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Get seed execution history
   */
  async getExecutionHistory(): Promise<Array<{
    seed_id: string;
    seed_name: string;
    executed_at: string;
    execution_time_ms: number;
    success: boolean;
    error_message?: string;
  }>> {
    try {
      const results = await this.db
        .selectFrom(SEED_EXECUTION_TABLE)
        .selectAll()
        .orderBy('executed_at', 'desc')
        .execute();
      
      // Type assertion to ensure proper typing
      return results as Array<{
        seed_id: string;
        seed_name: string;
        executed_at: string;
        execution_time_ms: number;
        success: boolean;
        error_message?: string;
      }>;
    } catch (error) {
      logger.warn('Could not retrieve seed execution history:', error);
      return [];
    }
  }
}