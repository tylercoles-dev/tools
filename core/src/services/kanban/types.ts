/**
 * Kanban Types and Schemas
 */

import { z } from 'zod';

// Priority levels for cards
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

// Database entity interfaces
export interface Board {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: number;
  board_id: number;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  board_id: number;
  column_id: number;
  title: string;
  description: string | null;
  position: number;
  priority: Priority;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  card_id: number;
  content: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

// Input schemas
export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});

export const UpdateBoardSchema = CreateBoardSchema.partial();

export const CreateColumnSchema = z.object({
  board_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  position: z.number().int().min(0).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b'),
});

export const UpdateColumnSchema = CreateColumnSchema.partial().omit({ board_id: true });

export const CreateCardSchema = z.object({
  board_id: z.number().int().positive(),
  column_id: z.number().int().positive().optional(),
  column_name: z.string().min(1).max(255).optional(),
  column_position: z.number().int().min(0).optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
  priority: PrioritySchema.default('medium'),
  assigned_to: z.string().max(255).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const UpdateCardSchema = CreateCardSchema.partial().omit({ board_id: true });

export const MoveCardSchema = z.object({
  column_id: z.number().int().positive().optional(),
  column_name: z.string().min(1).max(255).optional(),
  column_position: z.number().int().min(0).optional(),
  position: z.number().int().min(0),
});

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b'),
});

export const CreateCommentSchema = z.object({
  card_id: z.number().int().positive(),
  content: z.string().min(1),
  author: z.string().max(255).optional(),
});

export const SearchCardsSchema = z.object({
  query: z.string().min(1),
  board_id: z.number().int().positive().optional(),
  priority: PrioritySchema.optional(),
  assigned_to: z.string().max(255).optional(),
});

// Input types
export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;
export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;
export type UpdateColumnInput = z.infer<typeof UpdateColumnSchema>;
export type CreateCardInput = z.infer<typeof CreateCardSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export type MoveCardInput = z.infer<typeof MoveCardSchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type SearchCardsInput = z.infer<typeof SearchCardsSchema>;

// Response types
export interface BoardWithColumns extends Board {
  columns: ColumnWithCards[];
}

export interface ColumnWithCards extends Column {
  cards: CardWithTags[];
}

export interface CardWithTags extends Card {
  tags: Tag[];
}

export interface KanbanStats {
  total_boards: number;
  total_cards: number;
  cards_by_priority: Record<Priority, number>;
  cards_by_status: Record<string, number>;
  overdue_cards: number;
  recent_activity: Array<{
    type: 'card_created' | 'card_moved' | 'card_updated' | 'comment_added';
    card_id: number;
    card_title: string;
    timestamp: string;
    details?: string;
  }>;
}

// Error types
export class KanbanError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'KanbanError';
  }
}

export class NotFoundError extends KanbanError {
  constructor(resource: string, id: number | string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends KanbanError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}