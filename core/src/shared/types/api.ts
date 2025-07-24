/**
 * Shared API types for consistent request/response patterns
 */

import { z } from 'zod';

// Standard API response wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean().describe('Whether the request was successful'),
  data: z.any().optional().describe('Response data if successful'),
  error: z.string().optional().describe('Error message if failed'),
  message: z.string().optional().describe('Human-readable status message'),
  timestamp: z.number().describe('Response timestamp in milliseconds'),
  requestId: z.string().optional().describe('Request tracking ID'),
});

export type ApiResponse<T = any> = Omit<z.infer<typeof ApiResponseSchema>, 'data'> & {
  data?: T;
};

// Pagination metadata
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1).describe('Current page number'),
  limit: z.number().min(1).max(100).default(20).describe('Items per page'),
  totalPages: z.number().describe('Total number of pages'),
  totalItems: z.number().describe('Total number of items'),
  hasNext: z.boolean().describe('Whether there is a next page'),
  hasPrevious: z.boolean().describe('Whether there is a previous page'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Paginated response wrapper
export const PaginatedResponseSchema = ApiResponseSchema.extend({
  pagination: PaginationSchema.optional().describe('Pagination metadata'),
});

export type PaginatedResponse<T = any> = ApiResponse<T[]> & {
  pagination?: Pagination;
};

// Search/filter parameters
export const SearchParamsSchema = z.object({
  query: z.string().optional().describe('Search query string'),
  filters: z.record(z.any()).optional().describe('Filter parameters'),
  sort: z.string().optional().describe('Sort field'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  page: z.number().min(1).default(1).describe('Page number'),
  limit: z.number().min(1).max(100).default(20).describe('Items per page'),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// Common error types
export const ApiErrorSchema = z.object({
  code: z.string().describe('Machine-readable error code'),
  message: z.string().describe('Human-readable error message'),
  details: z.record(z.any()).optional().describe('Additional error details'),
  field: z.string().optional().describe('Field that caused the error (for validation errors)'),
  timestamp: z.number().describe('Error timestamp'),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Validation error (for form validation, etc.)
export const ApiValidationErrorSchema = z.object({
  field: z.string().describe('Field that failed validation'),
  message: z.string().describe('Validation error message'),
  code: z.string().describe('Validation error code'),
  value: z.any().optional().describe('The invalid value'),
});

export type ApiValidationError = z.infer<typeof ApiValidationErrorSchema>;

// Batch operation request
export const BatchRequestSchema = z.object({
  batchId: z.string().optional().describe('Optional batch identifier'),
  operations: z.array(z.object({
    id: z.string().describe('Operation identifier'),
    operation: z.string().describe('Operation type'),
    data: z.any().describe('Operation data'),
  })).describe('Batch operations to perform'),
  options: z.record(z.any()).optional().describe('Batch processing options'),
});

export type BatchRequest = z.infer<typeof BatchRequestSchema>;

// Batch operation response
export const BatchResponseSchema = z.object({
  batchId: z.string().describe('Batch identifier'),
  totalOperations: z.number().describe('Total number of operations'),
  successfulOperations: z.number().describe('Number of successful operations'),
  failedOperations: z.number().describe('Number of failed operations'),
  results: z.array(z.object({
    id: z.string().describe('Operation identifier'),
    success: z.boolean().describe('Whether operation succeeded'),
    data: z.any().optional().describe('Operation result data'),
    error: z.string().optional().describe('Error message if failed'),
  })).describe('Individual operation results'),
  processingTimeMs: z.number().describe('Total processing time'),
});

export type BatchResponse = z.infer<typeof BatchResponseSchema>;

// Status/health check response
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('Service health status'),
  uptime: z.number().describe('Service uptime in milliseconds'),
  version: z.string().describe('Service version'),
  timestamp: z.number().describe('Health check timestamp'),
  dependencies: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('Dependency status'),
    responseTime: z.number().optional().describe('Dependency response time'),
    lastCheck: z.number().describe('Last dependency check timestamp'),
  })).optional().describe('Status of service dependencies'),
  details: z.record(z.any()).optional().describe('Additional health details'),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// Standard HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Standard error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;