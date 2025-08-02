import { ToolModule, ToolResult } from '@tylercoles/mcp-server';
import {
  CreateMilestoneSchema,
  UpdateMilestoneWithIdSchema,
  MilestoneIdSchema,
  CompleteMilestoneSchema,
  AssignCardToMilestoneSchema,
  BoardIdSchema,
  CardIdSchema,
  NotFoundError,
  ValidationError,
} from '../../types/index.js';
import { createErrorResult, createSuccessResult } from '@tylercoles/mcp-server/dist/tools.js';
import { KanbanDatabase } from '../../database/index.js';
import { KanbanWebSocketServer } from '../../websocket-server.js';

export const registerCreateMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'create_milestone',
  config: {
    title: 'Create Milestone',
    description: 'Create a new milestone for a board',
    inputSchema: CreateMilestoneSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CreateMilestoneSchema.parse(args);

      // Validate board exists
      const board = await db.getBoardById(input.board_id);
      if (!board) {
        throw new NotFoundError('Board', input.board_id);
      }

      const milestone = await db.createMilestone({
        board_id: input.board_id,
        name: input.name,
        description: input.description || null,
        due_date: input.due_date || null,
        position: input.position,
        color: input.color,
        is_completed: false,
        completion_date: null,
      });

      // Broadcast to WebSocket clients
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting milestone_created for board ${input.board_id}, milestone:`, milestone.name);
        wsServer.broadcastToBoardClients(input.board_id, 'milestone_created', milestone);
      }

      return createSuccessResult(`✅ Successfully created milestone "${milestone.name}" (ID: ${milestone.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_milestone',
  config: {
    title: 'Update Milestone',
    description: 'Update an existing milestone',
    inputSchema: UpdateMilestoneWithIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { milestone_id, ...updates } = args;
      const milestone = await db.updateMilestone(milestone_id, updates);

      if (!milestone) {
        throw new NotFoundError('Milestone', milestone_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(milestone.board_id, 'milestone_updated', milestone);
      }

      return createSuccessResult(`✅ Successfully updated milestone "${milestone.name}" (ID: ${milestone.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerCompleteMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'complete_milestone',
  config: {
    title: 'Complete/Uncomplete Milestone',
    description: 'Mark a milestone as completed or uncompleted',
    inputSchema: CompleteMilestoneSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CompleteMilestoneSchema.parse(args);
      
      const completionData = {
        is_completed: input.is_completed,
        completion_date: input.is_completed 
          ? (input.completion_date || new Date().toISOString().split('T')[0])
          : null,
      };

      const milestone = await db.updateMilestone(input.milestone_id, completionData);

      if (!milestone) {
        throw new NotFoundError('Milestone', input.milestone_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(milestone.board_id, 'milestone_updated', milestone);
      }

      const status = input.is_completed ? 'completed' : 'uncompleted';
      return createSuccessResult(`✅ Successfully ${status} milestone "${milestone.name}" (ID: ${milestone.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerDeleteMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'delete_milestone',
  config: {
    title: 'Delete Milestone',
    description: 'Delete a milestone',
    inputSchema: MilestoneIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { milestone_id } = args;
      
      // Get the milestone first to get board_id for WebSocket broadcast
      const milestone = await db.getMilestoneById(milestone_id);
      if (!milestone) {
        throw new NotFoundError('Milestone', milestone_id);
      }

      const deleted = await db.deleteMilestone(milestone_id);
      if (!deleted) {
        throw new NotFoundError('Milestone', milestone_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(milestone.board_id, 'milestone_deleted', { id: milestone_id });
      }

      return createSuccessResult(`✅ Successfully deleted milestone (ID: ${milestone_id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetMilestonesTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_milestones',
  config: {
    title: 'Get Milestones',
    description: 'Get all milestones for a board',
    inputSchema: BoardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { board_id } = args;
      const milestones = await db.getMilestonesByBoard(board_id);

      return createSuccessResult(`Found ${milestones.length} milestones for board ${board_id}`, milestones);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerAssignCardToMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'assign_card_to_milestone',
  config: {
    title: 'Assign Card to Milestone',
    description: 'Assign a card to a milestone',
    inputSchema: AssignCardToMilestoneSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = AssignCardToMilestoneSchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Validate milestone exists and belongs to the same board
      const milestone = await db.getMilestoneById(input.milestone_id);
      if (!milestone) {
        throw new NotFoundError('Milestone', input.milestone_id);
      }

      if (milestone.board_id !== card.board_id) {
        throw new ValidationError('Milestone does not belong to the same board as the card');
      }

      await db.assignCardToMilestone(input.card_id, input.milestone_id);

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'card_milestone_assigned', {
          card_id: input.card_id,
          milestone_id: input.milestone_id,
        });
      }

      return createSuccessResult(
        `✅ Successfully assigned card "${card.title}" to milestone "${milestone.name}"`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUnassignCardFromMilestoneTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'unassign_card_from_milestone',
  config: {
    title: 'Unassign Card from Milestone',
    description: 'Remove a card from a milestone',
    inputSchema: AssignCardToMilestoneSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = AssignCardToMilestoneSchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Validate milestone exists
      const milestone = await db.getMilestoneById(input.milestone_id);
      if (!milestone) {
        throw new NotFoundError('Milestone', input.milestone_id);
      }

      await db.unassignCardFromMilestone(input.card_id, input.milestone_id);

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'card_milestone_unassigned', {
          card_id: input.card_id,
          milestone_id: input.milestone_id,
        });
      }

      return createSuccessResult(
        `✅ Successfully unassigned card "${card.title}" from milestone "${milestone.name}"`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetMilestoneProgressTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_milestone_progress',
  config: {
    title: 'Get Milestone Progress',
    description: 'Get progress statistics for a milestone',
    inputSchema: MilestoneIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { milestone_id } = args;
      const progress = await db.getMilestoneProgress(milestone_id);

      if (!progress) {
        throw new NotFoundError('Milestone', milestone_id);
      }

      return createSuccessResult(
        `Milestone progress: ${progress.completed_cards}/${progress.total_cards} cards (${progress.completion_percentage}%)`,
        progress
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});