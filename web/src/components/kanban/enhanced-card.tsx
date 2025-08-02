'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  User,
  Flag,
  Target,
  CheckSquare,
  Link as LinkIcon,
  MessageSquare,
  Play,
  Pause,
  AlertTriangle,
  Timer,
  MoreHorizontal,
  Edit3,
  Eye,
  Copy,
  Trash2
} from 'lucide-react';
import type { CustomFieldValue } from './custom-fields';
import type { Subtask } from './subtasks';
import type { CardLink } from './card-links';
import type { TimeEntry } from './time-tracking';

export interface EnhancedKanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  labels?: string[];
  columnId: string;
  boardId: string;
  estimatedHours?: number;
  position: number;
  
  // Enhanced features
  milestone?: {
    id: string;
    name: string;
    color: string;
    progress: number;
  };
  customFields?: CustomFieldValue[];
  subtasks?: Subtask[];
  links?: CardLink[];
  timeEntries?: TimeEntry[];
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
  activeTimeEntry?: TimeEntry;
  
  // Computed properties
  isBlocked?: boolean;
  isBlocking?: boolean;
  subtaskProgress?: number;
  totalTimeSpent?: number;
  isOverdue?: boolean;
}

interface EnhancedCardProps {
  card: EnhancedKanbanCard;
  onClick: () => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onQuickEdit?: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
  isCompact?: boolean;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityBorderColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

export function EnhancedCard({
  card,
  onClick,
  onStartTimer,
  onStopTimer,
  onQuickEdit,
  onDelete,
  isDragging = false,
  isCompact = false,
}: EnhancedCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDaysUntilDue = (): number | null => {
    if (!card.dueDate) return null;
    const due = new Date(card.dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilDue = getDaysUntilDue();
  const subtaskCount = card.subtasks?.length || 0;
  const completedSubtasks = card.subtasks?.filter(st => st.is_completed).length || 0;
  const subtaskProgress = subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;
  const totalTimeSpent = card.timeEntries?.reduce((total, entry) => total + entry.duration_minutes, 0) || 0;
  const linkCount = card.links?.length || 0;
  const commentCount = card.comments?.length || 0;

  // Status indicators
  const hasBlockingLinks = card.links?.some(link => link.link_type === 'blocks' && link.source_card_id === card.id);
  const hasBlockedByLinks = card.links?.some(link => link.link_type === 'blocks' && link.target_card_id === card.id);
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
        ${card.priority !== 'low' ? `border-l-4 ${priorityBorderColors[card.priority]}` : ''}
        ${isOverdue ? 'border-red-300 bg-red-50' : ''}
        ${hasBlockedByLinks ? 'border-orange-300 bg-orange-50' : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header with title and priority */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 flex-1 line-clamp-2 pr-2">
            {card.title}
          </h4>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showActions && (
              <>
                {card.activeTimeEntry ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopTimer?.();
                    }}
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartTimer?.();
                    }}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickEdit?.();
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Description preview */}
        {!isCompact && card.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {card.description}
          </p>
        )}
      </div>

      {/* Status indicators */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {/* Priority badge */}
          {card.priority !== 'low' && (
            <Badge className={priorityColors[card.priority]}>
              <Flag className="w-3 h-3 mr-1" />
              {card.priority}
            </Badge>
          )}

          {/* Active timer */}
          {card.activeTimeEntry && (
            <Badge className="bg-green-100 text-green-800">
              <Timer className="w-3 h-3 mr-1 animate-pulse" />
              Active
            </Badge>
          )}

          {/* Blocked status */}
          {hasBlockedByLinks && (
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Blocked
            </Badge>
          )}

          {/* Blocking status */}
          {hasBlockingLinks && (
            <Badge className="bg-orange-100 text-orange-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Blocking
            </Badge>
          )}

          {/* Due date status */}
          {isOverdue && (
            <Badge className="bg-red-100 text-red-800">
              <Calendar className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          )}
          {isDueSoon && !isOverdue && (
            <Badge className="bg-orange-100 text-orange-800">
              <Calendar className="w-3 h-3 mr-1" />
              Due {daysUntilDue === 0 ? 'today' : `in ${daysUntilDue}d`}
            </Badge>
          )}

          {/* Milestone */}
          {card.milestone && (
            <Badge variant="outline">
              <Target className="w-3 h-3 mr-1" />
              {card.milestone.name}
            </Badge>
          )}
        </div>

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Progress indicators */}
        {!isCompact && (
          <div className="space-y-2">
            {/* Subtasks progress */}
            {subtaskCount > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CheckSquare className="w-3 h-3" />
                    <span>Subtasks</span>
                  </div>
                  <span>{completedSubtasks}/{subtaskCount}</span>
                </div>
                <Progress value={subtaskProgress} className="h-1" />
              </div>
            )}

            {/* Time tracking progress */}
            {card.estimatedHours && totalTimeSpent > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Time</span>
                  </div>
                  <span>
                    {formatDuration(totalTimeSpent)} / {card.estimatedHours}h
                  </span>
                </div>
                <Progress 
                  value={Math.min((totalTimeSpent / (card.estimatedHours * 60)) * 100, 100)} 
                  className="h-1" 
                />
              </div>
            )}

            {/* Milestone progress */}
            {card.milestone && card.milestone.progress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Target className="w-3 h-3" />
                    <span>Milestone</span>
                  </div>
                  <span>{Math.round(card.milestone.progress)}%</span>
                </div>
                <Progress value={card.milestone.progress} className="h-1" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {/* Assignee */}
            {card.assignee && (
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span className="truncate max-w-20">{card.assignee}</span>
              </div>
            )}

            {/* Due date */}
            {card.dueDate && !isOverdue && !isDueSoon && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(card.dueDate).toLocaleDateString()}</span>
              </div>
            )}

            {/* Time spent */}
            {totalTimeSpent > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(totalTimeSpent)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Activity indicators */}
            {linkCount > 0 && (
              <div className="flex items-center space-x-1">
                <LinkIcon className="w-3 h-3" />
                <span>{linkCount}</span>
              </div>
            )}
            {commentCount > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-3 h-3" />
                <span>{commentCount}</span>
              </div>
            )}
            {subtaskCount > 0 && (
              <div className="flex items-center space-x-1">
                <CheckSquare className="w-3 h-3" />
                <span>{completedSubtasks}/{subtaskCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom fields preview */}
        {!isCompact && card.customFields && card.customFields.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-1 text-xs">
              {card.customFields.slice(0, 2).map((field, index) => (
                <div key={index} className="truncate">
                  <span className="text-gray-500">{field.custom_field_id}:</span>
                  <span className="ml-1 text-gray-700">{field.value || 'N/A'}</span>
                </div>
              ))}
              {card.customFields.length > 2 && (
                <div className="text-gray-500 text-xs">
                  +{card.customFields.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}