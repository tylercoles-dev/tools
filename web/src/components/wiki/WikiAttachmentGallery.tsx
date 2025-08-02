'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  Edit3, 
  Search, 
  Grid, 
  List,
  Image,
  FileText,
  FileArchive,
  Calendar,
  User,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

interface WikiAttachmentGalleryProps {
  pageId: number;
  attachments: WikiAttachment[];
  onAttachmentUpdate?: (attachment: WikiAttachment) => void;
  onAttachmentDelete?: (attachmentId: string) => void;
  onAttachmentDownload?: (attachment: WikiAttachment) => void;
  className?: string;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';
type FilterBy = 'all' | 'images' | 'documents' | 'archives';

export default function WikiAttachmentGallery({
  pageId,
  attachments,
  onAttachmentUpdate,
  onAttachmentDelete,
  onAttachmentDownload,
  className = '',
  allowEdit = true,
  allowDelete = true
}: WikiAttachmentGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [editingAttachment, setEditingAttachment] = useState<WikiAttachment | null>(null);
  const [editForm, setEditForm] = useState({ description: '', original_name: '' });
  const [selectedAttachment, setSelectedAttachment] = useState<WikiAttachment | null>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip')) return <FileArchive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Get file type category
  const getFileCategory = (mimeType: string): FilterBy => {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archives';
    return 'documents';
  };

  // Filter and sort attachments
  const filteredAndSortedAttachments = React.useMemo(() => {
    let filtered = attachments;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(att =>
        att.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (att.description && att.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(att => getFileCategory(att.mime_type) === filterBy);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.original_name.localeCompare(b.original_name);
        case 'date':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case 'size':
          return b.size_bytes - a.size_bytes;
        case 'type':
          return a.mime_type.localeCompare(b.mime_type);
        default:
          return 0;
      }
    });
  }, [attachments, searchQuery, filterBy, sortBy]);

  // Handle edit attachment
  const handleEditAttachment = (attachment: WikiAttachment) => {
    setEditingAttachment(attachment);
    setEditForm({
      description: attachment.description || '',
      original_name: attachment.original_name
    });
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!editingAttachment) return;

    const updatedAttachment = {
      ...editingAttachment,
      description: editForm.description,
      original_name: editForm.original_name
    };

    onAttachmentUpdate?.(updatedAttachment);
    setEditingAttachment(null);
  };

  // Handle download
  const handleDownload = (attachment: WikiAttachment) => {
    onAttachmentDownload?.(attachment);
  };

  // Handle delete
  const handleDelete = (attachment: WikiAttachment) => {
    if (confirm(`Are you sure you want to delete "${attachment.original_name}"?`)) {
      onAttachmentDelete?.(attachment.id);
    }
  };

  // Get attachment counts by type
  const attachmentCounts = React.useMemo(() => {
    const counts = { all: attachments.length, images: 0, documents: 0, archives: 0 };
    attachments.forEach(att => {
      const category = getFileCategory(att.mime_type);
      counts[category]++;
    });
    return counts;
  }, [attachments]);

  if (attachments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Image className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No attachments found</p>
            <p className="text-sm">Upload files to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Attachments ({attachments.length})
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search attachments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by Type */}
            <Select value={filterBy} onValueChange={(value: FilterBy) => setFilterBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files ({attachmentCounts.all})</SelectItem>
                <SelectItem value="images">Images ({attachmentCounts.images})</SelectItem>
                <SelectItem value="documents">Documents ({attachmentCounts.documents})</SelectItem>
                <SelectItem value="archives">Archives ({attachmentCounts.archives})</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="size">By Size</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          {filteredAndSortedAttachments.length !== attachments.length && (
            <div className="text-sm text-gray-500">
              Showing {filteredAndSortedAttachments.length} of {attachments.length} attachments
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachment Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
        : 'space-y-2'
      }>
        {filteredAndSortedAttachments.map((attachment) => (
          <Card key={attachment.id} className={viewMode === 'list' ? 'p-4' : ''}>
            {viewMode === 'grid' ? (
              // Grid View
              <div className="group">
                <CardContent className="p-4 space-y-3">
                  {/* Thumbnail/Icon */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {attachment.thumbnail_path ? (
                      <img
                        src={`/api/v1/wiki/attachments/${attachment.id}/thumbnail`}
                        alt={attachment.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">
                        {getFileIcon(attachment.mime_type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm truncate" title={attachment.original_name}>
                      {attachment.original_name}
                    </h4>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(attachment.size_bytes)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {attachment.mime_type.split('/')[1]}
                      </Badge>
                    </div>

                    {attachment.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {attachment.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="flex-1 mr-2"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedAttachment(attachment)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {allowEdit && (
                            <DropdownMenuItem onClick={() => handleEditAttachment(attachment)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {allowDelete && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(attachment)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </div>
            ) : (
              // List View
              <div className="flex items-center gap-4 p-2">
                {/* Icon/Thumbnail */}
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                  {attachment.thumbnail_path ? (
                    <img
                      src={`/api/v1/wiki/attachments/${attachment.id}/thumbnail`}
                      alt={attachment.original_name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    getFileIcon(attachment.mime_type)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{attachment.original_name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{formatFileSize(attachment.size_bytes)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(attachment.uploaded_at)}
                    </span>
                    {attachment.uploaded_by && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {attachment.uploaded_by}
                      </span>
                    )}
                  </div>
                  {attachment.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                      {attachment.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedAttachment(attachment)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {allowEdit && (
                        <DropdownMenuItem onClick={() => handleEditAttachment(attachment)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {allowDelete && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(attachment)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingAttachment && (
        <Dialog open={!!editingAttachment} onOpenChange={() => setEditingAttachment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Attachment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="original_name">Filename</Label>
                <Input
                  id="original_name"
                  value={editForm.original_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, original_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this attachment..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingAttachment(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Dialog */}
      {selectedAttachment && (
        <Dialog open={!!selectedAttachment} onOpenChange={() => setSelectedAttachment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Attachment Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Filename</Label>
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {selectedAttachment.original_name}
                  </p>
                </div>
                <div>
                  <Label>File Size</Label>
                  <p className="text-sm">{formatFileSize(selectedAttachment.size_bytes)}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="text-sm">{selectedAttachment.mime_type}</p>
                </div>
                <div>
                  <Label>Uploaded</Label>
                  <p className="text-sm">{formatDate(selectedAttachment.uploaded_at)}</p>
                </div>
              </div>
              
              {selectedAttachment.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    {selectedAttachment.description}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedAttachment(null)}>
                  Close
                </Button>
                <Button onClick={() => handleDownload(selectedAttachment)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}