'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  position: number;
  parent_subtask_id?: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  children?: Subtask[];
}

interface SubtaskListProps {
  cardId: string;
  subtasks: Subtask[];
  onCreateSubtask: (subtask: Omit<Subtask, 'id' | 'created_at' | 'updated_at' | 'children'>) => void;
  onUpdateSubtask: (subtaskId: string, updates: Partial<Subtask>) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onCompleteSubtask: (subtaskId: string, isCompleted: boolean) => void;
}

export function SubtaskList({
  cardId,
  subtasks,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onCompleteSubtask,
}: SubtaskListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [parentSubtaskId, setParentSubtaskId] = useState<string | undefined>(undefined);
  
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    position: subtasks.length,
    is_completed: false,
  });

  // Build hierarchical structure
  const buildHierarchy = (tasks: Subtask[]): Subtask[] => {
    const taskMap = new Map<string, Subtask>();
    const rootTasks: Subtask[] = [];

    // Create map of all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      
      if (task.parent_subtask_id) {
        const parent = taskMap.get(task.parent_subtask_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(taskWithChildren);
        }
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    // Sort by position
    const sortByPosition = (tasks: Subtask[]) => {
      tasks.sort((a, b) => a.position - b.position);
      tasks.forEach(task => {
        if (task.children && task.children.length > 0) {
          sortByPosition(task.children);
        }
      });
    };

    sortByPosition(rootTasks);
    return rootTasks;
  };

  const hierarchicalSubtasks = buildHierarchy(subtasks);

  const getCompletionStats = (tasks: Subtask[] = subtasks) => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.is_completed).length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const { total, completed, percentage } = getCompletionStats();

  const handleCreateSubtask = () => {
    if (!newSubtask.title.trim()) return;

    onCreateSubtask({
      ...newSubtask,
      parent_subtask_id: parentSubtaskId,
      position: parentSubtaskId 
        ? (subtasks.filter(s => s.parent_subtask_id === parentSubtaskId).length)
        : subtasks.filter(s => !s.parent_subtask_id).length,
    });

    setNewSubtask({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      position: subtasks.length + 1,
      is_completed: false,
    });
    setParentSubtaskId(undefined);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateSubtask = () => {
    if (!editingSubtask?.id || !editingSubtask.title.trim()) return;

    onUpdateSubtask(editingSubtask.id, editingSubtask);
    setEditingSubtask(null);
  };

  const handleToggleExpanded = (subtaskId: string) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(subtaskId)) {
      newExpanded.delete(subtaskId);
    } else {
      newExpanded.add(subtaskId);
    }
    setExpandedSubtasks(newExpanded);
  };

  const handleAddChildSubtask = (parentId: string) => {
    setParentSubtaskId(parentId);
    setNewSubtask({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      position: 0,
      is_completed: false,
    });
    setIsCreateDialogOpen(true);
  };

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderSubtask = (subtask: Subtask, level: number = 0) => {
    const hasChildren = subtask.children && subtask.children.length > 0;
    const isExpanded = expandedSubtasks.has(subtask.id);
    const overdue = isOverdue(subtask.due_date);

    return (
      <div key={subtask.id} className="space-y-2">
        <div 
          className={`flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
            level > 0 ? 'ml-6 border-l-2 border-l-blue-200' : ''
          }`}
        >
          {/* Expand/Collapse button */}
          <div className="w-6 flex justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleToggleExpanded(subtask.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            ) : null}
          </div>

          {/* Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={subtask.is_completed}
              onChange={(e) => onCompleteSubtask(subtask.id, e.target.checked)}
              className="rounded"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`font-medium ${subtask.is_completed ? 'line-through text-gray-500' : ''}`}>
                  {subtask.title}
                </p>
                {subtask.description && (
                  <p className="text-sm text-gray-600 mt-1">{subtask.description}</p>
                )}
                
                {/* Metadata */}
                <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                  {subtask.assigned_to && (
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{subtask.assigned_to}</span>
                    </div>
                  )}
                  {subtask.due_date && (
                    <div className={`flex items-center space-x-1 ${overdue && !subtask.is_completed ? 'text-red-600' : ''}`}>
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(subtask.due_date).toLocaleDateString()}</span>
                      {overdue && !subtask.is_completed && (
                        <AlertCircle className="w-3 h-3" />
                      )}
                    </div>
                  )}
                  {hasChildren && (
                    <Badge variant="outline" className="text-xs">
                      {subtask.children!.length} subtask{subtask.children!.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAddChildSubtask(subtask.id)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subtask
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingSubtask(subtask)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteSubtask(subtask.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {subtask.children!.map(child => renderSubtask(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h4 className="font-medium">Subtasks</h4>
          {total > 0 && (
            <Badge variant="outline">
              {completed}/{total} completed
            </Badge>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Subtask
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {parentSubtaskId ? 'Add Sub-subtask' : 'Add Subtask'}
              </DialogTitle>
              <DialogDescription>
                {parentSubtaskId 
                  ? 'Create a subtask under the selected parent'
                  : 'Break down this card into smaller tasks'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subtaskTitle">Title</Label>
                <Input
                  id="subtaskTitle"
                  placeholder="Enter subtask title"
                  value={newSubtask.title}
                  onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subtaskDescription">Description (optional)</Label>
                <Textarea
                  id="subtaskDescription"
                  placeholder="Describe this subtask"
                  value={newSubtask.description}
                  onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subtaskAssignee">Assignee (optional)</Label>
                  <Input
                    id="subtaskAssignee"
                    placeholder="Assign to..."
                    value={newSubtask.assigned_to}
                    onChange={(e) => setNewSubtask({ ...newSubtask, assigned_to: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="subtaskDueDate">Due Date (optional)</Label>
                  <Input
                    id="subtaskDueDate"
                    type="date"
                    value={newSubtask.due_date}
                    onChange={(e) => setNewSubtask({ ...newSubtask, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setParentSubtaskId(undefined);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateSubtask} disabled={!newSubtask.title.trim()}>
                Create Subtask
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-2">
        {hierarchicalSubtasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No subtasks yet</p>
            <p className="text-sm">Break down this card into smaller, manageable tasks</p>
          </div>
        ) : (
          hierarchicalSubtasks.map(subtask => renderSubtask(subtask))
        )}
      </div>

      {/* Edit Subtask Dialog */}
      <Dialog open={!!editingSubtask} onOpenChange={() => setEditingSubtask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subtask</DialogTitle>
            <DialogDescription>
              Update the subtask details
            </DialogDescription>
          </DialogHeader>
          {editingSubtask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editSubtaskTitle">Title</Label>
                <Input
                  id="editSubtaskTitle"
                  placeholder="Enter subtask title"
                  value={editingSubtask.title}
                  onChange={(e) =>
                    setEditingSubtask({ ...editingSubtask, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editSubtaskDescription">Description (optional)</Label>
                <Textarea
                  id="editSubtaskDescription"
                  placeholder="Describe this subtask"
                  value={editingSubtask.description || ''}
                  onChange={(e) =>
                    setEditingSubtask({ ...editingSubtask, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editSubtaskAssignee">Assignee (optional)</Label>
                  <Input
                    id="editSubtaskAssignee"
                    placeholder="Assign to..."
                    value={editingSubtask.assigned_to || ''}
                    onChange={(e) =>
                      setEditingSubtask({ ...editingSubtask, assigned_to: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editSubtaskDueDate">Due Date (optional)</Label>
                  <Input
                    id="editSubtaskDueDate"
                    type="date"
                    value={editingSubtask.due_date || ''}
                    onChange={(e) =>
                      setEditingSubtask({ ...editingSubtask, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubtask(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubtask} disabled={!editingSubtask?.title.trim()}>
              Update Subtask
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}