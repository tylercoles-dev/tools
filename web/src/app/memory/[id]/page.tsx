'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMemory, useMemoryMutations } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Edit3, 
  Save,
  X,
  Star,
  Calendar,
  Tag,
  Brain,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category?: string;
  isStarred?: boolean;
  type: 'text' | 'link' | 'note' | 'idea';
}

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoryId = params?.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    tags: string;
    category: string;
    type: 'text' | 'link' | 'note' | 'idea';
  }>({
    title: '',
    content: '',
    tags: '',
    category: '',
    type: 'note',
  });

  const { data: memoryData, isLoading, error } = useMemory(memoryId);
  const { updateMemory, deleteMemory } = useMemoryMutations();

  const memory: Memory = memoryData?.data;

  const handleEdit = () => {
    if (memory) {
      setEditForm({
        title: memory.title,
        content: memory.content,
        tags: memory.tags.join(', '),
        category: memory.category || '',
        type: memory.type,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;
    
    try {
      await updateMemory.mutateAsync({
        id: memoryId,
        updates: {
          ...editForm,
          tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        },
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteMemory.mutateAsync(memoryId);
        router.push('/memory');
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'link': return '🔗';
      case 'idea': return '💡';
      case 'note': return '📝';
      case 'text': return '📄';
      default: return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'link': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'idea': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'note': return 'bg-green-100 text-green-800 border-green-200';
      case 'text': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading memory...</p>
        </div>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Memory not found</h2>
          <p className="text-gray-600 mb-4">The requested memory could not be found.</p>
          <Link href="/memory">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Memories
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/memory" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center">
                <Brain className="w-6 h-6 text-purple-500 mr-2" />
                <span className="font-medium text-gray-900">Memory Detail</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateMemory.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMemory.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Memory title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                    >
                      <option value="note">Note</option>
                      <option value="idea">Idea</option>
                      <option value="link">Link</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    >
                      <option value="">No category</option>
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="ideas">Ideas</option>
                      <option value="research">Research</option>
                      <option value="notes">Notes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="e.g., important, project, meeting"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getTypeIcon(memory.type)}</span>
                    <div>
                      <CardTitle className="text-2xl">{memory.title}</CardTitle>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className={`px-3 py-1 text-sm rounded-full border ${getTypeColor(memory.type)}`}>
                          {memory.type}
                        </span>
                        {memory.category && (
                          <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
                            {memory.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {memory.isStarred && (
                    <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  )}
                </div>

                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-500 mr-1" />
                    {memory.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created: {new Date(memory.createdAt).toLocaleDateString()}
                  </div>
                  {memory.updatedAt !== memory.createdAt && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Updated: {new Date(memory.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {isEditing ? (
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  placeholder="Memory content"
                  rows={12}
                  className="mt-2"
                />
              </div>
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {memory.content}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}