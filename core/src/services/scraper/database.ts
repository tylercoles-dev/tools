/**
 * Scraper Database Layer
 */

import { Kysely, sql } from 'kysely';
import crypto from 'crypto';
import { DatabaseConnectionManager } from '../../utils/database.js';
import type { DatabaseConfig } from '../../utils/database.js';
import type { ScrapedPage, ScrapingJob } from './types.js';

// Database schema interfaces
export interface ScraperPerformanceMetric {
  id: string;
  url: string;
  domain: string;
  processing_time_ms: number;
  content_size_bytes: number | null;
  status_code: number | null;
  error_message: string | null;
  timestamp: string;
}

export interface ScraperDatabase {
  scraped_pages: ScrapedPage;
  scraping_jobs: ScrapingJob;
  scraper_performance: ScraperPerformanceMetric;
}

export class ScraperDatabaseManager {
  private dbManager: DatabaseConnectionManager<ScraperDatabase>;

  constructor(config: DatabaseConfig) {
    this.dbManager = new DatabaseConnectionManager<ScraperDatabase>(config);
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
    await this.testConnection();
  }

  get db(): Kysely<ScraperDatabase> {
    return this.dbManager.kysely;
  }

  async healthCheck() {
    return await this.dbManager.healthCheck();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.db.selectFrom('scraped_pages').select('id').limit(1).execute();
      console.log('✅ Scraper database connection verified successfully');
    } catch (error) {
      console.error('❌ Scraper database connection failed. Ensure migration service has completed:', error);
      throw new Error('Scraper database not available. Migration service may not have completed successfully.');
    }
  }

  // Scraped Pages CRUD operations
  async createPage(page: Omit<ScrapedPage, 'id' | 'created_at' | 'updated_at'>): Promise<ScrapedPage> {
    const id = crypto.randomUUID();
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.db
      .insertInto('scraped_pages')
      .values({
        id,
        created_at: now,
        updated_at: now,
        ...page
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getPage(id: string): Promise<ScrapedPage | undefined> {
    return await this.db
      .selectFrom('scraped_pages')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async getPageByUrl(url: string): Promise<ScrapedPage | undefined> {
    return await this.db
      .selectFrom('scraped_pages')
      .selectAll()
      .where('url', '=', url)
      .orderBy('scraped_at', 'desc')
      .executeTakeFirst();
  }

  async getPageByContentHash(contentHash: string): Promise<ScrapedPage | undefined> {
    return await this.db
      .selectFrom('scraped_pages')
      .selectAll()
      .where('content_hash', '=', contentHash)
      .executeTakeFirst();
  }

  async searchPages(filters: {
    url?: string;
    status?: ScrapedPage['status'];
    limit?: number;
    offset?: number;
  }): Promise<ScrapedPage[]> {
    let query = this.db.selectFrom('scraped_pages').selectAll();
    
    if (filters.url) {
      query = query.where('url', 'like', `%${filters.url}%`);
    }
    if (filters.status) {
      query = query.where('status', '=', filters.status);
    }
    
    query = query.orderBy('scraped_at', 'desc');
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.execute();
  }

  async updatePage(id: string, updates: Partial<ScrapedPage>): Promise<ScrapedPage> {
    const now = this.dbManager.getCurrentTimestamp();
    
    return await this.db
      .updateTable('scraped_pages')
      .set({ ...updates, updated_at: now })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deletePage(id: string): Promise<void> {
    await this.db
      .deleteFrom('scraped_pages')
      .where('id', '=', id)
      .execute();
  }

  // Scraping Jobs CRUD operations
  async createJob(job: Omit<ScrapingJob, 'id' | 'created_at' | 'updated_at'>): Promise<ScrapingJob> {
    const id = crypto.randomUUID();
    const now = this.dbManager.getCurrentTimestamp();
    
    const result = await this.db
      .insertInto('scraping_jobs')
      .values({
        id,
        created_at: now,
        updated_at: now,
        ...job
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getJob(id: string): Promise<ScrapingJob | undefined> {
    return await this.db
      .selectFrom('scraping_jobs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async getNextPendingJob(): Promise<ScrapingJob | undefined> {
    return await this.db
      .selectFrom('scraping_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .where((eb) => eb.or([
        eb('scheduled_at', 'is', null),
        eb('scheduled_at', '<=', new Date().toISOString())
      ]))
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .executeTakeFirst();
  }

  async getJobs(filters: {
    status?: ScrapingJob['status'];
    limit?: number;
    offset?: number;
  }): Promise<ScrapingJob[]> {
    let query = this.db.selectFrom('scraping_jobs').selectAll();
    
    if (filters.status) {
      query = query.where('status', '=', filters.status);
    }
    
    query = query.orderBy('created_at', 'desc');
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.execute();
  }

  async updateJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob> {
    const now = new Date().toISOString();
    
    return await this.db
      .updateTable('scraping_jobs')
      .set({ ...updates, updated_at: now })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteJob(id: string): Promise<void> {
    await this.db
      .deleteFrom('scraping_jobs')
      .where('id', '=', id)
      .execute();
  }

  // Statistics and reporting
  async getStats(): Promise<{
    totalPages: number;
    totalJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    const [pageCount, jobStats] = await Promise.all([
      this.db.selectFrom('scraped_pages').select(sql`count(*)`.as('count')).executeTakeFirstOrThrow(),
      this.db.selectFrom('scraping_jobs')
        .select([
          sql`count(*)`.as('total'),
          sql`count(case when status = 'pending' then 1 end)`.as('pending'),
          sql`count(case when status = 'running' then 1 end)`.as('running'),
          sql`count(case when status = 'completed' then 1 end)`.as('completed'),
          sql`count(case when status = 'failed' then 1 end)`.as('failed')
        ])
        .executeTakeFirstOrThrow()
    ]);
    
    return {
      totalPages: Number(pageCount.count),
      totalJobs: Number(jobStats.total),
      pendingJobs: Number(jobStats.pending),
      runningJobs: Number(jobStats.running),
      completedJobs: Number(jobStats.completed),
      failedJobs: Number(jobStats.failed)
    };
  }

  async getTopDomains(limit: number = 10): Promise<Array<{ domain: string; count: number }>> {
    const results = await this.db
      .selectFrom('scraped_pages')
      .select([
        sql`substr(url, 1, instr(substr(url, 9), '/') + 7)`.as('domain'),
        sql`count(*)`.as('count')
      ])
      .groupBy('domain')
      .orderBy('count', 'desc')
      .limit(limit)
      .execute();
    
    return results.map(r => ({
      domain: r.domain as string,
      count: Number(r.count)
    }));
  }

  get kysely() {
    return this.db;
  }

  // Performance metrics CRUD operations
  async createPerformanceMetric(metric: Omit<ScraperPerformanceMetric, 'id'>): Promise<ScraperPerformanceMetric> {
    const id = crypto.randomUUID();
    
    const result = await this.db
      .insertInto('scraper_performance')
      .values({
        id,
        ...metric
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getPerformanceMetrics(filters: {
    domain?: string;
    limit?: number;
    offset?: number;
    since?: string; // ISO timestamp
  } = {}): Promise<ScraperPerformanceMetric[]> {
    let query = this.db.selectFrom('scraper_performance').selectAll();
    
    if (filters.domain) {
      query = query.where('domain', '=', filters.domain);
    }
    if (filters.since) {
      query = query.where('timestamp', '>=', filters.since);
    }
    
    query = query.orderBy('timestamp', 'desc');
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.execute();
  }

  async getAverageProcessingTime(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<number> {
    const since = this.getTimeframeSince(timeframe);
    
    const result = await this.db
      .selectFrom('scraper_performance')
      .select(sql`AVG(processing_time_ms)`.as('avg_time'))
      .where('timestamp', '>=', since)
      .where('error_message', 'is', null) // Only successful operations
      .executeTakeFirst();
    
    return Number(result?.avg_time || 5000); // Default fallback
  }

  async getDomainPerformanceStats(domain: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    avgProcessingTime: number;
    successRate: number;
    totalRequests: number;
    avgContentSize: number;
  }> {
    const since = this.getTimeframeSince(timeframe);
    
    const stats = await this.db
      .selectFrom('scraper_performance')
      .select([
        sql`AVG(processing_time_ms)`.as('avg_time'),
        sql`COUNT(*)`.as('total'),
        sql`COUNT(CASE WHEN error_message IS NULL THEN 1 END)`.as('successful'),
        sql`AVG(content_size_bytes)`.as('avg_size')
      ])
      .where('domain', '=', domain)
      .where('timestamp', '>=', since)
      .executeTakeFirstOrThrow();
    
    return {
      avgProcessingTime: Number(stats.avg_time || 0),
      successRate: Number(stats.successful) / Number(stats.total) * 100,
      totalRequests: Number(stats.total),
      avgContentSize: Number(stats.avg_size || 0)
    };
  }

  async getPerformanceTrends(timeframe: '7d' | '30d' = '7d'): Promise<Array<{
    date: string;
    avgProcessingTime: number;
    requestCount: number;
    successRate: number;
  }>> {
    const since = this.getTimeframeSince(timeframe);
    
    const results = await this.db
      .selectFrom('scraper_performance')
      .select([
        sql`DATE(timestamp)`.as('date'),
        sql`AVG(processing_time_ms)`.as('avg_time'),
        sql`COUNT(*)`.as('count'),
        sql`(COUNT(CASE WHEN error_message IS NULL THEN 1 END) * 100.0 / COUNT(*))`.as('success_rate')
      ])
      .where('timestamp', '>=', since)
      .groupBy('date')
      .orderBy('date', 'asc')
      .execute();
    
    return results.map(r => ({
      date: r.date as string,
      avgProcessingTime: Number(r.avg_time),
      requestCount: Number(r.count),
      successRate: Number(r.success_rate)
    }));
  }

  private getTimeframeSince(timeframe: '1h' | '24h' | '7d' | '30d'): string {
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        now.setHours(now.getHours() - 1);
        break;
      case '24h':
        now.setHours(now.getHours() - 24);
        break;
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
    }
    
    return now.toISOString();
  }

  async close(): Promise<void> {
    await this.dbManager.close();
  }
}