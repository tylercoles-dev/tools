import { Kysely, sql } from 'kysely';
import { SqliteDialect } from 'kysely';
import { PostgresDialect } from 'kysely';
import { MysqlDialect } from 'kysely';
import { default as SQLiteDb } from 'better-sqlite3';
import { Pool } from 'pg';
import { createPool } from 'mysql2';
// Database setup is now handled by the dedicated migration service

// Database schema types
export interface Board {
  id?: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  color: string;
}

export interface Column {
  id?: number;
  board_id: number;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Card {
  id?: number;
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

export interface Tag {
  id?: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CardTag {
  card_id: number;
  tag_id: number;
}

export interface Comment {
  id?: number;
  card_id: number;
  content: string;
  author: string | null;
  created_at: string;
}

export interface Database {
  boards: Board;
  columns: Column;
  cards: Card;
  tags: Tag;
  card_tags: CardTag;
  comments: Comment;
}

// Database configuration
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string; // for SQLite
}

export class KanbanDatabase {
  private db: Kysely<Database>;
  private dbType: string;

  constructor(config: DatabaseConfig) {
    this.dbType = config.type;
    let dialect;

    switch (config.type) {
      case 'sqlite':
        dialect = new SqliteDialect({
          database: new SQLiteDb(config.filename || ':memory:'),
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

      case 'mysql':
        if (config.connectionString) {
          dialect = new MysqlDialect({
            pool: createPool(config.connectionString),
          });
        } else {
          dialect = new MysqlDialect({
            pool: createPool({
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
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    this.db = new Kysely<Database>({ dialect });
  }

  async initialize(): Promise<void> {
    // Database initialization is now handled by the dedicated migration service
    // This method is kept for compatibility but performs no database setup
    console.log('Kanban database initialization: Database migrations are handled by the migration service');
    
    // Test database connection to ensure it's available
    try {
      await this.db.selectFrom('boards').select('id').limit(1).execute();
      console.log('Kanban database connection verified successfully');
    } catch (error) {
      console.error('Kanban database connection failed. Ensure migration service has completed:', error);
      throw new Error('Database not available. Migration service may not have completed successfully.');
    }
  }

  // Board operations
  async getBoards(): Promise<Board[]> {
    return await this.db.selectFrom('boards').selectAll().execute();
  }

  async getBoardById(id: number): Promise<Board | undefined> {
    return await this.db
      .selectFrom('boards')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async createBoard(board: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board & { id: number }> {
    const result = await this.db
      .insertInto('boards')
      .values({
        ...board,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Board & { id: number };
  }

  async updateBoard(id: number, updates: Partial<Omit<Board, 'id' | 'created_at'>>): Promise<Board | undefined> {
    const result = await this.db
      .updateTable('boards')
      .set({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  async deleteBoard(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('boards')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Column operations
  async getColumnsByBoard(boardId: number): Promise<Column[]> {
    return await this.db
      .selectFrom('columns')
      .where('board_id', '=', boardId)
      .orderBy('position')
      .selectAll()
      .execute();
  }

  async getColumn(id: number): Promise<Column | undefined> {
    const result = await this.db
      .selectFrom('columns')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result as Column | undefined;
  }

  async createColumn(column: Omit<Column, 'id' | 'created_at'>): Promise<Column & { id: number }> {
    const result = await this.db
      .insertInto('columns')
      .values({
        ...column,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Column & { id: number };
  }

  async updateColumn(id: number, updates: Partial<Omit<Column, 'id' | 'created_at'>>): Promise<Column | undefined> {
    const result = await this.db
      .updateTable('columns')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  async deleteColumn(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('columns')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Card operations
  async getCardsByColumn(columnId: number): Promise<Card[]> {
    return await this.db
      .selectFrom('cards')
      .where('column_id', '=', columnId)
      .orderBy('position')
      .selectAll()
      .execute();
  }

  async getCardsByBoard(boardId: number): Promise<Card[]> {
    return await this.db
      .selectFrom('cards')
      .where('board_id', '=', boardId)
      .orderBy(['column_id', 'position'])
      .selectAll()
      .execute();
  }

  async getCardById(id: number): Promise<Card | undefined> {
    return await this.db
      .selectFrom('cards')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async createCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card & { id: number }> {
    const result = await this.db
      .insertInto('cards')
      .values({
        ...card,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Card & { id: number };
  }

  async updateCard(id: number, updates: Partial<Omit<Card, 'id' | 'created_at'>>): Promise<Card | undefined> {
    const result = await this.db
      .updateTable('cards')
      .set({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  async moveCard(cardId: number, newColumnId: number, newPosition: number): Promise<Card | undefined> {
    return await this.updateCard(cardId, {
      column_id: newColumnId,
      position: newPosition,
    });
  }

  async deleteCard(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('cards')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Tag operations
  async getTags(): Promise<Tag[]> {
    return await this.db.selectFrom('tags').selectAll().execute();
  }

  async getCardTags(cardId: number): Promise<Tag[]> {
    return await this.db
      .selectFrom('tags')
      .innerJoin('card_tags', 'tags.id', 'card_tags.tag_id')
      .where('card_tags.card_id', '=', cardId)
      .selectAll()
      .execute();
  }

  async addCardTag(cardId: number, tagId: number): Promise<void> {
    await this.db
      .insertInto('card_tags')
      .values({ card_id: cardId, tag_id: tagId })
      .execute();
  }

  async removeCardTag(cardId: number, tagId: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('card_tags')
      .where('card_id', '=', cardId)
      .where('tag_id', '=', tagId)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  async createTag(tag: Omit<Tag, 'id' | 'created_at'>): Promise<Tag & { id: number }> {
    const result = await this.db
      .insertInto('tags')
      .values({
        ...tag,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Tag & { id: number };
  }

  // Comment operations
  async getCardComments(cardId: number): Promise<Comment[]> {
    return await this.db
      .selectFrom('comments')
      .where('card_id', '=', cardId)
      .orderBy('created_at', 'desc')
      .selectAll()
      .execute();
  }

  async addComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment & { id: number }> {
    const result = await this.db
      .insertInto('comments')
      .values({
        ...comment,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Comment & { id: number };
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('comments')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Search operations
  async searchCards(query: string): Promise<Card[]> {
    const searchTerm = `%${query}%`;
    return await this.db
      .selectFrom('cards')
      .selectAll()
      .where((eb) => eb.or([
        eb('title', 'like', searchTerm),
        eb('description', 'like', searchTerm),
        eb('assigned_to', 'like', searchTerm)
      ]))
      .orderBy('updated_at', 'desc')
      .execute();
  }

  async getRecentlyUpdatedCards(limit: number = 50): Promise<Card[]> {
    return await this.db
      .selectFrom('cards')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .execute();
  }

  // Utility method to close database connection
  async close(): Promise<void> {
    await this.db.destroy();
  }
}