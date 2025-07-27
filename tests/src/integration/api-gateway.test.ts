/**
 * API Gateway Integration Tests
 */

import { TestAPIClient, TestDataGenerator } from '../utils/test-client.js';

describe('API Gateway Integration', () => {
  let client: TestAPIClient;

  beforeAll(() => {
    client = new TestAPIClient();
  });

  describe('Health Checks', () => {
    it('should return basic health status', async () => {
      const response = await client.getHealth();
      
      expect(response.status).toBe(200);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.status).toBe('healthy');
      expect(response.data.data.uptime).toBeGreaterThan(0);
    });

    it('should return detailed health with service status', async () => {
      const response = await client.getDetailedHealth();
      
      expect(response.status).toBe(200);
      expect(response.data).toBeValidApiResponse();
      expect(response.data.data.status).toMatch(/healthy|degraded/);
      expect(response.data.data.services).toBeDefined();
      expect(response.data.data.memory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await client.client.get('/nonexistent');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await client.client.post('/kanban/boards', { invalid: 'data' });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Request/Response Format', () => {
    it('should include proper CORS headers', async () => {
      const response = await client.getHealth();
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include proper content-type headers', async () => {
      const response = await client.getHealth();
      
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should include request ID in responses', async () => {
      const response = await client.getHealth();
      
      expect(response.data.requestId || response.headers['x-request-id']).toBeDefined();
    });
  });
});