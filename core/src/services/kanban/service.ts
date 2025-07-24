/**
 * Kanban Service Layer
 * 
 * Core business logic for Kanban operations
 */

import { sql } from 'kysely';
import type { KanbanDatabase } from './database.js';
import type {
  Board,
  Column,
  Tag,
  Comment,
  CreateBoardInput,
  UpdateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CreateTagInput,
  CreateCommentInput,
  SearchCardsInput,
  BoardWithColumns,
  ColumnWithCards,
  CardWithTags,
  KanbanStats
} from './types.js';
import {
  NotFoundError,
  ValidationError
} from './types.js';

export class KanbanService {
  constructor(private database: KanbanDatabase) {}

  // Board operations
  async getAllBoards(): Promise<Board[]> {
    return await this.database.kysely
      .selectFrom('boards')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  }

  async getBoardById(id: number): Promise<BoardWithColumns | null> {
    const board = await this.database.kysely
      .selectFrom('boards')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!board) {
      return null;
    }

    const columns = await this.getColumnsByBoardId(id);

    return {
      ...board,
      columns
    };
  }

  async createBoard(input: CreateBoardInput): Promise<Board> {
    const now = new Date().toISOString();
    
    const result = await this.database.kysely
      .insertInto('boards')
      .values({
        name: input.name,
        description: input.description || null,
        color: input.color || '#6366f1',
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create default columns
    await this.createDefaultColumns(result.id);

    return result;
  }

  async updateBoard(id: number, input: UpdateBoardInput): Promise<Board> {
    const board = await this.database.kysely
      .selectFrom('boards')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!board) {
      throw new NotFoundError('Board', id);
    }

    const now = new Date().toISOString();

    return await this.database.kysely
      .updateTable('boards')
      .set({
        ...input,
        updated_at: now
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteBoard(id: number): Promise<void> {
    const result = await this.database.kysely
      .deleteFrom('boards')
      .where('id', '=', id)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Board', id);
    }
  }

  // Column operations
  async getColumnsByBoardId(boardId: number): Promise<ColumnWithCards[]> {
    const columns = await this.database.kysely
      .selectFrom('columns')
      .selectAll()
      .where('board_id', '=', boardId)
      .orderBy('position', 'asc')
      .execute();

    const columnsWithCards: ColumnWithCards[] = [];

    for (const column of columns) {
      const cards = await this.getCardsByColumnId(column.id);
      columnsWithCards.push({
        ...column,
        cards
      });
    }

    return columnsWithCards;
  }

  async createColumn(input: CreateColumnInput): Promise<Column> {
    const now = new Date().toISOString();

    return await this.database.kysely
      .insertInto('columns')
      .values({
        board_id: input.board_id,
        name: input.name,
        position: input.position || 0,
        color: input.color || '#64748b',
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateColumn(id: number, input: UpdateColumnInput): Promise<Column> {
    const column = await this.database.kysely
      .selectFrom('columns')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!column) {
      throw new NotFoundError('Column', id);
    }

    const now = new Date().toISOString();

    return await this.database.kysely
      .updateTable('columns')
      .set({
        ...input,
        updated_at: now
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteColumn(id: number): Promise<void> {
    const result = await this.database.kysely
      .deleteFrom('columns')
      .where('id', '=', id)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Column', id);
    }
  }

  // Card operations
  async getCardsByColumnId(columnId: number): Promise<CardWithTags[]> {
    const cards = await this.database.kysely
      .selectFrom('cards')
      .selectAll()
      .where('column_id', '=', columnId)
      .orderBy('position', 'asc')
      .execute();

    const cardsWithTags: CardWithTags[] = [];

    for (const card of cards) {
      const tags = await this.getCardTags(card.id);
      cardsWithTags.push({
        ...card,
        tags
      });
    }

    return cardsWithTags;
  }

  async getCardById(id: number): Promise<CardWithTags | null> {
    const card = await this.database.kysely
      .selectFrom('cards')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!card) {
      return null;
    }

    const tags = await this.getCardTags(id);

    return {
      ...card,
      tags
    };
  }

  async createCard(input: CreateCardInput): Promise<CardWithTags> {
    // Find column by ID or name/position
    let columnId = input.column_id;

    if (!columnId && input.column_name) {
      const column = await this.database.kysely
        .selectFrom('columns')
        .select('id')
        .where('board_id', '=', input.board_id)
        .where('name', '=', input.column_name)
        .executeTakeFirst();

      if (!column) {
        throw new ValidationError(`Column '${input.column_name}' not found`);
      }

      columnId = column.id;
    }

    if (!columnId) {
      // Get first column if none specified
      const firstColumn = await this.database.kysely
        .selectFrom('columns')
        .select('id')
        .where('board_id', '=', input.board_id)
        .orderBy('position', 'asc')
        .executeTakeFirst();

      if (!firstColumn) {
        throw new ValidationError('No columns found for board');
      }

      columnId = firstColumn.id;
    }

    const now = new Date().toISOString();

    const card = await this.database.kysely
      .insertInto('cards')
      .values({
        board_id: input.board_id,
        column_id: columnId,
        title: input.title,
        description: input.description || null,
        position: input.position || 0,
        priority: input.priority || 'medium',
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...card,
      tags: []
    };
  }

  async updateCard(id: number, input: UpdateCardInput): Promise<CardWithTags> {
    const card = await this.database.kysely
      .selectFrom('cards')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!card) {
      throw new NotFoundError('Card', id);
    }

    const now = new Date().toISOString();

    const updatedCard = await this.database.kysely
      .updateTable('cards')
      .set({
        ...input,
        updated_at: now
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const tags = await this.getCardTags(id);

    return {
      ...updatedCard,
      tags
    };
  }

  async moveCard(id: number, input: MoveCardInput): Promise<CardWithTags> {
    const card = await this.database.kysely
      .selectFrom('cards')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!card) {
      throw new NotFoundError('Card', id);
    }

    // Find target column
    let columnId = input.column_id;

    if (!columnId && input.column_name) {
      const column = await this.database.kysely
        .selectFrom('columns')
        .select('id')
        .where('board_id', '=', card.board_id)
        .where('name', '=', input.column_name)
        .executeTakeFirst();

      if (!column) {
        throw new ValidationError(`Column '${input.column_name}' not found`);
      }

      columnId = column.id;
    }

    if (!columnId) {
      columnId = card.column_id; // Keep current column
    }

    const now = new Date().toISOString();

    const updatedCard = await this.database.kysely
      .updateTable('cards')
      .set({
        column_id: columnId,
        position: input.position,
        updated_at: now
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const tags = await this.getCardTags(id);

    return {
      ...updatedCard,
      tags
    };
  }

  async deleteCard(id: number): Promise<void> {
    const result = await this.database.kysely
      .deleteFrom('cards')
      .where('id', '=', id)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Card', id);
    }
  }

  async searchCards(input: SearchCardsInput): Promise<CardWithTags[]> {
    let query = this.database.kysely
      .selectFrom('cards')
      .selectAll()
      .where('title', 'like', `%${input.query}%`);

    if (input.board_id) {
      query = query.where('board_id', '=', input.board_id);
    }

    if (input.priority) {
      query = query.where('priority', '=', input.priority);
    }

    if (input.assigned_to) {
      query = query.where('assigned_to', '=', input.assigned_to);
    }

    const cards = await query
      .orderBy('created_at', 'desc')
      .execute();

    const cardsWithTags: CardWithTags[] = [];

    for (const card of cards) {
      const tags = await this.getCardTags(card.id);
      cardsWithTags.push({
        ...card,
        tags
      });
    }

    return cardsWithTags;
  }

  // Tag operations
  async getAllTags(): Promise<Tag[]> {
    return await this.database.kysely
      .selectFrom('tags')
      .selectAll()
      .orderBy('name', 'asc')
      .execute();
  }

  async createTag(input: CreateTagInput): Promise<Tag> {
    const now = new Date().toISOString();

    return await this.database.kysely
      .insertInto('tags')
      .values({
        name: input.name,
        color: input.color || '#64748b',
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async addCardTag(cardId: number, tagId: number): Promise<void> {
    const now = new Date().toISOString();

    await this.database.kysely
      .insertInto('card_tags')
      .values({
        card_id: cardId,
        tag_id: tagId,
        created_at: now
      })
      .execute();
  }

  async removeCardTag(cardId: number, tagId: number): Promise<void> {
    await this.database.kysely
      .deleteFrom('card_tags')
      .where('card_id', '=', cardId)
      .where('tag_id', '=', tagId)
      .execute();
  }

  async getCardTags(cardId: number): Promise<Tag[]> {
    return await this.database.kysely
      .selectFrom('card_tags')
      .innerJoin('tags', 'tags.id', 'card_tags.tag_id')
      .selectAll('tags')
      .where('card_tags.card_id', '=', cardId)
      .execute();
  }

  // Comment operations
  async getCardComments(cardId: number): Promise<Comment[]> {
    return await this.database.kysely
      .selectFrom('comments')
      .selectAll()
      .where('card_id', '=', cardId)
      .orderBy('created_at', 'asc')
      .execute();
  }

  async addComment(input: CreateCommentInput): Promise<Comment> {
    const now = new Date().toISOString();

    return await this.database.kysely
      .insertInto('comments')
      .values({
        card_id: input.card_id,
        content: input.content,
        author: input.author || null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteComment(id: number): Promise<void> {
    const result = await this.database.kysely
      .deleteFrom('comments')
      .where('id', '=', id)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Comment', id);
    }
  }

  // Statistics
  async getStats(): Promise<KanbanStats> {
    const [boardCount, cardCount] = await Promise.all([
      this.database.kysely
        .selectFrom('boards')
        .select(sql`count(*)`.as('count'))
        .executeTakeFirstOrThrow(),
      this.database.kysely
        .selectFrom('cards')
        .select(sql`count(*)`.as('count'))
        .executeTakeFirstOrThrow()
    ]);

    // Get cards by priority
    const priorityCounts = await this.database.kysely
      .selectFrom('cards')
      .select(['priority', sql`count(*)`.as('count')])
      .groupBy('priority')
      .execute();

    const cards_by_priority = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    for (const row of priorityCounts) {
      cards_by_priority[row.priority as keyof typeof cards_by_priority] = Number(row.count);
    }

    // Get overdue cards
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = await this.database.kysely
      .selectFrom('cards')
      .select(sql`count(*)`.as('count'))
      .where('due_date', '<', today)
      .executeTakeFirstOrThrow();

    return {
      total_boards: Number(boardCount.count),
      total_cards: Number(cardCount.count),
      cards_by_priority,
      cards_by_status: {}, // TODO: Implement status tracking
      overdue_cards: Number(overdueCount.count),
      recent_activity: [] // TODO: Implement activity tracking
    };
  }

  // Private helper methods
  private async createDefaultColumns(boardId: number): Promise<void> {
    const defaultColumns = [
      { name: 'To Do', position: 0, color: '#ef4444' },
      { name: 'In Progress', position: 1, color: '#f59e0b' },
      { name: 'Review', position: 2, color: '#3b82f6' },
      { name: 'Done', position: 3, color: '#10b981' }
    ];

    const now = new Date().toISOString();

    for (const column of defaultColumns) {
      await this.database.kysely
        .insertInto('columns')
        .values({
          board_id: boardId,
          name: column.name,
          position: column.position,
          color: column.color,
          created_at: now,
          updated_at: now
        })
        .execute();
    }
  }
}