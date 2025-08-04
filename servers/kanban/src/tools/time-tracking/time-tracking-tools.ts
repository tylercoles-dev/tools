import { ToolModule, ToolResult } from '@tylercoles/mcp-server';
import { z } from 'zod';
import {
  CreateTimeEntrySchema,
  UpdateTimeEntryWithIdSchema,
  TimeEntryIdSchema,
  StartTimeTrackingSchema,
  StopTimeTrackingSchema,
  UpdateCardTimeEstimateSchema,
  CardIdSchema,
  NotFoundError,
  ValidationError,
} from '../../types/index.js';
import { createErrorResult, createSuccessResult } from '@tylercoles/mcp-server/dist/tools.js';
// Database adapter interface - using any type for the database adapter
import { KanbanWebSocketServer } from '../../websocket-server.js';

export const registerCreateTimeEntryTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'create_time_entry',
  config: {
    title: 'Create Time Entry',
    description: 'Create a new time entry for a card (manual time logging)',
    inputSchema: CreateTimeEntrySchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CreateTimeEntrySchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Calculate duration if start and end times are provided
      let calculatedDuration = input.duration_minutes;
      if (input.start_time && input.end_time && !input.duration_minutes) {
        const start = new Date(input.start_time);
        const end = new Date(input.end_time);
        calculatedDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      const timeEntry = await db.createTimeEntry({
        card_id: input.card_id,
        user_name: input.user_name || null,
        description: input.description || null,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        duration_minutes: calculatedDuration || null,
        is_billable: input.is_billable,
        hourly_rate: input.hourly_rate || null,
      });

      // Update card's actual hours
      await db.updateCardActualHours(input.card_id);

      // Broadcast to WebSocket clients
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting time_entry_created for card ${input.card_id}`);
        wsServer.broadcastToBoardClients(card.board_id, 'time_entry_created', timeEntry);
      }

      return createSuccessResult(
        `✅ Successfully created time entry for "${card.title}" (ID: ${timeEntry.id}, Duration: ${calculatedDuration || 0} minutes)`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateTimeEntryTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_time_entry',
  config: {
    title: 'Update Time Entry',
    description: 'Update an existing time entry',
    inputSchema: UpdateTimeEntryWithIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { time_entry_id, ...updates } = args;
      
      // Get existing time entry to validate and get card info
      const existingEntry = await db.getTimeEntryById(time_entry_id);
      if (!existingEntry) {
        throw new NotFoundError('Time Entry', time_entry_id);
      }

      // Recalculate duration if start and end times are being updated
      if (updates.start_time && updates.end_time && !updates.duration_minutes) {
        const start = new Date(updates.start_time);
        const end = new Date(updates.end_time);
        updates.duration_minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      const timeEntry = await db.updateTimeEntry(time_entry_id, updates);
      if (!timeEntry) {
        throw new NotFoundError('Time Entry', time_entry_id);
      }

      // Update card's actual hours
      await db.updateCardActualHours(timeEntry.card_id);

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(timeEntry.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'time_entry_updated', timeEntry);
      }

      return createSuccessResult(`✅ Successfully updated time entry (ID: ${timeEntry.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerDeleteTimeEntryTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'delete_time_entry',
  config: {
    title: 'Delete Time Entry',
    description: 'Delete a time entry',
    inputSchema: TimeEntryIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { time_entry_id } = args;
      
      // Get the time entry first to get card info for WebSocket broadcast
      const timeEntry = await db.getTimeEntryById(time_entry_id);
      if (!timeEntry) {
        throw new NotFoundError('Time Entry', time_entry_id);
      }

      const deleted = await db.deleteTimeEntry(time_entry_id);
      if (!deleted) {
        throw new NotFoundError('Time Entry', time_entry_id);
      }

      // Update card's actual hours
      await db.updateCardActualHours(timeEntry.card_id);

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(timeEntry.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'time_entry_deleted', { id: time_entry_id, card_id: timeEntry.card_id });
      }

      return createSuccessResult(`✅ Successfully deleted time entry (ID: ${time_entry_id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerStartTimeTrackingTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'start_time_tracking',
  config: {
    title: 'Start Time Tracking',
    description: 'Start tracking time for a card (creates an active time entry)',
    inputSchema: StartTimeTrackingSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = StartTimeTrackingSchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Check if there's already an active time entry for this card and user
      const activeEntry = await db.getActiveTimeEntry(input.card_id, input.user_name);
      if (activeEntry) {
        throw new ValidationError(`There is already an active time entry for this card${input.user_name ? ` and user "${input.user_name}"` : ''}`);
      }

      const timeEntry = await db.createTimeEntry({
        card_id: input.card_id,
        user_name: input.user_name || null,
        description: input.description || null,
        start_time: new Date().toISOString(),
        end_time: null,
        duration_minutes: null,
        is_billable: false,
        hourly_rate: null,
      });

      // Broadcast to WebSocket clients
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting time_tracking_started for card ${input.card_id}`);
        wsServer.broadcastToBoardClients(card.board_id, 'time_tracking_started', timeEntry);
      }

      return createSuccessResult(
        `⏱️ Successfully started time tracking for "${card.title}" (Entry ID: ${timeEntry.id})`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerStopTimeTrackingTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'stop_time_tracking',
  config: {
    title: 'Stop Time Tracking',
    description: 'Stop tracking time for an active time entry',
    inputSchema: StopTimeTrackingSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = StopTimeTrackingSchema.parse(args);

      // Get existing time entry
      const existingEntry = await db.getTimeEntryById(input.time_entry_id);
      if (!existingEntry) {
        throw new NotFoundError('Time Entry', input.time_entry_id);
      }

      // Validate it's an active entry
      if (existingEntry.end_time) {
        throw new ValidationError('This time entry has already been stopped');
      }

      if (!existingEntry.start_time) {
        throw new ValidationError('This time entry does not have a start time');
      }

      const endTime = input.end_time || new Date().toISOString();
      const start = new Date(existingEntry.start_time);
      const end = new Date(endTime);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      const timeEntry = await db.updateTimeEntry(input.time_entry_id, {
        end_time: endTime,
        duration_minutes: duration,
      });

      if (!timeEntry) {
        throw new NotFoundError('Time Entry', input.time_entry_id);
      }

      // Update card's actual hours
      await db.updateCardActualHours(timeEntry.card_id);

      // Get card info for WebSocket broadcast
      const card = await db.getCardById(timeEntry.card_id);
      if (card && wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'time_tracking_stopped', timeEntry);
      }

      return createSuccessResult(
        `⏹️ Successfully stopped time tracking (Entry ID: ${timeEntry.id}, Duration: ${duration} minutes)`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetTimeEntriesForCardTool = (db: any): ToolModule => ({
  name: 'get_time_entries_for_card',
  config: {
    title: 'Get Time Entries for Card',
    description: 'Get all time entries for a card',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const timeEntries = await db.getTimeEntriesByCard(card_id);

      const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

      return createSuccessResult(
        `Found ${timeEntries.length} time entries for card ${card_id} (Total: ${totalHours} hours)`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateCardTimeEstimateTool = (db: any, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_card_time_estimate',
  config: {
    title: 'Update Card Time Estimate',
    description: 'Update the estimated hours for a card',
    inputSchema: UpdateCardTimeEstimateSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = UpdateCardTimeEstimateSchema.parse(args);

      // Note: The estimated_hours field is not part of the base Card schema
      // This functionality would require adding estimated_hours to the Card table schema
      const card = await db.getCardById(input.card_id);

      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'card_updated', card);
      }

      return createSuccessResult(
        `⚠️ Note: Time estimates are not currently stored in the database schema. Card "${card.title}" was found but estimated hours cannot be updated without schema changes.`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetActiveTimeEntresTool = (db: any): ToolModule => ({
  name: 'get_active_time_entries',
  config: {
    title: 'Get Active Time Entries',
    description: 'Get all currently active time entries (entries without end time)',
    inputSchema: z.object({
      user_name: z.string().max(255).optional(),
    }),
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { user_name } = args;
      const allActiveEntries = await db.getActiveTimeEntries();
      // Filter by user_name if provided
      const activeEntries = user_name 
        ? allActiveEntries.filter(entry => entry.user_name === user_name)
        : allActiveEntries;

      return createSuccessResult(
        `Found ${activeEntries.length} active time entries${user_name ? ` for user "${user_name}"` : ''}`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetTimeReportTool = (db: any): ToolModule => ({
  name: 'get_time_report',
  config: {
    title: 'Get Time Report',
    description: 'Generate a time tracking report for a date range',
    inputSchema: z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      user_name: z.string().max(255).optional(),
      card_id: z.number().int().positive().optional(),
      board_id: z.number().int().positive().optional(),
      is_billable: z.boolean().optional(),
    }),
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { start_date, end_date, user_name, card_id, board_id, is_billable } = args;
      
      const report = await db.getTimeReport({
        start_date,
        end_date,
        user_name,
        card_id,
        board_id,
        is_billable,
      });

      return createSuccessResult(
        `Generated time report for ${start_date} to ${end_date}`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});