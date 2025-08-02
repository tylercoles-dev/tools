import { ToolModule, ToolResult } from '@tylercoles/mcp-server';
import {
  CreateCustomFieldSchema,
  UpdateCustomFieldWithIdSchema,
  CustomFieldIdSchema,
  SetCustomFieldValueSchema,
  BoardIdSchema,
  CardIdSchema,
  NotFoundError,
  ValidationError,
} from '../../types/index.js';
import { createErrorResult, createSuccessResult } from '@tylercoles/mcp-server/dist/tools.js';
import { KanbanDatabase } from '../../database/index.js';
import { KanbanWebSocketServer } from '../../websocket-server.js';

export const registerCreateCustomFieldTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'create_custom_field',
  config: {
    title: 'Create Custom Field',
    description: 'Create a new custom field for a board. Field types: text, number, date, dropdown, checkbox, multi_select',
    inputSchema: CreateCustomFieldSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = CreateCustomFieldSchema.parse(args);

      // Validate board exists
      const board = await db.getBoardById(input.board_id);
      if (!board) {
        throw new NotFoundError('Board', input.board_id);
      }

      // Create custom field
      const customField = await db.createCustomField({
        board_id: input.board_id,
        name: input.name,
        field_type: input.field_type,
        is_required: input.is_required,
        position: input.position,
        options: input.options || null,
        validation_rules: input.validation_rules || null,
      });

      // Broadcast to WebSocket clients
      if (wsServer) {
        console.log(`MCP Tool: Broadcasting custom_field_created for board ${input.board_id}, field:`, customField.name);
        wsServer.broadcastToBoardClients(input.board_id, 'custom_field_created', customField);
      }

      return createSuccessResult(`✅ Successfully created custom field "${customField.name}" (ID: ${customField.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerUpdateCustomFieldTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'update_custom_field',
  config: {
    title: 'Update Custom Field',
    description: 'Update an existing custom field',
    inputSchema: UpdateCustomFieldWithIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { custom_field_id, ...updates } = args;
      const customField = await db.updateCustomField(custom_field_id, updates);

      if (!customField) {
        throw new NotFoundError('Custom Field', custom_field_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(customField.board_id, 'custom_field_updated', customField);
      }

      return createSuccessResult(`✅ Successfully updated custom field "${customField.name}" (ID: ${customField.id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerDeleteCustomFieldTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'delete_custom_field',
  config: {
    title: 'Delete Custom Field',
    description: 'Delete a custom field and all its values',
    inputSchema: CustomFieldIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { custom_field_id } = args;
      
      // Get the custom field first to get board_id for WebSocket broadcast
      const customField = await db.getCustomFieldById(custom_field_id);
      if (!customField) {
        throw new NotFoundError('Custom Field', custom_field_id);
      }

      const deleted = await db.deleteCustomField(custom_field_id);
      if (!deleted) {
        throw new NotFoundError('Custom Field', custom_field_id);
      }

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(customField.board_id, 'custom_field_deleted', { id: custom_field_id });
      }

      return createSuccessResult(`✅ Successfully deleted custom field (ID: ${custom_field_id})`);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetCustomFieldsTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_custom_fields',
  config: {
    title: 'Get Custom Fields',
    description: 'Get all custom fields for a board',
    inputSchema: BoardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { board_id } = args;
      const customFields = await db.getCustomFieldsByBoard(board_id);

      return createSuccessResult(`Found ${customFields.length} custom fields for board ${board_id}`, customFields);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerSetCustomFieldValueTool = (db: KanbanDatabase, wsServer: KanbanWebSocketServer): ToolModule => ({
  name: 'set_custom_field_value',
  config: {
    title: 'Set Custom Field Value',
    description: 'Set or update a custom field value for a card',
    inputSchema: SetCustomFieldValueSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const input = SetCustomFieldValueSchema.parse(args);

      // Validate card exists
      const card = await db.getCardById(input.card_id);
      if (!card) {
        throw new NotFoundError('Card', input.card_id);
      }

      // Validate custom field exists and belongs to the same board
      const customField = await db.getCustomFieldById(input.custom_field_id);
      if (!customField) {
        throw new NotFoundError('Custom Field', input.custom_field_id);
      }

      if (customField.board_id !== card.board_id) {
        throw new ValidationError('Custom field does not belong to the same board as the card');
      }

      // Validate required field
      if (customField.is_required && (!input.value || input.value.trim() === '')) {
        throw new ValidationError(`Custom field "${customField.name}" is required`);
      }

      // Set the custom field value
      const fieldValue = await db.setCustomFieldValue({
        card_id: input.card_id,
        custom_field_id: input.custom_field_id,
        value: input.value || null,
      });

      // Broadcast to WebSocket clients
      if (wsServer) {
        wsServer.broadcastToBoardClients(card.board_id, 'custom_field_value_updated', {
          card_id: input.card_id,
          custom_field_id: input.custom_field_id,
          value: input.value,
        });
      }

      return createSuccessResult(
        `✅ Successfully set custom field "${customField.name}" value for card "${card.title}"`
      );
    } catch (error) {
      return createErrorResult(error);
    }
  }
});

export const registerGetCustomFieldValuesTool = (db: KanbanDatabase): ToolModule => ({
  name: 'get_custom_field_values',
  config: {
    title: 'Get Custom Field Values',
    description: 'Get all custom field values for a card',
    inputSchema: CardIdSchema,
  },
  handler: async (args: any): Promise<ToolResult> => {
    try {
      const { card_id } = args;
      const values = await db.getCustomFieldValuesByCard(card_id);

      return createSuccessResult(`Found ${values.length} custom field values for card ${card_id}`, values);
    } catch (error) {
      return createErrorResult(error);
    }
  }
});