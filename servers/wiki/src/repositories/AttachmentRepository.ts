/**
 * Attachment Repository
 * Handles database operations for wiki attachments
 */

import { Kysely } from 'kysely';
import {
  WikiAttachment,
  AttachmentNotFoundError,
  AttachmentUploadInput,
  AttachmentUpdateInput
} from '@mcp-tools/core';
import type { Database } from '../database/index.js';

export interface CreateAttachmentData {
  id: string;
  page_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  thumbnail_path?: string;
  description?: string;
  uploaded_by?: string;
}

export class AttachmentRepository {
  constructor(private db: Kysely<Database>) {}

  /**
   * Create a new attachment record
   */
  async create(data: CreateAttachmentData): Promise<WikiAttachment> {
    const result = await this.db
      .insertInto('wiki_attachments')
      .values({
        id: data.id,
        page_id: data.page_id,
        filename: data.filename,
        original_name: data.original_name,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        storage_path: data.storage_path,
        thumbnail_path: data.thumbnail_path || null,
        description: data.description || null,
        uploaded_by: data.uploaded_by || null
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapRowToAttachment(result);
  }

  /**
   * Get attachment by ID
   */
  async findById(id: string): Promise<WikiAttachment | null> {
    const result = await this.db
      .selectFrom('wiki_attachments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? this.mapRowToAttachment(result) : null;
  }

  /**
   * Get all attachments for a page
   */
  async findByPageId(pageId: number): Promise<WikiAttachment[]> {
    const results = await this.db
      .selectFrom('wiki_attachments')
      .selectAll()
      .where('page_id', '=', pageId)
      .orderBy('uploaded_at', 'desc')
      .execute();

    return results.map(row => this.mapRowToAttachment(row));
  }

  /**
   * Update attachment metadata
   */
  async update(id: string, data: AttachmentUpdateInput): Promise<WikiAttachment> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AttachmentNotFoundError(id);
    }

    const updates: Partial<{
      description: string | null;
      original_name: string;
    }> = {};

    if (data.description !== undefined) {
      updates.description = data.description;
    }

    if (data.original_name !== undefined) {
      updates.original_name = data.original_name;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const result = await this.db
      .updateTable('wiki_attachments')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapRowToAttachment(result);
  }

  /**
   * Delete attachment record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('wiki_attachments')
      .where('id', '=', id)
      .execute();

    return result.length > 0 && Number(result[0].numDeletedRows) > 0;
  }

  /**
   * Get attachments by MIME type
   */
  async findByMimeType(mimeType: string): Promise<WikiAttachment[]> {
    const results = await this.db
      .selectFrom('wiki_attachments')
      .selectAll()
      .where('mime_type', '=', mimeType)
      .orderBy('uploaded_at', 'desc')
      .execute();

    return results.map(row => this.mapRowToAttachment(row));
  }

  /**
   * Search attachments by filename or description
   */
  async search(query: string, pageId?: number): Promise<WikiAttachment[]> {
    let queryBuilder = this.db
      .selectFrom('wiki_attachments')
      .selectAll()
      .where((eb) => eb.or([
        eb('original_name', 'like', `%${query}%`),
        eb('description', 'like', `%${query}%`)
      ]));

    if (pageId) {
      queryBuilder = queryBuilder.where('page_id', '=', pageId);
    }

    const results = await queryBuilder
      .orderBy('uploaded_at', 'desc')
      .execute();

    return results.map(row => this.mapRowToAttachment(row));
  }

  /**
   * Get storage statistics for a page
   */
  async getPageStorageStats(pageId: number): Promise<{
    totalSize: number;
    totalFiles: number;
    attachments: WikiAttachment[];
  }> {
    const attachments = await this.findByPageId(pageId);
    const totalSize = attachments.reduce((sum, att) => sum + att.size_bytes, 0);
    
    return {
      totalSize,
      totalFiles: attachments.length,
      attachments
    };
  }

  /**
   * Get all orphaned attachments (for cleanup)
   */
  async findOrphaned(): Promise<WikiAttachment[]> {
    const results = await this.db
      .selectFrom('wiki_attachments as a')
      .selectAll('a')
      .leftJoin('pages as p', 'a.page_id', 'p.id')
      .where('p.id', 'is', null)
      .execute();

    return results.map(row => this.mapRowToAttachment(row));
  }

  /**
   * Bulk delete attachments by page ID
   */
  async deleteByPageId(pageId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('wiki_attachments')
      .where('page_id', '=', pageId)
      .execute();

    return result.length > 0 ? Number(result[0].numDeletedRows) : 0;
  }

  /**
   * Count attachments by page
   */
  async countByPageId(pageId: number): Promise<number> {
    const result = await this.db
      .selectFrom('wiki_attachments')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('page_id', '=', pageId)
      .executeTakeFirstOrThrow();

    return Number(result.count);
  }

  private mapRowToAttachment(row: any): WikiAttachment {
    return {
      id: row.id,
      page_id: row.page_id,
      filename: row.filename,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      storage_path: row.storage_path,
      thumbnail_path: row.thumbnail_path,
      description: row.description,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at
    };
  }
}