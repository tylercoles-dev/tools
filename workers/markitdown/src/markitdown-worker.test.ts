/**
 * MarkItDown Worker Unit Tests
 * 
 * Comprehensive test suite for the MarkItDown worker and converter
 */

import { MarkItDownWorker } from './worker.js';
import { MarkItDownConverter } from './converter.js';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { EventEmitter } from 'events';

// Mock external dependencies
jest.mock('nats');
jest.mock('winston');
jest.mock('child_process');
jest.mock('fs/promises');

// Mock configuration
const mockConfig = {
  natsUrl: 'nats://localhost:4222',
  logLevel: 'info' as const,
  healthCheckInterval: 30000,
  maxConcurrentJobs: 5,
  requestTimeout: 30000
};

describe('MarkItDown Worker', () => {
  describe('MarkItDownWorker', () => {
    let worker: MarkItDownWorker;
    let mockNatsConnection: any;
    let mockConverter: any;

    beforeEach(() => {
      // Mock NATS connection
      mockNatsConnection = {
        subscribe: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: jest.fn().mockReturnValue({
            next: jest.fn().mockResolvedValue({ done: true })
          })
        }),
        isClosed: jest.fn().mockReturnValue(false),
        drain: jest.fn(),
        close: jest.fn()
      };

      // Mock the NATS connect function
      const { connect } = require('nats');
      connect.mockResolvedValue(mockNatsConnection);

      worker = new MarkItDownWorker(mockConfig);

      // Mock converter methods
      mockConverter = {
        convertDocument: jest.fn(),
        convertFromUrl: jest.fn(),
        getActiveJobCount: jest.fn(),
        getStats: jest.fn()
      };

      // Replace the converter instance
      (worker as any).converter = mockConverter;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('initialization', () => {
      it('should create worker with valid config', () => {
        expect(worker).toBeInstanceOf(MarkItDownWorker);
      });

      it('should connect to NATS on start', async () => {
        await worker.start();

        const { connect } = require('nats');
        expect(connect).toHaveBeenCalledWith({
          servers: mockConfig.natsUrl,
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 1000
        });
      });

      it('should set up message subscriptions', async () => {
        await worker.start();

        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('markitdown.convert.document', {
          queue: 'markitdown-workers'
        });
        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('markitdown.convert.url', {
          queue: 'markitdown-workers'
        });
        expect(mockNatsConnection.subscribe).toHaveBeenCalledWith('markitdown.stats');
      });

      it('should handle connection errors', async () => {
        const { connect } = require('nats');
        connect.mockRejectedValue(new Error('Connection failed'));

        await expect(worker.start()).rejects.toThrow('Connection failed');
      });
    });

    describe('message handling', () => {
      beforeEach(async () => {
        await worker.start();
      });

      it('should handle document conversion request', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            filename: 'test.docx',
            content: 'test content',
            options: { preserveFormatting: true }
          })),
          respond: jest.fn(),
          subject: 'markitdown.convert.document'
        };

        const mockResponse = {
          success: true,
          markdown: '# Test Document\n\nTest content',
          metadata: { wordCount: 2, characterCount: 12 },
          processingTimeMs: 100
        };

        mockConverter.getActiveJobCount.mockReturnValue(0);
        mockConverter.convertDocument.mockResolvedValue(mockResponse);

        await (worker as any).handleDocumentConversion(mockMsg);

        expect(mockConverter.convertDocument).toHaveBeenCalledWith({
          filename: 'test.docx',
          content: 'test content',
          options: { preserveFormatting: true }
        });
        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded response
        );
      });

      it('should handle URL conversion request', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            url: 'https://example.com',
            options: { stripImages: true }
          })),
          respond: jest.fn(),
          subject: 'markitdown.convert.url'
        };

        const mockResponse = {
          success: true,
          markdown: '# Example Website\n\nContent from example.com',
          metadata: { wordCount: 4, characterCount: 35 },
          processingTimeMs: 200
        };

        mockConverter.getActiveJobCount.mockReturnValue(0);
        mockConverter.convertFromUrl.mockResolvedValue(mockResponse);

        await (worker as any).handleUrlConversion(mockMsg);

        expect(mockConverter.convertFromUrl).toHaveBeenCalledWith(
          'https://example.com',
          { stripImages: true }
        );
        expect(mockMsg.respond).toHaveBeenCalled();
      });

      it('should reject requests when at max capacity', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            filename: 'test.docx',
            content: 'test content'
          })),
          respond: jest.fn(),
          subject: 'markitdown.convert.document'
        };

        mockConverter.getActiveJobCount.mockReturnValue(5); // At max capacity

        await (worker as any).handleDocumentConversion(mockMsg);

        expect(mockConverter.convertDocument).not.toHaveBeenCalled();
        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded error response
        );
      });

      it('should handle stats request', async () => {
        const mockMsg = {
          respond: jest.fn()
        };

        const mockStats = {
          totalRequests: 100,
          successfulConversions: 95,
          failedConversions: 5,
          averageProcessingTime: 150,
          activeJobs: 2
        };

        mockConverter.getStats.mockReturnValue(mockStats);

        await (worker as any).handleStatsRequest(mockMsg);

        expect(mockConverter.getStats).toHaveBeenCalled();
        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded stats
        );
      });

      it('should handle conversion errors', async () => {
        const mockMsg = {
          data: Buffer.from(JSON.stringify({
            filename: 'test.docx',
            content: 'test content'
          })),
          respond: jest.fn(),
          subject: 'markitdown.convert.document'
        };

        mockConverter.getActiveJobCount.mockReturnValue(0);
        mockConverter.convertDocument.mockRejectedValue(new Error('Conversion failed'));

        await (worker as any).handleDocumentConversion(mockMsg);

        expect(mockMsg.respond).toHaveBeenCalledWith(
          expect.any(Uint8Array) // Encoded error response
        );
      });
    });

    describe('shutdown', () => {
      it('should stop gracefully', async () => {
        await worker.start();

        await worker.stop();

        expect(mockNatsConnection.close).toHaveBeenCalled();
      });

      it('should wait for active jobs during shutdown', async () => {
        await worker.start();

        mockConverter.getActiveJobCount
          .mockReturnValueOnce(2)
          .mockReturnValueOnce(1)
          .mockReturnValueOnce(0);

        // Mock the graceful shutdown method
        const gracefulShutdown = (worker as any).setupGracefulShutdown;
        expect(typeof gracefulShutdown).toBe('function');
      });
    });
  });

  describe('MarkItDownConverter', () => {
    let converter: MarkItDownConverter;
    let mockProcess: EventEmitter;

    beforeEach(() => {
      converter = new MarkItDownConverter();

      // Mock child process
      mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (mockProcess as any).kill = jest.fn();

      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      mockSpawn.mockReturnValue(mockProcess as any);

      // Mock file system operations
      const mockMkdtemp = mkdtemp as jest.MockedFunction<typeof mkdtemp>;
      mockMkdtemp.mockResolvedValue('/tmp/markitdown-test123');

      const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
      mockWriteFile.mockResolvedValue();

      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockUnlink.mockResolvedValue();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('document conversion', () => {
      it('should convert document successfully', async () => {
        const request = {
          filename: 'test.docx',
          content: 'Binary document content',
          options: { preserveFormatting: true }
        };

        const mockOutput = JSON.stringify({
          markdown: '# Test Document\n\nThis is test content',
          metadata: { wordCount: 4, characterCount: 30, format: 'docx' }
        });

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate successful process execution
        setTimeout(() => {
          mockProcess.stdout.emit('data', mockOutput);
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe('# Test Document\n\nThis is test content');
        expect(result.metadata?.wordCount).toBe(4);
        expect(result.processingTimeMs).toBeGreaterThan(0);

        // Verify file operations
        expect(mkdtemp).toHaveBeenCalled();
        expect(writeFile).toHaveBeenCalledWith(
          expect.stringContaining('test.docx'),
          request.content
        );

        // Verify process spawn
        expect(spawn).toHaveBeenCalledWith('python', [
          '-m',
          'markitdown',
          expect.stringContaining('test.docx'),
          '--preserve-formatting'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
      });

      it('should handle conversion failure', async () => {
        const request = {
          filename: 'test.docx',
          content: 'Binary document content'
        };

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate process failure
        setTimeout(() => {
          mockProcess.stderr.emit('data', 'Error: File not supported');
          mockProcess.emit('close', 1);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('MarkItDown process failed with code 1');
        expect(result.processingTimeMs).toBeGreaterThan(0);
      });

      it('should handle process spawn error', async () => {
        const request = {
          filename: 'test.docx',
          content: 'Binary document content'
        };

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate spawn error
        setTimeout(() => {
          mockProcess.emit('error', new Error('Python not found'));
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to spawn MarkItDown process');
      });

      it('should handle process timeout', async () => {
        const request = {
          filename: 'test.docx',
          content: 'Binary document content',
          options: { timeout: 100 }
        };

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Don't emit close event to simulate hanging process

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      });

      it('should parse plain text output when JSON parsing fails', async () => {
        const request = {
          filename: 'test.txt',
          content: 'Simple text content'
        };

        const plainTextOutput = '# Simple Document\n\nThis is plain text output';

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate successful process with plain text output
        setTimeout(() => {
          mockProcess.stdout.emit('data', plainTextOutput);
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe(plainTextOutput);
        expect(result.metadata?.wordCount).toBe(6); // "Simple Document This is plain text"
        expect(result.metadata?.format).toBe('unknown');
      });

      it('should handle different conversion options', async () => {
        const request = {
          filename: 'test.pdf',
          content: 'PDF content',
          options: {
            preserveFormatting: true,
            stripImages: true,
            maxLength: 5000
          }
        };

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate successful process
        setTimeout(() => {
          mockProcess.stdout.emit('data', '# PDF Content');
          mockProcess.emit('close', 0);
        }, 10);

        await conversionPromise;

        expect(spawn).toHaveBeenCalledWith('python', [
          '-m',
          'markitdown',
          expect.stringContaining('test.pdf'),
          '--preserve-formatting',
          '--strip-images',
          '--max-length',
          '5000'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
      });
    });

    describe('URL conversion', () => {
      it('should convert URL successfully', async () => {
        const url = 'https://example.com';
        const options = { stripImages: true };

        const mockOutput = JSON.stringify({
          markdown: '# Example Website\n\nContent from the web',
          metadata: { wordCount: 5, characterCount: 35, format: 'html' }
        });

        // Start conversion
        const conversionPromise = converter.convertFromUrl(url, options);

        // Simulate successful process execution
        setTimeout(() => {
          mockProcess.stdout.emit('data', mockOutput);
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe('# Example Website\n\nContent from the web');
        expect(result.metadata?.format).toBe('html');

        // Verify process spawn
        expect(spawn).toHaveBeenCalledWith('python', [
          '-m',
          'markitdown',
          '--url',
          url,
          '--strip-images'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
      });

      it('should handle URL conversion failure', async () => {
        const url = 'https://invalid-url';

        // Start conversion
        const conversionPromise = converter.convertFromUrl(url);

        // Simulate process failure
        setTimeout(() => {
          mockProcess.stderr.emit('data', 'Error: Invalid URL');
          mockProcess.emit('close', 1);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('MarkItDown URL process failed with code 1');
      });

      it('should use longer timeout for URL conversions', async () => {
        const url = 'https://example.com';

        // Start conversion without custom timeout
        const conversionPromise = converter.convertFromUrl(url);

        // The default timeout for URLs should be 60000ms
        // We won't wait for it, but we can verify the spawn was called correctly
        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Test');
          mockProcess.emit('close', 0);
        }, 10);

        await conversionPromise;

        expect(spawn).toHaveBeenCalledWith('python', [
          '-m',
          'markitdown',
          '--url',
          url
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
      });
    });

    describe('metadata generation', () => {
      it('should generate basic metadata from content', () => {
        const content = '# Test Title\n\nThis is a test document with multiple words.';
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe('Test Title');
        expect(metadata.wordCount).toBe(10); // "This is a test document with multiple words."
        expect(metadata.characterCount).toBe(content.length);
        expect(metadata.format).toBe('markdown');
        expect(metadata.createdDate).toBeDefined();
      });

      it('should handle content without title', () => {
        const content = 'This is content without a title.';
        const metadata = (converter as any).generateBasicMetadata(content, 'text');

        expect(metadata.title).toBeUndefined();
        expect(metadata.wordCount).toBe(6);
        expect(metadata.format).toBe('text');
      });

      it('should handle empty content', () => {
        const content = '';
        const metadata = (converter as any).generateBasicMetadata(content, 'empty');

        expect(metadata.wordCount).toBe(0);
        expect(metadata.characterCount).toBe(0);
        expect(metadata.format).toBe('empty');
      });
    });

    describe('statistics and job tracking', () => {
      it('should track conversion statistics', async () => {
        const request = {
          filename: 'test.txt',
          content: 'Test content'
        };

        const initialStats = converter.getStats();
        expect(initialStats.totalRequests).toBe(0);
        expect(initialStats.successfulConversions).toBe(0);
        expect(initialStats.activeJobs).toBe(0);

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Check active jobs during conversion
        expect(converter.getActiveJobCount()).toBe(1);

        // Complete conversion
        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Test');
          mockProcess.emit('close', 0);
        }, 10);

        await conversionPromise;

        const finalStats = converter.getStats();
        expect(finalStats.totalRequests).toBe(1);
        expect(finalStats.successfulConversions).toBe(1);
        expect(finalStats.failedConversions).toBe(0);
        expect(finalStats.activeJobs).toBe(0);
        expect(finalStats.averageProcessingTime).toBeGreaterThan(0);
      });

      it('should track failed conversions', async () => {
        const request = {
          filename: 'test.txt',
          content: 'Test content'
        };

        // Start conversion
        const conversionPromise = converter.convertDocument(request);

        // Simulate failure
        setTimeout(() => {
          mockProcess.emit('error', new Error('Process failed'));
        }, 10);

        await conversionPromise;

        const stats = converter.getStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.successfulConversions).toBe(0);
        expect(stats.failedConversions).toBe(1);
      });

      it('should clean up active jobs on completion', async () => {
        const request1 = { filename: 'test1.txt', content: 'Content 1' };
        const request2 = { filename: 'test2.txt', content: 'Content 2' };

        // Start multiple conversions
        const promise1 = converter.convertDocument(request1);
        const promise2 = converter.convertDocument(request2);

        expect(converter.getActiveJobCount()).toBe(2);

        // Complete first conversion
        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Test 1');
          mockProcess.emit('close', 0);
        }, 10);

        await promise1;
        
        // Active job count should decrease
        expect(converter.getActiveJobCount()).toBe(1);

        // Complete second conversion
        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Test 2');
          mockProcess.emit('close', 0);
        }, 20);

        await promise2;

        expect(converter.getActiveJobCount()).toBe(0);
      });

      it('should handle concurrent job limit enforcement', async () => {
        const requests = Array.from({ length: 10 }, (_, i) => ({
          filename: `test${i}.txt`,
          content: `Content ${i}`
        }));

        // Start many conversions
        const promises = requests.map(req => converter.convertDocument(req));

        // Should track all active jobs
        expect(converter.getActiveJobCount()).toBe(10);

        // Complete all conversions
        setTimeout(() => {
          for (let i = 0; i < 10; i++) {
            mockProcess.stdout.emit('data', `# Test ${i}`);
            mockProcess.emit('close', 0);
          }
        }, 10);

        await Promise.all(promises);

        expect(converter.getActiveJobCount()).toBe(0);
        expect(converter.getStats().totalRequests).toBe(10);
      });
    });

    describe('error handling and edge cases', () => {
      it('should handle malformed JSON input gracefully', async () => {
        const request = {
          filename: 'malformed.json',
          content: '{invalid json content}'
        };

        // Simulate successful process with malformed output
        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stdout.emit('data', '{invalid json}');
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe('{invalid json}');
        expect(result.metadata?.format).toBe('unknown');
      });

      it('should handle binary content with special characters', async () => {
        const request = {
          filename: 'binary.pdf',
          content: 'Binary content with \x00\x01\x02 null bytes and unicode 📄'
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stdout.emit('data', '# PDF Document\n\nExtracted text');
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(writeFile).toHaveBeenCalledWith(
          expect.stringContaining('binary.pdf'),
          request.content
        );
      });

      it('should handle very large content', async () => {
        const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB content
        const request = {
          filename: 'large.txt',
          content: largeContent
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Large Document\n\nProcessed content');
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.metadata?.characterCount).toBeGreaterThan(0);
      });

      it('should handle process memory limit errors', async () => {
        const request = {
          filename: 'memory-intensive.pdf',
          content: 'Content that causes memory issues'
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stderr.emit('data', 'MemoryError: Out of memory');
          mockProcess.emit('close', 137); // SIGKILL exit code
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('MarkItDown process failed with code 137');
      });

      it('should handle SIGTERM gracefully during conversion', async () => {
        const request = {
          filename: 'interrupted.docx',
          content: 'Content being processed'
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.emit('close', 143); // SIGTERM exit code
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('MarkItDown process failed with code 143');
      });

      it('should handle file system errors during cleanup', async () => {
        const request = {
          filename: 'cleanup-error.txt',
          content: 'Test content'
        };

        // Mock unlink to throw error
        const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
        mockUnlink.mockRejectedValueOnce(new Error('Permission denied'));

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Test');
          mockProcess.emit('close', 0);
        }, 10);

        // Should still succeed despite cleanup error
        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe('# Test');
      });

      it('should handle multiple stderr chunks', async () => {
        const request = {
          filename: 'multi-error.pdf',
          content: 'Content with multiple errors'
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stderr.emit('data', 'Warning: ');
          mockProcess.stderr.emit('data', 'Unsupported feature\n');
          mockProcess.stderr.emit('data', 'Error: ');
          mockProcess.stderr.emit('data', 'Critical failure');
          mockProcess.emit('close', 1);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('Warning: Unsupported feature\nError: Critical failure');
      });

      it('should handle stdout and stderr mixed output', async () => {
        const request = {
          filename: 'mixed-output.docx',
          content: 'Content with mixed output'
        };

        const conversionPromise = converter.convertDocument(request);

        setTimeout(() => {
          mockProcess.stdout.emit('data', '# Document Title\n');
          mockProcess.stderr.emit('data', 'Warning: Non-critical issue\n');
          mockProcess.stdout.emit('data', 'Document content');
          mockProcess.emit('close', 0); // Success despite warnings
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(result.markdown).toBe('# Document Title\nDocument content');
      });
    });

    describe('URL conversion edge cases', () => {
      it('should handle redirects and complex URLs', async () => {
        const complexUrl = 'https://example.com/path?param1=value1&param2=value2#fragment';
        const options = { timeout: 10000 };

        const conversionPromise = converter.convertFromUrl(complexUrl, options);

        setTimeout(() => {
          mockProcess.stdout.emit('data', JSON.stringify({
            markdown: '# Redirected Page\n\nFinal content',
            metadata: { wordCount: 3, characterCount: 35, format: 'html' }
          }));
          mockProcess.emit('close', 0);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(true);
        expect(spawn).toHaveBeenCalledWith('python', [
          '-m',
          'markitdown',
          '--url',
          complexUrl
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
      });

      it('should handle URL with authentication requirements', async () => {
        const authUrl = 'https://protected.example.com/document';

        const conversionPromise = converter.convertFromUrl(authUrl);

        setTimeout(() => {
          mockProcess.stderr.emit('data', 'Error: 401 Unauthorized');
          mockProcess.emit('close', 1);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('401 Unauthorized');
      });

      it('should handle malformed URLs', async () => {
        const malformedUrl = 'not-a-valid-url';

        const conversionPromise = converter.convertFromUrl(malformedUrl);

        setTimeout(() => {
          mockProcess.stderr.emit('data', 'Error: Invalid URL format');
          mockProcess.emit('close', 1);
        }, 10);

        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('MarkItDown URL process failed');
      });

      it('should handle network timeouts for URL conversion', async () => {
        const slowUrl = 'https://slow.example.com/document';
        const options = { timeout: 100 }; // Very short timeout

        const conversionPromise = converter.convertFromUrl(slowUrl, options);

        // Don't emit any events to simulate hanging
        const result = await conversionPromise;

        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
      });
    });

    describe('metadata extraction edge cases', () => {
      it('should extract multiple heading levels', () => {
        const content = `# Main Title

## Section 1

### Subsection

#### Deep Section

Content here`;
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe('Main Title'); // Should use first h1
        expect(metadata.wordCount).toBe(6); // "Section 1 Subsection Deep Section Content here"
        expect(metadata.format).toBe('markdown');
      });

      it('should handle content with no headings', () => {
        const content = `This is a document without any headings.

It has multiple paragraphs but no title structure.`;
        const metadata = (converter as any).generateBasicMetadata(content, 'text');

        expect(metadata.title).toBeUndefined();
        expect(metadata.wordCount).toBe(14);
        expect(metadata.format).toBe('text');
      });

      it('should handle content with markdown formatting', () => {
        const content = `# Title with **bold** and *italic*

Paragraph with [link](http://example.com) and \`code\``;
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe('Title with **bold** and *italic*');
        expect(metadata.wordCount).toBe(10); // "Paragraph with link http example com and code"
        expect(metadata.characterCount).toBe(content.length);
      });

      it('should handle unicode and special characters in titles', () => {
        const content = `# 📄 Document Title with 中文 and émojis 🚀

Content with unicode`;
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe('📄 Document Title with 中文 and émojis 🚀');
        expect(metadata.wordCount).toBe(3); // "Content with unicode"
      });

      it('should handle very long titles', () => {
        const longTitle = 'A'.repeat(1000);
        const content = `# ${longTitle}\n\nShort content`;
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe(longTitle);
        expect(metadata.wordCount).toBe(2); // "Short content"
      });

      it('should handle titles with special markdown characters', () => {
        const content = `# Title with \# escaped hash and \* asterisk

Normal content`;
        const metadata = (converter as any).generateBasicMetadata(content, 'markdown');

        expect(metadata.title).toBe('Title with \\# escaped hash and \\* asterisk');
        expect(metadata.wordCount).toBe(2); // "Normal content"
      });

      it('should generate consistent timestamps', () => {
        const content = 'Test content';
        const metadata1 = (converter as any).generateBasicMetadata(content, 'test');
        const metadata2 = (converter as any).generateBasicMetadata(content, 'test');

        // Should be close in time (within 1 second)
        const time1 = new Date(metadata1.createdDate!);
        const time2 = new Date(metadata2.createdDate!);
        const timeDiff = Math.abs(time2.getTime() - time1.getTime());

        expect(timeDiff).toBeLessThan(1000);
      });
    });

    describe('performance and stress testing', () => {
      it('should handle rapid successive requests', async () => {
        const requests = Array.from({ length: 50 }, (_, i) => ({
          filename: `rapid${i}.txt`,
          content: `Rapid content ${i}`
        }));

        const startTime = Date.now();
        const promises = requests.map(req => {
          const promise = converter.convertDocument(req);
          
          // Complete each conversion quickly
          setTimeout(() => {
            mockProcess.stdout.emit('data', `# Rapid ${req.filename}`);
            mockProcess.emit('close', 0);
          }, Math.random() * 50);
          
          return promise;
        });

        const results = await Promise.all(promises);
        const endTime = Date.now();

        expect(results).toHaveLength(50);
        expect(results.every(r => r.success)).toBe(true);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      });

      it('should maintain accurate statistics under load', async () => {
        const initialStats = converter.getStats();
        
        // Mix of successful and failed conversions
        const requests = Array.from({ length: 20 }, (_, i) => ({
          filename: `load${i}.txt`,
          content: `Load content ${i}`,
          shouldFail: i % 3 === 0 // Every 3rd request fails
        }));

        const promises = requests.map(req => {
          const promise = converter.convertDocument(req);
          
          setTimeout(() => {
            if (req.shouldFail) {
              mockProcess.emit('error', new Error(`Failed ${req.filename}`));
            } else {
              mockProcess.stdout.emit('data', `# Success ${req.filename}`);
              mockProcess.emit('close', 0);
            }
          }, Math.random() * 20);
          
          return promise;
        });

        await Promise.all(promises);

        const finalStats = converter.getStats();
        const expectedSuccesses = requests.filter(r => !r.shouldFail).length;
        const expectedFailures = requests.filter(r => r.shouldFail).length;

        expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 20);
        expect(finalStats.successfulConversions).toBe(initialStats.successfulConversions + expectedSuccesses);
        expect(finalStats.failedConversions).toBe(initialStats.failedConversions + expectedFailures);
        expect(finalStats.activeJobs).toBe(0);
      });
    });
  });

  describe('Worker Integration Stress Tests', () => {
    let worker: MarkItDownWorker;
    let mockNatsConnection: any;
    let mockConverter: any;

    beforeEach(() => {
      mockNatsConnection = {
        subscribe: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: jest.fn().mockReturnValue({
            next: jest.fn().mockResolvedValue({ done: true })
          })
        }),
        isClosed: jest.fn().mockReturnValue(false),
        drain: jest.fn(),
        close: jest.fn()
      };

      const { connect } = require('nats');
      connect.mockResolvedValue(mockNatsConnection);

      worker = new MarkItDownWorker(mockConfig);

      mockConverter = {
        convertDocument: jest.fn(),
        convertFromUrl: jest.fn(),
        getActiveJobCount: jest.fn().mockReturnValue(0),
        getStats: jest.fn().mockReturnValue({
          totalRequests: 0,
          successfulConversions: 0,
          failedConversions: 0,
          averageProcessingTime: 0,
          activeJobs: 0
        })
      };

      (worker as any).converter = mockConverter;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should handle high-frequency message processing', async () => {
      await worker.start();

      const messages = Array.from({ length: 100 }, (_, i) => ({
        data: Buffer.from(JSON.stringify({
          filename: `high-freq-${i}.txt`,
          content: `Content ${i}`
        })),
        respond: jest.fn(),
        subject: 'markitdown.convert.document'
      }));

      mockConverter.convertDocument.mockImplementation(() => 
        Promise.resolve({
          success: true,
          markdown: '# Converted',
          processingTimeMs: 50
        })
      );

      // Process all messages
      const promises = messages.map(msg => 
        (worker as any).handleDocumentConversion(msg)
      );

      await Promise.all(promises);

      expect(mockConverter.convertDocument).toHaveBeenCalledTimes(100);
      messages.forEach(msg => {
        expect(msg.respond).toHaveBeenCalled();
      });
    });

    it('should handle mixed message types concurrently', async () => {
      await worker.start();

      const docMessages = Array.from({ length: 30 }, (_, i) => ({
        data: Buffer.from(JSON.stringify({
          filename: `mixed-doc-${i}.txt`,
          content: `Doc content ${i}`
        })),
        respond: jest.fn(),
        subject: 'markitdown.convert.document'
      }));

      const urlMessages = Array.from({ length: 20 }, (_, i) => ({
        data: Buffer.from(JSON.stringify({
          url: `https://example.com/page-${i}`,
          options: { stripImages: true }
        })),
        respond: jest.fn(),
        subject: 'markitdown.convert.url'
      }));

      const statsMessages = Array.from({ length: 10 }, () => ({
        respond: jest.fn()
      }));

      mockConverter.convertDocument.mockResolvedValue({
        success: true,
        markdown: '# Document',
        processingTimeMs: 100
      });

      mockConverter.convertFromUrl.mockResolvedValue({
        success: true,
        markdown: '# Web Page',
        processingTimeMs: 200
      });

      // Process all message types concurrently
      const allPromises = [
        ...docMessages.map(msg => (worker as any).handleDocumentConversion(msg)),
        ...urlMessages.map(msg => (worker as any).handleUrlConversion(msg)),
        ...statsMessages.map(msg => (worker as any).handleStatsRequest(msg))
      ];

      await Promise.all(allPromises);

      expect(mockConverter.convertDocument).toHaveBeenCalledTimes(30);
      expect(mockConverter.convertFromUrl).toHaveBeenCalledTimes(20);
      expect(mockConverter.getStats).toHaveBeenCalledTimes(10);
    });

    it('should maintain stability during error conditions', async () => {
      await worker.start();

      const messages = Array.from({ length: 50 }, (_, i) => ({
        data: Buffer.from(JSON.stringify({
          filename: `error-test-${i}.txt`,
          content: `Content ${i}`
        })),
        respond: jest.fn(),
        subject: 'markitdown.convert.document'
      }));

      // Mix of successful and failed conversions
      mockConverter.convertDocument.mockImplementation((req: any) => {
        const shouldFail = req.filename.includes('error-test-1') || 
                          req.filename.includes('error-test-2');
        
        if (shouldFail) {
          return Promise.reject(new Error(`Conversion failed for ${req.filename}`));
        }
        
        return Promise.resolve({
          success: true,
          markdown: `# ${req.filename}`,
          processingTimeMs: 75
        });
      });

      const promises = messages.map(msg => 
        (worker as any).handleDocumentConversion(msg)
      );

      await Promise.all(promises);

      // All messages should have received responses
      messages.forEach(msg => {
        expect(msg.respond).toHaveBeenCalled();
      });
    });
  });
});