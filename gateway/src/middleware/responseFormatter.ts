/**
 * Response Formatter Middleware
 * 
 * Adds consistent response formatting methods to Express response object.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface FormattedResponse extends Response {
  success: (data: any, meta?: any) => void;
  error: (code: string, message: string, details?: any, statusCode?: number) => void;
  paginated: (data: any[], pagination: any, meta?: any) => void;
}

export function responseFormatter(req: Request, res: FormattedResponse, next: NextFunction): void {
  const requestId = uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Success response formatter
  res.success = function(data: any, meta: any = {}) {
    const response = {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        ...meta
      }
    };
    
    this.json(response);
  };
  
  // Error response formatter
  res.error = function(code: string, message: string, details: any = null, statusCode: number = 400) {
    const response = {
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    this.status(statusCode).json(response);
  };
  
  // Paginated response formatter
  res.paginated = function(data: any[], pagination: any, meta: any = {}) {
    const response = {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || data.length,
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        ...meta
      }
    };
    
    this.json(response);
  };
  
  next();
}