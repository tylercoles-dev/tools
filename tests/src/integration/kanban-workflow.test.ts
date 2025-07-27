/**
 * Kanban Workflow Integration Tests
 */

import { TestAPIClient, TestDataGenerator } from '../utils/test-client.js';

describe('Kanban Workflow Integration', () => {
  let client: TestAPIClient;
  let testBoard: any;
  let testColumn: any;

  beforeAll(() => {
    client = new TestAPIClient();
  });

  describe('Board Management', () => {
    it('should create a new kanban board', async () => {
      const boardData = TestDataGenerator.randomKanbanBoard();
      const response = await client.createKanbanBoard(boardData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.name).toBe(boardData.name);
      expect(response.data.data.id).toBeDefined();
      
      testBoard = response.data.data;
    });

    it('should retrieve the created board', async () => {
      const response = await client.getKanbanBoard(testBoard.id);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.id).toBe(testBoard.id);
      expect(response.data.data.name).toBe(testBoard.name);
    });

    it('should list all boards including the new one', async () => {
      const response = await client.getKanbanBoards();
      
      expect(response.status).toBe(200);
      expect(response.data).toBeValidApiResponse();
      expect(Array.isArray(response.data.data)).toBe(true);
      
      const boardExists = response.data.data.some((board: any) => board.id === testBoard.id);
      expect(boardExists).toBe(true);
    });
  });

  describe('Card Management', () => {
    beforeAll(() => {
      // Assume the board has columns from creation
      testColumn = testBoard.columns[0];
    });

    it('should create a card in the board', async () => {
      const cardData = TestDataGenerator.randomKanbanCard(testBoard.id, testColumn.id);
      const response = await client.client.post(`/api/kanban/cards`, cardData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.title).toBe(cardData.title);
      expect(response.data.data.boardId).toBe(testBoard.id);
    });

    it('should update card status', async () => {
      // First create a card
      const cardData = TestDataGenerator.randomKanbanCard(testBoard.id, testColumn.id);
      const createResponse = await client.client.post(`/api/kanban/cards`, cardData);
      const card = createResponse.data.data;
      
      // Then update it
      const updateData = { status: 'in_progress' };
      const updateResponse = await client.client.patch(`/api/kanban/cards/${card.id}`, updateData);
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toBeValidApiResponse();
      expect(updateResponse.data.data.status).toBe('in_progress');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should handle board analytics requests', async () => {
      const response = await client.client.get(`/api/kanban/boards/${testBoard.id}/analytics`);
      
      // Should return analytics even if board is empty
      expect(response.status).toBe(200);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.totalCards).toBeGreaterThanOrEqual(0);
    });

    it('should validate board references in memory system', async () => {
      // Create a memory that references the kanban board
      const memoryData = {
        content: `Working on kanban board: ${testBoard.name}`,
        type: 'project_note',
        metadata: {
          kanbanBoardId: testBoard.id,
          source: 'integration-test'
        }
      };
      
      const response = await client.createMemory(memoryData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.metadata.kanbanBoardId).toBe(testBoard.id);
    });
  });
});