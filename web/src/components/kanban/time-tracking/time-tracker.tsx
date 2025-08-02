'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Play,
  Pause,
  Square,
  Clock,
  Target,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  BarChart3,
  Timer,
  Stopwatch
} from 'lucide-react';

export interface TimeEntry {
  id: string;
  card_id: string;
  user_name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  is_billable: boolean;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

interface TimeTrackerProps {
  cardId: string;
  cardTitle: string;
  timeEntries: TimeEntry[];
  estimatedHours?: number;
  activeTimeEntry?: TimeEntry;
  onStartTimer: (description?: string) => void;
  onStopTimer: (entryId: string) => void;
  onCreateTimeEntry: (entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTimeEntry: (entryId: string, updates: Partial<TimeEntry>) => void;
  onDeleteTimeEntry: (entryId: string) => void;
  onUpdateEstimate: (estimatedHours: number) => void;
}

export function TimeTracker({
  cardId,
  cardTitle,
  timeEntries,
  estimatedHours,
  activeTimeEntry,
  onStartTimer,
  onStopTimer,
  onCreateTimeEntry,
  onUpdateTimeEntry,
  onDeleteTimeEntry,
  onUpdateEstimate,
}: TimeTrackerProps) {
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [timerDescription, setTimerDescription] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newEstimate, setNewEstimate] = useState(estimatedHours?.toString() || '');
  
  const [newTimeEntry, setNewTimeEntry] = useState({
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: 0,
    is_billable: false,
    hourly_rate: 0,
    user_name: 'current_user',
  });

  // Update current time every second for active timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalTimeSpent = timeEntries.reduce((total, entry) => total + entry.duration_minutes, 0);
  const totalBillableTime = timeEntries
    .filter(entry => entry.is_billable)
    .reduce((total, entry) => total + entry.duration_minutes, 0);
  const totalEarnings = timeEntries
    .filter(entry => entry.is_billable && entry.hourly_rate)
    .reduce((total, entry) => total + (entry.duration_minutes / 60) * (entry.hourly_rate || 0), 0);

  const progressPercentage = estimatedHours 
    ? Math.min((totalTimeSpent / (estimatedHours * 60)) * 100, 100)
    : 0;

  const getActiveTimeDuration = (): number => {
    if (!activeTimeEntry) return 0;
    const startTime = new Date(activeTimeEntry.start_time);
    const diffMs = currentTime.getTime() - startTime.getTime();
    return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleStartTimer = () => {
    onStartTimer(timerDescription || 'Working on task');
    setTimerDescription('');
  };

  const handleCreateManualEntry = () => {
    if (!newTimeEntry.start_time || !newTimeEntry.end_time) return;

    const startTime = new Date(newTimeEntry.start_time);
    const endTime = new Date(newTimeEntry.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.max(0, Math.floor(durationMs / (1000 * 60)));

    onCreateTimeEntry({
      ...newTimeEntry,
      card_id: cardId,
      duration_minutes: durationMinutes,
    });

    setNewTimeEntry({
      description: '',
      start_time: '',
      end_time: '',
      duration_minutes: 0,
      is_billable: false,
      hourly_rate: 0,
      user_name: 'current_user',
    });
    setIsManualEntryOpen(false);
  };

  const handleUpdateEntry = () => {
    if (!editingEntry?.id) return;

    onUpdateTimeEntry(editingEntry.id, editingEntry);
    setEditingEntry(null);
  };

  const handleUpdateEstimate = () => {
    const hours = parseFloat(newEstimate);
    if (isNaN(hours) || hours < 0) return;

    onUpdateEstimate(hours);
    setIsEstimateDialogOpen(false);
  };

  const activeTimerDuration = getActiveTimeDuration();

  return (
    <div className="space-y-6">
      {/* Timer Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Timer className="w-5 h-5 mr-2" />
              Time Tracker
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Dialog open={isEstimateDialogOpen} onOpenChange={setIsEstimateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Target className="w-4 h-4 mr-2" />
                    {estimatedHours ? `${estimatedHours}h estimated` : 'Set Estimate'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Time Estimate</DialogTitle>
                    <DialogDescription>
                      How many hours do you estimate this task will take?
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Label htmlFor="estimate">Hours</Label>
                    <Input
                      id="estimate"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={newEstimate}
                      onChange={(e) => setNewEstimate(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEstimateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateEstimate}>
                      Update Estimate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Timer */}
          {activeTimeEntry ? (
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-green-800">Timer Active</span>
                </div>
                <div className="text-2xl font-mono text-green-800">
                  {formatDuration(activeTimerDuration)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">
                    {activeTimeEntry.description || 'Working on task'}
                  </p>
                  <p className="text-xs text-green-600">
                    Started at {formatTime(activeTimeEntry.start_time)}
                  </p>
                </div>
                <Button
                  onClick={() => onStopTimer(activeTimeEntry.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="timerDescription">What are you working on?</Label>
                <Input
                  id="timerDescription"
                  placeholder="Brief description of your work..."
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleStartTimer} className="w-full bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </div>
          )}

          {/* Time Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(totalTimeSpent)}
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(totalBillableTime)}
              </div>
              <div className="text-sm text-gray-600">Billable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Earnings</div>
            </div>
          </div>

          {/* Progress vs Estimate */}
          {estimatedHours && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress vs Estimate</span>
                <span>
                  {formatDuration(totalTimeSpent)} / {estimatedHours}h
                  {progressPercentage > 100 && (
                    <Badge className="bg-red-100 text-red-800 ml-2">
                      Over by {formatDuration(totalTimeSpent - estimatedHours * 60)}
                    </Badge>
                  )}
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className={`h-2 ${progressPercentage > 100 ? 'bg-red-100' : ''}`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Entries ({timeEntries.length})
            </CardTitle>
            <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Entry</DialogTitle>
                  <DialogDescription>
                    Manually add a time entry for work done on this card
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="manualDescription">Description</Label>
                    <Textarea
                      id="manualDescription"
                      placeholder="What did you work on?"
                      value={newTimeEntry.description}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={newTimeEntry.start_time}
                        onChange={(e) => setNewTimeEntry({ ...newTimeEntry, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={newTimeEntry.end_time}
                        onChange={(e) => setNewTimeEntry({ ...newTimeEntry, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isBillable"
                        checked={newTimeEntry.is_billable}
                        onChange={(e) => setNewTimeEntry({ ...newTimeEntry, is_billable: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="isBillable">Billable</Label>
                    </div>
                    {newTimeEntry.is_billable && (
                      <div className="flex-1">
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newTimeEntry.hourly_rate}
                          onChange={(e) => setNewTimeEntry({ 
                            ...newTimeEntry, 
                            hourly_rate: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsManualEntryOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateManualEntry}
                    disabled={!newTimeEntry.start_time || !newTimeEntry.end_time}
                  >
                    Add Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No time entries yet</p>
              <p className="text-sm">Start the timer or add manual entries to track your time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeEntries
                .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                .map((entry) => {
                  const earnings = entry.is_billable && entry.hourly_rate 
                    ? (entry.duration_minutes / 60) * entry.hourly_rate 
                    : 0;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">
                            {formatDuration(entry.duration_minutes)}
                          </span>
                          {entry.is_billable && (
                            <Badge className="bg-green-100 text-green-800">
                              <DollarSign className="w-3 h-3 mr-1" />
                              ${earnings.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {entry.description || 'Time entry'}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{formatDate(entry.start_time)}</span>
                          <span>
                            {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : 'Running'}
                          </span>
                          <span>{entry.user_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEntry(entry)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTimeEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Update the time entry details
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  placeholder="What did you work on?"
                  value={editingEntry.description || ''}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, description: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editIsBillable"
                    checked={editingEntry.is_billable}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, is_billable: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="editIsBillable">Billable</Label>
                </div>
                {editingEntry.is_billable && (
                  <div className="flex-1">
                    <Label htmlFor="editHourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="editHourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={editingEntry.hourly_rate || 0}
                      onChange={(e) =>
                        setEditingEntry({
                          ...editingEntry,
                          hourly_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry}>
              Update Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}