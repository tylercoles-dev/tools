'use client';

import { useState } from 'react';
import { useMemorySearch } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Tag, Calendar, Star } from 'lucide-react';
import Link from 'next/link';

interface SearchFilters {
  category?: string;
  type?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  starred?: boolean;
}

interface MemorySearchProps {
  onMemorySelect?: (memoryId: string) => void;
  compact?: boolean;
}

export function MemorySearch({ onMemorySelect, compact = false }: MemorySearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: searchResults, isLoading } = useMemorySearch(query, filters);

  const memories = searchResults?.data || [];

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

  const handleMemoryClick = (memoryId: string) => {
    if (onMemorySelect) {
      onMemorySelect(memoryId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search memories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                >
                  <option value="">All Categories</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="ideas">Ideas</option>
                  <option value="research">Research</option>
                  <option value="notes">Notes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                >
                  <option value="">All Types</option>
                  <option value="note">Note</option>
                  <option value="idea">Idea</option>
                  <option value="link">Link</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: {
                      start: e.target.value,
                      end: filters.dateRange?.end || ''
                    }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    dateRange: {
                      start: filters.dateRange?.start || '',
                      end: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.starred || false}
                  onChange={(e) => setFilters({ ...filters, starred: e.target.checked || undefined })}
                  className="mr-2"
                />
                <Star className="w-4 h-4 text-yellow-500 mr-1" />
                Starred only
              </label>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {query && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isLoading ? 'Searching...' : `${memories.length} results found`}
          </h3>
          
          {memories.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No memories match your search criteria.</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {memories.map((memory: any) => (
                <Card 
                  key={memory.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleMemoryClick(memory.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getTypeIcon(memory.type)}</span>
                        <div>
                          <CardTitle className="text-base line-clamp-1">
                            {memory.title}
                          </CardTitle>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full border ${getTypeColor(memory.type)}`}>
                              {memory.type}
                            </span>
                            {memory.category && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                                {memory.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {memory.isStarred && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {memory.content}
                    </p>
                    
                    {memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {memory.tags.slice(0, 2).map((tag: string, index: number) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            #{tag}
                          </span>
                        ))}
                        {memory.tags.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{memory.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}