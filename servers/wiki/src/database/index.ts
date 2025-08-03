import { Kysely, Generated, Selectable, Insertable, Updateable, sql } from 'kysely';
import { SqliteDialect, PostgresDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
// Database setup is now handled by the dedicated migration service

// Database schema interfaces
export interface Database {
  pages: PagesTable;
  categories: CategoriesTable;
  page_categories: PageCategoriesTable;
  tags: TagsTable;
  page_tags: PageTagsTable;
  page_links: PageLinksTable;
  wiki_attachments: AttachmentsTable;
  page_history: PageHistoryTable;
  comments: CommentsTable;
}

export interface PagesTable {
  id: Generated<number>;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  created_by: string | null;
  updated_by: string | null;
  is_published: Generated<boolean>;
  parent_id: number | null;
  sort_order: Generated<number>;
}

export interface CategoriesTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  color: Generated<string>;
  created_at: Generated<string>;
}

export interface PageCategoriesTable {
  page_id: number;
  category_id: number;
}

export interface TagsTable {
  id: Generated<number>;
  name: string;
  color: Generated<string>;
  created_at: Generated<string>;
}

export interface PageTagsTable {
  page_id: number;
  tag_id: number;
}

export interface PageLinksTable {
  id: Generated<number>;
  source_page_id: number;
  target_page_id: number;
  link_text: string | null;
  created_at: Generated<string>;
}

export interface AttachmentsTable {
  id: string; // PostgreSQL uses TEXT PRIMARY KEY
  page_id: number;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  thumbnail_path: string | null;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: Generated<string>;
}

export interface PageHistoryTable {
  id: Generated<number>;
  page_id: number;
  title: string;
  content: string;
  summary: string | null;
  changed_by: string | null;
  change_reason: string | null;
  created_at: Generated<string>;
}

export interface CommentsTable {
  id: Generated<number>;
  page_id: number;
  content: string;
  author: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  parent_id: number | null;
}

// Type aliases for convenience
export type Page = Selectable<PagesTable>;
export type NewPage = Insertable<PagesTable>;
export type PageUpdate = Updateable<PagesTable>;

export type Category = Selectable<CategoriesTable>;
export type NewCategory = Insertable<CategoriesTable>;
export type CategoryUpdate = Updateable<CategoriesTable>;

export type Tag = Selectable<TagsTable>;
export type NewTag = Insertable<TagsTable>;
export type TagUpdate = Updateable<TagsTable>;

export type Comment = Selectable<CommentsTable>;
export type NewComment = Insertable<CommentsTable>;
export type CommentUpdate = Updateable<CommentsTable>;

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  filename?: string; // SQLite
  connectionString?: string; // All
  host?: string; // PostgreSQL/MySQL
  port?: number; // PostgreSQL/MySQL
  user?: string; // PostgreSQL/MySQL
  password?: string; // PostgreSQL/MySQL
  database?: string; // PostgreSQL/MySQL
}

export class WikiDatabase {
  private db: Kysely<Database>;
  private sqliteDb?: Database.Database;
  private dbType: string;

  constructor(private config: DatabaseConfig) {
    this.dbType = config.type;
    let dialect;

    switch (config.type) {
      case 'sqlite':
        this.sqliteDb = new Database(config.filename || ':memory:');
        dialect = new SqliteDialect({
          database: this.sqliteDb,
        });
        break;

      case 'postgres':
        if (config.connectionString) {
          dialect = new PostgresDialect({
            pool: new Pool({
              connectionString: config.connectionString,
            }),
          });
        } else {
          dialect = new PostgresDialect({
            pool: new Pool({
              host: config.host,
              port: config.port,
              user: config.user,
              password: config.password,
              database: config.database,
            }),
          });
        }
        break;

      default:
        throw new Error(`Database type ${config.type} not yet implemented`);
    }

    this.db = new Kysely<Database>({ dialect });
  }


  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Database initialization is now handled by the dedicated migration service
    // This method is kept for compatibility but performs no database setup
    console.log('Wiki database initialization: Database migrations are handled by the migration service');
    
    // Test database connection to ensure it's available
    try {
      await this.db.selectFrom('pages').select('id').limit(1).execute();
      console.log('✅ Wiki database connection verified successfully');
    } catch (error) {
      console.error('❌ Wiki database connection failed. Ensure migration service has completed:', error);
      throw new Error('Database not available. Migration service may not have completed successfully.');
    }
  }

  // Page operations
  async getPages(): Promise<Page[]> {
    return await this.db
      .selectFrom('pages')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .execute();
  }

  async getPageById(id: number): Promise<Page | undefined> {
    return await this.db
      .selectFrom('pages')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async getPageBySlug(slug: string): Promise<Page | undefined> {
    return await this.db
      .selectFrom('pages')
      .selectAll()
      .where('slug', '=', slug)
      .executeTakeFirst();
  }

  async createPage(page: NewPage): Promise<Page> {
    const result = await this.db
      .insertInto('pages')
      .values(page)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async updatePage(id: number, updates: PageUpdate): Promise<Page> {
    const result = await this.db
      .updateTable('pages')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async deletePage(id: number): Promise<void> {
    await this.db
      .deleteFrom('pages')
      .where('id', '=', id)
      .execute();
  }

  async getPagesByParent(parentId: number | null): Promise<Page[]> {
    return await this.db
      .selectFrom('pages')
      .selectAll()
      .where('parent_id', parentId === null ? 'is' : '=', parentId)
      .orderBy('sort_order')
      .orderBy('title')
      .execute();
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await this.db
      .selectFrom('categories')
      .selectAll()
      .orderBy('name')
      .execute();
  }

  async createCategory(category: NewCategory): Promise<Category> {
    const result = await this.db
      .insertInto('categories')
      .values(category)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getPageCategories(pageId: number): Promise<Category[]> {
    return await this.db
      .selectFrom('page_categories')
      .innerJoin('categories', 'categories.id', 'page_categories.category_id')
      .selectAll('categories')
      .where('page_categories.page_id', '=', pageId)
      .execute();
  }

  // Tag operations
  async getTags(): Promise<Tag[]> {
    return await this.db
      .selectFrom('tags')
      .selectAll()
      .orderBy('name')
      .execute();
  }

  async createTag(tag: NewTag): Promise<Tag> {
    const result = await this.db
      .insertInto('tags')
      .values(tag)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async getOrCreateTag(name: string, color?: string): Promise<Tag> {
    const existing = await this.db
      .selectFrom('tags')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();

    if (existing) {
      return existing;
    }

    return await this.createTag({ name, color });
  }

  async getPageTags(pageId: number): Promise<Tag[]> {
    return await this.db
      .selectFrom('page_tags')
      .innerJoin('tags', 'tags.id', 'page_tags.tag_id')
      .selectAll('tags')
      .where('page_tags.page_id', '=', pageId)
      .execute();
  }

  async addPageTag(pageId: number, tagId: number): Promise<void> {
    await this.db
      .insertInto('page_tags')
      .values({ page_id: pageId, tag_id: tagId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async removePageTag(pageId: number, tagId: number): Promise<void> {
    await this.db
      .deleteFrom('page_tags')
      .where('page_id', '=', pageId)
      .where('tag_id', '=', tagId)
      .execute();
  }

  // Search operations
  async searchPages(query: string, limit = 50): Promise<Page[]> {
    if (this.config.type === 'sqlite') {
      // Use SQLite FTS5
      const pages = await this.db
        .selectFrom('pages')
        .selectAll()
        .where('id', 'in', (eb) =>
          eb.selectFrom('pages_fts' as any)
            .select('rowid' as any)
            .where('pages_fts' as any, 'match', query)
        )
        .limit(limit)
        .execute();
      
      return pages;
    } else if (this.config.type === 'postgres') {
      // Use PostgreSQL full-text search with search_vector
      return await this.db
        .selectFrom('pages')
        .selectAll()
        .where(sql`search_vector @@ to_tsquery('english', ${sql.lit(query)})`)
        .orderBy(sql`ts_rank(search_vector, to_tsquery('english', ${sql.lit(query)}))`, 'desc')
        .limit(limit)
        .execute();
    }
    
    // Fallback to LIKE search for other database types
    return await this.db
      .selectFrom('pages')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('title', 'like', `%${query}%`),
          eb('content', 'like', `%${query}%`),
          eb('summary', 'like', `%${query}%`),
        ])
      )
      .limit(limit)
      .execute();
  }

  // Comment operations
  async getPageComments(pageId: number): Promise<Comment[]> {
    return await this.db
      .selectFrom('comments')
      .selectAll()
      .where('page_id', '=', pageId)
      .orderBy('created_at')
      .execute();
  }

  async createComment(comment: NewComment): Promise<Comment> {
    const result = await this.db
      .insertInto('comments')
      .values(comment)
      .returningAll()
      .executeTakeFirstOrThrow();
    
    return result;
  }

  async deleteComment(id: number): Promise<void> {
    await this.db
      .deleteFrom('comments')
      .where('id', '=', id)
      .execute();
  }

  // Statistics and analytics
  async getStats(): Promise<any> {
    const [
      totalPages,
      publishedPages,
      totalCategories,
      totalTags,
      totalComments,
    ] = await Promise.all([
      this.db.selectFrom('pages').select((eb) => eb.fn.count('id').as('count')).executeTakeFirst(),
      this.db.selectFrom('pages').select((eb) => eb.fn.count('id').as('count')).where('is_published', '=', true).executeTakeFirst(),
      this.db.selectFrom('categories').select((eb) => eb.fn.count('id').as('count')).executeTakeFirst(),
      this.db.selectFrom('tags').select((eb) => eb.fn.count('id').as('count')).executeTakeFirst(),
      this.db.selectFrom('comments').select((eb) => eb.fn.count('id').as('count')).executeTakeFirst(),
    ]);

    return {
      total_pages: Number(totalPages?.count || 0),
      published_pages: Number(publishedPages?.count || 0),
      draft_pages: Number(totalPages?.count || 0) - Number(publishedPages?.count || 0),
      total_categories: Number(totalCategories?.count || 0),
      total_tags: Number(totalTags?.count || 0),
      total_comments: Number(totalComments?.count || 0),
    };
  }

  // Page categories operations
  async removePageCategories(pageId: number): Promise<void> {
    await this.db
      .deleteFrom('page_categories')
      .where('page_id', '=', pageId)
      .execute();
  }

  async addPageCategory(pageId: number, categoryId: number): Promise<void> {
    await this.db
      .insertInto('page_categories')
      .values({ page_id: pageId, category_id: categoryId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  // Page tags operations
  async removePageTags(pageId: number): Promise<void> {
    await this.db
      .deleteFrom('page_tags')
      .where('page_id', '=', pageId)
      .execute();
  }

  // Page history operations
  async getPageHistory(pageId: number): Promise<any[]> {
    return await this.db
      .selectFrom('page_history')
      .selectAll()
      .where('page_id', '=', pageId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async createPageHistory(data: {
    page_id: number;
    title: string;
    content: string;
    summary?: string | null;
    changed_by?: string | null;
    change_reason?: string | null;
  }): Promise<void> {
    await this.db
      .insertInto('page_history')
      .values(data)
      .execute();
  }

  // Page links operations
  async getPageLinks(pageId: number): Promise<any[]> {
    return await this.db
      .selectFrom('page_links')
      .innerJoin('pages as target_pages', 'target_pages.id', 'page_links.target_page_id')
      .select([
        'page_links.id',
        'page_links.target_page_id',
        'page_links.link_text',
        'page_links.created_at',
        'target_pages.title as target_title',
        'target_pages.slug as target_slug',
      ])
      .where('page_links.source_page_id', '=', pageId)
      .execute();
  }

  async getPageBacklinks(pageId: number): Promise<any[]> {
    return await this.db
      .selectFrom('page_links')
      .innerJoin('pages as source_pages', 'source_pages.id', 'page_links.source_page_id')
      .select([
        'page_links.id',
        'page_links.source_page_id',
        'page_links.link_text',
        'page_links.created_at',
        'source_pages.title as source_title',
        'source_pages.slug as source_slug',
      ])
      .where('page_links.target_page_id', '=', pageId)
      .execute();
  }

  async removePageLinks(pageId: number): Promise<void> {
    await this.db
      .deleteFrom('page_links')
      .where('source_page_id', '=', pageId)
      .execute();
  }

  async createPageLink(data: {
    source_page_id: number;
    target_page_id: number;
    link_text?: string | null;
  }): Promise<void> {
    await this.db
      .insertInto('page_links')
      .values(data)
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  // Direct access to Kysely instance for complex queries
  get kysely(): Kysely<Database> {
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}