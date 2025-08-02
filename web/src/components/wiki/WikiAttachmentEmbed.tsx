'use client';

import React, { useState } from 'react';
import { 
  Download, 
  ExternalLink, 
  Image as ImageIcon,
  FileText,
  FileArchive,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WikiAttachment {
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

interface WikiAttachmentEmbedProps {
  attachment: WikiAttachment;
  mode?: 'inline' | 'block' | 'card';
  showDescription?: boolean;
  showDownload?: boolean;
  showPreview?: boolean;
  className?: string;
  maxWidth?: string;
  onDownload?: (attachment: WikiAttachment) => void;
}

interface AttachmentNotFoundProps {
  filename: string;
  className?: string;
}

// Component for when attachment is not found
export function AttachmentNotFound({ filename, className = '' }: AttachmentNotFoundProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-200 ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm">Attachment not found: {filename}</span>
    </div>
  );
}

// Main attachment embed component
export default function WikiAttachmentEmbed({
  attachment,
  mode = 'inline',
  showDescription = true,
  showDownload = true,
  showPreview = true,
  className = '',
  maxWidth,
  onDownload
}: WikiAttachmentEmbedProps) {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (mimeType: string, size: string = 'h-4 w-4') => {
    if (mimeType.startsWith('image/')) return <ImageIcon className={size} />;
    if (mimeType === 'application/pdf') return <FileText className={size} />;
    if (mimeType.includes('zip')) return <FileArchive className={size} />;
    return <FileText className={size} />;
  };

  // Handle download
  const handleDownload = () => {
    onDownload?.(attachment);
  };

  // Get download URL
  const getDownloadUrl = () => `/api/v1/wiki/attachments/${attachment.id}`;
  const getThumbnailUrl = () => `/api/v1/wiki/attachments/${attachment.id}/thumbnail`;

  // Check if file is an image
  const isImage = attachment.mime_type.startsWith('image/');
  const isPdf = attachment.mime_type === 'application/pdf';

  // Inline mode - simple link with icon
  if (mode === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        {getFileIcon(attachment.mime_type, 'h-3 w-3')}
        <a 
          href={getDownloadUrl()}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          download={attachment.original_name}
          onClick={(e) => {
            e.preventDefault();
            handleDownload();
          }}
        >
          {attachment.original_name}
        </a>
        <span className="text-xs text-gray-500">
          ({formatFileSize(attachment.size_bytes)})
        </span>
      </span>
    );
  }

  // Block mode - full-width display
  if (mode === 'block') {
    return (
      <div className={`my-4 ${className}`} style={{ maxWidth }}>
        {/* Image display */}
        {isImage && !imageError && (
          <div className="mb-3">
            <img
              src={attachment.thumbnail_path ? getThumbnailUrl() : getDownloadUrl()}
              alt={attachment.description || attachment.original_name}
              className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
              onError={() => setImageError(true)}
              onClick={() => showPreview && setShowPreviewDialog(true)}
              style={{ maxWidth: maxWidth || '100%' }}
            />
          </div>
        )}

        {/* File info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {getFileIcon(attachment.mime_type)}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{attachment.original_name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatFileSize(attachment.size_bytes)}</span>
                <Badge variant="secondary" className="text-xs">
                  {attachment.mime_type.split('/')[1]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showPreview && (isImage || isPdf) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewDialog(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            )}
            
            {showDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {showDescription && attachment.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
            {attachment.description}
          </p>
        )}

        {/* Preview Dialog */}
        {showPreviewDialog && (
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getFileIcon(attachment.mime_type)}
                  {attachment.original_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                {isImage ? (
                  <img
                    src={getDownloadUrl()}
                    alt={attachment.description || attachment.original_name}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : isPdf ? (
                  <div className="aspect-[3/4] w-full">
                    <iframe
                      src={`${getDownloadUrl()}#view=FitH`}
                      className="w-full h-full border rounded"
                      title={attachment.original_name}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <Button onClick={handleDownload} className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
              
              {attachment.description && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <p className="text-sm">{attachment.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Card mode - compact card display
  return (
    <Card className={`max-w-sm ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {isImage && attachment.thumbnail_path && !imageError ? (
              <img
                src={getThumbnailUrl()}
                alt={attachment.original_name}
                className="w-12 h-12 object-cover rounded border cursor-pointer"
                onError={() => setImageError(true)}
                onClick={() => showPreview && setShowPreviewDialog(true)}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                {getFileIcon(attachment.mime_type)}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate mb-1">
              {attachment.original_name}
            </h4>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <span>{formatFileSize(attachment.size_bytes)}</span>
              <Badge variant="secondary" className="text-xs">
                {attachment.mime_type.split('/')[1]}
              </Badge>
            </div>

            {showDescription && attachment.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {attachment.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-1">
              {showPreview && (isImage || isPdf) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewDialog(true)}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              )}
              
              {showDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        {showPreviewDialog && (
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getFileIcon(attachment.mime_type)}
                  {attachment.original_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                {isImage ? (
                  <img
                    src={getDownloadUrl()}
                    alt={attachment.description || attachment.original_name}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : isPdf ? (
                  <div className="aspect-[3/4] w-full">
                    <iframe
                      src={`${getDownloadUrl()}#view=FitH`}
                      className="w-full h-full border rounded"
                      title={attachment.original_name}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <Button onClick={handleDownload} className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
              
              {attachment.description && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <p className="text-sm">{attachment.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// Utility function to parse attachment markdown and create embed components
export function parseAttachmentMarkdown(
  markdown: string,
  attachments: WikiAttachment[],
  onDownload?: (attachment: WikiAttachment) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const attachmentRegex = /!\[([^\]]*)\]\(attachment:([^)]+)\)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = attachmentRegex.exec(markdown)) !== null) {
    const [fullMatch, caption, filename] = match;
    const matchStart = match.index;
    
    // Add text before the attachment
    if (matchStart > lastIndex) {
      const text = markdown.slice(lastIndex, matchStart);
      if (text.trim()) {
        nodes.push(<span key={`text-${lastIndex}`}>{text}</span>);
      }
    }

    // Find the attachment
    const attachment = attachments.find(att => att.original_name === filename);
    
    if (attachment) {
      nodes.push(
        <WikiAttachmentEmbed
          key={`attachment-${attachment.id}`}
          attachment={attachment}
          mode="block"
          showDescription={true}
          showDownload={true}
          showPreview={true}
          onDownload={onDownload}
        />
      );
    } else {
      nodes.push(
        <AttachmentNotFound
          key={`missing-${filename}`}
          filename={filename}
        />
      );
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    const text = markdown.slice(lastIndex);
    if (text.trim()) {
      nodes.push(<span key={`text-${lastIndex}`}>{text}</span>);
    }
  }

  return nodes;
}