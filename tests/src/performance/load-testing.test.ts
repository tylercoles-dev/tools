/**
 * Performance and Load Testing
 */

import { TestAPIClient, TestDataGenerator } from '../utils/test-client.js';

describe('Performance Tests', () => {
  let client: TestAPIClient;

  beforeAll(() => {
    client = new TestAPIClient();
  });

  describe('API Performance', () => {
    it('should handle concurrent API requests', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        client.getHealth()
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / concurrentRequests;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeValidApiResponse();
      });
      
      // Performance expectations
      expect(avgResponseTime).toBeLessThan(1000); // Average < 1s
      expect(totalTime).toBeLessThan(10000); // Total < 10s
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgResponseTime.toFixed(2)}ms)`);
    });

    it('should maintain performance under sustained load', async () => {
      const requestsPerBatch = 10;
      const numberOfBatches = 5;
      const timeBetweenBatches = 1000; // 1 second
      
      const batchTimes: number[] = [];
      
      for (let batch = 0; batch < numberOfBatches; batch++) {
        const batchStartTime = Date.now();
        
        const promises = Array.from({ length: requestsPerBatch }, () =>
          client.getHealth()
        );
        
        const responses = await Promise.all(promises);
        const batchEndTime = Date.now();
        
        const batchTime = batchEndTime - batchStartTime;
        batchTimes.push(batchTime);
        
        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        
        console.log(`Batch ${batch + 1}/${numberOfBatches}: ${requestsPerBatch} requests in ${batchTime}ms`);
        
        // Wait between batches
        if (batch < numberOfBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, timeBetweenBatches));
        }
      }
      
      // Performance should remain consistent
      const avgBatchTime = batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length;
      const maxBatchTime = Math.max(...batchTimes);
      
      expect(avgBatchTime).toBeLessThan(5000); // Average batch < 5s
      expect(maxBatchTime).toBeLessThan(10000); // Max batch < 10s
      
      console.log(`Sustained load test: ${numberOfBatches} batches, avg time: ${avgBatchTime.toFixed(2)}ms, max time: ${maxBatchTime}ms`);
    });
  });

  describe('Database Performance', () => {
    it('should handle large memory creation efficiently', async () => {
      const numberOfMemories = 50;
      const memories = Array.from({ length: numberOfMemories }, () =>
        TestDataGenerator.randomMemory()
      );
      
      const startTime = Date.now();
      
      // Create memories sequentially to test database performance
      const createdMemories = [];
      for (const memory of memories) {
        const response = await client.createMemory(memory);
        expect(response.status).toBe(201);
        createdMemories.push(response.data.data);
      }
      
      const creationTime = Date.now() - startTime;
      const avgCreationTime = creationTime / numberOfMemories;
      
      console.log(`Created ${numberOfMemories} memories in ${creationTime}ms (avg: ${avgCreationTime.toFixed(2)}ms each)`);
      
      // Retrieval performance test
      const retrievalStartTime = Date.now();
      
      for (const memory of createdMemories) {
        const response = await client.getMemory(memory.id);
        expect(response.status).toBe(200);
      }
      
      const retrievalTime = Date.now() - retrievalStartTime;
      const avgRetrievalTime = retrievalTime / numberOfMemories;
      
      console.log(`Retrieved ${numberOfMemories} memories in ${retrievalTime}ms (avg: ${avgRetrievalTime.toFixed(2)}ms each)`);
      
      // Performance expectations
      expect(avgCreationTime).toBeLessThan(500); // < 500ms per creation
      expect(avgRetrievalTime).toBeLessThan(100); // < 100ms per retrieval
    });

    it('should handle large kanban operations efficiently', async () => {
      const numberOfBoards = 10;
      const cardsPerBoard = 20;
      
      const boards = Array.from({ length: numberOfBoards }, () =>
        TestDataGenerator.randomKanbanBoard()
      );
      
      const startTime = Date.now();
      
      // Create boards
      const createdBoards = [];
      for (const board of boards) {
        const response = await client.createKanbanBoard(board);
        expect(response.status).toBe(201);
        createdBoards.push(response.data.data);
      }
      
      // Create cards for each board
      let totalCards = 0;
      for (const board of createdBoards) {
        const column = board.columns[0]; // Use first column
        
        for (let i = 0; i < cardsPerBoard; i++) {
          const cardData = TestDataGenerator.randomKanbanCard(board.id, column.id);
          const response = await client.client.post('/api/kanban/cards', cardData);
          expect(response.status).toBe(201);
          totalCards++;
        }
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerOperation = totalTime / (numberOfBoards + totalCards);
      
      console.log(`Created ${numberOfBoards} boards and ${totalCards} cards in ${totalTime}ms (avg: ${avgTimePerOperation.toFixed(2)}ms per operation)`);
      
      // List performance test
      const listStartTime = Date.now();
      const boardsResponse = await client.getKanbanBoards();
      const listTime = Date.now() - listStartTime;
      
      expect(boardsResponse.status).toBe(200);
      expect(boardsResponse.data.data.length).toBeGreaterThanOrEqual(numberOfBoards);
      
      console.log(`Listed ${boardsResponse.data.data.length} boards in ${listTime}ms`);
      
      // Performance expectations
      expect(avgTimePerOperation).toBeLessThan(200); // < 200ms per operation
      expect(listTime).toBeLessThan(1000); // < 1s to list all boards
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      const numberOfOperations = 100;
      
      // Perform many operations
      for (let i = 0; i < numberOfOperations; i++) {
        const memory = TestDataGenerator.randomMemory();
        const response = await client.createMemory(memory);
        expect(response.status).toBe(201);
        
        // Retrieve it
        const getResponse = await client.getMemory(response.data.data.id);
        expect(getResponse.status).toBe(200);
        
        // Periodically check memory usage
        if (i % 20 === 0) {
          const currentMemory = process.memoryUsage();
          const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
          console.log(`After ${i} operations: heap increased by ${(heapIncrease / 1024 / 1024).toFixed(2)}MB`);
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreasePerOp = heapIncrease / numberOfOperations;
      
      console.log(`Final memory increase: ${(heapIncrease / 1024 / 1024).toFixed(2)}MB (${(heapIncreasePerOp / 1024).toFixed(2)}KB per operation)`);
      
      // Memory increase should be reasonable
      expect(heapIncreasePerOp).toBeLessThan(50 * 1024); // < 50KB per operation
    });
  });
});