import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validate request body, query, or params against a Zod schema
 */
export function validateRequest(
  schema: z.ZodSchema<any>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errorMessages
        });
      }
      
      // Handle other validation errors
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data'
      });
    }
  };
}

/**
 * Validate multiple parts of the request
 */
export function validateMultiple(validations: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: any[] = [];
      
      // Validate body
      if (validations.body) {
        try {
          req.body = validations.body.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              location: 'body',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      // Validate query
      if (validations.query) {
        try {
          req.query = validations.query.parse(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              location: 'query',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      // Validate params
      if (validations.params) {
        try {
          req.params = validations.params.parse(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => ({
              location: 'params',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        });
      }
      
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data'
      });
    }
  };
}

/**
 * Optional validation - doesn't fail if data is missing
 */
export function validateOptional(
  schema: z.ZodSchema<any>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      
      // Skip validation if no data
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return next();
      }
      
      const validated = schema.parse(data);
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errorMessages
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data'
      });
    }
  };
}

export default validateRequest;