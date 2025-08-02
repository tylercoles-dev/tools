'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWikiPage, useWikiMutations } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight,
  History,
  Link as LinkIcon,
  Hash,
  Clock,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  WikiCategoryManager, 
  WikiTagSelector, 
  WikiVersionHistory, 
  WikiBacklinks,
  WikiAttachmentUploader,
  WikiAttachmentGallery,
  parseAttachmentMarkdown
} from '@/components/wiki';

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

export default function EnhancedWikiPageDetail() {
  const params = useParams();
  const router = useRouter();
  const pageId = params?.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
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
    setActiveTab('content');
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
      setShowPreview(true);
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

  const handleVersionRestore = (entry: any) => {
    setEditForm({
      title: entry.title,
      content: entry.content,
      category: editForm.category,
      tags: editForm.tags,
      parent: editForm.parent,
    });
    setIsEditing(true);
    setActiveTab('content');
  };

  const handleNavigateToPage = (slug: string) => {
    router.push(`/wiki/${slug}`);
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="organization" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Organization
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </TabsTrigger>
                <TabsTrigger value="attachments" className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6">
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
                      </div>
                    ) : (
                      <div>
                        <CardTitle className="text-3xl mb-4">{page.title}</CardTitle>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                          {page.category && (
                            <Badge variant="default" className="bg-green-500">
                              {page.category}
                            </Badge>
                          )}
                          {page.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              #{tag}
              </Badge>
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
                            placeholder="Write your content in Markdown format... Use [[Page Name]] for internal links and ![caption](attachment:filename.jpg) for attachments."
                            rows={20}
                            className="mt-2 font-mono text-sm"
                          />
                        </div>
                        {showPreview && (
                          <div>
                            <Label>Preview</Label>
                            <div className="mt-2 prose prose-sm max-w-none border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[500px]">
                              <div className="space-y-4">
                                {parseAttachmentMarkdown(
                                  editForm.content,
                                  [], // TODO: Load page attachments
                                  (attachment) => {
                                    window.open(`/api/v1/wiki/attachments/${attachment.id}`, '_blank');
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="prose prose-lg max-w-none space-y-4">
                        {parseAttachmentMarkdown(
                          page.content,
                          [], // TODO: Load page attachments
                          (attachment) => {
                            window.open(`/api/v1/wiki/attachments/${attachment.id}`, '_blank');
                          }
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="organization" className="mt-6 space-y-6">
                <WikiCategoryManager
                  pageId={parseInt(pageId)}
                  selectedCategories={[]} // This would come from the page data
                  onCategoriesChange={(categoryIds) => console.log('Categories changed:', categoryIds)}
                />
                
                <WikiTagSelector
                  pageId={parseInt(pageId)}
                  selectedTags={page.tags}
                  onTagsChange={(tagNames) => console.log('Tags changed:', tagNames)}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <WikiVersionHistory
                  pageId={parseInt(pageId)}
                  onVersionRestore={handleVersionRestore}
                />
              </TabsContent>

              <TabsContent value="links" className="mt-6">
                <WikiBacklinks
                  pageId={parseInt(pageId)}
                  onNavigate={handleNavigateToPage}
                />
              </TabsContent>

              <TabsContent value="attachments" className="mt-6 space-y-6">
                {isEditing ? (
                  <WikiAttachmentUploader
                    pageId={parseInt(pageId)}
                    onUploadComplete={(attachments) => {
                      console.log('Attachments uploaded:', attachments);
                      // TODO: Refresh attachment list
                    }}
                    onUploadError={(error) => {
                      console.error('Upload error:', error);
                      // TODO: Show error toast
                    }}
                  />
                ) : null}
                
                <WikiAttachmentGallery
                  pageId={parseInt(pageId)}
                  attachments={[]} // TODO: Load from API
                  onAttachmentUpdate={(attachment) => {
                    console.log('Attachment updated:', attachment);
                    // TODO: Update attachment in list
                  }}
                  onAttachmentDelete={(attachmentId) => {
                    console.log('Attachment deleted:', attachmentId);
                    // TODO: Remove from list
                  }}
                  onAttachmentDownload={(attachment) => {
                    console.log('Download attachment:', attachment);
                    // TODO: Trigger download
                    window.open(`/api/v1/wiki/attachments/${attachment.id}`, '_blank');
                  }}
                  allowEdit={isEditing}
                  allowDelete={isEditing}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Enhanced Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Page Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Page Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(page.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {page.author && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Author</p>
                    <p className="text-sm text-gray-600">{page.author}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                  <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                    {page.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Child Pages */}
            {page.children && page.children.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Child Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {page.children.map(child => (
                      <Link 
                        key={child.id} 
                        href={`/wiki/${child.id}`}
                        className="block p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          {child.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('organization')}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Manage Tags & Categories
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('history')}
                >
                  <History className="h-4 w-4 mr-2" />
                  View Version History
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('links')}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Explore Connections
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}