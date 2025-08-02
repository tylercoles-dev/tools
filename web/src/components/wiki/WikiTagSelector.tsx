'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { Plus, X, Hash, Check } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

interface WikiTagSelectorProps {
  pageId?: number;
  selectedTags?: string[];
  onTagsChange?: (tagNames: string[]) => void;
  showCreateButton?: boolean;
}

export function WikiTagSelector({
  pageId,
  selectedTags = [],
  onTagsChange,
  showCreateButton = true
}: WikiTagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(selectedTags);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#64748b'
  });
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const api = useApi();

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    setSelectedTagNames(selectedTags);
  }, [selectedTags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/wiki/tags');
      setTags(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tags',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) {
      toast({
        title: 'Error',
        description: 'Tag name is required',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/api/wiki/tags', newTag);
      const createdTag = response.data;
      
      setTags(prev => [...prev, createdTag]);
      setNewTag({ name: '', color: '#64748b' });
      setIsCreateDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Tag created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create tag',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowSuggestions(value.length > 0);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.trim());
    } else if (e.key === 'Backspace' && tagInput === '' && selectedTagNames.length > 0) {
      // Remove last tag when backspacing on empty input
      const newTags = selectedTagNames.slice(0, -1);
      setSelectedTagNames(newTags);
      onTagsChange?.(newTags);
    }
  };

  const addTag = (tagName: string) => {
    if (!tagName || selectedTagNames.includes(tagName)) return;

    const newTags = [...selectedTagNames, tagName];
    setSelectedTagNames(newTags);
    onTagsChange?.(newTags);
    setTagInput('');
    setShowSuggestions(false);

    // Create tag if it doesn't exist
    if (!tags.find(tag => tag.name === tagName)) {
      createNewTagFromInput(tagName);
    }
  };

  const createNewTagFromInput = async (tagName: string) => {
    try {
      const response = await api.post('/api/wiki/tags', {
        name: tagName,
        color: '#64748b'
      });
      const createdTag = response.data;
      setTags(prev => [...prev, createdTag]);
    } catch (error) {
      // Silently fail - tag creation from input is not critical
    }
  };

  const removeTag = (tagName: string) => {
    const newTags = selectedTagNames.filter(name => name !== tagName);
    setSelectedTagNames(newTags);
    onTagsChange?.(newTags);
  };

  const handleSaveTags = async () => {
    if (!pageId) return;

    setIsSaving(true);
    try {
      await api.put(`/api/wiki/pages/${pageId}/tags`, {
        tag_names: selectedTagNames
      });
      
      toast({
        title: 'Success',
        description: 'Page tags updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update page tags',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFilteredSuggestions = () => {
    if (!tagInput) return [];
    
    const input = tagInput.toLowerCase();
    return tags
      .filter(tag => 
        tag.name.toLowerCase().includes(input) && 
        !selectedTagNames.includes(tag.name)
      )
      .slice(0, 5);
  };

  const getColorPalette = () => [
    '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e'
  ];

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          <Label className="text-sm font-medium">Tags</Label>
        </div>
        {showCreateButton && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tagName">Name</Label>
                  <Input
                    id="tagName"
                    value={newTag.name}
                    onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tag name"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getColorPalette().map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTag.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTag(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTag}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Creating...' : 'Create Tag'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {/* Selected Tags */}
        {selectedTagNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTagNames.map(tagName => {
              const tag = tags.find(t => t.name === tagName);
              return (
                <Badge
                  key={tagName}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: tag?.color || '#64748b',
                    color: 'white'
                  }}
                  onClick={() => removeTag(tagName)}
                >
                  {tagName}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              );
            })}
          </div>
        )}

        {/* Tag Input */}
        <div className="relative">
          <Input
            ref={inputRef}
            value={tagInput}
            onChange={(e) => handleTagInputChange(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            onFocus={() => setShowSuggestions(tagInput.length > 0)}
            placeholder="Type to add tags... (press Enter or comma to add)"
            className="pr-10"
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
            >
              {getFilteredSuggestions().map(tag => (
                <div
                  key={tag.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                  onClick={() => addTag(tag.name)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </div>
                  <Check className="h-4 w-4 text-gray-400" />
                </div>
              ))}
              
              {/* Add new tag option */}
              {tagInput && !tags.find(tag => tag.name.toLowerCase() === tagInput.toLowerCase()) && (
                <div
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 border-t"
                  onClick={() => addTag(tagInput)}
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span>Create "{tagInput}"</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {pageId && selectedTagNames.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSaveTags}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Tags'}
          </Button>
        </div>
      )}
    </Card>
  );
}