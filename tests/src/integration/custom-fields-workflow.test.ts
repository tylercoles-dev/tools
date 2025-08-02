/**
 * Integration Tests for Custom Fields Workflow
 * Tests the complete custom fields feature from creation to usage across the system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ApiClient } from '../utils/test-client';
import { TestEnvironment } from '../setup/test-environment';

describe('Custom Fields Workflow Integration', () => {
  let apiClient: ApiClient;
  let testEnv: TestEnvironment;
  let boardId: number;
  let cardId: number;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    apiClient = testEnv.getApiClient();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    // Create a fresh board and card for each test
    const board = await apiClient.post('/api/kanban/boards', {
      title: 'Custom Fields Test Board',
      description: 'Testing custom fields functionality'
    });
    boardId = board.data.id;

    const column = await apiClient.post('/api/kanban/columns', {
      board_id: boardId,
      title: 'To Do',
      order_index: 0
    });

    const card = await apiClient.post('/api/kanban/cards', {
      board_id: boardId,
      column_id: column.data.id,
      title: 'Test Card for Custom Fields',
      description: 'Testing custom field functionality'
    });
    cardId = card.data.id;
  });

  describe('Text Field Workflow', () => {
    it('should create and use text custom field successfully', async () => {
      // Step 1: Create text custom field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Priority Level',
        type: 'text',
        required: false,
        description: 'Text description of priority'
      });

      expect(fieldResponse.status).toBe(201);
      expect(fieldResponse.data).toMatchObject({
        board_id: boardId,
        name: 'Priority Level',
        type: 'text',
        required: false
      });

      const fieldId = fieldResponse.data.id;

      // Step 2: Set field value on card
      const valueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'High Priority - Critical Bug Fix'
      });

      expect(valueResponse.status).toBe(201);
      expect(valueResponse.data).toMatchObject({
        card_id: cardId,
        field_id: fieldId,
        value: 'High Priority - Critical Bug Fix'
      });

      // Step 3: Retrieve field values for card
      const valuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      
      expect(valuesResponse.status).toBe(200);
      expect(valuesResponse.data).toHaveLength(1);
      expect(valuesResponse.data[0]).toMatchObject({
        field_id: fieldId,
        field_name: 'Priority Level',
        field_type: 'text',
        value: 'High Priority - Critical Bug Fix'
      });

      // Step 4: Update field value
      const updateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'Medium Priority - Enhancement'
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.value).toBe('Medium Priority - Enhancement');

      // Step 5: Verify updated value
      const updatedValuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      expect(updatedValuesResponse.data[0].value).toBe('Medium Priority - Enhancement');
    });

    it('should handle text field validation correctly', async () => {
      // Create required text field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Required Description',
        type: 'text',
        required: true
      });

      const fieldId = fieldResponse.data.id;

      // Try to set empty value for required field
      const emptyValueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: ''
      });

      expect(emptyValueResponse.status).toBe(400);
      expect(emptyValueResponse.data.error).toContain('required');

      // Set valid value
      const validValueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'Valid description text'
      });

      expect(validValueResponse.status).toBe(201);
    });
  });

  describe('Dropdown Field Workflow', () => {
    it('should create and use dropdown custom field with validation', async () => {
      // Step 1: Create dropdown field with options
      const options = ['Low', 'Medium', 'High', 'Critical'];
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Priority',
        type: 'dropdown',
        required: true,
        options: options,
        description: 'Task priority level'
      });

      expect(fieldResponse.status).toBe(201);
      expect(fieldResponse.data.options).toEqual(options);

      const fieldId = fieldResponse.data.id;

      // Step 2: Set valid option value
      const validValueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'High'
      });

      expect(validValueResponse.status).toBe(201);
      expect(validValueResponse.data.value).toBe('High');

      // Step 3: Try to set invalid option value
      const invalidValueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'Invalid Option'
      });

      expect(invalidValueResponse.status).toBe(400);
      expect(invalidValueResponse.data.error).toContain('Invalid option');

      // Step 4: Update to different valid option
      const updateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'Critical'
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.value).toBe('Critical');

      // Step 5: Update dropdown options
      const updatedOptions = ['Low', 'Normal', 'High', 'Urgent', 'Critical'];
      const updateFieldResponse = await apiClient.put(`/api/kanban/custom-fields/${fieldId}`, {
        options: updatedOptions
      });

      expect(updateFieldResponse.status).toBe(200);
      expect(updateFieldResponse.data.options).toEqual(updatedOptions);

      // Step 6: Verify existing values still work
      const valuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      expect(valuesResponse.data[0].value).toBe('Critical'); // Should still be valid
    });
  });

  describe('Multi-Select Field Workflow', () => {
    it('should handle multi-select field operations', async () => {
      // Create multi-select field
      const tags = ['Frontend', 'Backend', 'Database', 'Testing', 'Documentation'];
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Technology Stack',
        type: 'multi-select',
        options: tags,
        required: false
      });

      const fieldId = fieldResponse.data.id;

      // Set multiple values
      const selectedTags = ['Frontend', 'Database'];
      const valueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: selectedTags
      });

      expect(valueResponse.status).toBe(201);
      expect(valueResponse.data.value).toEqual(selectedTags);

      // Update to different selection
      const newSelection = ['Backend', 'Testing', 'Documentation'];
      const updateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: newSelection
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.value).toEqual(newSelection);

      // Try invalid option in multi-select
      const invalidResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: ['Frontend', 'InvalidTag']
      });

      expect(invalidResponse.status).toBe(400);
    });
  });

  describe('Number Field Workflow', () => {
    it('should handle number field with validation', async () => {
      // Create number field with constraints
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Story Points',
        type: 'number',
        required: true,
        validation: {
          min: 1,
          max: 100
        }
      });

      const fieldId = fieldResponse.data.id;

      // Set valid number
      const validResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 8
      });

      expect(validResponse.status).toBe(201);
      expect(validResponse.data.value).toBe(8);

      // Try invalid number (too high)
      const tooHighResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 150
      });

      expect(tooHighResponse.status).toBe(400);

      // Try invalid number (too low)
      const tooLowResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 0
      });

      expect(tooLowResponse.status).toBe(400);

      // Update to valid number
      const updateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 13
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.value).toBe(13);
    });
  });

  describe('Date Field Workflow', () => {
    it('should handle date field operations', async () => {
      // Create date field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Due Date',
        type: 'date',
        required: false
      });

      const fieldId = fieldResponse.data.id;

      // Set date value
      const dateValue = '2024-12-31';
      const valueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: dateValue
      });

      expect(valueResponse.status).toBe(201);
      expect(valueResponse.data.value).toBe(dateValue);

      // Try invalid date format
      const invalidDateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'invalid-date'
      });

      expect(invalidDateResponse.status).toBe(400);

      // Update to different valid date
      const newDate = '2024-06-15';
      const updateResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: newDate
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.value).toBe(newDate);
    });
  });

  describe('Checkbox Field Workflow', () => {
    it('should handle boolean checkbox field', async () => {
      // Create checkbox field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Reviewed',
        type: 'checkbox',
        required: false,
        description: 'Has this card been reviewed?'
      });

      const fieldId = fieldResponse.data.id;

      // Set to true
      const trueResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: true
      });

      expect(trueResponse.status).toBe(201);
      expect(trueResponse.data.value).toBe(true);

      // Update to false
      const falseResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: false
      });

      expect(falseResponse.status).toBe(200);
      expect(falseResponse.data.value).toBe(false);

      // Try invalid boolean value
      const invalidResponse = await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'not-a-boolean'
      });

      expect(invalidResponse.status).toBe(400);
    });
  });

  describe('Complex Multi-Field Workflow', () => {
    it('should handle multiple custom fields on a single card', async () => {
      // Create multiple different field types
      const fields = [
        {
          name: 'Priority',
          type: 'dropdown',
          options: ['Low', 'Medium', 'High'],
          required: true
        },
        {
          name: 'Estimate',
          type: 'number',
          required: false
        },
        {
          name: 'Tags',
          type: 'multi-select',
          options: ['Bug', 'Feature', 'Enhancement'],
          required: false
        },
        {
          name: 'Completed',
          type: 'checkbox',
          required: false
        },
        {
          name: 'Due Date',
          type: 'date',
          required: false
        }
      ];

      const createdFields = [];
      for (const field of fields) {
        const response = await apiClient.post('/api/kanban/custom-fields', {
          board_id: boardId,
          ...field
        });
        expect(response.status).toBe(201);
        createdFields.push(response.data);
      }

      // Set values for all fields
      const fieldValues = [
        { field_id: createdFields[0].id, value: 'High' },
        { field_id: createdFields[1].id, value: 8 },
        { field_id: createdFields[2].id, value: ['Bug', 'Enhancement'] },
        { field_id: createdFields[3].id, value: false },
        { field_id: createdFields[4].id, value: '2024-07-15' }
      ];

      for (const fieldValue of fieldValues) {
        const response = await apiClient.post('/api/kanban/custom-field-values', {
          card_id: cardId,
          ...fieldValue
        });
        expect(response.status).toBe(201);
      }

      // Retrieve all field values for card
      const allValuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      
      expect(allValuesResponse.status).toBe(200);
      expect(allValuesResponse.data).toHaveLength(5);

      // Verify each field value
      const valuesByFieldId = allValuesResponse.data.reduce((acc, val) => {
        acc[val.field_id] = val;
        return acc;
      }, {});

      expect(valuesByFieldId[createdFields[0].id].value).toBe('High');
      expect(valuesByFieldId[createdFields[1].id].value).toBe(8);
      expect(valuesByFieldId[createdFields[2].id].value).toEqual(['Bug', 'Enhancement']);
      expect(valuesByFieldId[createdFields[3].id].value).toBe(false);
      expect(valuesByFieldId[createdFields[4].id].value).toBe('2024-07-15');

      // Update multiple fields at once
      await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: createdFields[0].id,
        value: 'Medium'
      });

      await apiClient.put('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: createdFields[3].id,
        value: true
      });

      // Verify updates
      const updatedValuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      const updatedValuesByFieldId = updatedValuesResponse.data.reduce((acc, val) => {
        acc[val.field_id] = val;
        return acc;
      }, {});

      expect(updatedValuesByFieldId[createdFields[0].id].value).toBe('Medium');
      expect(updatedValuesByFieldId[createdFields[3].id].value).toBe(true);
    });
  });

  describe('Field Management Workflow', () => {
    it('should handle field lifecycle operations', async () => {
      // Create field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Test Field',
        type: 'text',
        required: false
      });

      const fieldId = fieldResponse.data.id;

      // Set field value on card
      await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: fieldId,
        value: 'Initial value'
      });

      // Update field properties
      const updateFieldResponse = await apiClient.put(`/api/kanban/custom-fields/${fieldId}`, {
        name: 'Updated Test Field',
        description: 'Updated description',
        required: true
      });

      expect(updateFieldResponse.status).toBe(200);
      expect(updateFieldResponse.data.name).toBe('Updated Test Field');
      expect(updateFieldResponse.data.required).toBe(true);

      // Verify field values still exist after field update
      const valuesResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      expect(valuesResponse.data).toHaveLength(1);
      expect(valuesResponse.data[0].field_name).toBe('Updated Test Field');

      // Get all fields for board
      const allFieldsResponse = await apiClient.get(`/api/kanban/boards/${boardId}/custom-fields`);
      expect(allFieldsResponse.status).toBe(200);
      const updatedField = allFieldsResponse.data.find(f => f.id === fieldId);
      expect(updatedField.name).toBe('Updated Test Field');

      // Delete field (should also delete all values)
      const deleteResponse = await apiClient.delete(`/api/kanban/custom-fields/${fieldId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify field is deleted
      const fieldsAfterDeleteResponse = await apiClient.get(`/api/kanban/boards/${boardId}/custom-fields`);
      expect(fieldsAfterDeleteResponse.data.find(f => f.id === fieldId)).toBeUndefined();

      // Verify field values are also deleted
      const valuesAfterDeleteResponse = await apiClient.get(`/api/kanban/cards/${cardId}/custom-field-values`);
      expect(valuesAfterDeleteResponse.data).toHaveLength(0);
    });
  });

  describe('Cross-Card Field Operations', () => {
    it('should handle custom fields across multiple cards', async () => {
      // Create additional cards
      const card2Response = await apiClient.post('/api/kanban/cards', {
        board_id: boardId,
        column_id: (await apiClient.get(`/api/kanban/boards/${boardId}/columns`)).data[0].id,
        title: 'Second Test Card'
      });
      const card2Id = card2Response.data.id;

      const card3Response = await apiClient.post('/api/kanban/cards', {
        board_id: boardId,
        column_id: (await apiClient.get(`/api/kanban/boards/${boardId}/columns`)).data[0].id,
        title: 'Third Test Card'
      });
      const card3Id = card3Response.data.id;

      // Create shared custom field
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Status',
        type: 'dropdown',
        options: ['Not Started', 'In Progress', 'Review', 'Done'],
        required: true
      });

      const fieldId = fieldResponse.data.id;

      // Set different values for each card
      const cardValues = [
        { card_id: cardId, value: 'In Progress' },
        { card_id: card2Id, value: 'Review' },
        { card_id: card3Id, value: 'Not Started' }
      ];

      for (const cardValue of cardValues) {
        const response = await apiClient.post('/api/kanban/custom-field-values', {
          field_id: fieldId,
          ...cardValue
        });
        expect(response.status).toBe(201);
      }

      // Verify each card has correct value
      for (const cardValue of cardValues) {
        const valuesResponse = await apiClient.get(`/api/kanban/cards/${cardValue.card_id}/custom-field-values`);
        expect(valuesResponse.data[0].value).toBe(cardValue.value);
      }

      // Update field options (should not affect existing values)
      const updatedOptions = ['Backlog', 'In Progress', 'Review', 'Done', 'Deployed'];
      await apiClient.put(`/api/kanban/custom-fields/${fieldId}`, {
        options: updatedOptions
      });

      // Verify existing values are still valid
      for (const cardValue of cardValues) {
        const valuesResponse = await apiClient.get(`/api/kanban/cards/${cardValue.card_id}/custom-field-values`);
        expect(valuesResponse.data[0].value).toBe(cardValue.value);
      }

      // Set new option value on one card
      await apiClient.put('/api/kanban/custom-field-values', {
        card_id: card3Id,
        field_id: fieldId,
        value: 'Backlog'
      });

      const updatedCard3Response = await apiClient.get(`/api/kanban/cards/${card3Id}/custom-field-values`);
      expect(updatedCard3Response.data[0].value).toBe('Backlog');
    });
  });

  describe('Field Validation and Error Handling', () => {
    it('should handle various error scenarios', async () => {
      // Try to create field with invalid type
      const invalidTypeResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Invalid Field',
        type: 'invalid_type'
      });

      expect(invalidTypeResponse.status).toBe(400);

      // Try to create dropdown field without options
      const noOptionsResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Dropdown No Options',
        type: 'dropdown'
      });

      expect(noOptionsResponse.status).toBe(400);

      // Create valid field first
      const fieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: boardId,
        name: 'Test Field',
        type: 'text',
        required: true
      });

      const fieldId = fieldResponse.data.id;

      // Try to set value for non-existent card
      const nonExistentCardResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: 99999,
        field_id: fieldId,
        value: 'test'
      });

      expect(nonExistentCardResponse.status).toBe(404);

      // Try to set value for non-existent field
      const nonExistentFieldResponse = await apiClient.post('/api/kanban/custom-field-values', {
        card_id: cardId,
        field_id: 99999,
        value: 'test'
      });

      expect(nonExistentFieldResponse.status).toBe(404);

      // Try to delete field from different board
      const otherBoardResponse = await apiClient.post('/api/kanban/boards', {
        title: 'Other Board'
      });
      const otherBoardId = otherBoardResponse.data.id;

      const otherFieldResponse = await apiClient.post('/api/kanban/custom-fields', {
        board_id: otherBoardId,
        name: 'Other Field',
        type: 'text'
      });

      // Should not be able to delete field from wrong board
      const unauthorizedDeleteResponse = await apiClient.delete(`/api/kanban/custom-fields/${otherFieldResponse.data.id}`, {
        headers: { 'X-Board-Context': boardId }
      });

      expect(unauthorizedDeleteResponse.status).toBe(403);
    });
  });
});