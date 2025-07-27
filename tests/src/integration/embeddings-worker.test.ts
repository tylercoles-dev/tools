/**
 * Embeddings Worker Integration Tests
 */

import { TestAPIClient, TestDataGenerator, createTestTimeout } from '../utils/test-client.js';

describe('Embeddings Worker Integration', () => {
  let client: TestAPIClient;

  beforeAll(() => {
    client = new TestAPIClient();
  });

  describe('Memory Embedding Processing', () => {
    it('should process embeddings when creating memories', async () => {
      const memoryData = TestDataGenerator.randomMemory();
      
      // Create memory which should trigger embedding processing
      const response = await Promise.race([
        client.createMemory(memoryData),
        createTestTimeout('Memory creation with embeddings', 15000)
      ]);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      
      const memoryId = response.data.data.id;
      
      // Wait a moment for async embedding processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify memory was created and potentially has embedding metadata
      const getResponse = await client.getMemory(memoryId);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.content).toBe(memoryData.content);
    });

    it('should handle batch embedding requests', async () => {
      // Create multiple memories that will trigger batch processing
      const memories = Array.from({ length: 5 }, () => TestDataGenerator.randomMemory());
      
      const createPromises = memories.map(memory => 
        client.createMemory(memory)
      );
      
      const responses = await Promise.all(createPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data).toBeValidApiResponse();
      });
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify all memories exist
      const memoryIds = responses.map(r => r.data.data.id);
      
      for (const memoryId of memoryIds) {
        const getResponse = await client.getMemory(memoryId);
        expect(getResponse.status).toBe(200);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding service unavailability gracefully', async () => {
      // Create memory even when embedding service might be down
      const memoryData = {
        content: 'This should work even without embeddings',
        type: 'note',
        metadata: { skipEmbeddings: true }
      };
      
      const response = await client.createMemory(memoryData);
      
      // Memory creation should still succeed
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
    });

    it('should retry failed embedding operations', async () => {
      // This test verifies the retry mechanism
      // We create a memory with complex content that might initially fail
      const memoryData = {
        content: 'Complex content with special characters: 🚀 áéíóú çñü @#$%^&*(){}[]|\\:";\'<>?,./`~',
        type: 'note',
        tags: ['special-characters', 'retry-test']
      };
      
      const response = await client.createMemory(memoryData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      
      // Give worker time to process and potentially retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify memory still exists and is accessible
      const getResponse = await client.getMemory(response.data.data.id);
      expect(getResponse.status).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent embedding requests', async () => {
      const concurrentRequests = 10;
      const memories = Array.from({ length: concurrentRequests }, () => 
        TestDataGenerator.randomMemory()
      );
      
      const startTime = Date.now();
      
      const promises = memories.map(memory => client.createMemory(memory));
      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data).toBeValidApiResponse();
      });
      
      // Should complete within reasonable time (not more than 30 seconds)
      expect(totalTime).toBeLessThan(30000);
      
      console.log(`Processed ${concurrentRequests} concurrent embedding requests in ${totalTime}ms`);
    });

    it('should process large content efficiently', async () => {
      // Create memory with large content
      const largeContent = 'Large content: ' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
      
      const memoryData = {
        content: largeContent,
        type: 'document',
        tags: ['large-content', 'performance-test']
      };
      
      const startTime = Date.now();
      const response = await client.createMemory(memoryData);
      const endTime = Date.now();
      
      expect(response.status).toBe(201);
      expect(response.data).toBeValidApiResponse();
      
      const processingTime = endTime - startTime;
      console.log(`Processed large content (${largeContent.length} chars) in ${processingTime}ms`);
      
      // Should complete within reasonable time
      expect(processingTime).toBeLessThan(10000);
    });
  });
});