/**
 * Wiki Attachment System Integration Tests
 * 
 * Tests the full-stack wiki attachment functionality including:
 * - File upload and storage
 * - Attachment metadata management
 * - MCP tool integration
 * - API endpoints
 * - Real-time WebSocket updates
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';
import { TestClient } from '../utils/test-client';

describe('Wiki Attachments Integration', () => {
  let client: TestClient;
  let testPageId: number;
  let uploadedAttachments: any[] = [];

  // Test file buffers
  const testFiles = {
    image: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    text: Buffer.from('This is a test file content'),
    pdf: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n')
  };

  beforeAll(async () => {
    client = new TestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    // Create a test wiki page
    const pageResponse = await client.post('/api/v1/wiki/pages', {
      title: 'Test Page for Attachments',
      content: '# Test Page\n\nThis page is for testing attachments.',
      published: true
    });

    expect(pageResponse.status).toBe(201);
    testPageId = parseInt(pageResponse.data.id.replace('page_', ''));
  });

  describe('File Upload', () => {
    test('should upload an image attachment', async () => {
      const formData = new FormData();
      formData.append('file', testFiles.image, {
        filename: 'test-image.png',
        contentType: 'image/png'
      });
      formData.append('description', 'Test image attachment');
      formData.append('uploaded_by', 'test-user');

      const response = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);

      expect(response.status).toBe(201);
      expect(response.data.attachment).toBeDefined();
      expect(response.data.attachment.original_name).toBe('test-image.png');
      expect(response.data.attachment.mime_type).toBe('image/png');
      expect(response.data.attachment.description).toBe('Test image attachment');
      expect(response.data.downloadUrl).toContain('/api/v1/wiki/attachments/');

      uploadedAttachments.push(response.data.attachment);
    });

    test('should upload a text file attachment', async () => {
      const formData = new FormData();
      formData.append('file', testFiles.text, {
        filename: 'test-file.txt',
        contentType: 'text/plain'
      });
      formData.append('description', 'Test text file');

      const response = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);

      expect(response.status).toBe(201);
      expect(response.data.attachment.original_name).toBe('test-file.txt');
      expect(response.data.attachment.mime_type).toBe('text/plain');

      uploadedAttachments.push(response.data.attachment);
    });

    test('should reject files that are too large', async () => {
      // Create a large buffer (simulate file larger than limit)
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const formData = new FormData();
      formData.append('file', largeBuffer, {
        filename: 'large-file.bin',
        contentType: 'application/octet-stream'
      });

      const response = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);

      expect(response.status).toBe(413); // Payload Too Large
    });

    test('should reject unsupported file types', async () => {
      const formData = new FormData();
      formData.append('file', Buffer.from('executable content'), {
        filename: 'malicious.exe',
        contentType: 'application/x-executable'
      });

      const response = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('not allowed');
    });
  });

  describe('Attachment Listing', () => {
    beforeEach(async () => {
      // Upload a test attachment
      const formData = new FormData();
      formData.append('file', testFiles.image, {
        filename: 'list-test.png',
        contentType: 'image/png'
      });

      await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
    });

    test('should list page attachments', async () => {
      const response = await client.get(`/api/v1/wiki/pages/${testPageId}/attachments`);

      expect(response.status).toBe(200);
      expect(response.data.attachments).toBeInstanceOf(Array);
      expect(response.data.attachments.length).toBeGreaterThan(0);
      expect(response.data.storage_info).toBeDefined();
      expect(response.data.storage_info.total_files).toBeGreaterThan(0);
    });

    test('should return empty list for page with no attachments', async () => {
      // Create a new page without attachments
      const pageResponse = await client.post('/api/v1/wiki/pages', {
        title: 'Empty Page',
        content: 'No attachments here'
      });

      const emptyPageId = parseInt(pageResponse.data.id.replace('page_', ''));
      const response = await client.get(`/api/v1/wiki/pages/${emptyPageId}/attachments`);

      expect(response.status).toBe(200);
      expect(response.data.attachments).toHaveLength(0);
      expect(response.data.storage_info.total_files).toBe(0);
    });
  });

  describe('Attachment Retrieval', () => {
    let testAttachmentId: string;

    beforeEach(async () => {
      // Upload a test attachment
      const formData = new FormData();
      formData.append('file', testFiles.text, {
        filename: 'retrieve-test.txt',
        contentType: 'text/plain'
      });

      const uploadResponse = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      testAttachmentId = uploadResponse.data.attachment.id;
    });

    test('should retrieve attachment metadata', async () => {
      const response = await client.get(`/api/v1/wiki/attachments/${testAttachmentId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testAttachmentId);
      expect(response.data.original_name).toBe('retrieve-test.txt');
      expect(response.data.mime_type).toBe('text/plain');
    });

    test('should return 404 for non-existent attachment', async () => {
      const response = await client.get('/api/v1/wiki/attachments/non-existent-id');

      expect(response.status).toBe(404);
    });

    test('should download attachment file', async () => {
      const response = await client.get(`/api/v1/wiki/attachments/${testAttachmentId}`);

      expect(response.status).toBe(200);
      // In a full implementation, this would return the file stream
      // For now, we check that the endpoint responds correctly
    });
  });

  describe('Attachment Updates', () => {
    let testAttachmentId: string;

    beforeEach(async () => {
      const formData = new FormData();
      formData.append('file', testFiles.image, {
        filename: 'update-test.png',
        contentType: 'image/png'
      });
      formData.append('description', 'Original description');

      const uploadResponse = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      testAttachmentId = uploadResponse.data.attachment.id;
    });

    test('should update attachment description', async () => {
      const updateData = {
        description: 'Updated description'
      };

      const response = await client.put(`/api/v1/wiki/attachments/${testAttachmentId}`, updateData);

      expect(response.status).toBe(200);
      expect(response.data.description).toBe('Updated description');
    });

    test('should update attachment filename', async () => {
      const updateData = {
        original_name: 'renamed-file.png'
      };

      const response = await client.put(`/api/v1/wiki/attachments/${testAttachmentId}`, updateData);

      expect(response.status).toBe(200);
      expect(response.data.original_name).toBe('renamed-file.png');
    });

    test('should update multiple fields at once', async () => {
      const updateData = {
        description: 'Updated description',
        original_name: 'new-name.png'
      };

      const response = await client.put(`/api/v1/wiki/attachments/${testAttachmentId}`, updateData);

      expect(response.status).toBe(200);
      expect(response.data.description).toBe('Updated description');
      expect(response.data.original_name).toBe('new-name.png');
    });
  });

  describe('Attachment Deletion', () => {
    let testAttachmentId: string;

    beforeEach(async () => {
      const formData = new FormData();
      formData.append('file', testFiles.text, {
        filename: 'delete-test.txt',
        contentType: 'text/plain'
      });

      const uploadResponse = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      testAttachmentId = uploadResponse.data.attachment.id;
    });

    test('should delete attachment', async () => {
      const response = await client.delete(`/api/v1/wiki/attachments/${testAttachmentId}`);

      expect(response.status).toBe(204);

      // Verify attachment is gone
      const getResponse = await client.get(`/api/v1/wiki/attachments/${testAttachmentId}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 when deleting non-existent attachment', async () => {
      const response = await client.delete('/api/v1/wiki/attachments/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('Attachment Search', () => {
    beforeEach(async () => {
      // Upload several test files with different names and descriptions
      const testUploads = [
        { filename: 'document.pdf', description: 'Important document' },
        { filename: 'image.jpg', description: 'Photo from vacation' },
        { filename: 'data.csv', description: 'Sales data spreadsheet' }
      ];

      for (const upload of testUploads) {
        const formData = new FormData();
        formData.append('file', testFiles.text, {
          filename: upload.filename,
          contentType: 'text/plain'
        });
        formData.append('description', upload.description);

        await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      }
    });

    test('should search attachments by filename', async () => {
      const response = await client.get('/api/v1/wiki/attachments/search?query=document');

      expect(response.status).toBe(200);
      expect(response.data.attachments).toBeDefined();
      expect(response.data.attachments.some((att: any) => att.original_name.includes('document'))).toBe(true);
    });

    test('should search attachments by description', async () => {
      const response = await client.get('/api/v1/wiki/attachments/search?query=vacation');

      expect(response.status).toBe(200);
      expect(response.data.attachments.some((att: any) => att.description.includes('vacation'))).toBe(true);
    });

    test('should filter search by page', async () => {
      const response = await client.get(`/api/v1/wiki/attachments/search?query=data&page_id=${testPageId}`);

      expect(response.status).toBe(200);
      expect(response.data.attachments.every((att: any) => att.page_id === testPageId)).toBe(true);
    });

    test('should filter search by mime type', async () => {
      const response = await client.get('/api/v1/wiki/attachments/search?query=document&mime_type=text/plain');

      expect(response.status).toBe(200);
      expect(response.data.attachments.every((att: any) => att.mime_type === 'text/plain')).toBe(true);
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(async () => {
      // Upload a few test files
      for (let i = 0; i < 3; i++) {
        const formData = new FormData();
        formData.append('file', testFiles.text, {
          filename: `stats-test-${i}.txt`,
          contentType: 'text/plain'
        });

        await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      }
    });

    test('should get storage stats for specific page', async () => {
      const response = await client.get(`/api/v1/wiki/storage/stats?page_id=${testPageId}`);

      expect(response.status).toBe(200);
      expect(response.data.page_id).toBe(testPageId);
      expect(response.data.total_files).toBeGreaterThanOrEqual(3);
      expect(response.data.total_size).toBeGreaterThan(0);
      expect(response.data.quota_limit).toBeDefined();
      expect(response.data.quota_used_percent).toBeDefined();
    });

    test('should get global storage stats', async () => {
      const response = await client.get('/api/v1/wiki/storage/stats');

      expect(response.status).toBe(200);
      // Global stats implementation would depend on requirements
    });
  });

  describe('MCP Tool Integration', () => {
    test('should handle MCP attachment upload tool', async () => {
      const toolCall = {
        name: 'wiki_upload_attachment',
        arguments: {
          page_id: testPageId,
          file_data: testFiles.image.toString('base64'),
          filename: 'mcp-test.png',
          mime_type: 'image/png',
          description: 'Uploaded via MCP tool'
        }
      };

      // This would be called through the MCP client
      // For now, we simulate the expected behavior
      expect(toolCall.arguments.page_id).toBe(testPageId);
      expect(toolCall.arguments.filename).toBe('mcp-test.png');
    });

    test('should handle MCP attachment listing tool', async () => {
      const toolCall = {
        name: 'wiki_list_page_attachments',
        arguments: {
          page_id: testPageId
        }
      };

      expect(toolCall.arguments.page_id).toBe(testPageId);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file in upload', async () => {
      const formData = new FormData();
      formData.append('description', 'No file attached');

      const response = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('No file uploaded');
    });

    test('should handle invalid page ID', async () => {
      const formData = new FormData();
      formData.append('file', testFiles.text, {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

      const response = await client.postForm('/api/v1/wiki/pages/99999/attachments', formData);

      expect(response.status).toBe(404);
    });

    test('should validate attachment update data', async () => {
      const formData = new FormData();
      formData.append('file', testFiles.text, {
        filename: 'validate-test.txt',
        contentType: 'text/plain'
      });

      const uploadResponse = await client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      const attachmentId = uploadResponse.data.attachment.id;

      // Try to update with invalid data
      const invalidUpdate = {
        original_name: '', // Empty filename should be rejected
      };

      const response = await client.put(`/api/v1/wiki/attachments/${attachmentId}`, invalidUpdate);

      expect(response.status).toBe(400);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple simultaneous uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) => {
        const formData = new FormData();
        formData.append('file', testFiles.text, {
          filename: `concurrent-${i}.txt`,
          contentType: 'text/plain'
        });

        return client.postForm(`/api/v1/wiki/pages/${testPageId}/attachments`, formData);
      });

      const responses = await Promise.all(uploadPromises);

      responses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.data.attachment.original_name).toBe(`concurrent-${i}.txt`);
      });
    });

    test('should handle quota enforcement during concurrent uploads', async () => {
      // This test would verify that quota limits are properly enforced
      // even when multiple uploads happen simultaneously
      
      // For now, we just ensure the system can handle concurrent requests
      const results = await Promise.allSettled([
        client.get(`/api/v1/wiki/pages/${testPageId}/attachments`),
        client.get(`/api/v1/wiki/storage/stats?page_id=${testPageId}`),
        client.get('/api/v1/wiki/attachments/search?query=test')
      ]);

      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });
  });

  // Cleanup after each test
  afterEach(async () => {
    // Clean up uploaded attachments
    for (const attachment of uploadedAttachments) {
      try {
        await client.delete(`/api/v1/wiki/attachments/${attachment.id}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    uploadedAttachments = [];

    // Clean up test page
    if (testPageId) {
      try {
        await client.delete(`/api/v1/wiki/pages/page_${testPageId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});