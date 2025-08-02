import { z } from 'zod';

// Priority levels for cards
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

// Custom Fields
export const CustomFieldTypeSchema = z.enum(['text', 'number', 'date', 'dropdown', 'checkbox', 'multi_select']);
export type CustomFieldType = z.infer<typeof CustomFieldTypeSchema>;

// Card Links
export const CardLinkTypeSchema = z.enum(['blocks', 'relates_to', 'duplicate', 'parent_child']);
export type CardLinkType = z.infer<typeof CardLinkTypeSchema>;

// Board schemas
export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});

export const UpdateBoardSchema = CreateBoardSchema.partial();

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;

// Column schemas
export const CreateColumnSchema = z.object({
  board_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  position: z.number().int().min(0).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b'),
});

export const UpdateColumnSchema = CreateColumnSchema.partial().omit({ board_id: true });

export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;
export type UpdateColumnInput = z.infer<typeof UpdateColumnSchema>;

// Card schemas
export const CreateCardSchema = z.object({
  board_id: z.number().int().positive(),
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
  card_id: z.number().int().positive(),
  column_name: z.string().min(1).max(255).optional(),
  column_position: z.number().int().min(0).optional(),
  position: z.number().int().min(0),
});

export type CreateCardInput = z.infer<typeof CreateCardSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export type MoveCardInput = z.infer<typeof MoveCardSchema>;

// Tag schemas
export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b'),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;

// Comment schemas
export const CreateCommentSchema = z.object({
  card_id: z.number().int().positive(),
  content: z.string().min(1),
  author: z.string().max(255).optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

// Additional schemas for tools that need simple ID-based inputs
export const BoardIdSchema = z.object({
  board_id: z.number().int().positive(),
});

export const UpdateBoardWithIdSchema = z.object({
  board_id: z.number().int().positive(),
}).merge(UpdateBoardSchema);

export const ColumnIdSchema = z.object({
  column_id: z.number().int().positive(),
});

export const UpdateColumnWithIdSchema = z.object({
  column_id: z.number().int().positive(),
}).merge(UpdateColumnSchema);

export const CardIdSchema = z.object({
  card_id: z.number().int().positive(),
});

export const UpdateCardWithIdSchema = z.object({
  card_id: z.number().int().positive(),
}).merge(UpdateCardSchema);

export const CommentIdSchema = z.object({
  comment_id: z.number().int().positive(),
});

export const CardTagSchema = z.object({
  card_id: z.number().int().positive(),
  tag_id: z.number().int().positive(),
});

export const SearchCardsSchema = z.object({
  query: z.string().min(1),
  board_id: z.number().int().positive().optional(),
  priority: PrioritySchema.optional(),
  assigned_to: z.string().max(255).optional(),
});

// Custom Fields schemas
export const CreateCustomFieldSchema = z.object({
  board_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  field_type: CustomFieldTypeSchema,
  is_required: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
  options: z.string().optional(),
  validation_rules: z.string().optional(),
});

export const UpdateCustomFieldSchema = CreateCustomFieldSchema.partial().omit({ board_id: true });

export const CustomFieldIdSchema = z.object({
  custom_field_id: z.number().int().positive(),
});

export const UpdateCustomFieldWithIdSchema = z.object({
  custom_field_id: z.number().int().positive(),
}).merge(UpdateCustomFieldSchema);

export const SetCustomFieldValueSchema = z.object({
  card_id: z.number().int().positive(),
  custom_field_id: z.number().int().positive(),
  value: z.string().optional(),
});

// Milestones schemas
export const CreateMilestoneSchema = z.object({
  board_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  position: z.number().int().min(0).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial().omit({ board_id: true });

export const MilestoneIdSchema = z.object({
  milestone_id: z.number().int().positive(),
});

export const UpdateMilestoneWithIdSchema = z.object({
  milestone_id: z.number().int().positive(),
}).merge(UpdateMilestoneSchema);

export const CompleteMilestoneSchema = z.object({
  milestone_id: z.number().int().positive(),
  is_completed: z.boolean(),
  completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AssignCardToMilestoneSchema = z.object({
  card_id: z.number().int().positive(),
  milestone_id: z.number().int().positive(),
});

// Subtasks schemas
export const CreateSubtaskSchema = z.object({
  card_id: z.number().int().positive(),
  parent_subtask_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
  assigned_to: z.string().max(255).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const UpdateSubtaskSchema = CreateSubtaskSchema.partial().omit({ card_id: true });

export const SubtaskIdSchema = z.object({
  subtask_id: z.number().int().positive(),
});

export const UpdateSubtaskWithIdSchema = z.object({
  subtask_id: z.number().int().positive(),
}).merge(UpdateSubtaskSchema);

export const CompleteSubtaskSchema = z.object({
  subtask_id: z.number().int().positive(),
  is_completed: z.boolean(),
});

// Card Links schemas
export const CreateCardLinkSchema = z.object({
  source_card_id: z.number().int().positive(),
  target_card_id: z.number().int().positive(),
  link_type: CardLinkTypeSchema,
  description: z.string().optional(),
  created_by: z.string().max(255).optional(),
});

export const UpdateCardLinkSchema = CreateCardLinkSchema.partial().omit({ source_card_id: true, target_card_id: true });

export const CardLinkIdSchema = z.object({
  link_id: z.number().int().positive(),
});

export const UpdateCardLinkWithIdSchema = z.object({
  link_id: z.number().int().positive(),
}).merge(UpdateCardLinkSchema);

// Time Tracking schemas
export const CreateTimeEntrySchema = z.object({
  card_id: z.number().int().positive(),
  user_name: z.string().max(255).optional(),
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  is_billable: z.boolean().default(false),
  hourly_rate: z.number().min(0).optional(),
});

export const UpdateTimeEntrySchema = CreateTimeEntrySchema.partial().omit({ card_id: true });

export const TimeEntryIdSchema = z.object({
  time_entry_id: z.number().int().positive(),
});

export const UpdateTimeEntryWithIdSchema = z.object({
  time_entry_id: z.number().int().positive(),
}).merge(UpdateTimeEntrySchema);

export const StartTimeTrackingSchema = z.object({
  card_id: z.number().int().positive(),
  user_name: z.string().max(255).optional(),
  description: z.string().optional(),
});

export const StopTimeTrackingSchema = z.object({
  time_entry_id: z.number().int().positive(),
  end_time: z.string().datetime().optional(),
});

export const UpdateCardTimeEstimateSchema = z.object({
  card_id: z.number().int().positive(),
  estimated_hours: z.number().min(0).optional(),
});

// API response types
export interface KanbanBoardData {
  board: {
    id: number;
    name: string;
    description: string | null;
    color: string;
    created_at: string;
    updated_at: string;
  };
  columns: Array<{
    id: number;
    name: string;
    position: number;
    color: string;
    cards: Array<{
      id: number;
      title: string;
      description: string | null;
      position: number;
      priority: Priority;
      assigned_to: string | null;
      due_date: string | null;
      created_at: string;
      updated_at: string;
      tags: Array<{
        id: number;
        name: string;
        color: string;
      }>;
    }>;
  }>;
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