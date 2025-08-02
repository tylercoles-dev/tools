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

export interface WikiAttachment {
  id: string;
  page_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  thumbnail_path: string | null;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
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

// Attachment schemas
export const AttachmentUploadSchema = z.object({
  page_id: z.number().int().positive(),
  description: z.string().optional(),
  uploaded_by: z.string().optional()
});

export const AttachmentUpdateSchema = z.object({
  description: z.string().optional(),
  original_name: z.string().min(1).max(255).optional()
});

// Attachment configuration
export const AttachmentConfigSchema = z.object({
  maxFileSize: z.number().positive().default(50 * 1024 * 1024), // 50MB
  maxFilesPerPage: z.number().positive().default(100),
  allowedMimeTypes: z.array(z.string()).default([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown', 'application/zip'
  ]),
  generateThumbnails: z.boolean().default(true),
  thumbnailSize: z.number().positive().default(200),
  storageQuotaPerPage: z.number().positive().default(500 * 1024 * 1024) // 500MB
});

// Input types
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type AttachmentUploadInput = z.infer<typeof AttachmentUploadSchema>;
export type AttachmentUpdateInput = z.infer<typeof AttachmentUpdateSchema>;
export type AttachmentConfig = z.infer<typeof AttachmentConfigSchema>;

// Response types
export interface WikiPageWithDetails extends WikiPage {
  category?: WikiCategory;
  tags: WikiTag[];
  attachments?: WikiAttachment[];
  html_content: string;
  table_of_contents: Array<{
    level: number;
    title: string;
    anchor: string;
  }>;
}

export interface AttachmentUploadResult {
  attachment: WikiAttachment;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface AttachmentStorageInfo {
  totalSize: number;
  totalFiles: number;
  quotaUsed: number;
  quotaLimit: number;
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

export class AttachmentError extends WikiError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, code, statusCode);
    this.name = 'AttachmentError';
  }
}

export class AttachmentNotFoundError extends AttachmentError {
  constructor(id: string) {
    super(`Attachment with id ${id} not found`, 'ATTACHMENT_NOT_FOUND', 404);
  }
}

export class AttachmentTooLargeError extends AttachmentError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      'FILE_TOO_LARGE',
      413
    );
  }
}

export class InvalidFileTypeError extends AttachmentError {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      'INVALID_FILE_TYPE',
      400
    );
  }
}

export class StorageQuotaExceededError extends AttachmentError {
  constructor(quotaUsed: number, quotaLimit: number) {
    super(
      `Storage quota exceeded. Used: ${quotaUsed} bytes, Limit: ${quotaLimit} bytes`,
      'QUOTA_EXCEEDED',
      413
    );
  }
}