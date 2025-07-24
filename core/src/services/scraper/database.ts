/**
 * Scraper Database Layer
 */

import { Kysely, sql } from 'kysely';
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
import crypto from 'crypto';
import type { DatabaseConfig } from '../../utils/database.js';
import type { ScrapedPage, ScrapingJob } from './types.js';

// Database schema interfaces
export interface ScraperDatabase {
  scraped_pages: ScrapedPage;
  scraping_jobs: ScrapingJob;
}

export class ScraperDatabaseManager {
  private db: Kysely<ScraperDatabase>;

  constructor(config: DatabaseConfig) {
    if (config.type === 'sqlite') {
      const database = new Database(config.filename || './scraper.db');
      this.db = new Kysely<ScraperDatabase>({
        dialect: new SqliteDialect({ database })
      });
    } else {
      throw new Error('PostgreSQL support not yet implemented');
    }
  }

  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // Create scraped_pages table
    await this.db.schema
      .createTable('scraped_pages')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('url', 'text', (col) => col.notNull())
      .addColumn('title', 'text')
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('content_hash', 'text', (col) => col.notNull())
      .addColumn('metadata', 'text', (col) => col.notNull().defaultTo('{}')) // JSON
      .addColumn('scraped_at', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('error_message', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create scraping_jobs table
    await this.db.schema
      .createTable('scraping_jobs')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('url', 'text', (col) => col.notNull())
      .addColumn('selector', 'text')
      .addColumn('options', 'text', (col) => col.notNull().defaultTo('{}')) // JSON
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
      .addColumn('priority', 'integer', (col) => col.notNull().defaultTo(5))
      .addColumn('scheduled_at', 'text')
      .addColumn('started_at', 'text')
      .addColumn('completed_at', 'text')
      .addColumn('error_message', 'text')
      .addColumn('result_page_id', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Add indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_scraped_pages_url ON scraped_pages(url)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_scraped_pages_content_hash ON scraped_pages(content_hash)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_scraped_pages_scraped_at ON scraped_pages(scraped_at)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_scraping_jobs_priority ON scraping_jobs(priority)`.execute(this.db);
    await sql`CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scheduled_at ON scraping_jobs(scheduled_at)`.execute(this.db);
  }

  // Scraped Pages CRUD operations
  async createPage(page: Omit<ScrapedPage, 'id' | 'created_at' | 'updated_at'>): Promise<ScrapedPage> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
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
    const now = new Date().toISOString();
    
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
    const now = new Date().toISOString();
    
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

  async close(): Promise<void> {
    await this.db.destroy();
  }
}