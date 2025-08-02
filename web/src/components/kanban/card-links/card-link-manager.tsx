'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Link as LinkIcon,
  ExternalLink,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Users,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Circle,
  GitBranch
} from 'lucide-react';

export type CardLinkType = 'blocks' | 'relates_to' | 'duplicate' | 'parent_child';

export interface CardLink {
  id: string;
  source_card_id: string;
  target_card_id: string;
  link_type: CardLinkType;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Populated from API
  source_card_title?: string;
  target_card_title?: string;
  source_card_column?: string;
  target_card_column?: string;
}

interface CardLinkManagerProps {
  cardId: string;
  boardId: string;
  links: CardLink[];
  availableCards: Array<{ id: string; title: string; column: string }>;
  onCreateLink: (link: Omit<CardLink, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateLink: (linkId: string, updates: Partial<CardLink>) => void;
  onDeleteLink: (linkId: string) => void;
  onNavigateToCard?: (cardId: string) => void;
}

const linkTypeConfig = {
  blocks: {
    label: 'Blocks',
    description: 'This card blocks the linked card',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800',
    direction: 'outgoing',
  },
  relates_to: {
    label: 'Relates to',
    description: 'This card is related to the linked card',
    icon: ArrowLeftRight,
    color: 'bg-blue-100 text-blue-800',
    direction: 'bidirectional',
  },
  duplicate: {
    label: 'Duplicate of',
    description: 'This card is a duplicate of the linked card',
    icon: Copy,
    color: 'bg-gray-100 text-gray-800',
    direction: 'outgoing',
  },
  parent_child: {
    label: 'Parent/Child',
    description: 'Parent-child relationship between cards',
    icon: GitBranch,
    color: 'bg-green-100 text-green-800',
    direction: 'hierarchical',
  },
};

export function CardLinkManager({
  cardId,
  boardId,
  links,
  availableCards,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onNavigateToCard,
}: CardLinkManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CardLink | null>(null);
  const [newLink, setNewLink] = useState({
    target_card_id: '',
    link_type: 'relates_to' as CardLinkType,
    description: '',
  });

  // Separate incoming and outgoing links
  const outgoingLinks = links.filter(link => link.source_card_id === cardId);
  const incomingLinks = links.filter(link => link.target_card_id === cardId);

  const handleCreateLink = () => {
    if (!newLink.target_card_id || newLink.target_card_id === cardId) return;

    onCreateLink({
      source_card_id: cardId,
      target_card_id: newLink.target_card_id,
      link_type: newLink.link_type,
      description: newLink.description || undefined,
      created_by: 'current_user', // This should come from auth context
    });

    setNewLink({
      target_card_id: '',
      link_type: 'relates_to',
      description: '',
    });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateLink = () => {
    if (!editingLink?.id) return;

    onUpdateLink(editingLink.id, {
      link_type: editingLink.link_type,
      description: editingLink.description,
    });
    setEditingLink(null);
  };

  const getCardTitle = (cardId: string): string => {
    const card = availableCards.find(c => c.id === cardId);
    return card?.title || `Card #${cardId}`;
  };

  const getCardColumn = (cardId: string): string => {
    const card = availableCards.find(c => c.id === cardId);
    return card?.column || 'Unknown';
  };

  const renderLinkItem = (link: CardLink, isIncoming: boolean = false) => {
    const config = linkTypeConfig[link.link_type];
    const Icon = config.icon;
    const targetCardId = isIncoming ? link.source_card_id : link.target_card_id;
    const targetTitle = isIncoming ? link.source_card_title : link.target_card_title;
    const targetColumn = isIncoming ? link.source_card_column : link.target_card_column;

    return (
      <div
        key={link.id}
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3 flex-1">
          <Icon className="w-5 h-5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Badge className={config.color}>
                {isIncoming ? `Incoming: ${config.label}` : config.label}
              </Badge>
              {isIncoming && (
                <span className="text-sm text-gray-500">
                  from
                </span>
              )}
              {!isIncoming && link.link_type === 'blocks' && (
                <Badge className="bg-orange-100 text-orange-800" variant="outline">
                  Blocking
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium truncate">
                {targetTitle || getCardTitle(targetCardId)}
              </span>
              <span className="text-sm text-gray-500">
                in {targetColumn || getCardColumn(targetCardId)}
              </span>
            </div>
            {link.description && (
              <p className="text-sm text-gray-600 mt-1">{link.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateToCard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToCard(targetCardId)}
              title="Go to card"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          {!isIncoming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingLink(link)}
              title="Edit link"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteLink(link.id)}
            className="text-red-600 hover:text-red-700"
            title="Remove link"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const totalLinks = outgoingLinks.length + incomingLinks.length;
  const blockingLinks = outgoingLinks.filter(link => link.link_type === 'blocks').length;
  const blockedByLinks = incomingLinks.filter(link => link.link_type === 'blocks').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h4 className="font-medium">Card Links</h4>
          {totalLinks > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {totalLinks} link{totalLinks !== 1 ? 's' : ''}
              </Badge>
              {blockingLinks > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  Blocking {blockingLinks}
                </Badge>
              )}
              {blockedByLinks > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  Blocked by {blockedByLinks}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Card Link</DialogTitle>
              <DialogDescription>
                Link this card to another card to show relationships
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="targetCard">Target Card</Label>
                <select
                  id="targetCard"
                  value={newLink.target_card_id}
                  onChange={(e) => setNewLink({ ...newLink, target_card_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a card...</option>
                  {availableCards
                    .filter(card => card.id !== cardId)
                    .map(card => (
                      <option key={card.id} value={card.id}>
                        {card.title} (in {card.column})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="linkType">Link Type</Label>
                <select
                  id="linkType"
                  value={newLink.link_type}
                  onChange={(e) => setNewLink({ ...newLink, link_type: e.target.value as CardLinkType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(linkTypeConfig).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="linkDescription">Description (optional)</Label>
                <Textarea
                  id="linkDescription"
                  placeholder="Describe the relationship between these cards"
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLink} 
                disabled={!newLink.target_card_id || newLink.target_card_id === cardId}
              >
                Create Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {totalLinks === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No links yet</p>
            <p className="text-sm">Connect this card to other cards to show relationships</p>
          </div>
        ) : (
          <>
            {/* Outgoing Links */}
            {outgoingLinks.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-700 flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Outgoing Links ({outgoingLinks.length})
                </h5>
                {outgoingLinks.map(link => renderLinkItem(link, false))}
              </div>
            )}

            {/* Incoming Links */}
            {incomingLinks.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-700 flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Incoming Links ({incomingLinks.length})
                </h5>
                {incomingLinks.map(link => renderLinkItem(link, true))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Link Dialog */}
      <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card Link</DialogTitle>
            <DialogDescription>
              Update the link relationship
            </DialogDescription>
          </DialogHeader>
          {editingLink && (
            <div className="space-y-4">
              <div>
                <Label>Target Card</Label>
                <div className="p-3 border rounded-md bg-gray-50">
                  <span className="font-medium">
                    {editingLink.target_card_title || getCardTitle(editingLink.target_card_id)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    in {editingLink.target_card_column || getCardColumn(editingLink.target_card_id)}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="editLinkType">Link Type</Label>
                <select
                  id="editLinkType"
                  value={editingLink.link_type}
                  onChange={(e) => setEditingLink({ 
                    ...editingLink, 
                    link_type: e.target.value as CardLinkType 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(linkTypeConfig).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="editLinkDescription">Description (optional)</Label>
                <Textarea
                  id="editLinkDescription"
                  placeholder="Describe the relationship between these cards"
                  value={editingLink.description || ''}
                  onChange={(e) => setEditingLink({ 
                    ...editingLink, 
                    description: e.target.value 
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLink(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLink}>
              Update Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}