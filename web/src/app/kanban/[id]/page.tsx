'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useKanbanBoard, useKanbanMutations } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, 
  ArrowLeft, 
  MoreHorizontal,
  Edit3,
  Trash2,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { DroppableColumn } from '@/components/kanban/droppable-column';
import { useRealtimeKanban } from '@/hooks/use-realtime';
import { ConnectionStatusIndicator } from '@/components/realtime/connection-status';
import { useRealtime } from '@/components/realtime/realtime-provider';

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  labels?: string[];
  columnId: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  cards: KanbanCard[];
}

export default function KanbanBoardPage() {
  const params = useParams();
  const boardId = params?.id as string;
  
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [newCard, setNewCard] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    assignee: string;
    dueDate: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    dueDate: '',
  });

  const { data: boardData, isLoading, error } = useKanbanBoard(boardId);
  const { createCard, updateCard, deleteCard } = useKanbanMutations();
  
  // Real-time updates for this board
  useRealtimeKanban(boardId);
  const { connectionStatus, sendMessage } = useRealtime();

  const handleCreateCard = async () => {
    if (!newCard.title.trim() || !selectedColumn) return;
    
    try {
      if (editingCard) {
        await updateCard.mutateAsync({
          id: editingCard.id,
          updates: { ...newCard },
        });
      } else {
        await createCard.mutateAsync({
          ...newCard,
          boardId,
          columnId: selectedColumn,
        });
      }
      
      setNewCard({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' });
      setEditingCard(null);
      setIsCardDialogOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCardMove = async (cardId: string, fromColumn: string, toColumn: string) => {
    try {
      await updateCard.mutateAsync({
        id: cardId,
        updates: { columnId: toColumn },
      });
      
      // Send real-time update
      sendMessage('kanban_update', {
        boardId,
        action: 'card_moved',
        cardId,
        fromColumn,
        toColumn,
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleAddCard = (columnId: string) => {
    setSelectedColumn(columnId);
    setEditingCard(null);
    setNewCard({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' });
    setIsCardDialogOpen(true);
  };

  const handleEditCard = (card: KanbanCard) => {
    setEditingCard(card);
    setSelectedColumn(card.columnId);
    setNewCard({
      title: card.title,
      description: card.description || '',
      priority: card.priority,
      assignee: card.assignee || '',
      dueDate: card.dueDate || '',
    });
    setIsCardDialogOpen(true);
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCard.mutateAsync({ id: cardId, boardId });
    } catch (error) {
      // Error handled by hook
    }
  };

  const board = boardData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Board not found</h2>
          <p className="text-gray-600 mb-4">The requested board could not be found.</p>
          <Link href="/kanban">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Boards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const columns: KanbanColumn[] = board.columns || [
    { id: 'todo', name: 'To Do', color: '#6b7280', cards: [] },
    { id: 'progress', name: 'In Progress', color: '#3b82f6', cards: [] },
    { id: 'done', name: 'Done', color: '#10b981', cards: [] },
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/kanban" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-gray-600">{board.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <ConnectionStatusIndicator 
                status={connectionStatus as any}
                showText={false}
              />
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Invite
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="p-6">
        <div className="flex space-x-6 overflow-x-auto pb-6">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              onCardMove={handleCardMove}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
            />
          ))}
        </div>

        {/* Card Dialog */}
        <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCard ? 'Edit Card' : 'Create New Card'}
              </DialogTitle>
              <DialogDescription>
                {editingCard 
                  ? 'Update the card details below.'
                  : `Add a new card to the ${columns.find(c => c.id === selectedColumn)?.name} column.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardTitle">Title</Label>
                <Input
                  id="cardTitle"
                  placeholder="Enter card title"
                  value={newCard.title}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cardDescription">Description</Label>
                <Textarea
                  id="cardDescription"
                  placeholder="Enter card description"
                  value={newCard.description}
                  onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardPriority">Priority</Label>
                  <select
                    id="cardPriority"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newCard.priority}
                    onChange={(e) => setNewCard({ ...newCard, priority: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="cardDueDate">Due Date</Label>
                  <Input
                    id="cardDueDate"
                    type="date"
                    value={newCard.dueDate}
                    onChange={(e) => setNewCard({ ...newCard, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cardAssignee">Assignee</Label>
                <Input
                  id="cardAssignee"
                  placeholder="Enter assignee name"
                  value={newCard.assignee}
                  onChange={(e) => setNewCard({ ...newCard, assignee: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCardDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCard}
                disabled={!newCard.title.trim() || (editingCard ? updateCard.isPending : createCard.isPending)}
              >
                {editingCard 
                  ? (updateCard.isPending ? 'Updating...' : 'Update Card')
                  : (createCard.isPending ? 'Creating...' : 'Create Card')
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}