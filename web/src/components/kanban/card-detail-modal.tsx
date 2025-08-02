'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Calendar,
  Flag,
  Clock,
  CheckSquare,
  Link as LinkIcon,
  Target,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { CustomFieldForm, type CustomField, type CustomFieldValue } from './custom-fields';
import { 
  useCardSubtasks, 
  useCardLinks, 
  useCardTimeEntries, 
  useCardCustomFields,
  useKanbanMutations,
  useActiveTimeTracking 
} from '@/hooks/use-api';

export interface KanbanCard {
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
  milestone?: {
    id: string;
    name: string;
    color: string;
    progress: number;
  };
}

interface CardDetailModalProps {
  card: KanbanCard | null;
  isOpen: boolean;
  onClose: () => void;
  boardCustomFields: CustomField[];
  onUpdateCard: (cardId: string, updates: Partial<KanbanCard>) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function CardDetailModal({ 
  card, 
  isOpen, 
  onClose, 
  boardCustomFields,
  onUpdateCard 
}: CardDetailModalProps) {
  const [editedCard, setEditedCard] = useState<Partial<KanbanCard>>({});
  const [activeTab, setActiveTab] = useState('details');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | null>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Data hooks
  const { data: subtasksData } = useCardSubtasks(card?.id || '');
  const { data: linksData } = useCardLinks(card?.id || '');
  const { data: timeEntriesData } = useCardTimeEntries(card?.id || '');
  const { data: customFieldsData } = useCardCustomFields(card?.id || '');
  const { data: activeTimeData } = useActiveTimeTracking();

  // Mutations
  const {
    updateCard,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    completeSubtask,
    createCardLink,
    deleteCardLink,
    startTimeTracking,
    stopTimeTracking,
    createTimeEntry,
    setCustomFieldValue,
    updateCardTimeEstimate,
  } = useKanbanMutations();

  useEffect(() => {
    if (card) {
      setEditedCard(card);
      setIsEditing(false);
    }
  }, [card]);

  useEffect(() => {
    if (customFieldsData?.data) {
      const valueMap: Record<string, string | null> = {};
      customFieldsData.data.forEach((field: CustomFieldValue) => {
        valueMap[field.custom_field_id] = field.value;
      });
      setCustomFieldValues(valueMap);
    }
  }, [customFieldsData]);

  if (!card) return null;

  const subtasks = subtasksData?.data || [];
  const links = linksData?.data || [];
  const timeEntries = timeEntriesData?.data || [];
  const customFields = customFieldsData?.data || [];
  const activeTimeEntry = activeTimeData?.data?.find((entry: any) => entry.card_id === card.id);

  const completedSubtasks = subtasks.filter((st: any) => st.is_completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const totalTimeSpent = timeEntries.reduce((total: number, entry: any) => {
    return total + (entry.duration_minutes || 0);
  }, 0);

  const handleSave = async () => {
    if (!editedCard.title?.trim()) return;

    try {
      await updateCard.mutateAsync({
        id: card.id,
        updates: editedCard,
      });
      onUpdateCard(card.id, editedCard);
      setIsEditing(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCustomFieldChange = async (fieldId: string, value: string | null) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
    
    try {
      await setCustomFieldValue.mutateAsync({
        cardId: card.id,
        fieldId,
        value,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStartTimer = async () => {
    try {
      await startTimeTracking.mutateAsync({
        cardId: card.id,
        description: 'Working on task',
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStopTimer = async () => {
    if (activeTimeEntry) {
      try {
        await stopTimeTracking.mutateAsync(activeTimeEntry.id);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedCard.title || ''}
                  onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
                  className="text-lg font-semibold"
                  placeholder="Card title"
                />
              ) : (
                <DialogTitle className="text-xl">{card.title}</DialogTitle>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={priorityColors[card.priority]}>
                  <Flag className="w-3 h-3 mr-1" />
                  {priorityLabels[card.priority]}
                </Badge>
                {card.milestone && (
                  <Badge variant="outline">
                    <Target className="w-3 h-3 mr-1" />
                    {card.milestone.name}
                  </Badge>
                )}
                {activeTimeEntry && (
                  <Badge className="bg-green-100 text-green-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Timer Active
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateCard.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 grid w-full grid-cols-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="subtasks">
                Subtasks ({subtasks.length})
              </TabsTrigger>
              <TabsTrigger value="links">
                Links ({links.length})
              </TabsTrigger>
              <TabsTrigger value="time">Time</TabsTrigger>
              <TabsTrigger value="custom">Fields</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pt-4">
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    {isEditing ? (
                      <Textarea
                        id="description"
                        value={editedCard.description || ''}
                        onChange={(e) => setEditedCard({ ...editedCard, description: e.target.value })}
                        placeholder="Add a description..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="p-3 border rounded-md min-h-[100px]">
                        {card.description ? (
                          <p className="whitespace-pre-wrap">{card.description}</p>
                        ) : (
                          <p className="text-gray-500 italic">No description provided</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignee">Assignee</Label>
                      {isEditing ? (
                        <Input
                          id="assignee"
                          value={editedCard.assignee || ''}
                          onChange={(e) => setEditedCard({ ...editedCard, assignee: e.target.value })}
                          placeholder="Assign to..."
                        />
                      ) : (
                        <div className="p-2 border rounded-md flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {card.assignee || 'Unassigned'}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      {isEditing ? (
                        <Input
                          id="dueDate"
                          type="date"
                          value={editedCard.dueDate || ''}
                          onChange={(e) => setEditedCard({ ...editedCard, dueDate: e.target.value })}
                        />
                      ) : (
                        <div className="p-2 border rounded-md flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    {isEditing ? (
                      <select
                        id="priority"
                        value={editedCard.priority || 'medium'}
                        onChange={(e) => setEditedCard({ ...editedCard, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    ) : (
                      <div className="p-2 border rounded-md">
                        <Badge className={priorityColors[card.priority]}>
                          <Flag className="w-3 h-3 mr-1" />
                          {priorityLabels[card.priority]}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {card.estimatedHours && (
                    <div>
                      <Label>Time Estimate</Label>
                      <div className="p-2 border rounded-md flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {card.estimatedHours} hours estimated
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="subtasks" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium">Subtasks</h4>
                    {subtasks.length > 0 && (
                      <Badge variant="outline">
                        {completedSubtasks}/{subtasks.length} completed
                      </Badge>
                    )}
                  </div>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subtask
                  </Button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Progress</span>
                      <span>{Math.round(subtaskProgress)}%</span>
                    </div>
                    <Progress value={subtaskProgress} className="h-2" />
                  </div>
                )}

                <div className="space-y-2">
                  {subtasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No subtasks yet</p>
                      <p className="text-sm">Break down this card into smaller tasks</p>
                    </div>
                  ) : (
                    subtasks.map((subtask: any) => (
                      <div
                        key={subtask.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.is_completed}
                          onChange={(e) => completeSubtask.mutate({
                            subtaskId: subtask.id,
                            isCompleted: e.target.checked,
                          })}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className={`${subtask.is_completed ? 'line-through text-gray-500' : ''}`}>
                            {subtask.title}
                          </p>
                          {subtask.description && (
                            <p className="text-sm text-gray-600">{subtask.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button size="sm" variant="ghost">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Card Links</h4>
                  <Button size="sm">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>

                <div className="space-y-3">
                  {links.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No links yet</p>
                      <p className="text-sm">Connect this card to other cards</p>
                    </div>
                  ) : (
                    links.map((link: any) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <LinkIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{link.link_type.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-600">
                              {link.target_card_title || `Card #${link.target_card_id}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="time" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Time Tracking</h4>
                  <div className="flex items-center space-x-2">
                    {activeTimeEntry ? (
                      <Button size="sm" onClick={handleStopTimer} className="bg-red-600 hover:bg-red-700">
                        <Pause className="w-4 h-4 mr-2" />
                        Stop Timer
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleStartTimer} className="bg-green-600 hover:bg-green-700">
                        <Play className="w-4 h-4 mr-2" />
                        Start Timer
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Entry
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Total Time</span>
                    </div>
                    <p className="text-2xl font-bold">{formatDuration(totalTimeSpent)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Estimated</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {card.estimatedHours ? `${card.estimatedHours}h` : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium">Time Entries</h5>
                  {timeEntries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No time entries yet</p>
                      <p className="text-sm">Start tracking time or add manual entries</p>
                    </div>
                  ) : (
                    timeEntries.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{entry.description || 'Time entry'}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(entry.start_time).toLocaleDateString()} • {formatDuration(entry.duration_minutes)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-0">
                <CustomFieldForm
                  fields={boardCustomFields}
                  values={customFields}
                  onChange={handleCustomFieldChange}
                />
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Comments</h4>
                  <Button size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No comments yet</p>
                  <p className="text-sm">Start a discussion about this card</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}