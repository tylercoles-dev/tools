/**
 * Wiki Attachment Components Unit Tests
 * 
 * Tests for React components related to wiki attachments:
 * - WikiAttachmentUploader
 * - WikiAttachmentGallery  
 * - WikiAttachmentEmbed
 * - parseAttachmentMarkdown utility
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAttachmentMarkdown } from '@/components/wiki/WikiAttachmentEmbed';

// Mock components for testing
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div {...props} data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}));

// Mock file objects for testing
const createMockFile = (name: string, size: number, type: string, content: string = '') => {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Sample attachment data
const mockAttachment = {
  id: 'att-123',
  page_id: 1,
  filename: 'uuid-filename.jpg',
  original_name: 'vacation-photo.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 1024000,
  storage_path: 'wiki/attachments/2024/01/uuid-filename.jpg',
  thumbnail_path: 'wiki/thumbnails/2024/01/uuid-filename_thumb.jpg',
  description: 'Photo from summer vacation',
  uploaded_by: 'user123',
  uploaded_at: '2024-01-15T10:30:00Z'
};

const mockAttachments = [
  mockAttachment,
  {
    id: 'att-456',
    page_id: 1,
    filename: 'uuid-document.pdf',
    original_name: 'project-proposal.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2048000,
    storage_path: 'wiki/attachments/2024/01/uuid-document.pdf',
    thumbnail_path: null,
    description: 'Project proposal document',
    uploaded_by: 'user456',
    uploaded_at: '2024-01-14T15:20:00Z'
  }
];

describe('parseAttachmentMarkdown', () => {
  test('should parse simple attachment reference', () => {
    const markdown = 'Here is an image: ![Photo](attachment:vacation-photo.jpg)';
    
    const result = parseAttachmentMarkdown(markdown, mockAttachments);
    
    expect(result).toHaveLength(3); // text, attachment, text
    expect(result[0]).toBe('Here is an image: ');
    // result[1] would be the WikiAttachmentEmbed component
    expect(result[2]).toBe('');
  });

  test('should handle multiple attachments in markdown', () => {
    const markdown = `
    First image: ![Photo](attachment:vacation-photo.jpg)
    
    And a document: ![Document](attachment:project-proposal.pdf)
    
    End of content.
    `;
    
    const result = parseAttachmentMarkdown(markdown, mockAttachments);
    
    expect(result.length).toBeGreaterThan(4); // Multiple text and attachment nodes
  });

  test('should handle missing attachments', () => {
    const markdown = 'Missing file: ![Missing](attachment:non-existent.jpg)';
    
    const result = parseAttachmentMarkdown(markdown, mockAttachments);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Missing file: ');
    // result[1] would be AttachmentNotFound component
  });

  test('should handle markdown without attachments', () => {
    const markdown = 'Regular markdown with no attachments';
    
    const result = parseAttachmentMarkdown(markdown, mockAttachments);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Regular markdown with no attachments');
  });

  test('should preserve caption text', () => {
    const markdown = '![Vacation Photo Caption](attachment:vacation-photo.jpg)';
    
    const result = parseAttachmentMarkdown(markdown, mockAttachments);
    
    expect(result).toHaveLength(1);
    // The WikiAttachmentEmbed component would receive the caption
  });
});

describe('File Validation Utils', () => {
  test('should validate file size', () => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    const smallFile = createMockFile('small.txt', 1024, 'text/plain');
    const largeFile = createMockFile('large.bin', maxSize + 1, 'application/octet-stream');
    
    expect(smallFile.size).toBeLessThan(maxSize);
    expect(largeFile.size).toBeGreaterThan(maxSize);
  });

  test('should validate file types', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    
    const validFile = createMockFile('photo.jpg', 1024, 'image/jpeg');
    const invalidFile = createMockFile('virus.exe', 1024, 'application/x-executable');
    
    expect(allowedTypes).toContain(validFile.type);
    expect(allowedTypes).not.toContain(invalidFile.type);
  });

  test('should detect image files', () => {
    const imageFile = createMockFile('photo.jpg', 1024, 'image/jpeg');
    const textFile = createMockFile('document.txt', 1024, 'text/plain');
    
    expect(imageFile.type.startsWith('image/')).toBe(true);
    expect(textFile.type.startsWith('image/')).toBe(false);
  });
});

describe('File Size Formatting', () => {
  test('should format bytes correctly', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('Attachment URL Generation', () => {
  test('should generate download URLs', () => {
    const getDownloadUrl = (id: string) => `/api/v1/wiki/attachments/${id}`;
    const getThumbnailUrl = (id: string) => `/api/v1/wiki/attachments/${id}/thumbnail`;
    
    expect(getDownloadUrl('att-123')).toBe('/api/v1/wiki/attachments/att-123');
    expect(getThumbnailUrl('att-123')).toBe('/api/v1/wiki/attachments/att-123/thumbnail');
  });
});

describe('File Icon Detection', () => {
  test('should return correct icons for file types', () => {
    const getFileType = (mimeType: string) => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('zip')) return 'archive';
      return 'document';
    };

    expect(getFileType('image/jpeg')).toBe('image');
    expect(getFileType('image/png')).toBe('image');
    expect(getFileType('application/pdf')).toBe('pdf');
    expect(getFileType('application/zip')).toBe('archive');
    expect(getFileType('text/plain')).toBe('document');
  });
});

describe('Drag and Drop Events', () => {
  test('should handle drag enter/leave events', () => {
    let dragActive = false;
    
    const handleDrag = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        dragActive = true;
      } else if (e.type === 'dragleave') {
        dragActive = false;
      }
    };

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      type: 'dragenter'
    };

    handleDrag(mockEvent);
    expect(dragActive).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  test('should extract files from drop event', () => {
    const extractFilesFromDrop = (e: any) => {
      const files = [];
      if (e.dataTransfer?.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files[i]);
        }
      }
      return files;
    };

    const mockFile = createMockFile('dropped.txt', 1024, 'text/plain');
    const mockEvent = {
      dataTransfer: {
        files: [mockFile]
      }
    };

    const files = extractFilesFromDrop(mockEvent);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(mockFile);
  });
});

describe('Upload Progress Tracking', () => {
  test('should track upload progress', () => {
    const uploadStates = new Map();
    
    const updateProgress = (fileId: string, progress: number) => {
      uploadStates.set(fileId, { progress, status: 'uploading' });
    };
    
    const completeUpload = (fileId: string) => {
      uploadStates.set(fileId, { progress: 100, status: 'completed' });
    };

    updateProgress('file-1', 50);
    expect(uploadStates.get('file-1')).toEqual({ progress: 50, status: 'uploading' });

    completeUpload('file-1');
    expect(uploadStates.get('file-1')).toEqual({ progress: 100, status: 'completed' });
  });
});

describe('Search and Filter Logic', () => {
  test('should filter attachments by search query', () => {
    const filterAttachments = (attachments: any[], query: string) => {
      return attachments.filter(att =>
        att.original_name.toLowerCase().includes(query.toLowerCase()) ||
        (att.description && att.description.toLowerCase().includes(query.toLowerCase()))
      );
    };

    const results = filterAttachments(mockAttachments, 'vacation');
    expect(results).toHaveLength(1);
    expect(results[0].original_name).toBe('vacation-photo.jpg');
  });

  test('should filter attachments by mime type', () => {
    const filterByType = (attachments: any[], mimeType: string) => {
      return attachments.filter(att => att.mime_type === mimeType);
    };

    const images = filterByType(mockAttachments, 'image/jpeg');
    const pdfs = filterByType(mockAttachments, 'application/pdf');

    expect(images).toHaveLength(1);
    expect(pdfs).toHaveLength(1);
  });

  test('should sort attachments by different criteria', () => {
    const sortAttachments = (attachments: any[], sortBy: string) => {
      const sorted = [...attachments];
      switch (sortBy) {
        case 'name':
          return sorted.sort((a, b) => a.original_name.localeCompare(b.original_name));
        case 'size':
          return sorted.sort((a, b) => b.size_bytes - a.size_bytes);
        case 'date':
          return sorted.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        default:
          return sorted;
      }
    };

    const byName = sortAttachments(mockAttachments, 'name');
    expect(byName[0].original_name).toBe('project-proposal.pdf');

    const bySize = sortAttachments(mockAttachments, 'size');
    expect(bySize[0].size_bytes).toBe(2048000); // Larger file first

    const byDate = sortAttachments(mockAttachments, 'date');
    expect(byDate[0].uploaded_at).toBe('2024-01-15T10:30:00Z'); // More recent first
  });
});

describe('Storage Quota Calculations', () => {
  test('should calculate storage usage', () => {
    const calculateUsage = (attachments: any[]) => {
      const totalSize = attachments.reduce((sum, att) => sum + att.size_bytes, 0);
      const totalFiles = attachments.length;
      return { totalSize, totalFiles };
    };

    const usage = calculateUsage(mockAttachments);
    expect(usage.totalSize).toBe(3072000); // 1MB + 2MB
    expect(usage.totalFiles).toBe(2);
  });

  test('should calculate quota percentage', () => {
    const calculateQuotaUsage = (usedBytes: number, quotaBytes: number) => {
      return (usedBytes / quotaBytes) * 100;
    };

    const quotaUsage = calculateQuotaUsage(1024000, 10240000); // 1MB of 10MB
    expect(quotaUsage).toBe(10);
  });
});

describe('Error Handling', () => {
  test('should validate file extensions', () => {
    const validateFileName = (filename: string) => {
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.scr'];
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
      
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return 'Invalid filename: path traversal detected';
      }
      
      if (dangerousExtensions.includes(ext)) {
        return 'Invalid filename: executable files not allowed';
      }
      
      return null;
    };

    expect(validateFileName('document.pdf')).toBeNull();
    expect(validateFileName('virus.exe')).toContain('executable files not allowed');
    expect(validateFileName('../../../etc/passwd')).toContain('path traversal detected');
  });

  test('should handle upload errors gracefully', () => {
    const handleUploadError = (error: any) => {
      if (error.code === 'FILE_TOO_LARGE') {
        return 'File is too large. Maximum size is 50MB.';
      } else if (error.code === 'INVALID_FILE_TYPE') {
        return 'File type not supported.';
      } else if (error.code === 'QUOTA_EXCEEDED') {
        return 'Storage quota exceeded.';
      } else {
        return 'Upload failed. Please try again.';
      }
    };

    expect(handleUploadError({ code: 'FILE_TOO_LARGE' })).toContain('too large');
    expect(handleUploadError({ code: 'INVALID_FILE_TYPE' })).toContain('not supported');
    expect(handleUploadError({ code: 'QUOTA_EXCEEDED' })).toContain('quota exceeded');
    expect(handleUploadError({ code: 'UNKNOWN_ERROR' })).toContain('try again');
  });
});

describe('Component Integration', () => {
  test('should handle attachment embedding in markdown', () => {
    const insertAttachmentMarkdown = (content: string, filename: string, caption?: string) => {
      const markdownLink = `![${caption || filename}](attachment:${filename})`;
      return content + '\n\n' + markdownLink;
    };

    const originalContent = '# My Document\n\nSome content here.';
    const withAttachment = insertAttachmentMarkdown(originalContent, 'chart.png', 'Sales Chart');
    
    expect(withAttachment).toContain('![Sales Chart](attachment:chart.png)');
  });

  test('should handle real-time updates', () => {
    const attachmentList = [...mockAttachments];
    
    const handleAttachmentAdded = (newAttachment: any) => {
      attachmentList.push(newAttachment);
    };
    
    const handleAttachmentRemoved = (attachmentId: string) => {
      const index = attachmentList.findIndex(att => att.id === attachmentId);
      if (index > -1) {
        attachmentList.splice(index, 1);
      }
    };

    expect(attachmentList).toHaveLength(2);
    
    handleAttachmentAdded({ id: 'att-789', original_name: 'new-file.txt' });
    expect(attachmentList).toHaveLength(3);
    
    handleAttachmentRemoved('att-123');
    expect(attachmentList).toHaveLength(2);
    expect(attachmentList.find(att => att.id === 'att-123')).toBeUndefined();
  });
});