/**
 * Unit Tests for Custom Fields MCP Tools
 * Tests all 6 custom field tools with comprehensive scenarios
 */

import { KanbanService } from '@mcp-tools/core/kanban';
import { 
  registerCreateCustomFieldTool,
  registerUpdateCustomFieldTool,
  registerDeleteCustomFieldTool,
  registerGetCustomFieldsTool,
  registerSetCustomFieldValueTool,
  registerGetCustomFieldValuesTool
} from '../../../servers/kanban/src/tools/custom-field/custom-field-tools';

describe('Custom Fields MCP Tools', () => {
  let mockKanbanService: jest.Mocked<KanbanService>;
  let mockWsServer: any;
  let mockDb: any;

  beforeEach(() => {
    mockKanbanService = {
      createCustomField: jest.fn(),
      updateCustomField: jest.fn(),
      deleteCustomField: jest.fn(),
      getCustomFields: jest.fn(),
      setCustomFieldValue: jest.fn(),
      getCustomFieldValues: jest.fn(),
    } as any;

    mockWsServer = {
      broadcast: jest.fn(),
      broadcastToBoard: jest.fn(),
    };

    mockDb = {
      createCustomField: jest.fn(),
      updateCustomField: jest.fn(),
      deleteCustomField: jest.fn(),
      getCustomFieldById: jest.fn(),
      getCustomFieldsByBoard: jest.fn(),
      setCustomFieldValue: jest.fn(),
      getCustomFieldValuesByCard: jest.fn(),
    };
  });

  describe('Create Custom Field Tool', () => {
    it('should create text field successfully', async () => {
      const mockField = {
        id: 1,
        board_id: 1,
        name: 'Priority',
        type: 'text',
        required: false,
        options: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.createCustomField.mockResolvedValue(mockField);
      const tool = registerCreateCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        name: 'Priority',
        type: 'text',
        required: false
      });

      expect(mockDb.createCustomField).toHaveBeenCalledWith({
        board_id: 1,
        name: 'Priority',
        type: 'text',
        required: false,
        options: null
      });
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'customFieldCreated', mockField);
      expect(result).toEqual({
        success: true,
        data: mockField
      });
    });

    it('should create dropdown field with options', async () => {
      const mockField = {
        id: 2,
        board_id: 1,
        name: 'Status',
        type: 'dropdown',
        required: true,
        options: ['To Do', 'In Progress', 'Done'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.createCustomField.mockResolvedValue(mockField);
      const tool = registerCreateCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        name: 'Status',
        type: 'dropdown',
        required: true,
        options: ['To Do', 'In Progress', 'Done']
      });

      expect(mockDb.createCustomField).toHaveBeenCalledWith({
        board_id: 1,
        name: 'Status',
        type: 'dropdown',
        required: true,
        options: ['To Do', 'In Progress', 'Done']
      });
      expect(result.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      const tool = registerCreateCustomFieldTool(mockDb, mockWsServer);

      await expect(tool.handler({
        board_id: 1,
        name: '',
        type: 'invalid_type' as any
      })).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockDb.createCustomField.mockRejectedValue(new Error('Database error'));
      const tool = registerCreateCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        name: 'Test Field',
        type: 'text'
      });

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    it('should create all supported field types', async () => {
      const tool = registerCreateCustomFieldTool(mockDb, mockWsServer);
      const fieldTypes = ['text', 'number', 'date', 'dropdown', 'checkbox', 'multi-select'];

      for (const type of fieldTypes) {
        const mockField = { id: Math.random(), name: `Test ${type}`, type };
        mockDb.createCustomField.mockResolvedValue(mockField);

        const result = await tool.handler({
          board_id: 1,
          name: `Test ${type}`,
          type: type as any
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Update Custom Field Tool', () => {
    it('should update field successfully', async () => {
      const updatedField = {
        id: 1,
        board_id: 1,
        name: 'Updated Priority',
        type: 'dropdown',
        required: true,
        options: ['Low', 'Medium', 'High'],
        updated_at: new Date().toISOString()
      };

      mockDb.getCustomFieldById.mockResolvedValue({ id: 1, board_id: 1 });
      mockDb.updateCustomField.mockResolvedValue(updatedField);
      const tool = registerUpdateCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({
        field_id: 1,
        name: 'Updated Priority',
        type: 'dropdown',
        required: true,
        options: ['Low', 'Medium', 'High']
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalled();
    });

    it('should handle field not found', async () => {
      mockDb.getCustomFieldById.mockResolvedValue(null);
      const tool = registerUpdateCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({
        field_id: 999,
        name: 'Non-existent Field'
      });

      expect(result).toEqual({
        success: false,
        error: 'Custom field not found'
      });
    });
  });

  describe('Delete Custom Field Tool', () => {
    it('should delete field and its values', async () => {
      mockDb.getCustomFieldById.mockResolvedValue({ id: 1, board_id: 1 });
      mockDb.deleteCustomField.mockResolvedValue(true);
      const tool = registerDeleteCustomFieldTool(mockDb, mockWsServer);

      const result = await tool.handler({ field_id: 1 });

      expect(mockDb.deleteCustomField).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalledWith(1, 'customFieldDeleted', { field_id: 1 });
    });
  });

  describe('Get Custom Fields Tool', () => {
    it('should return all fields for a board', async () => {
      const mockFields = [
        { id: 1, name: 'Priority', type: 'text' },
        { id: 2, name: 'Status', type: 'dropdown', options: ['To Do', 'Done'] }
      ];

      mockDb.getCustomFieldsByBoard.mockResolvedValue(mockFields);
      const tool = registerGetCustomFieldsTool(mockDb);

      const result = await tool.handler({ board_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockFields
      });
    });
  });

  describe('Set Custom Field Value Tool', () => {
    it('should set text field value', async () => {
      const mockValue = {
        card_id: 1,
        field_id: 1,
        value: 'High Priority',
        updated_at: new Date().toISOString()
      };

      mockDb.getCustomFieldById.mockResolvedValue({ id: 1, type: 'text', board_id: 1 });
      mockDb.setCustomFieldValue.mockResolvedValue(mockValue);
      const tool = registerSetCustomFieldValueTool(mockDb, mockWsServer);

      const result = await tool.handler({
        card_id: 1,
        field_id: 1,
        value: 'High Priority'
      });

      expect(result.success).toBe(true);
      expect(mockWsServer.broadcastToBoard).toHaveBeenCalled();
    });

    it('should validate dropdown values', async () => {
      mockDb.getCustomFieldById.mockResolvedValue({
        id: 1,
        type: 'dropdown',
        options: ['Low', 'Medium', 'High'],
        board_id: 1
      });

      const tool = registerSetCustomFieldValueTool(mockDb, mockWsServer);

      // Valid option
      mockDb.setCustomFieldValue.mockResolvedValue({ value: 'High' });
      const validResult = await tool.handler({
        card_id: 1,
        field_id: 1,
        value: 'High'
      });
      expect(validResult.success).toBe(true);

      // Invalid option
      const invalidResult = await tool.handler({
        card_id: 1,
        field_id: 1,
        value: 'Invalid Option'
      });
      expect(invalidResult).toEqual({
        success: false,
        error: 'Invalid option for dropdown field'
      });
    });

    it('should handle different field types', async () => {
      const tool = registerSetCustomFieldValueTool(mockDb, mockWsServer);

      // Number field
      mockDb.getCustomFieldById.mockResolvedValue({ id: 1, type: 'number', board_id: 1 });
      mockDb.setCustomFieldValue.mockResolvedValue({ value: 42 });
      
      const numberResult = await tool.handler({
        card_id: 1,
        field_id: 1,
        value: 42
      });
      expect(numberResult.success).toBe(true);

      // Date field
      mockDb.getCustomFieldById.mockResolvedValue({ id: 2, type: 'date', board_id: 1 });
      const dateValue = '2024-01-15';
      mockDb.setCustomFieldValue.mockResolvedValue({ value: dateValue });
      
      const dateResult = await tool.handler({
        card_id: 1,
        field_id: 2,
        value: dateValue
      });
      expect(dateResult.success).toBe(true);

      // Checkbox field
      mockDb.getCustomFieldById.mockResolvedValue({ id: 3, type: 'checkbox', board_id: 1 });
      mockDb.setCustomFieldValue.mockResolvedValue({ value: true });
      
      const checkboxResult = await tool.handler({
        card_id: 1,
        field_id: 3,
        value: true
      });
      expect(checkboxResult.success).toBe(true);
    });
  });

  describe('Get Custom Field Values Tool', () => {
    it('should return all field values for a card', async () => {
      const mockValues = [
        { field_id: 1, field_name: 'Priority', value: 'High', type: 'text' },
        { field_id: 2, field_name: 'Status', value: 'In Progress', type: 'dropdown' }
      ];

      mockDb.getCustomFieldValuesByCard.mockResolvedValue(mockValues);
      const tool = registerGetCustomFieldValuesTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: mockValues
      });
    });

    it('should handle card with no custom field values', async () => {
      mockDb.getCustomFieldValuesByCard.mockResolvedValue([]);
      const tool = registerGetCustomFieldValuesTool(mockDb);

      const result = await tool.handler({ card_id: 1 });

      expect(result).toEqual({
        success: true,
        data: []
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete custom field lifecycle', async () => {
      // Create field
      const createTool = registerCreateCustomFieldTool(mockDb, mockWsServer);
      const field = { id: 1, board_id: 1, name: 'Priority', type: 'dropdown', options: ['Low', 'High'] };
      mockDb.createCustomField.mockResolvedValue(field);
      
      const createResult = await createTool.handler({
        board_id: 1,
        name: 'Priority',
        type: 'dropdown',
        options: ['Low', 'High']
      });
      expect(createResult.success).toBe(true);

      // Set value
      const setValueTool = registerSetCustomFieldValueTool(mockDb, mockWsServer);
      mockDb.getCustomFieldById.mockResolvedValue(field);
      mockDb.setCustomFieldValue.mockResolvedValue({ card_id: 1, field_id: 1, value: 'High' });
      
      const setValueResult = await setValueTool.handler({
        card_id: 1,
        field_id: 1,
        value: 'High'
      });
      expect(setValueResult.success).toBe(true);

      // Get values
      const getValuesTool = registerGetCustomFieldValuesTool(mockDb);
      mockDb.getCustomFieldValuesByCard.mockResolvedValue([
        { field_id: 1, field_name: 'Priority', value: 'High', type: 'dropdown' }
      ]);
      
      const getValuesResult = await getValuesTool.handler({ card_id: 1 });
      expect(getValuesResult.success).toBe(true);
      expect(getValuesResult.data).toHaveLength(1);
    });

    it('should handle complex multi-select field', async () => {
      const field = {
        id: 1,
        board_id: 1,
        type: 'multi-select',
        options: ['Frontend', 'Backend', 'Database', 'Testing']
      };

      mockDb.getCustomFieldById.mockResolvedValue(field);
      const setValueTool = registerSetCustomFieldValueTool(mockDb, mockWsServer);

      // Set multiple values
      const multiValues = ['Frontend', 'Testing'];
      mockDb.setCustomFieldValue.mockResolvedValue({ value: multiValues });
      
      const result = await setValueTool.handler({
        card_id: 1,
        field_id: 1,
        value: multiValues
      });

      expect(result.success).toBe(true);
    });
  });
});