'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { Link, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PageLink {
  id: number;
  target_page_id?: number;
  source_page_id?: number;
  link_text?: string;
  created_at: string;
  target_title?: string;
  target_slug?: string;
  source_title?: string;
  source_slug?: string;
}

interface WikiBacklinksProps {
  pageId: number;
  onNavigate?: (slug: string) => void;
}

export function WikiBacklinks({ pageId, onNavigate }: WikiBacklinksProps) {
  const [outgoingLinks, setOutgoingLinks] = useState<PageLink[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<PageLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');

  const { toast } = useToast();
  const api = useApi();

  useEffect(() => {
    loadLinks();
  }, [pageId]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const [outgoingResponse, incomingResponse] = await Promise.all([
        api.get(`/api/wiki/pages/${pageId}/links`),
        api.get(`/api/wiki/pages/${pageId}/backlinks`)
      ]);
      
      setOutgoingLinks(outgoingResponse.data || []);
      setIncomingLinks(incomingResponse.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load page links',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToPage = (slug: string) => {
    if (onNavigate) {
      onNavigate(slug);
    } else {
      // Fallback to direct navigation
      window.location.href = `/wiki/${slug}`;
    }
  };

  const renderLinkItem = (link: PageLink, isOutgoing: boolean) => {
    const title = isOutgoing ? link.target_title : link.source_title;
    const slug = isOutgoing ? link.target_slug : link.source_slug;
    
    if (!title || !slug) return null;

    return (
      <div
        key={link.id}
        className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => handleNavigateToPage(slug)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isOutgoing ? (
              <ArrowRight className="h-4 w-4 text-blue-500" />
            ) : (
              <ArrowLeft className="h-4 w-4 text-green-500" />
            )}
            <h4 className="font-medium text-sm truncate">{title}</h4>
          </div>
          
          {link.link_text && link.link_text !== title && (
            <p className="text-xs text-gray-500 ml-6">
              Link text: "{link.link_text}"
            </p>
          )}
          
          <p className="text-xs text-gray-400 ml-6">
            Created {formatDistanceToNow(new Date(link.created_at))} ago
          </p>
        </div>
        
        <Button variant="ghost" size="sm">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link className="h-4 w-4" />
        <h3 className="font-medium">Page Links</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outgoing'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('outgoing')}
        >
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Outgoing Links
            {outgoingLinks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {outgoingLinks.length}
              </Badge>
            )}
          </div>
        </button>
        
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'incoming'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('incoming')}
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Incoming Links
            {incomingLinks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {incomingLinks.length}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Links Content */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activeTab === 'outgoing' ? (
          <>
            {outgoingLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowRight className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No outgoing links</p>
                <p className="text-xs mt-1">Add [[Page Name]] links to your content</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  Pages that this page links to:
                </p>
                {outgoingLinks.map(link => renderLinkItem(link, true))}
              </div>
            )}
          </>
        ) : (
          <>
            {incomingLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowLeft className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No incoming links</p>
                <p className="text-xs mt-1">No other pages link to this page yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  Pages that link to this page:
                </p>
                {incomingLinks.map(link => renderLinkItem(link, false))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {(outgoingLinks.length > 0 || incomingLinks.length > 0) && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{outgoingLinks.length} outgoing</span>
            <span>{incomingLinks.length} incoming</span>
            <span>{outgoingLinks.length + incomingLinks.length} total connections</span>
          </div>
        </div>
      )}
    </Card>
  );
}