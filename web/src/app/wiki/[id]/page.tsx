'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWikiPage, useWikiMutations } from '@/hooks/use-api';
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
  BookOpen,
  Calendar,
  Tag,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Home,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WikiPage {
  id: string;
  title: string;
  content: string;
  slug: string;
  category: string;
  tags: string[];
  parent?: string;
  parentPage?: WikiPage;
  children?: WikiPage[];
  createdAt: string;
  updatedAt: string;
  author?: string;
  isPublished: boolean;
}

export default function WikiPageDetail() {
  const params = useParams();
  const router = useRouter();
  const pageId = params?.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    parent: '',
  });

  const { data: pageData, isLoading, error } = useWikiPage(pageId);
  const { updatePage, deletePage } = useWikiMutations();

  const page: WikiPage = pageData?.data;

  useEffect(() => {
    if (page) {
      setEditForm({
        title: page.title,
        content: page.content,
        category: page.category || '',
        tags: page.tags.join(', '),
        parent: page.parent || '',
      });
    }
  }, [page]);

  const handleEdit = () => {
    setIsEditing(true);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;
    
    try {
      await updatePage.mutateAsync({
        id: pageId,
        updates: {
          ...editForm,
          slug: editForm.title.toLowerCase().replace(/\s+/g, '-'),
          tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        },
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this wiki page? This action cannot be undone.')) {
      try {
        await deletePage.mutateAsync(pageId);
        router.push('/wiki');
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-green-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading wiki page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
          <p className="text-gray-600 mb-4">The requested wiki page could not be found.</p>
          <Link href="/wiki">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Wiki
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-1">
              <Link href="/wiki" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              
              {/* Breadcrumbs */}
              <nav className="flex items-center text-sm">
                <Link href="/wiki" className="text-gray-600 hover:text-gray-900 flex items-center">
                  <Home className="w-4 h-4 mr-1" />
                  Wiki
                </Link>
                {page.parentPage && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    <Link href={`/wiki/${page.parentPage.id}`} className="text-gray-600 hover:text-gray-900">
                      {page.parentPage.title}
                    </Link>
                  </>
                )}
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <span className="text-gray-900 font-medium">{page.title}</span>
              </nav>
            </div>
            
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show Preview
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updatePage.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updatePage.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
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
                        placeholder="Page title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      >
                        <option value="">Select category</option>
                        <option value="documentation">Documentation</option>
                        <option value="guides">Guides</option>
                        <option value="api">API</option>
                        <option value="tutorials">Tutorials</option>
                        <option value="reference">Reference</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="e.g., setup, configuration, advanced"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <CardTitle className="text-3xl mb-4">{page.title}</CardTitle>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                      {page.category && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                          {page.category}
                        </span>
                      )}
                      {page.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {isEditing ? (
                  <div className={showPreview ? 'grid grid-cols-2 gap-4' : ''}>
                    <div>
                      <Label htmlFor="content">Content (Markdown)</Label>
                      <Textarea
                        id="content"
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        placeholder="Write your content in Markdown format..."
                        rows={20}
                        className="mt-2 font-mono text-sm"
                      />
                    </div>
                    {showPreview && (
                      <div>
                        <Label>Preview</Label>
                        <div className="mt-2 prose prose-sm max-w-none border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[500px]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {editForm.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {page.content}
                    </ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(page.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {page.author && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Author</p>
                    <p className="text-sm text-gray-600">{page.author}</p>
                  </div>
                )}

                {page.children && page.children.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Child Pages</p>
                    <div className="space-y-1">
                      {page.children.map(child => (
                        <Link 
                          key={child.id} 
                          href={`/wiki/${child.id}`}
                          className="block text-sm text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="w-3 h-3 inline mr-1" />
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}