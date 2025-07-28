'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  BarChart3,
  RefreshCw,
  Star,
  ArrowRight,
  Brain,
  Coffee,
  Timer
} from 'lucide-react';
import { usePredictiveAnalyticsDashboard } from '@/hooks/use-predictive-analytics';
import { useProductivityInsights } from '@/hooks/use-analytics';

// Mock implementation for useAutoAnalytics - replace with actual implementation
const useAutoAnalytics = () => ({
  trackFeatureUse: (feature: string, action: string, properties?: any) => {
    console.log('Track feature use:', { feature, action, properties });
  }
});
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SmartRecommendationsProps {
  className?: string;
}

interface EnhancedRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'health' | 'efficiency' | 'learning' | 'planning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeToImplement: string;
  basedOn: string[];
  actionSteps: string[];
  expectedOutcome: string;
  isPersonalized: boolean;
}

export function SmartRecommendations({ className }: SmartRecommendationsProps) {
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const [implementedRecommendations, setImplementedRecommendations] = useState<Set<string>>(new Set());
  
  const {
    taskPrediction,
    productivityForecast,
    workloadCapacity,
    hasHighBurnoutRisk,
    isProductivityImproving,
    isLoading
  } = usePredictiveAnalyticsDashboard();
  
  const { insights, generateInsights, isGenerating } = useProductivityInsights();
  const { trackFeatureUse } = useAutoAnalytics();

  // Generate enhanced ML-based recommendations
  const generateSmartRecommendations = (): EnhancedRecommendation[] => {
    const recommendations: EnhancedRecommendation[] = [];

    // Burnout Prevention Recommendations
    if (hasHighBurnoutRisk) {
      recommendations.push({
        id: 'burnout-prevention',
        title: 'Reduce Workload Immediately',
        description: 'Your burnout risk is critically high. Take immediate action to prevent exhaustion.',
        category: 'health',
        priority: 'critical',
        confidence: 0.95,
        impact: 'high',
        effort: 'medium',
        timeToImplement: 'Immediate',
        basedOn: ['Workload analysis', 'Stress patterns', 'Performance metrics'],
        actionSteps: [
          'Cancel or postpone non-essential meetings today',
          'Delegate 2-3 tasks to team members',
          'Block out 2 hours for break time',
          'Set a hard stop time for work today'
        ],
        expectedOutcome: 'Reduce burnout risk by 30-40% within 3 days',
        isPersonalized: true
      });
    }

    // Peak Hours Optimization
    if (productivityForecast?.predictions.peakHours.length) {
      const nextPeakHour = productivityForecast.predictions.peakHours[0];
      recommendations.push({
        id: 'peak-hours-optimization',
        title: 'Schedule High-Priority Tasks During Peak Hours',
        description: `Your peak productivity hour is ${nextPeakHour}:00. Maximize this time for important work.`,
        category: 'productivity',
        priority: 'high',
        confidence: 0.85,
        impact: 'high',
        effort: 'low',
        timeToImplement: 'Tomorrow',
        basedOn: ['Peak hour analysis', 'Task completion patterns', 'Energy levels'],
        actionSteps: [
          `Block ${nextPeakHour}:00-${nextPeakHour + 2}:00 for your most important task`,
          'Move routine tasks to non-peak hours',
          'Set phone to do-not-disturb during peak time',
          'Prepare all materials the night before'
        ],
        expectedOutcome: 'Increase task completion efficiency by 25-35%',
        isPersonalized: true
      });
    }

    // Task Prediction Optimization
    if (taskPrediction && taskPrediction.confidence < 0.7) {
      recommendations.push({
        id: 'task-estimation-improvement',
        title: 'Improve Task Time Estimation',
        description: 'Your task completion predictions have low confidence. Better estimation leads to better planning.',
        category: 'planning',
        priority: 'medium',
        confidence: 0.78,
        impact: 'medium',
        effort: 'low',
        timeToImplement: '1 week',
        basedOn: ['Task completion variance', 'Estimation accuracy', 'Planning patterns'],
        actionSteps: [
          'Log actual time spent on tasks for one week',
          'Break large tasks into smaller 2-hour chunks',
          'Add 25% buffer time to estimates',
          'Review and adjust estimates weekly'
        ],
        expectedOutcome: 'Improve estimation accuracy by 40-50%',
        isPersonalized: true
      });
    }

    // Productivity Trend Recommendations
    if (!isProductivityImproving && productivityForecast) {
      recommendations.push({
        id: 'productivity-boost',
        title: 'Reverse Declining Productivity Trend',
        description: 'Your productivity is showing a declining trend. Time to try new strategies.',
        category: 'efficiency',
        priority: 'high',
        confidence: 0.82,
        impact: 'high',
        effort: 'medium',
        timeToImplement: '2 weeks',
        basedOn: ['Productivity trends', 'Completion rates', 'Activity patterns'],
        actionSteps: [
          'Implement the Pomodoro technique (25min focus, 5min break)',
          'Remove distractions from workspace',
          'Try time-blocking for different types of tasks',
          'Review and eliminate low-value activities'
        ],
        expectedOutcome: 'Increase productivity score by 20-30%',
        isPersonalized: true
      });
    }

    // Break Frequency Optimization
    if (workloadCapacity?.recommendations.breakFrequency) {
      const breakFreq = workloadCapacity.recommendations.breakFrequency;
      recommendations.push({
        id: 'break-optimization',
        title: 'Optimize Break Schedule',
        description: `AI recommends taking breaks every ${breakFreq} minutes for optimal performance.`,
        category: 'health',
        priority: 'medium',
        confidence: 0.75,
        impact: 'medium',
        effort: 'low',
        timeToImplement: 'Today',
        basedOn: ['Workload analysis', 'Focus patterns', 'Energy levels'],
        actionSteps: [
          `Set timer for ${breakFreq}-minute work blocks`,
          'Take 5-10 minute breaks between blocks',
          'Use breaks for light stretching or walking',
          'Avoid screens during break time'
        ],
        expectedOutcome: 'Maintain energy levels 15-20% longer',
        isPersonalized: true
      });
    }

    // Focus Time Block Recommendations
    if (workloadCapacity?.recommendations.focusTimeBlocks.length) {
      const focusBlocks = workloadCapacity.recommendations.focusTimeBlocks;
      recommendations.push({
        id: 'focus-time-blocks',
        title: 'Implement Deep Work Time Blocks',
        description: 'AI has identified optimal time slots for your most focused work.',
        category: 'productivity',
        priority: 'high',
        confidence: 0.88,
        impact: 'high',
        effort: 'medium',
        timeToImplement: 'This week',
        basedOn: ['Focus patterns', 'Distraction analysis', 'Performance data'],
        actionSteps: [
          ...focusBlocks.map(block => `Block ${block.start}:00-${block.end}:00 for deep work`),
          'Turn off all notifications during these blocks',
          'Prepare tasks and materials in advance',
          'Communicate boundaries to team members'
        ],
        expectedOutcome: 'Complete 40-60% more high-priority tasks',
        isPersonalized: true
      });
    }

    // Generic ML-Based Recommendations
    recommendations.push(
      {
        id: 'energy-management',
        title: 'Implement Energy-Based Task Scheduling',
        description: 'Match task complexity to your natural energy patterns for maximum efficiency.',
        category: 'efficiency',
        priority: 'medium',
        confidence: 0.70,
        impact: 'medium',
        effort: 'medium',
        timeToImplement: '1 week',
        basedOn: ['Energy pattern analysis', 'Task completion data'],
        actionSteps: [
          'Schedule complex tasks during morning hours',
          'Handle routine tasks during energy dips',
          'Save creative work for your peak creative time',
          'Batch similar tasks together'
        ],
        expectedOutcome: 'Reduce task completion time by 15-25%',
        isPersonalized: false
      },
      {
        id: 'weekly-planning',
        title: 'Adopt Data-Driven Weekly Planning',
        description: 'Use your productivity patterns to plan more realistic and effective weeks.',
        category: 'planning',
        priority: 'medium',
        confidence: 0.80,
        impact: 'medium',
        effort: 'low',
        timeToImplement: 'Next week',
        basedOn: ['Weekly patterns', 'Completion rates', 'Workload analysis'],
        actionSteps: [
          'Review previous week\'s actual vs planned tasks',
          'Identify your most and least productive days',
          'Plan lighter schedules for typically low-energy days',
          'Build buffer time into your weekly schedule'
        ],
        expectedOutcome: 'Improve weekly goal achievement by 30-40%',
        isPersonalized: false
      }
    );

    return recommendations.filter(rec => !dismissedRecommendations.has(rec.id));
  };

  const recommendations = generateSmartRecommendations();

  const handleDismissRecommendation = (id: string) => {
    setDismissedRecommendations(prev => new Set([...prev, id]));
    trackFeatureUse('recommendations', 'dismiss', { recommendationId: id });
  };

  const handleImplementRecommendation = (id: string) => {
    setImplementedRecommendations(prev => new Set([...prev, id]));
    trackFeatureUse('recommendations', 'implement', { recommendationId: id });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'productivity': return <Target className="h-4 w-4" />;
      case 'health': return <Coffee className="h-4 w-4" />;
      case 'efficiency': return <Zap className="h-4 w-4" />;
      case 'learning': return <Brain className="h-4 w-4" />;
      case 'planning': return <Calendar className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-muted-foreground">Analyzing your patterns...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Recommendations</h2>
          <p className="text-muted-foreground">
            AI-powered suggestions based on your productivity patterns
          </p>
        </div>
        <Button 
          onClick={() => generateInsights()}
          disabled={isGenerating}
          variant="outline"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Total Recommendations</span>
            </div>
            <div className="text-2xl font-bold">{recommendations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">High Priority</span>
            </div>
            <div className="text-2xl font-bold">
              {recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Implemented</span>
            </div>
            <div className="text-2xl font-bold">{implementedRecommendations.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Personalized</span>
            </div>
            <div className="text-2xl font-bold">
              {recommendations.filter(r => r.isPersonalized).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No recommendations available</p>
                <p className="text-sm">Complete more tasks to generate personalized recommendations</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          recommendations
            .sort((a, b) => {
              const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
            .map((recommendation) => (
              <Card key={recommendation.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-1 h-16 rounded-full ${getPriorityColor(recommendation.priority)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getCategoryIcon(recommendation.category)}
                          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                          {recommendation.isPersonalized && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Personalized
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-base">
                          {recommendation.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissRecommendation(recommendation.id)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleImplementRecommendation(recommendation.id)}
                        disabled={implementedRecommendations.has(recommendation.id)}
                      >
                        {implementedRecommendations.has(recommendation.id) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Implemented
                          </>
                        ) : (
                          'Implement'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Metrics */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={recommendation.confidence * 100} className="flex-1" />
                          <span className="text-sm font-medium">
                            {Math.round(recommendation.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm text-muted-foreground">Impact</span>
                        <Badge variant="outline" className="block mt-1">
                          {recommendation.impact}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <span className="text-sm text-muted-foreground">Effort</span>
                        <Badge variant="outline" className="block mt-1">
                          {recommendation.effort}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <span className="text-sm text-muted-foreground">Time</span>
                        <Badge variant="outline" className="block mt-1">
                          {recommendation.timeToImplement}
                        </Badge>
                      </div>
                    </div>

                    {/* Based On */}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Based on:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recommendation.basedOn.map((factor, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Steps */}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Action Steps:</span>
                      <div className="mt-2 space-y-2">
                        {recommendation.actionSteps.map((step, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-primary">{index + 1}</span>
                            </div>
                            <span className="text-sm">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expected Outcome */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Expected Outcome:</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {recommendation.expectedOutcome}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}

export default SmartRecommendations;