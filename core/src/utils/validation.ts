/**
 * Validation Utilities
 */

import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.issues);
  }
  
  return result.data;
}