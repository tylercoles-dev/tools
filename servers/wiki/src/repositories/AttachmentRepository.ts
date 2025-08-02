/**
 * Attachment Repository
 * Handles database operations for wiki attachments
 */

import { Database } from 'sqlite3';
import {
  WikiAttachment,
  AttachmentNotFoundError,
  AttachmentUploadInput,
  AttachmentUpdateInput
} from '@mcp-tools/core';

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
  constructor(private db: Database) {}

  /**
   * Create a new attachment record
   */
  async create(data: CreateAttachmentData): Promise<WikiAttachment> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO wiki_attachments (
          id, page_id, filename, original_name, mime_type, size_bytes,
          storage_path, thumbnail_path, description, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        data.id,
        data.page_id,
        data.filename,
        data.original_name,
        data.mime_type,
        data.size_bytes,
        data.storage_path,
        data.thumbnail_path || null,
        data.description || null,
        data.uploaded_by || null
      ], function (err) {
        if (err) {
          reject(err);
          return;
        }

        // Fetch the created attachment
        stmt.finalize();
        resolve(data as WikiAttachment);
      });
    });
  }

  /**
   * Get attachment by ID
   */
  async findById(id: string): Promise<WikiAttachment | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM wiki_attachments WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? this.mapRowToAttachment(row) : null);
        }
      );
    });
  }

  /**
   * Get all attachments for a page
   */
  async findByPageId(pageId: number): Promise<WikiAttachment[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM wiki_attachments WHERE page_id = ? ORDER BY uploaded_at DESC',
        [pageId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.mapRowToAttachment(row)));
        }
      );
    });
  }

  /**
   * Update attachment metadata
   */
  async update(id: string, data: AttachmentUpdateInput): Promise<WikiAttachment> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AttachmentNotFoundError(id);
    }

    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
      }

      if (data.original_name !== undefined) {
        fields.push('original_name = ?');
        values.push(data.original_name);
      }

      if (fields.length === 0) {
        resolve(existing);
        return;
      }

      values.push(id);

      this.db.run(
        `UPDATE wiki_attachments SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Fetch updated attachment
          this.findById(id).then(resolve).catch(reject);
        }
      );
    });
  }

  /**
   * Delete attachment record
   */
  async delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM wiki_attachments WHERE id = ?',
        [id],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get attachments by MIME type
   */
  async findByMimeType(mimeType: string): Promise<WikiAttachment[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM wiki_attachments WHERE mime_type = ? ORDER BY uploaded_at DESC',
        [mimeType],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.mapRowToAttachment(row)));
        }
      );
    });
  }

  /**
   * Search attachments by filename or description
   */
  async search(query: string, pageId?: number): Promise<WikiAttachment[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM wiki_attachments 
        WHERE (original_name LIKE ? OR description LIKE ?)
      `;
      const params: any[] = [`%${query}%`, `%${query}%`];

      if (pageId) {
        sql += ' AND page_id = ?';
        params.push(pageId);
      }

      sql += ' ORDER BY uploaded_at DESC';

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(row => this.mapRowToAttachment(row)));
      });
    });
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
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT a.* FROM wiki_attachments a 
         LEFT JOIN pages p ON a.page_id = p.id 
         WHERE p.id IS NULL`,
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows.map(row => this.mapRowToAttachment(row)));
        }
      );
    });
  }

  /**
   * Bulk delete attachments by page ID
   */
  async deleteByPageId(pageId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM wiki_attachments WHERE page_id = ?',
        [pageId],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  /**
   * Count attachments by page
   */
  async countByPageId(pageId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM wiki_attachments WHERE page_id = ?',
        [pageId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row.count);
        }
      );
    });
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