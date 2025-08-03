/**
 * Wiki full-text search migration
 * Adds PostgreSQL full-text search capabilities for wiki pages
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const addWikiFullTextSearch: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 003_wiki_full_text_search (up)');

    // Add search vector column to pages table (PostgreSQL specific)
    try {
      await sql`ALTER TABLE pages ADD COLUMN search_vector tsvector`.execute(db);
      logger.info('Added search_vector column to pages table');
    } catch (error) {
      // Column might already exist or we might be on SQLite
      logger.warn('Could not add search_vector column (may be SQLite or column exists):', error);
    }

    // Create PostgreSQL full-text search index
    try {
      await sql`CREATE INDEX idx_pages_search_vector ON pages USING GIN(search_vector)`.execute(db);
      logger.info('Created GIN index for full-text search');
    } catch (error) {
      logger.warn('Could not create GIN index (may be SQLite):', error);
    }

    // Create function to update search vector (PostgreSQL specific)
    try {
      await sql`
        CREATE OR REPLACE FUNCTION update_page_search_vector() 
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english', 
            COALESCE(NEW.title, '') || ' ' || 
            COALESCE(NEW.content, '') || ' ' || 
            COALESCE(NEW.summary, '')
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `.execute(db);
      logger.info('Created search vector update function');
    } catch (error) {
      logger.warn('Could not create search vector function (may be SQLite):', error);
    }

    // Create trigger for maintaining search vector (PostgreSQL specific)
    try {
      await sql`
        CREATE TRIGGER update_pages_search_vector
          BEFORE INSERT OR UPDATE ON pages
          FOR EACH ROW
          EXECUTE FUNCTION update_page_search_vector()
      `.execute(db);
      logger.info('Created search vector trigger');
    } catch (error) {
      logger.warn('Could not create search vector trigger (may be SQLite):', error);
    }

    // For SQLite, create FTS5 virtual table
    try {
      await sql`
        CREATE VIRTUAL TABLE pages_fts USING fts5(
          title, 
          content, 
          summary,
          content='pages',
          content_rowid='id'
        )
      `.execute(db);
      logger.info('Created SQLite FTS5 virtual table');

      // Create triggers for SQLite FTS5
      await sql`
        CREATE TRIGGER pages_fts_insert AFTER INSERT ON pages
        BEGIN
          INSERT INTO pages_fts(rowid, title, content, summary) 
          VALUES (NEW.id, NEW.title, NEW.content, NEW.summary);
        END
      `.execute(db);

      await sql`
        CREATE TRIGGER pages_fts_update AFTER UPDATE ON pages
        BEGIN
          UPDATE pages_fts 
          SET title = NEW.title, content = NEW.content, summary = NEW.summary
          WHERE rowid = NEW.id;
        END
      `.execute(db);

      await sql`
        CREATE TRIGGER pages_fts_delete AFTER DELETE ON pages
        BEGIN
          DELETE FROM pages_fts WHERE rowid = OLD.id;
        END
      `.execute(db);

      logger.info('Created SQLite FTS5 triggers');
    } catch (error) {
      // FTS5 might not be available or we might be on PostgreSQL
      logger.warn('Could not create SQLite FTS5 table (may be PostgreSQL):', error);
    }

    // Update existing pages with search vectors (PostgreSQL only)
    try {
      await sql`
        UPDATE pages SET search_vector = to_tsvector('english', 
          COALESCE(title, '') || ' ' || 
          COALESCE(content, '') || ' ' || 
          COALESCE(summary, '')
        )
      `.execute(db);
      logger.info('Updated existing pages with search vectors');
    } catch (error) {
      logger.warn('Could not update search vectors (may be SQLite):', error);
    }

    // Populate SQLite FTS table with existing data
    try {
      await sql`
        INSERT INTO pages_fts(rowid, title, content, summary)
        SELECT id, title, content, summary FROM pages
      `.execute(db);
      logger.info('Populated SQLite FTS table with existing data');
    } catch (error) {
      logger.warn('Could not populate FTS table (may be PostgreSQL or no data):', error);
    }

    logger.info('Migration 003_wiki_full_text_search completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 003_wiki_full_text_search (down)');

    // Drop SQLite FTS triggers
    try {
      await sql`DROP TRIGGER IF EXISTS pages_fts_insert`.execute(db);
      await sql`DROP TRIGGER IF EXISTS pages_fts_update`.execute(db);
      await sql`DROP TRIGGER IF EXISTS pages_fts_delete`.execute(db);
      logger.info('Dropped SQLite FTS triggers');
    } catch (error) {
      logger.warn('Could not drop SQLite FTS triggers:', error);
    }

    // Drop SQLite FTS table
    try {
      await sql`DROP TABLE IF EXISTS pages_fts`.execute(db);
      logger.info('Dropped SQLite FTS table');
    } catch (error) {
      logger.warn('Could not drop SQLite FTS table:', error);
    }

    // Drop PostgreSQL trigger
    try {
      await sql`DROP TRIGGER IF EXISTS update_pages_search_vector ON pages`.execute(db);
      logger.info('Dropped PostgreSQL search vector trigger');
    } catch (error) {
      logger.warn('Could not drop PostgreSQL trigger:', error);
    }

    // Drop PostgreSQL function
    try {
      await sql`DROP FUNCTION IF EXISTS update_page_search_vector()`.execute(db);
      logger.info('Dropped PostgreSQL search vector function');
    } catch (error) {
      logger.warn('Could not drop PostgreSQL function:', error);
    }

    // Drop PostgreSQL index
    try {
      await sql`DROP INDEX IF EXISTS idx_pages_search_vector`.execute(db);
      logger.info('Dropped PostgreSQL search index');
    } catch (error) {
      logger.warn('Could not drop PostgreSQL index:', error);
    }

    // Drop search vector column
    try {
      await sql`ALTER TABLE pages DROP COLUMN IF EXISTS search_vector`.execute(db);
      logger.info('Dropped search_vector column');
    } catch (error) {
      logger.warn('Could not drop search_vector column:', error);
    }

    logger.info('Migration 003_wiki_full_text_search rollback completed');
  }
};