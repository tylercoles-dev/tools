'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { Plus, X, Tag } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  page_count?: number;
  created_at: string;
}

interface WikiCategoryManagerProps {
  pageId?: number;
  selectedCategories?: number[];
  onCategoriesChange?: (categoryIds: number[]) => void;
  showCreateButton?: boolean;
}

export function WikiCategoryManager({
  pageId,
  selectedCategories = [],
  onCategoriesChange,
  showCreateButton = true
}: WikiCategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedCategories);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#6366f1'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const api = useApi();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setSelectedIds(selectedCategories);
  }, [selectedCategories]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/wiki/categories');
      setCategories(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: 'Error',
        description: 'Category name is required',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/api/wiki/categories', newCategory);
      const createdCategory = response.data;
      
      setCategories(prev => [...prev, createdCategory]);
      setNewCategory({ name: '', description: '', color: '#6366f1' });
      setIsCreateDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Category created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    const newSelectedIds = selectedIds.includes(categoryId)
      ? selectedIds.filter(id => id !== categoryId)
      : [...selectedIds, categoryId];
    
    setSelectedIds(newSelectedIds);
    onCategoriesChange?.(newSelectedIds);
  };

  const handleSaveCategories = async () => {
    if (!pageId) return;

    setIsSaving(true);
    try {
      await api.put(`/api/wiki/pages/${pageId}/categories`, {
        category_ids: selectedIds
      });
      
      toast({
        title: 'Success',
        description: 'Page categories updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update page categories',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
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
          <Tag className="h-4 w-4" />
          <Label className="text-sm font-medium">Categories</Label>
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
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Category description (optional)"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getColorPalette().map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newCategory.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategory(prev => ({ ...prev, color }))}
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
                    onClick={handleCreateCategory}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">No categories available</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category.id}
                variant={selectedIds.includes(category.id) ? 'default' : 'outline'}
                className="cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: selectedIds.includes(category.id) ? category.color : 'transparent',
                  borderColor: category.color,
                  color: selectedIds.includes(category.id) ? 'white' : category.color
                }}
                onClick={() => handleCategoryToggle(category.id)}
              >
                {category.name}
                {selectedIds.includes(category.id) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {pageId && selectedIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSaveCategories}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Categories'}
          </Button>
        </div>
      )}
    </Card>
  );
}