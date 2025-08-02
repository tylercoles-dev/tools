'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, FileArchive, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface FileUpload {
  file: File;
  id: string;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  description?: string;
}

interface WikiAttachmentUploaderProps {
  pageId: number;
  onUploadComplete?: (attachments: any[]) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
  className?: string;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown', 'application/zip'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

export default function WikiAttachmentUploader({
  pageId,
  onUploadComplete,
  onUploadError,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES,
  allowedTypes = ALLOWED_TYPES,
  className = ''
}: WikiAttachmentUploaderProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate file preview for images
  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      const sizeMB = Math.round(maxFileSize / (1024 * 1024));
      return `File size exceeds ${sizeMB}MB limit`;
    }

    if (!allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`;
    }

    return null;
  };

  // Get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip')) return <FileArchive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFiles = useCallback(async (selectedFiles: FileList) => {
    const newFiles: FileUpload[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const validationError = validateFile(file);

      if (files.length + newFiles.length >= maxFiles) {
        onUploadError?.(` maximum of ${maxFiles} files allowed`);
        break;
      }

      const preview = await generatePreview(file);

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        preview,
        progress: 0,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, maxFileSize, allowedTypes, onUploadError]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Handle file input change
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Update file description
  const updateFileDescription = useCallback((id: string, description: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, description } : f
    ));
  }, []);

  // Upload files
  const uploadFiles = useCallback(async () => {
    const validFiles = files.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    let completed = 0;

    const uploadPromises = validFiles.map(async (fileUpload) => {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
        ));

        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileUpload.file);
        });

        // Simulate progress updates
        for (let progress = 20; progress <= 80; progress += 20) {
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id ? { ...f, progress } : f
          ));
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // TODO: Replace with actual API call
        // const response = await fetch(`/api/v1/wiki/pages/${pageId}/attachments`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     file_data: base64,
        //     filename: fileUpload.file.name,
        //     mime_type: fileUpload.file.type,
        //     description: fileUpload.description
        //   })
        // });

        // Simulate successful upload
        await new Promise(resolve => setTimeout(resolve, 500));

        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id ? { ...f, status: 'completed' as const, progress: 100 } : f
        ));

        completed++;
        setGlobalProgress((completed / validFiles.length) * 100);

      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id ? { 
            ...f, 
            status: 'error' as const, 
            error: 'Upload failed' 
          } : f
        ));
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    setGlobalProgress(0);

    const successfulUploads = files.filter(f => f.status === 'completed');
    if (successfulUploads.length > 0) {
      onUploadComplete?.(successfulUploads);
    }
  }, [files, pageId, onUploadComplete]);

  const pendingFiles = files.filter(f => f.status === 'pending');
  const hasErrors = files.some(f => f.status === 'error');

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Supports images, PDFs, documents, and archives up to {Math.round(maxFileSize / (1024 * 1024))}MB
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept={allowedTypes.join(',')}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected Files ({files.length})</h4>
                {pendingFiles.length > 0 && (
                  <Button 
                    onClick={uploadFiles} 
                    disabled={isUploading || hasErrors}
                    size="sm"
                  >
                    {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </div>

              {/* Global Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(globalProgress)}%</span>
                  </div>
                  <Progress value={globalProgress} />
                </div>
              )}

              {/* Individual Files */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileUpload) => (
                  <div key={fileUpload.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* File Preview/Icon */}
                      <div className="flex-shrink-0">
                        {fileUpload.preview ? (
                          <img 
                            src={fileUpload.preview} 
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                            {getFileIcon(fileUpload.file.type)}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {fileUpload.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(fileUpload.file.size)}
                            </p>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex items-center gap-2 ml-3">
                            <Badge variant={
                              fileUpload.status === 'completed' ? 'default' :
                              fileUpload.status === 'error' ? 'destructive' :
                              fileUpload.status === 'uploading' ? 'secondary' : 'outline'
                            }>
                              {fileUpload.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {fileUpload.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {fileUpload.status}
                            </Badge>
                            
                            {fileUpload.status !== 'uploading' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileUpload.id)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {fileUpload.status === 'uploading' && (
                          <div className="mt-2">
                            <Progress value={fileUpload.progress} className="h-1" />
                          </div>
                        )}

                        {/* Error Message */}
                        {fileUpload.error && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {fileUpload.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Description Input */}
                        {fileUpload.status === 'pending' && (
                          <div className="mt-2">
                            <Label htmlFor={`desc-${fileUpload.id}`} className="text-xs">
                              Description (optional)
                            </Label>
                            <Input
                              id={`desc-${fileUpload.id}`}
                              placeholder="Describe this file..."
                              value={fileUpload.description || ''}
                              onChange={(e) => updateFileDescription(fileUpload.id, e.target.value)}
                              className="mt-1"
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Limits Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Maximum {maxFiles} files per page</p>
            <p>• Maximum {Math.round(maxFileSize / (1024 * 1024))}MB per file</p>
            <p>• Supported: Images, PDFs, Documents, Archives</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}