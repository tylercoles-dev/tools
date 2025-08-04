import { Kysely, sql } from 'kysely';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
// Database setup is now handled by the dedicated migration service

// Database schema types
export interface Board {
  id?: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  color: string;
}

export interface Column {
  id?: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Card {
  id?: string;
  board_id: string;
  column_id: string;
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
  id?: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CardTag {
  card_id: string;
  tag_id: string;
}

export interface Comment {
  id?: string;
  card_id: string;
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

// Database configuration (PostgreSQL only)
export interface DatabaseConfig {
  type: 'postgres';
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export class KanbanDatabase {
  private db: Kysely<Database>;

  constructor(config: DatabaseConfig) {
    if (config.type !== 'postgres') {
      throw new Error(`Only PostgreSQL is supported. Received: ${config.type}`);
    }

    let dialect;
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

  async getBoardById(id: string): Promise<Board | undefined> {
    return await this.db
      .selectFrom('boards')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async createBoard(board: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board & { id: string }> {
    const result = await this.db
      .insertInto('boards')
      .values({
        ...board,
        id: randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Board & { id: string };
  }

  async updateBoard(id: string, updates: Partial<Omit<Board, 'id' | 'created_at'>>): Promise<Board | undefined> {
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

  async deleteBoard(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('boards')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Column operations
  async getColumnsByBoard(boardId: string): Promise<Column[]> {
    return await this.db
      .selectFrom('columns')
      .where('board_id', '=', boardId)
      .orderBy('position')
      .selectAll()
      .execute();
  }

  async getColumn(id: string): Promise<Column | undefined> {
    const result = await this.db
      .selectFrom('columns')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result as Column | undefined;
  }

  async createColumn(column: Omit<Column, 'id' | 'created_at'>): Promise<Column & { id: string }> {
    const result = await this.db
      .insertInto('columns')
      .values({
        ...column,
        id: randomUUID(),
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Column & { id: string };
  }

  async updateColumn(id: string, updates: Partial<Omit<Column, 'id' | 'created_at'>>): Promise<Column | undefined> {
    const result = await this.db
      .updateTable('columns')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  async deleteColumn(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('columns')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  // Card operations
  async getCardsByColumn(columnId: string): Promise<Card[]> {
    return await this.db
      .selectFrom('cards')
      .where('column_id', '=', columnId)
      .orderBy('position')
      .selectAll()
      .execute();
  }

  async getCardsByBoard(boardId: string): Promise<Card[]> {
    return await this.db
      .selectFrom('cards')
      .where('board_id', '=', boardId)
      .orderBy(['column_id', 'position'])
      .selectAll()
      .execute();
  }

  async getCardById(id: string): Promise<Card | undefined> {
    return await this.db
      .selectFrom('cards')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async createCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card & { id: string }> {
    const result = await this.db
      .insertInto('cards')
      .values({
        ...card,
        id: randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Card & { id: string };
  }

  async updateCard(id: string, updates: Partial<Omit<Card, 'id' | 'created_at'>>): Promise<Card | undefined> {
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

  async moveCard(cardId: string, newColumnId: string, newPosition: number): Promise<Card | undefined> {
    return await this.updateCard(cardId, {
      column_id: newColumnId,
      position: newPosition,
    });
  }

  async deleteCard(id: string): Promise<boolean> {
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

  async getCardTags(cardId: string): Promise<Tag[]> {
    return await this.db
      .selectFrom('tags')
      .innerJoin('card_tags', 'tags.id', 'card_tags.tag_id')
      .where('card_tags.card_id', '=', cardId)
      .selectAll()
      .execute();
  }

  async addCardTag(cardId: string, tagId: string): Promise<void> {
    await this.db
      .insertInto('card_tags')
      .values({ card_id: cardId, tag_id: tagId })
      .execute();
  }

  async removeCardTag(cardId: string, tagId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('card_tags')
      .where('card_id', '=', cardId)
      .where('tag_id', '=', tagId)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  async createTag(tag: Omit<Tag, 'id' | 'created_at'>): Promise<Tag & { id: string }> {
    const result = await this.db
      .insertInto('tags')
      .values({
        ...tag,
        id: randomUUID(),
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Tag & { id: string };
  }

  // Comment operations
  async getCardComments(cardId: string): Promise<Comment[]> {
    return await this.db
      .selectFrom('comments')
      .where('card_id', '=', cardId)
      .orderBy('created_at', 'desc')
      .selectAll()
      .execute();
  }

  async addComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment & { id: string }> {
    const result = await this.db
      .insertInto('comments')
      .values({
        ...comment,
        id: randomUUID(),
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result as Comment & { id: string };
  }

  async deleteComment(id: string): Promise<boolean> {
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