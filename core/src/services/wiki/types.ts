/**
 * Wiki Types and Schemas
 */

import { z } from 'zod';

// Database entity interfaces
export interface WikiPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  category_id: number | null;
  author_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface WikiCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface WikiTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// Input schemas
export const CreatePageSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category_id: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(true)
});

export const UpdatePageSchema = CreatePageSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b')
});

// Input types
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// Response types
export interface WikiPageWithDetails extends WikiPage {
  category?: WikiCategory;
  tags: WikiTag[];
  html_content: string;
  table_of_contents: Array<{
    level: number;
    title: string;
    anchor: string;
  }>;
}

// Error types
export class WikiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'WikiError';
  }
}

export class WikiPageNotFoundError extends WikiError {
  constructor(id: number | string) {
    super(`Wiki page with id ${id} not found`, 'NOT_FOUND', 404);
  }
}