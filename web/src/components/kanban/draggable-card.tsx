'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal,
  Calendar,
  User,
  Edit3,
  Trash2
} from 'lucide-react';

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

interface DraggableCardProps {
  card: KanbanCard;
  onEdit?: (card: KanbanCard) => void;
  onDelete?: (cardId: string) => void;
}

export function DraggableCard({ card, onEdit, onDelete }: DraggableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Card 
      className={`bg-white shadow-sm hover:shadow-md transition-all cursor-pointer select-none ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-gray-900 flex-1 pr-2">
            {card.title}
          </CardTitle>
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
            
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(card);
                    setShowMenu(false);
                  }}
                >
                  <Edit3 className="w-3 h-3 mr-2" />
                  Edit
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(card.id);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {card.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{card.description}</p>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(card.priority)}`}>
              {card.priority}
            </span>
            {card.labels?.map((label, index) => (
              <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {label}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          {card.dueDate && (
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(card.dueDate).toLocaleDateString()}
            </div>
          )}
          {card.assignee && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {card.assignee}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Click outside handler for menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </Card>
  );
}