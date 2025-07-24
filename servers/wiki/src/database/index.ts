import { Kysely, Generated, Selectable, Insertable, Updateable } from 'kysely';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database schema interfaces
export interface Database {
  pages: PagesTable;
  categories: CategoriesTable;
  page_categories: PageCategoriesTable;
  tags: TagsTable;
  page_tags: PageTagsTable;
  page_links: PageLinksTable;
  attachments: AttachmentsTable;
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
  id: Generated<number>;
  page_id: number;
  filename: string;
  original_name: string;
  mime_type: string | null;
  file_size: number | null;
  file_path: string;
  created_at: Generated<string>;
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

  constructor(private config: DatabaseConfig) {
    if (config.type === 'sqlite') {
      this.sqliteDb = new Database(config.filename || ':memory:');
      // Import SqliteDialect dynamically to avoid issues
      this.initializeSqlite();
    } else {
      throw new Error(`Database type ${config.type} not yet implemented`);
    }
  }

  private async initializeSqlite() {
    const { SqliteDialect } = await import('kysely');
    this.db = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: this.sqliteDb!,
      }),
    });
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      // Split and execute SQL statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (this.config.type === 'sqlite' && this.sqliteDb) {
          this.sqliteDb.exec(statement);
        }
      }

      console.log('✅ Wiki database schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
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
    }
    
    // Fallback to LIKE search
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

  async close(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}