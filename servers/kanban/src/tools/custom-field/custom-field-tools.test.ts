import { 
  registerCreateCustomFieldTool,
  registerUpdateCustomFieldTool,
  registerDeleteCustomFieldTool,
  registerGetCustomFieldsTool,
  registerSetCustomFieldValueTool,
  registerGetCustomFieldValuesTool
} from './custom-field-tools.js';
import { KanbanWebSocketServer } from '../../websocket-server.js';

// Mock the MCP framework
jest.mock('@tylercoles/mcp-server', () => ({
  createErrorResult: jest.fn((error) => ({ 
    success: false, 
    content: error instanceof Error ? error.message : String(error)
  })),
  createSuccessResult: jest.fn((message, data) => ({ 
    success: true, 
    content: message,
    data: data 
  })),
}));

// Mock the tools import
jest.mock('@tylercoles/mcp-server/dist/tools.js', () => ({
  createErrorResult: jest.fn((error) => ({ 
    success: false, 
    content: error instanceof Error ? error.message : String(error)
  })),
  createSuccessResult: jest.fn((message, data) => ({ 
    success: true, 
    content: message,
    data: data 
  })),
}));

// Mock database
const mockDb = {
  getBoardById: jest.fn(),
  createCustomField: jest.fn(),
  updateCustomField: jest.fn(),
  deleteCustomField: jest.fn(),
  getCustomFieldById: jest.fn(),
  getCustomFieldsByBoard: jest.fn(),
  setCustomFieldValue: jest.fn(),
  getCustomFieldValuesByCard: jest.fn(),
  getCardById: jest.fn(),
};

// Mock WebSocket server
const mockWsServer = {
  broadcastToBoardClients: jest.fn(),
} as unknown as KanbanWebSocketServer;

describe('Test Setup', () => {
  test('should configure test environment', () => {
    expect(true).toBe(true);
  });
});

describe('Custom Field Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCreateCustomFieldTool', () => {
    test('should return tool configuration', () => {
      const tool = registerCreateCustomFieldTool(mockDb as any, mockWsServer);
      
      expect(tool.name).toBe('create_custom_field');
      expect(tool.config.title).toBe('Create Custom Field');
      expect(tool.config.description).toContain('Create a new custom field for a board');
    });

    test('should create custom field successfully', async () => {
      const tool = registerCreateCustomFieldTool(mockDb as any, mockWsServer);
      
      mockDb.getBoardById.mockResolvedValue({ id: 1, name: 'Test Board' });
      mockDb.createCustomField.mockResolvedValue({
        id: 1,
        board_id: 1,
        name: 'Priority Level',
        field_type: 'dropdown',
        is_required: true,
        position: 0,
        options: '["High", "Medium", "Low"]',
        validation_rules: null,
      });

      const result = await tool.handler({
        board_id: 1,
        name: 'Priority Level',
        field_type: 'dropdown',
        is_required: true,
        position: 0,
        options: '["High", "Medium", "Low"]',
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Successfully created custom field "Priority Level"');
      expect(mockDb.createCustomField).toHaveBeenCalledWith({
        board_id: 1,
        name: 'Priority Level',
        field_type: 'dropdown',
        is_required: true,
        position: 0,
        options: '["High", "Medium", "Low"]',
        validation_rules: null,
      });
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(1, 'custom_field_created', expect.any(Object));
    });

    test('should handle board not found', async () => {
      const tool = registerCreateCustomFieldTool(mockDb as any, mockWsServer);
      
      mockDb.getBoardById.mockResolvedValue(null);

      const result = await tool.handler({
        board_id: 999,
        name: 'Test Field',
        field_type: 'text',
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Board with id 999 not found');
    });

    test('should handle validation errors', async () => {
      const tool = registerCreateCustomFieldTool(mockDb as any, mockWsServer);

      const result = await tool.handler({
        board_id: 1,
        name: '', // Invalid: empty name
        field_type: 'text',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('registerSetCustomFieldValueTool', () => {
    test('should return tool configuration', () => {
      const tool = registerSetCustomFieldValueTool(mockDb as any, mockWsServer);
      
      expect(tool.name).toBe('set_custom_field_value');
      expect(tool.config.title).toBe('Set Custom Field Value');
      expect(tool.config.description).toContain('Set or update a custom field value for a card');
    });

    test('should set custom field value successfully', async () => {
      const tool = registerSetCustomFieldValueTool(mockDb as any, mockWsServer);
      
      mockDb.getCardById.mockResolvedValue({ id: 1, board_id: 1, title: 'Test Card' });
      mockDb.getCustomFieldById.mockResolvedValue({
        id: 1,
        board_id: 1,
        name: 'Priority Level',
        field_type: 'dropdown',
        is_required: false,
      });
      mockDb.setCustomFieldValue.mockResolvedValue({
        id: 1,
        card_id: 1,
        custom_field_id: 1,
        value: 'High',
      });

      const result = await tool.handler({
        card_id: 1,
        custom_field_id: 1,
        value: 'High',
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Successfully set custom field "Priority Level" value');
      expect(mockDb.setCustomFieldValue).toHaveBeenCalledWith({
        card_id: 1,
        custom_field_id: 1,
        value: 'High',
      });
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(1, 'custom_field_value_updated', expect.any(Object));
    });

    test('should handle required field validation', async () => {
      const tool = registerSetCustomFieldValueTool(mockDb as any, mockWsServer);
      
      mockDb.getCardById.mockResolvedValue({ id: 1, board_id: 1, title: 'Test Card' });
      mockDb.getCustomFieldById.mockResolvedValue({
        id: 1,
        board_id: 1,
        name: 'Required Field',
        field_type: 'text',
        is_required: true,
      });

      const result = await tool.handler({
        card_id: 1,
        custom_field_id: 1,
        value: '', // Empty value for required field
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Custom field "Required Field" is required');
    });

    test('should handle board mismatch', async () => {
      const tool = registerSetCustomFieldValueTool(mockDb as any, mockWsServer);
      
      mockDb.getCardById.mockResolvedValue({ id: 1, board_id: 1, title: 'Test Card' });
      mockDb.getCustomFieldById.mockResolvedValue({
        id: 1,
        board_id: 2, // Different board
        name: 'Test Field',
        field_type: 'text',
        is_required: false,
      });

      const result = await tool.handler({
        card_id: 1,
        custom_field_id: 1,
        value: 'Test Value',
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Custom field does not belong to the same board as the card');
    });
  });

  describe('registerGetCustomFieldsTool', () => {
    test('should return tool configuration', () => {
      const tool = registerGetCustomFieldsTool(mockDb as any);
      
      expect(tool.name).toBe('get_custom_fields');
      expect(tool.config.title).toBe('Get Custom Fields');
      expect(tool.config.description).toContain('Get all custom fields for a board');
    });

    test('should get custom fields successfully', async () => {
      const tool = registerGetCustomFieldsTool(mockDb as any);
      
      const mockFields = [
        { id: 1, name: 'Priority', field_type: 'dropdown' },
        { id: 2, name: 'Due Date', field_type: 'date' },
      ];
      mockDb.getCustomFieldsByBoard.mockResolvedValue(mockFields);

      const result = await tool.handler({ board_id: 1 });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Found 2 custom fields for board 1');
      expect(result.data).toEqual(mockFields);
    });

    test('should handle empty results', async () => {
      const tool = registerGetCustomFieldsTool(mockDb as any);
      
      mockDb.getCustomFieldsByBoard.mockResolvedValue([]);

      const result = await tool.handler({ board_id: 1 });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Found 0 custom fields for board 1');
      expect(result.data).toEqual([]);
    });
  });

  describe('registerDeleteCustomFieldTool', () => {
    test('should return tool configuration', () => {
      const tool = registerDeleteCustomFieldTool(mockDb as any, mockWsServer);
      
      expect(tool.name).toBe('delete_custom_field');
      expect(tool.config.title).toBe('Delete Custom Field');
      expect(tool.config.description).toContain('Delete a custom field and all its values');
    });

    test('should delete custom field successfully', async () => {
      const tool = registerDeleteCustomFieldTool(mockDb as any, mockWsServer);
      
      mockDb.getCustomFieldById.mockResolvedValue({
        id: 1,
        board_id: 1,
        name: 'Test Field',
      });
      mockDb.deleteCustomField.mockResolvedValue(true);

      const result = await tool.handler({ custom_field_id: 1 });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Successfully deleted custom field (ID: 1)');
      expect(mockWsServer.broadcastToBoardClients).toHaveBeenCalledWith(1, 'custom_field_deleted', { id: 1 });
    });

    test('should handle custom field not found', async () => {
      const tool = registerDeleteCustomFieldTool(mockDb as any, mockWsServer);
      
      mockDb.getCustomFieldById.mockResolvedValue(null);

      const result = await tool.handler({ custom_field_id: 999 });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Custom Field with id 999 not found');
    });
  });
});