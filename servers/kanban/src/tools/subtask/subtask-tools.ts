import { ToolModule, ToolResult } from '@tylercoles/mcp-server';
import { z } from 'zod';
import {
  CreateSubtaskSchema,
  UpdateSubtaskWithIdSchema,
  SubtaskIdSchema,
  CompleteSubtaskSchema,
  CardIdSchema,
  NotFoundError,
  ValidationError,
} from '../../types/index.js';
import { createErrorResult, createSuccessResult } from '@tylercoles/mcp-server/dist/tools.js';
import { KanbanDatabase } from '../../database/index.js';
import { KanbanWebSocketServer } from '../../websocket-server.js';

export const registerCreateSubtaskTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'create_subtask',
  config: {
    title: 'Create Subtask',
    description: 'Create a new subtask for a card (supports nested subtasks)',
    inputSchema: CreateSubtaskSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CreateSubtaskSchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Validate parent subtask if provided
      if (input.parent_subtask_id) {
        const parentSubtask = await db.getSubtaskById(input.parent_subtask_id);
        if (!parentSubtask) {
          throw new NotFoundError('Parent Subtask', input.parent_subtask_id);
        }
        
        if (parentSubtask.card_id !== input.card_id) {
          throw new ValidationError('Parent subtask must belong to the same card');
        }
      }

      const subtask = await db.createSubtask({
        card_id: input.card_id,
        parent_subtask_id: input.parent_subtask_id || null,
        title: input.title,
        description: input.description || null,
        position: input.position,
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null,
        is_completed: false,
        completed_at: null,
      });

      // Broadcast to WebSocket clients
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting subtask_created for card ${input.card_id}, subtask:`, subtask.title);
        wsServer.broadcastToBoardClients(card.board_id, 'subtask_created', subtask);
      }

      return createSuccessResult(`✅ Successfully created subtask "${subtask.title}" (ID: ${subtask.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateSubtaskTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_subtask',
  config: {
    title: 'Update Subtask',
    description: 'Update an existing subtask',
    inputSchema: UpdateSubtaskWithIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { subtask_id, ...updates } = args;
      
      // Get existing subtask to validate and get card info
      const existingSubtask = await db.getSubtaskById(subtask_id);
      if (!existingSubtask) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      const subtask = await db.updateSubtask(subtask_id, updates);
      if (!subtask) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(subtask.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'subtask_updated', subtask);
      }

      return createSuccessResult(`✅ Successfully updated subtask "${subtask.title}" (ID: ${subtask.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerCompleteSubtaskTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'complete_subtask',
  config: {
    title: 'Complete/Uncomplete Subtask',
    description: 'Mark a subtask as completed or uncompleted',
    inputSchema: CompleteSubtaskSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CompleteSubtaskSchema.parse(args);
      
      const completionData = {
        is_completed: input.is_completed,
        completed_at: input.is_completed ? new Date().toISOString() : null,
      };

      const subtask = await db.updateSubtask(input.subtask_id, completionData);
      if (!subtask) {
        throw new NotFoundError('Subtask', input.subtask_id);
      }

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(subtask.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'subtask_updated', subtask);
      }

      const status = input.is_completed ? 'completed' : 'uncompleted';
      return createSuccessResult(`✅ Successfully ${status} subtask "${subtask.title}" (ID: ${subtask.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerDeleteSubtaskTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'delete_subtask',
  config: {
    title: 'Delete Subtask',
    description: 'Delete a subtask and all its nested subtasks',
    inputSchema: SubtaskIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { subtask_id } = args;
      
      // Get the subtask first to get card info for WebSocket broadcast
      const subtask = await db.getSubtaskById(subtask_id);
      if (!subtask) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      const deleted = await db.deleteSubtask(subtask_id);
      if (!deleted) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(subtask.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'subtask_deleted', { id: subtask_id, card_id: subtask.card_id });
      }

      return createSuccessResult(`✅ Successfully deleted subtask (ID: ${subtask_id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetSubtasksTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_subtasks',
  config: {
    title: 'Get Subtasks',
    description: 'Get all subtasks for a card (organized hierarchically)',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const subtasks = await db.getSubtasksByCard(card_id);

      return createSuccessResult(`Found ${subtasks.length} subtasks for card ${card_id}`, subtasks);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerMoveSubtaskTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'move_subtask',
  config: {
    title: 'Move Subtask',
    description: 'Change the position or parent of a subtask',
    inputSchema: SubtaskIdSchema.extend({
      parent_subtask_id: z.number().int().positive().optional().nullable(),
      position: z.number().int().min(0),
    }),
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { subtask_id, parent_subtask_id, position } = args;
      
      // Get existing subtask
      const existingSubtask = await db.getSubtaskById(subtask_id);
      if (!existingSubtask) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      // Validate parent subtask if provided
      if (parent_subtask_id) {
        const parentSubtask = await db.getSubtaskById(parent_subtask_id);
        if (!parentSubtask) {
          throw new NotFoundError('Parent Subtask', parent_subtask_id);
        }
        
        if (parentSubtask.card_id !== existingSubtask.card_id) {
          throw new ValidationError('Parent subtask must belong to the same card');
        }

        // Prevent circular references
        if (parent_subtask_id === subtask_id) {
          throw new ValidationError('A subtask cannot be its own parent');
        }
      }

      const subtask = await db.updateSubtask(subtask_id, {
        parent_subtask_id: parent_subtask_id || null,
        position,
      });

      if (!subtask) {
        throw new NotFoundError('Subtask', subtask_id);
      }

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(subtask.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'subtask_moved', subtask);
      }

      return createSuccessResult(`✅ Successfully moved subtask "${subtask.title}" (ID: ${subtask.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetSubtaskProgressTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_subtask_progress',
  config: {
    title: 'Get Subtask Progress',
    description: 'Get completion progress for all subtasks of a card',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const progress = await db.getSubtaskProgress(card_id);

      return createSuccessResult(
        `Subtask progress: ${progress.completed_subtasks}/${progress.total_subtasks} completed (${progress.completion_percentage}%)`,
        progress
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});