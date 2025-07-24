/**
 * MarkItDown Worker Types
 */

// Request/Response types for NATS messages
export interface ConvertDocumentRequest {
  content: string;
  contentType?: string;
  filename?: string;
  options?: {
    preserveFormatting?: boolean;
    includeMetadata?: boolean;
    stripImages?: boolean;
    maxLength?: number;
  };
}

export interface ConvertDocumentResponse {
  success: boolean;
  markdown?: string;
  metadata?: DocumentMetadata;
  error?: string;
  processingTimeMs: number;
}

export interface ConvertUrlRequest {
  url: string;
  options?: {
    preserveFormatting?: boolean;
    includeMetadata?: boolean;
    stripImages?: boolean;
    maxLength?: number;
    timeout?: number;
  };
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdDate?: string;
  modifiedDate?: string;
  wordCount: number;
  characterCount: number;
  pages?: number;
  format: string;
}

export interface WorkerStats {
  totalRequests: number;
  successfulConversions: number;
  failedConversions: number;
  averageProcessingTime: number;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface WorkerConfig {
  natsUrl: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxConcurrentJobs: number;
  requestTimeout: number;
  healthCheckInterval: number;
}