'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DraggableCard } from './draggable-card';

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

interface DroppableColumnProps {
  column: KanbanColumn;
  onCardMove: (cardId: string, fromColumn: string, toColumn: string) => void;
  onAddCard: (columnId: string) => void;
  onEditCard: (card: KanbanCard) => void;
  onDeleteCard: (cardId: string) => void;
}

export function DroppableColumn({ 
  column, 
  onCardMove, 
  onAddCard, 
  onEditCard, 
  onDeleteCard 
}: DroppableColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set dragOver to false if we're leaving the column completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const cardData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (cardData && cardData.columnId !== column.id) {
        onCardMove(cardData.id, cardData.columnId, column.id);
      }
    } catch (error) {
      console.error('Error parsing dropped card data:', error);
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div 
        className={`bg-gray-100 rounded-lg p-4 min-h-[500px] transition-colors ${
          isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: column.color }}
            ></div>
            <h3 className="font-medium text-gray-900">{column.name}</h3>
            <span className="ml-2 text-sm text-gray-500">
              {column.cards?.length || 0}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onAddCard(column.id)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {column.cards?.map((card: KanbanCard) => (
            <DraggableCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
          
          {/* Add Card Button */}
          <button 
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => onAddCard(column.id)}
          >
            <Plus className="w-4 h-4 mx-auto mb-1" />
            <span className="text-sm">Add a card</span>
          </button>
        </div>

        {/* Drop zone indicator */}
        {isDragOver && column.cards?.length === 0 && (
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center text-blue-500">
            Drop card here
          </div>
        )}
      </div>
    </div>
  );
}