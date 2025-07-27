'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Folder, 
  FolderOpen,
  Search,
  Plus,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  category: string;
  parent?: string;
  children?: WikiPage[];
  isPublished: boolean;
}

interface WikiSidebarProps {
  pages: WikiPage[];
  currentPageId?: string;
  onCreatePage?: () => void;
  onFilter?: (category: string) => void;
  selectedCategory?: string;
}

export function WikiSidebar({ 
  pages, 
  currentPageId, 
  onCreatePage, 
  onFilter,
  selectedCategory = 'all' 
}: WikiSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (pageId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedFolders(newExpanded);
  };

  const buildPageTree = (pages: WikiPage[]): WikiPage[] => {
    const pageMap = new Map<string, WikiPage>();
    const rootPages: WikiPage[] = [];

    // Filter by search and category
    const filteredPages = pages.filter(page => {
      const matchesSearch = !searchQuery || 
        page.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || page.category === selectedCategory;
      return matchesSearch && matchesCategory && page.isPublished;
    });

    // First pass: create map
    filteredPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Second pass: build tree
    filteredPages.forEach(page => {
      const currentPage = pageMap.get(page.id)!;
      if (page.parent && pageMap.has(page.parent)) {
        const parentPage = pageMap.get(page.parent)!;
        parentPage.children = parentPage.children || [];
        parentPage.children.push(currentPage);
      } else {
        rootPages.push(currentPage);
      }
    });

    return rootPages;
  };

  const PageTreeItem = ({ page, level = 0 }: { page: WikiPage; level?: number }) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedFolders.has(page.id);
    const isActive = page.id === currentPageId;

    return (
      <div className={`${level > 0 ? 'ml-4' : ''}`}>
        <div 
          className={`flex items-center py-1.5 px-2 rounded-lg transition-colors group ${
            isActive 
              ? 'bg-blue-100 text-blue-900 border border-blue-200' 
              : 'hover:bg-gray-50'
          }`}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 mr-1"
              onClick={(e) => {
                e.preventDefault();
                toggleFolder(page.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          )}
          
          <Link href={`/wiki/${page.id}`} className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              )
            ) : (
              <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium truncate ${
              isActive ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-600'
            }`}>
              {page.title}
            </span>
          </Link>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {page.children!.map(child => (
              <PageTreeItem key={child.id} page={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const pageTree = buildPageTree(pages);
  const categories = ['all', 'documentation', 'guides', 'api', 'tutorials', 'reference'];

  return (
    <div className="bg-white rounded-lg shadow-sm border h-fit">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Wiki Pages</h2>
          {onCreatePage && (
            <Button variant="ghost" size="sm" onClick={onCreatePage}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-2 text-sm"
          />
        </div>
        
        {/* Category Filter */}
        {onFilter && (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={selectedCategory}
            onChange={(e) => onFilter(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {pageTree.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {searchQuery || selectedCategory !== 'all' ? 'No pages match your filters' : 'No pages yet'}
            </p>
            {!searchQuery && selectedCategory === 'all' && onCreatePage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCreatePage}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create first page
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {pageTree.map(page => (
              <PageTreeItem key={page.id} page={page} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}