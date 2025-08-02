/**
 * Usage Tracking Service
 * Tracks and persists API usage statistics
 */

import { Kysely, sql } from 'kysely';
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
import crypto from 'crypto';

interface UsageTable {
  id: string;
  service: string;
  operation: string;
  tokens_used: number | null;
  cost_usd: number | null;
  timestamp: string;
}

interface UsageDatabase {
  usage_tracking: UsageTable;
}

export class UsageTracker {
  private db: Kysely<UsageDatabase>;

  constructor(databasePath: string = './usage.db') {
    const database = new Database(databasePath);
    this.db = new Kysely<UsageDatabase>({
      dialect: new SqliteDialect({ database })
    });
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Create usage tracking table
    await this.db.schema
      .createTable('usage_tracking')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('service', 'text', (col) => col.notNull())
      .addColumn('operation', 'text', (col) => col.notNull())
      .addColumn('tokens_used', 'integer')
      .addColumn('cost_usd', 'real')
      .addColumn('timestamp', 'text', (col) => col.notNull().defaultTo(sql`datetime('now')`))
      .execute();

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_tracking(timestamp)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_service ON usage_tracking(service)`.execute(this.db);
  }

  async trackUsage(service: string, operation: string, tokensUsed?: number, costUsd?: number): Promise<void> {
    await this.db
      .insertInto('usage_tracking')
      .values({
        id: crypto.randomUUID(),
        service,
        operation,
        tokens_used: tokensUsed || null,
        cost_usd: costUsd || null,
        timestamp: new Date().toISOString()
      })
      .execute();
  }

  async getUsageStats(service?: string, since?: string): Promise<{
    totalTokens: number;
    totalCost: number;
    apiCalls: number;
    avgTokensPerCall: number;
  }> {
    let query = this.db
      .selectFrom('usage_tracking')
      .select([
        sql`sum(coalesce(tokens_used, 0))`.as('total_tokens'),
        sql`sum(coalesce(cost_usd, 0))`.as('total_cost'),
        sql`count(*)`.as('api_calls')
      ]);

    if (service) {
      query = query.where('service', '=', service);
    }

    if (since) {
      query = query.where('timestamp', '>=', since);
    }

    const result = await query.executeTakeFirst();
    
    const totalTokens = Number(result?.total_tokens) || 0;
    const totalCost = Number(result?.total_cost) || 0;
    const apiCalls = Number(result?.api_calls) || 0;
    const avgTokensPerCall = apiCalls > 0 ? totalTokens / apiCalls : 0;

    return {
      totalTokens,
      totalCost,
      apiCalls,
      avgTokensPerCall
    };
  }

  async getServiceBreakdown(): Promise<Array<{
    service: string;
    totalTokens: number;
    totalCost: number;
    apiCalls: number;
  }>> {
    const results = await this.db
      .selectFrom('usage_tracking')
      .select([
        'service',
        sql`sum(coalesce(tokens_used, 0))`.as('total_tokens'),
        sql`sum(coalesce(cost_usd, 0))`.as('total_cost'),
        sql`count(*)`.as('api_calls')
      ])
      .groupBy('service')
      .orderBy('total_cost', 'desc')
      .execute();

    return results.map(r => ({
      service: r.service,
      totalTokens: Number(r.total_tokens),
      totalCost: Number(r.total_cost),
      apiCalls: Number(r.api_calls)
    }));
  }

  async getRecentUsage(hours: number = 24): Promise<Array<{
    timestamp: string;
    service: string;
    operation: string;
    tokensUsed: number;
    costUsd: number;
  }>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const results = await this.db
      .selectFrom('usage_tracking')
      .selectAll()
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .execute();

    return results.map(r => ({
      timestamp: r.timestamp,
      service: r.service,
      operation: r.operation,
      tokensUsed: r.tokens_used || 0,
      costUsd: r.cost_usd || 0
    }));
  }

  async close(): Promise<void> {
    await this.db.destroy();
  }
}