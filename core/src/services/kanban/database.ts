/**
 * Kanban Database Layer
 */

import { Kysely, sql, Generated } from 'kysely';
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
// Remove unused imports - types are defined in table interfaces above

// Database schema interfaces - separate types for inserts vs selects
interface BoardTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

interface ColumnTable {
  id: Generated<number>;
  board_id: number;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

interface CardTable {
  id: Generated<number>;
  board_id: number;
  column_id: number;
  title: string;
  description: string | null;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface TagTable {
  id: Generated<number>;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface CommentTable {
  id: Generated<number>;
  card_id: number;
  content: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanDatabase {
  boards: BoardTable;
  columns: ColumnTable;
  cards: CardTable;
  tags: TagTable;
  card_tags: {
    card_id: number;
    tag_id: number;
    created_at: string;
  };
  comments: CommentTable;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  filename?: string; // for SQLite
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export class KanbanDatabase {
  private db: Kysely<KanbanDatabase>;

  constructor(config: DatabaseConfig) {
    if (config.type === 'sqlite') {
      const database = new Database(config.filename || './kanban.db');
      this.db = new Kysely<KanbanDatabase>({
        dialect: new SqliteDialect({ database })
      });
    } else {
      throw new Error('PostgreSQL support not yet implemented');
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Creating kanban database tables...');
      await this.createTables();
      console.log('✅ Kanban database tables created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to create kanban tables:', errorMessage);
      console.error('Error details:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // Create boards table
    const boardsQuery = this.db.schema
      .createTable('boards')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('color', 'text', (col) => col.notNull().defaultTo('#6366f1'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`));
    
    const compiled = boardsQuery.compile();
    console.log('Boards table SQL:', compiled.sql);
    console.log('Parameters:', compiled.parameters);
    
    await boardsQuery.execute();

    // Create columns table
    await this.db.schema
      .createTable('columns')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('color', 'text', (col) => col.notNull().defaultTo('#64748b'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create cards table
    await this.db.schema
      .createTable('cards')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('board_id', 'integer', (col) => col.notNull())
      .addColumn('column_id', 'integer', (col) => col.notNull())
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('priority', 'text', (col) => col.notNull().defaultTo('medium'))
      .addColumn('assigned_to', 'text')
      .addColumn('due_date', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create tags table
    await this.db.schema
      .createTable('tags')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull().unique())
      .addColumn('color', 'text', (col) => col.notNull().defaultTo('#64748b'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create card_tags junction table
    await this.db.schema
      .createTable('card_tags')
      .ifNotExists()
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('tag_id', 'integer', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addPrimaryKeyConstraint('primary_key', ['card_id', 'tag_id'])
      .execute();

    // Create comments table
    await this.db.schema
      .createTable('comments')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('card_id', 'integer', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('author', 'text')
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create indexes
    await this.db.schema
      .createIndex('idx_columns_board_id')
      .ifNotExists()
      .on('columns')
      .columns(['board_id'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_cards_board_id')
      .ifNotExists()
      .on('cards')
      .columns(['board_id'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_cards_column_id')
      .ifNotExists()
      .on('cards')
      .columns(['column_id'])
      .execute();
    
    await this.db.schema
      .createIndex('idx_comments_card_id')
      .ifNotExists()
      .on('comments')
      .columns(['card_id'])
      .execute();
  }

  get kysely() {
    return this.db;
  }

  async close(): Promise<void> {
    await this.db.destroy();
  }
}