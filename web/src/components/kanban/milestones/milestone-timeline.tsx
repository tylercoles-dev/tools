'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Target,
  CheckSquare,
  Clock,
  Flag,
  AlertTriangle,
  ChevronRight,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import type { Milestone } from './milestone-manager';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  showCompleted?: boolean;
}

export function MilestoneTimeline({ 
  milestones, 
  onMilestoneClick,
  showCompleted = true 
}: MilestoneTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');

  const now = new Date();
  
  const getFilteredMilestones = () => {
    let filtered = milestones;
    
    switch (filter) {
      case 'active':
        filtered = milestones.filter(m => !m.is_completed);
        break;
      case 'completed':
        filtered = milestones.filter(m => m.is_completed);
        break;
      case 'overdue':
        filtered = milestones.filter(m => 
          !m.is_completed && m.due_date && new Date(m.due_date) < now
        );
        break;
    }

    return filtered.sort((a, b) => {
      // Sort by due date, with no due date items at the end
      if (!a.due_date && !b.due_date) return a.position - b.position;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.is_completed) return 'completed';
    if (!milestone.due_date) return 'no-date';
    
    const daysUntil = getDaysUntilDue(milestone.due_date);
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'due-soon';
    return 'on-track';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckSquare className="w-5 h-5 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'due-soon':
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <Target className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (milestone: Milestone) => {
    const status = getMilestoneStatus(milestone);
    
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            Completed
          </Badge>
        );
      case 'overdue':
        const overdueDays = milestone.due_date ? Math.abs(getDaysUntilDue(milestone.due_date)) : 0;
        return (
          <Badge className="bg-red-100 text-red-800">
            {overdueDays} days overdue
          </Badge>
        );
      case 'due-soon':
        const dueDays = milestone.due_date ? getDaysUntilDue(milestone.due_date) : 0;
        return (
          <Badge className="bg-orange-100 text-orange-800">
            Due in {dueDays} day{dueDays !== 1 ? 's' : ''}
          </Badge>
        );
      case 'no-date':
        return (
          <Badge variant="outline">
            No due date
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800">
            On track
          </Badge>
        );
    }
  };

  const filteredMilestones = getFilteredMilestones();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Milestone Timeline
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 border rounded-md p-1">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'active' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setFilter('active')}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={filter === 'completed' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
              <Button
                size="sm"
                variant={filter === 'overdue' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setFilter('overdue')}
              >
                Overdue
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMilestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No milestones found</p>
            <p className="text-sm">
              {filter === 'all' 
                ? 'Create your first milestone to get started'
                : `No ${filter} milestones at the moment`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMilestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone);
              const isLast = index === filteredMilestones.length - 1;
              
              return (
                <div key={milestone.id} className="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  
                  <div 
                    className={`flex items-start space-x-4 p-4 rounded-lg border transition-all hover:shadow-sm ${
                      onMilestoneClick ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${milestone.is_completed ? 'opacity-75' : ''}`}
                    onClick={() => onMilestoneClick?.(milestone)}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(status)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`font-medium ${milestone.is_completed ? 'line-through text-gray-500' : ''}`}>
                            {milestone.name}
                          </h4>
                          {milestone.description && (
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {getStatusBadge(milestone)}
                          {onMilestoneClick && (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Progress and stats */}
                      {milestone.assigned_cards > 0 && (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Progress</span>
                            <span>{milestone.completed_cards}/{milestone.assigned_cards} cards</span>
                          </div>
                          <Progress value={milestone.progress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Date and metadata */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {milestone.due_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(milestone.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Flag className="w-4 h-4" />
                          <span>{milestone.assigned_cards} cards assigned</span>
                        </div>
                        {milestone.is_completed && milestone.completion_date && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckSquare className="w-4 h-4" />
                            <span>Completed {new Date(milestone.completion_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Color indicator */}
                      <div className="flex items-center mt-2">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: milestone.color }}
                        />
                        <span className="text-xs text-gray-400">
                          Created {new Date(milestone.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}